// utils/analytics.js
import Booking from '../models/Booking.js';
import User from '../models/User.js';
import Photographer from '../models/Photographer.js';
import Videographer from '../models/Videographer.js';
import Review from '../models/Review.js';
import mongoose from 'mongoose';

// Get date ranges for analytics
export const getDateRanges = (period) => {
  const now = new Date();
  let start, end;

  switch (period) {
    case 'today':
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      break;
    case 'week':
      const weekStart = now.getDate() - now.getDay();
      start = new Date(now.getFullYear(), now.getMonth(), weekStart);
      end = new Date();
      break;
    case 'month':
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date();
      break;
    case 'quarter':
      const quarterStart = Math.floor(now.getMonth() / 3) * 3;
      start = new Date(now.getFullYear(), quarterStart, 1);
      end = new Date();
      break;
    case 'year':
      start = new Date(now.getFullYear(), 0, 1);
      end = new Date();
      break;
    case '7d':
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      end = new Date();
      break;
    case '30d':
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      end = new Date();
      break;
    case '90d':
      start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      end = new Date();
      break;
    default:
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      end = new Date();
  }

  return { start, end };
};

// User analytics
export const getUserAnalytics = async (period = '30d') => {
  const { start, end } = getDateRanges(period);

  try {
    // Total users by role
    const usersByRole = await User.aggregate([
      {
        $match: { isActive: true }
      },
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      }
    ]);

    // New user registrations over time
    const newUsersTrend = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
          isActive: true
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
      }
    ]);

    // User activity metrics
    const activeUsers = await User.countDocuments({
      lastLogin: { $gte: start },
      isActive: true
    });

    const totalUsers = await User.countDocuments({ isActive: true });

    return {
      usersByRole: usersByRole.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      newUsersTrend,
      activeUsers,
      totalUsers,
      activityRate: totalUsers > 0 ? (activeUsers / totalUsers * 100).toFixed(2) : 0
    };
  } catch (error) {
    console.error('User analytics error:', error);
    throw new Error('Failed to generate user analytics');
  }
};

// Booking analytics
export const getBookingAnalytics = async (period = '30d', providerId = null, providerType = null) => {
  const { start, end } = getDateRanges(period);

  try {
    let matchConditions = {
      createdAt: { $gte: start, $lte: end }
    };

    // Add provider-specific filters
    if (providerId) {
      matchConditions.provider = new mongoose.Types.ObjectId(providerId);
    }
    if (providerType) {
      matchConditions.providerType = providerType;
    }

    // Booking trends over time
    const bookingTrends = await Booking.aggregate([
      { $match: matchConditions },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          totalBookings: { $sum: 1 },
          totalRevenue: { $sum: '$pricing.totalAmount' },
          averageValue: { $avg: '$pricing.totalAmount' }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
      }
    ]);

    // Booking status distribution
    const bookingsByStatus = await Booking.aggregate([
      { $match: matchConditions },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          revenue: { $sum: '$pricing.totalAmount' }
        }
      }
    ]);

    // Popular event types
    const eventTypes = await Booking.aggregate([
      { $match: matchConditions },
      {
        $group: {
          _id: '$eventDetails.type',
          count: { $sum: 1 },
          averageValue: { $avg: '$pricing.totalAmount' },
          totalRevenue: { $sum: '$pricing.totalAmount' }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    // Revenue metrics
    const revenueMetrics = await Booking.aggregate([
      { $match: matchConditions },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$pricing.totalAmount' },
          averageBookingValue: { $avg: '$pricing.totalAmount' },
          totalBookings: { $sum: 1 },
          paidBookings: {
            $sum: {
              $cond: [
                { $in: ['$payment.status', ['paid', 'partial']] },
                1,
                0
              ]
            }
          },
          paidRevenue: {
            $sum: {
              $cond: [
                { $in: ['$payment.status', ['paid', 'partial']] },
                '$pricing.totalAmount',
                0
              ]
            }
          }
        }
      }
    ]);

    const metrics = revenueMetrics[0] || {
      totalRevenue: 0,
      averageBookingValue: 0,
      totalBookings: 0,
      paidBookings: 0,
      paidRevenue: 0
    };

    // Conversion rates
    const conversionRate = metrics.totalBookings > 0 ? 
      (metrics.paidBookings / metrics.totalBookings * 100).toFixed(2) : 0;

    return {
      bookingTrends,
      bookingsByStatus: bookingsByStatus.reduce((acc, item) => {
        acc[item._id] = { count: item.count, revenue: item.revenue };
        return acc;
      }, {}),
      eventTypes,
      revenueMetrics: {
        ...metrics,
        conversionRate: parseFloat(conversionRate)
      },
      period: { start, end }
    };
  } catch (error) {
    console.error('Booking analytics error:', error);
    throw new Error('Failed to generate booking analytics');
  }
};

// Provider performance analytics
export const getProviderPerformance = async (providerId, providerType, period = '30d') => {
  const { start, end } = getDateRanges(period);

  try {
    const matchConditions = {
      provider: new mongoose.Types.ObjectId(providerId),
      providerType,
      createdAt: { $gte: start, $lte: end }
    };

    // Booking performance
    const bookingPerformance = await Booking.aggregate([
      { $match: matchConditions },
      {
        $group: {
          _id: null,
          totalBookings: { $sum: 1 },
          completedBookings: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          cancelledBookings: {
            $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
          },
          totalRevenue: { $sum: '$pricing.totalAmount' },
          averageBookingValue: { $avg: '$pricing.totalAmount' }
        }
      }
    ]);

    // Review performance
    const reviewPerformance = await Review.aggregate([
      {
        $match: {
          provider: new mongoose.Types.ObjectId(providerId),
          providerType,
          createdAt: { $gte: start, $lte: end }
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
          recommendationCount: {
            $sum: { $cond: ['$recommended', 1, 0] }
          }
        }
      }
    ]);

    // Monthly trends
    const monthlyTrends = await Booking.aggregate([
      { $match: matchConditions },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          bookings: { $sum: 1 },
          revenue: { $sum: '$pricing.totalAmount' },
          completedBookings: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    const performance = bookingPerformance[0] || {
      totalBookings: 0,
      completedBookings: 0,
      cancelledBookings: 0,
      totalRevenue: 0,
      averageBookingValue: 0
    };

    const reviews = reviewPerformance[0] || {
      totalReviews: 0,
      averageRating: 0,
      averageQuality: 0,
      averageProfessionalism: 0,
      averageCommunication: 0,
      recommendationCount: 0
    };

    // Calculate completion rate
    const completionRate = performance.totalBookings > 0 ?
      (performance.completedBookings / performance.totalBookings * 100).toFixed(2) : 0;

    // Calculate recommendation rate
    const recommendationRate = reviews.totalReviews > 0 ?
      (reviews.recommendationCount / reviews.totalReviews * 100).toFixed(2) : 0;

    return {
      bookingPerformance: {
        ...performance,
        completionRate: parseFloat(completionRate)
      },
      reviewPerformance: {
        ...reviews,
        recommendationRate: parseFloat(recommendationRate)
      },
      monthlyTrends,
      period: { start, end }
    };
  } catch (error) {
    console.error('Provider performance analytics error:', error);
    throw new Error('Failed to generate provider performance analytics');
  }
};

// Platform-wide analytics
export const getPlatformAnalytics = async (period = '30d') => {
  const { start, end } = getDateRanges(period);

  try {
    // Platform growth metrics
    const growthMetrics = await Promise.all([
      // Total users
      User.countDocuments({ isActive: true }),
      // Active providers
      Photographer.countDocuments({ isActive: true, isApproved: true }) +
      Videographer.countDocuments({ isActive: true, isApproved: true }),
      // Total bookings
      Booking.countDocuments(),
      // Total revenue
      Booking.aggregate([
        {
          $match: { 'payment.status': { $in: ['paid', 'partial'] } }
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$pricing.totalAmount' }
          }
        }
      ])
    ]);

    // Geographic distribution
    const geographicDistribution = await Booking.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: '$eventDetails.location.city',
          bookings: { $sum: 1 },
          revenue: { $sum: '$pricing.totalAmount' }
        }
      },
      {
        $sort: { bookings: -1 }
      },
      {
        $limit: 10
      }
    ]);

    // Provider type comparison
    const providerComparison = await Booking.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: '$providerType',
          bookings: { $sum: 1 },
          revenue: { $sum: '$pricing.totalAmount' },
          averageValue: { $avg: '$pricing.totalAmount' }
        }
      }
    ]);

    // Peak booking times
    const peakTimes = await Booking.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: {
            dayOfWeek: { $dayOfWeek: '$eventDetails.date' },
            hour: { $hour: { $dateFromString: { dateString: '$eventDetails.startTime' } } }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    return {
      growthMetrics: {
        totalUsers: growthMetrics[0],
        activeProviders: growthMetrics,
        totalBookings: growthMetrics,
        totalRevenue: growthMetrics?.totalRevenue || 0
      },
      geographicDistribution,
      providerComparison: providerComparison.reduce((acc, item) => {
        acc[item._id] = {
          bookings: item.bookings,
          revenue: item.revenue,
          averageValue: item.averageValue
        };
        return acc;
      }, {}),
      peakTimes,
      period: { start, end }
    };
  } catch (error) {
    console.error('Platform analytics error:', error);
    throw new Error('Failed to generate platform analytics');
  }
};

// Revenue analytics with forecasting
export const getRevenueAnalytics = async (period = '30d') => {
  const { start, end } = getDateRanges(period);

  try {
    // Historical revenue data
    const revenueHistory = await Booking.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
          'payment.status': { $in: ['paid', 'partial'] }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            week: { $week: '$createdAt' }
          },
          revenue: { $sum: '$pricing.totalAmount' },
          bookings: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1, '_id.week': 1 }
      }
    ]);

    // Revenue by provider type
    const revenueByProviderType = await Booking.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
          'payment.status': { $in: ['paid', 'partial'] }
        }
      },
      {
        $group: {
          _id: '$providerType',
          revenue: { $sum: '$pricing.totalAmount' },
          bookings: { $sum: 1 },
          averageValue: { $avg: '$pricing.totalAmount' }
        }
      }
    ]);

    // Revenue forecasting (simple linear projection)
    const forecastRevenue = (history) => {
      if (history.length < 2) return null;

      const revenues = history.map(item => item.revenue);
      const n = revenues.length;
      const sumX = n * (n + 1) / 2;
      const sumY = revenues.reduce((a, b) => a + b, 0);
      const sumXY = revenues.reduce((sum, revenue, index) => sum + revenue * (index + 1), 0);
      const sumXX = n * (n + 1) * (2 * n + 1) / 6;

      const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
      const intercept = (sumY - slope * sumX) / n;

      // Project next period
      const nextRevenue = slope * (n + 1) + intercept;
      return Math.max(0, nextRevenue);
    };

    const projectedRevenue = forecastRevenue(revenueHistory);

    return {
      revenueHistory,
      revenueByProviderType: revenueByProviderType.reduce((acc, item) => {
        acc[item._id] = {
          revenue: item.revenue,
          bookings: item.bookings,
          averageValue: item.averageValue
        };
        return acc;
      }, {}),
      projectedRevenue,
      period: { start, end }
    };
  } catch (error) {
    console.error('Revenue analytics error:', error);
    throw new Error('Failed to generate revenue analytics');
  }
};

// Export all analytics functions
export default {
  getDateRanges,
  getUserAnalytics,
  getBookingAnalytics,
  getProviderPerformance,
  getPlatformAnalytics,
  getRevenueAnalytics
};
