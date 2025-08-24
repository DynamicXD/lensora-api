// services/analyticsService.js
import Photographer from '../models/Photographer.js';
import Videographer from '../models/Videographer.js';
import Booking from '../models/Booking.js';
import Review from '../models/Review.js';

export const updateProviderStats = async (providerId, providerType) => {
  try {
    const Model = providerType === 'Photographer' ? Photographer : Videographer;
    
    // Calculate average rating
    const reviews = await Review.find({ 
      provider: providerId, 
      providerType 
    });

    if (reviews.length > 0) {
      const totalRating = reviews.reduce((sum, review) => sum + review.ratings.overall, 0);
      const averageRating = totalRating / reviews.length;
      
      const ratingBreakdown = {
        five: reviews.filter(r => r.ratings.overall === 5).length,
        four: reviews.filter(r => r.ratings.overall === 4).length,
        three: reviews.filter(r => r.ratings.overall === 3).length,
        two: reviews.filter(r => r.ratings.overall === 2).length,
        one: reviews.filter(r => r.ratings.overall === 1).length
      };

      await Model.findByIdAndUpdate(providerId, {
        'ratings.average': Math.round(averageRating * 10) / 10,
        'ratings.totalReviews': reviews.length,
        'ratings.breakdown': ratingBreakdown
      });
    }

    // Update booking statistics
    const bookingStats = await Booking.aggregate([
      {
        $match: {
          provider: providerId,
          providerType
        }
      },
      {
        $group: {
          _id: null,
          totalBookings: { $sum: 1 },
          totalRevenue: {
            $sum: {
              $cond: [
                { $in: ['$payment.status', ['paid', 'partial']] },
                '$pricing.totalAmount',
                0
              ]
            }
          },
          completedBookings: {
            $sum: {
              $cond: [{ $eq: ['$status', 'completed'] }, 1, 0]
            }
          }
        }
      }
    ]);

    if (bookingStats.length > 0) {
      const stats = bookingStats[0];
      await Model.findByIdAndUpdate(providerId, {
        'analytics.bookingInquiries': stats.totalBookings,
        'analytics.bookingConversions': stats.completedBookings
      });
    }

    console.log(`Updated stats for ${providerType} ${providerId}`);
  } catch (error) {
    console.error('Update provider stats error:', error);
  }
};

export const getPopularProviders = async (providerType, limit = 10) => {
  try {
    const Model = providerType === 'Photographer' ? Photographer : Videographer;
    
    const popularProviders = await Model.find({
      isActive: true,
      isApproved: true
    })
    .sort({
      'ratings.average': -1,
      'analytics.profileViews': -1,
      'ratings.totalReviews': -1
    })
    .limit(limit)
    .populate('user', 'name avatar')
    .select('businessName ratings analytics location portfolio');

    return popularProviders;
  } catch (error) {
    console.error('Get popular providers error:', error);
    return [];
  }
};
