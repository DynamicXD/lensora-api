// controllers/reviewController.js
import Review from '../models/Review.js';
import Booking from '../models/Booking.js';
import Photographer from '../models/Photographer.js';
import Videographer from '../models/Videographer.js';
import { updateProviderStats } from '../services/analyticsService.js';
import { uploadImage } from '../config/cloudinary.js';

export const createReview = async (req, res) => {
  try {
    const { bookingId, ratings, title, content, recommended } = req.body;

    // Verify booking exists and belongs to user
    const booking = await Booking.findOne({
      _id: bookingId,
      client: req.user._id,
      status: 'completed'
    });

    if (!booking) {
      return res.status(404).json({ 
        message: 'Completed booking not found' 
      });
    }

    // Check if review already exists
    const existingReview = await Review.findOne({ booking: bookingId });
    if (existingReview) {
      return res.status(400).json({ 
        message: 'Review already exists for this booking' 
      });
    }

    // Handle photo uploads
    let photos = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const uploadResult = await uploadImage(file, 'reviews');
        photos.push(uploadResult.url);
      }
    }

    const review = new Review({
      booking: bookingId,
      client: req.user._id,
      provider: booking.provider,
      providerType: booking.providerType,
      ratings,
      title,
      content,
      photos,
      recommended
    });

    await review.save();

    // Update booking with review reference
    booking.review = review._id;
    await booking.save();

    // Update provider statistics
    await updateProviderStats(booking.provider, booking.providerType);

    const populatedReview = await Review.findById(review._id)
      .populate('client', 'name avatar')
      .populate('booking', 'eventDetails');

    res.status(201).json({
      message: 'Review created successfully',
      review: populatedReview
    });
  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getReviews = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const reviews = await Review.find({ client: req.user._id })
      .populate('provider')
      .populate('booking', 'eventDetails')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Review.countDocuments({ client: req.user._id });

    res.json({
      reviews,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalResults: total
      }
    });
  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getReviewById = async (req, res) => {
  try {
    const { id } = req.params;

    const review = await Review.findById(id)
      .populate('client', 'name avatar')
      .populate('provider')
      .populate('booking', 'eventDetails');

    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    res.json({ review });
  } catch (error) {
    console.error('Get review error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { ratings, title, content, recommended } = req.body;

    const review = await Review.findOne({
      _id: id,
      client: req.user._id
    });

    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    // Check if review is older than 30 days (optional business rule)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    if (review.createdAt < thirtyDaysAgo) {
      return res.status(400).json({ 
        message: 'Reviews can only be edited within 30 days of creation' 
      });
    }

    review.ratings = ratings;
    review.title = title;
    review.content = content;
    review.recommended = recommended;

    await review.save();

    // Update provider statistics
    await updateProviderStats(review.provider, review.providerType);

    res.json({
      message: 'Review updated successfully',
      review
    });
  } catch (error) {
    console.error('Update review error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteReview = async (req, res) => {
  try {
    const { id } = req.params;

    const review = await Review.findOne({
      _id: id,
      client: req.user._id
    });

    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    await Review.findByIdAndDelete(id);

    // Update provider statistics
    await updateProviderStats(review.provider, review.providerType);

    res.json({ message: 'Review deleted successfully' });
  } catch (error) {
    console.error('Delete review error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const respondToReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { response } = req.body;

    // Find the provider's profile
    let providerProfile;
    if (req.user.role === 'photographer') {
      providerProfile = await Photographer.findOne({ user: req.user._id });
    } else if (req.user.role === 'videographer') {
      providerProfile = await Videographer.findOne({ user: req.user._id });
    }

    const review = await Review.findOne({
      _id: id,
      provider: providerProfile._id
    });

    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    if (review.response.content) {
      return res.status(400).json({ 
        message: 'Review already has a response' 
      });
    }

    review.response = {
      content: response,
      date: new Date(),
      respondedBy: req.user._id
    };

    await review.save();

    res.json({
      message: 'Response added successfully',
      review
    });
  } catch (error) {
    console.error('Respond to review error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const markHelpful = async (req, res) => {
  try {
    const { id } = req.params;

    const review = await Review.findById(id);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    // Check if user already marked as helpful
    const alreadyMarked = review.helpful.users.includes(req.user._id);
    
    if (alreadyMarked) {
      // Remove helpful mark
      review.helpful.users.pull(req.user._id);
      review.helpful.count -= 1;
    } else {
      // Add helpful mark
      review.helpful.users.push(req.user._id);
      review.helpful.count += 1;
    }

    await review.save();

    res.json({
      message: alreadyMarked ? 'Helpful mark removed' : 'Marked as helpful',
      helpfulCount: review.helpful.count,
      isMarkedHelpful: !alreadyMarked
    });
  } catch (error) {
    console.error('Mark helpful error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getProviderReviews = async (req, res) => {
  try {
    const { providerId, providerType } = req.params;
    const { page = 1, limit = 10, sortBy = 'recent' } = req.query;

    let sortOptions = {};
    switch (sortBy) {
      case 'recent':
        sortOptions = { createdAt: -1 };
        break;
      case 'oldest':
        sortOptions = { createdAt: 1 };
        break;
      case 'highest':
        sortOptions = { 'ratings.overall': -1 };
        break;
      case 'lowest':
        sortOptions = { 'ratings.overall': 1 };
        break;
      case 'helpful':
        sortOptions = { 'helpful.count': -1 };
        break;
      default:
        sortOptions = { createdAt: -1 };
    }

    const reviews = await Review.find({
      provider: providerId,
      providerType: providerType,
      isHidden: false
    })
      .populate('client', 'name avatar')
      .populate('booking', 'eventDetails')
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Review.countDocuments({
      provider: providerId,
      providerType: providerType,
      isHidden: false
    });

    res.json({
      reviews,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalResults: total
      }
    });
  } catch (error) {
    console.error('Get provider reviews error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getReviewStats = async (req, res) => {
  try {
    const { providerId, providerType } = req.params;

    const stats = await Review.aggregate([
      {
        $match: {
          provider: mongoose.Types.ObjectId(providerId),
          providerType: providerType,
          isHidden: false
        }
      },
      {
        $group: {
          _id: null,
          totalReviews: { $sum: 1 },
          averageRating: { $avg: '$ratings.overall' },
          averageQuality: { $avg: '$ratings.quality' },
          averageProfessionalism: { $avg: '$ratings.professionalism' },
          averageCommunication: { $avg: '$ratings.communication' },
          averageValue: { $avg: '$ratings.valueForMoney' },
          averageTimeliness: { $avg: '$ratings.timeliness' },
          recommendationCount: {
            $sum: { $cond: ['$recommended', 1, 0] }
          },
          fiveStarCount: {
            $sum: { $cond: [{ $eq: ['$ratings.overall', 5] }, 1, 0] }
          },
          fourStarCount: {
            $sum: { $cond: [{ $eq: ['$ratings.overall', 4] }, 1, 0] }
          },
          threeStarCount: {
            $sum: { $cond: [{ $eq: ['$ratings.overall', 3] }, 1, 0] }
          },
          twoStarCount: {
            $sum: { $cond: [{ $eq: ['$ratings.overall', 2] }, 1, 0] }
          },
          oneStarCount: {
            $sum: { $cond: [{ $eq: ['$ratings.overall', 1] }, 1, 0] }
          }
        }
      }
    ]);

    const result = stats[0] || {
      totalReviews: 0,
      averageRating: 0,
      recommendationCount: 0
    };

    if (result.totalReviews > 0) {
      result.recommendationPercentage = (result.recommendationCount / result.totalReviews) * 100;
    }

    res.json({ stats: result });
  } catch (error) {
    console.error('Get review stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
