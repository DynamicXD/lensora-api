// controllers/adminController.js
import User from '../models/User.js';
import Photographer from '../models/Photographer.js';
import Videographer from '../models/Videographer.js';
import Booking from '../models/Booking.js';
import Review from '../models/Review.js';
import { sendEmail } from '../utils/emailService.js';

export const getDashboardStats = async (req, res) => {
  try {
    const currentDate = new Date();
    const currentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const lastMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);

    // User statistics
    const totalUsers = await User.countDocuments({ isActive: true });
    const newUsersThisMonth = await User.countDocuments({
      createdAt: { $gte: currentMonth },
      isActive: true
    });

    // Provider statistics
    const totalPhotographers = await Photographer.countDocuments({ isActive: true });
    const totalVideographers = await Videographer.countDocuments({ isActive: true });
    const pendingApprovals = await Photographer.countDocuments({ isApproved: false }) +
                           await Videographer.countDocuments({ isApproved: false });

    // Booking statistics
    const totalBookings = await Booking.countDocuments();
    const monthlyBookings = await Booking.countDocuments({
      createdAt: { $gte: currentMonth }
    });
    const pendingBookings = await Booking.countDocuments({ status: 'pending' });

    // Revenue statistics
    const revenueData = await Booking.aggregate([
      {
        $match: {
          'payment.status': { $in: ['paid', 'partial'] }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$pricing.totalAmount' },
          monthlyRevenue: {
            $sum: {
              $cond: [
                { $gte: ['$createdAt', currentMonth] },
                '$pricing.totalAmount',
                0
              ]
            }
          }
        }
      }
    ]);

    const revenue = revenueData[0] || { totalRevenue: 0, monthlyRevenue: 0 };

    // Review statistics
    const totalReviews = await Review.countDocuments();
    const averageRatingData = await Review.aggregate([
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$ratings.overall' }
        }
      }
    ]);

    res.json({
      users: {
        total: totalUsers,
        newThisMonth: newUsersThisMonth
      },
      providers: {
        photographers: totalPhotographers,
        videographers: totalVideographers,
        pendingApprovals
      },
      bookings: {
        total: totalBookings,
        monthly: monthlyBookings,
        pending: pendingBookings
      },
      revenue: {
        total: revenue.totalRevenue,
        monthly: revenue.monthlyRevenue
      },
      reviews: {
        total: totalReviews,
        averageRating: averageRatingData[0]?.averageRating || 0
      }
    });
  } catch (error) {
    console.error('Get admin dashboard stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, role, status } = req.query;
    
    const query = {};
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (role) {
      query.role = role;
    }
    
    if (status) {
      query.isActive = status === 'active';
    }

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(query);

    res.json({
      users,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalResults: total
      }
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await User.findById(id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get additional data based on role
    let additionalData = {};
    
    if (user.role === 'photographer') {
      additionalData.profile = await Photographer.findOne({ user: id });
    } else if (user.role === 'videographer') {
      additionalData.profile = await Videographer.findOne({ user: id });
    }

    // Get booking statistics
    const bookingStats = await Booking.aggregate([
      {
        $match: {
          $or: [
            { client: user._id },
            { provider: additionalData.profile?._id }
          ]
        }
      },
      {
        $group: {
          _id: null,
          totalBookings: { $sum: 1 },
          totalSpent: {
            $sum: {
              $cond: [
                { $eq: ['$client', user._id] },
                '$pricing.totalAmount',
                0
              ]
            }
          },
          totalEarned: {
            $sum: {
              $cond: [
                { $eq: ['$provider', additionalData.profile?._id] },
                '$pricing.totalAmount',
                0
              ]
            }
          }
        }
      }
    ]);

    additionalData.bookingStats = bookingStats[0] || {
      totalBookings: 0,
      totalSpent: 0,
      totalEarned: 0
    };

    res.json({
      user,
      ...additionalData
    });
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive, reason } = req.body;

    const user = await User.findByIdAndUpdate(
      id,
      { isActive },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Send notification email
    if (!isActive) {
      await sendEmail({
        to: user.email,
        subject: 'Account Status Update',
        html: `
          <h2>Account Status Update</h2>
          <p>Hello ${user.name},</p>
          <p>Your account has been suspended.</p>
          ${reason ? `<p>Reason: ${reason}</p>` : ''}
          <p>Please contact support for more information.</p>
        `
      });
    }

    res.json({
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      user
    });
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Check for active bookings
    const activeBookings = await Booking.countDocuments({
      $or: [
        { client: id },
        { provider: id }
      ],
      status: { $in: ['confirmed', 'in_progress'] }
    });

    if (activeBookings > 0) {
      return res.status(400).json({
        message: 'Cannot delete user with active bookings'
      });
    }

    // Soft delete by deactivating
    const user = await User.findByIdAndUpdate(
      id,
      { 
        isActive: false,
        email: `deleted_${Date.now()}_${user.email}`
      }
    );

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getAllPhotographers = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, approved } = req.query;
    
    const query = {};
    
    if (status) {
      query.isActive = status === 'active';
    }
    
    if (approved !== undefined) {
      query.isApproved = approved === 'true';
    }

    const photographers = await Photographer.find(query)
      .populate('user', 'name email createdAt')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Photographer.countDocuments(query);

    res.json({
      photographers,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalResults: total
      }
    });
  } catch (error) {
    console.error('Get all photographers error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getAllVideographers = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, approved } = req.query;
    
    const query = {};
    
    if (status) {
      query.isActive = status === 'active';
    }
    
    if (approved !== undefined) {
      query.isApproved = approved === 'true';
    }

    const videographers = await Videographer.find(query)
      .populate('user', 'name email createdAt')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Videographer.countDocuments(query);

    res.json({
      videographers,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalResults: total
      }
    });
  } catch (error) {
    console.error('Get all videographers error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const approveProvider = async (req, res) => {
  try {
    const { id, type } = req.params;
    const { approved, reason } = req.body;

    const Model = type === 'photographer' ? Photographer : Videographer;
    const provider = await Model.findByIdAndUpdate(
      id,
      { isApproved: approved },
      { new: true }
    ).populate('user', 'name email');

    if (!provider) {
      return res.status(404).json({ message: 'Provider not found' });
    }

    // Send notification email
    await sendEmail({
      to: provider.user.email,
      subject: `Profile ${approved ? 'Approved' : 'Rejected'}`,
      html: `
        <h2>Profile Status Update</h2>
        <p>Hello ${provider.user.name},</p>
        <p>Your ${type} profile has been ${approved ? 'approved' : 'rejected'}.</p>
        ${reason ? `<p>Reason: ${reason}</p>` : ''}
        ${approved ? '<p>You can now start receiving bookings!</p>' : '<p>Please review and update your profile.</p>'}
      `
    });

    res.json({
      message: `Provider ${approved ? 'approved' : 'rejected'} successfully`,
      provider
    });
  } catch (error) {
    console.error('Approve provider error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const rejectProvider = async (req, res) => {
  try {
    const { id, type } = req.params;
    const { reason } = req.body;

    await approveProvider(req, res);
  } catch (error) {
    console.error('Reject provider error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getAllBookings = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, providerType } = req.query;
    
    const query = {};
    
    if (status) {
      query.status = status;
    }
    
    if (providerType) {
      query.providerType = providerType;
    }

    const bookings = await Booking.find(query)
      .populate('client', 'name email')
      .populate('provider', 'businessName')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Booking.countDocuments(query);

    res.json({
      bookings,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalResults: total
      }
    });
  } catch (error) {
    console.error('Get all bookings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getBookingById = async (req, res) => {
  try {
    const { id } = req.params;

    const booking = await Booking.findById(id)
      .populate('client', 'name email avatar phone')
      .populate('provider')
      .populate('teamAssignment.teamMembers.member')
      .populate('review');

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    res.json({ booking });
  } catch (error) {
    console.error('Get booking by ID error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateBookingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;

    const booking = await Booking.findByIdAndUpdate(
      id,
      { 
        status,
        $push: {
          communication: {
            from: req.user._id,
            message: reason || `Status updated to ${status} by admin`,
            type: 'status_update'
          }
        }
      },
      { new: true }
    ).populate('client', 'name email')
     .populate('provider');

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    res.json({
      message: 'Booking status updated successfully',
      booking
    });
  } catch (error) {
    console.error('Update booking status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getAllReviews = async (req, res) => {
  try {
    const { page = 1, limit = 20, rating, providerType, hidden } = req.query;
    
    const query = {};
    
    if (rating) {
      query['ratings.overall'] = parseInt(rating);
    }
    
    if (providerType) {
      query.providerType = providerType;
    }
    
    if (hidden !== undefined) {
      query.isHidden = hidden === 'true';
    }

    const reviews = await Review.find(query)
      .populate('client', 'name email')
      .populate('provider', 'businessName')
      .populate('booking', 'eventDetails')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Review.countDocuments(query);

    res.json({
      reviews,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalResults: total
      }
    });
  } catch (error) {
    console.error('Get all reviews error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const hideReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const review = await Review.findByIdAndUpdate(
      id,
      { isHidden: true },
      { new: true }
    );

    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    res.json({
      message: 'Review hidden successfully',
      review
    });
  } catch (error) {
    console.error('Hide review error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const unhideReview = async (req, res) => {
  try {
    const { id } = req.params;

    const review = await Review.findByIdAndUpdate(
      id,
      { isHidden: false },
      { new: true }
    );

    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    res.json({
      message: 'Review unhidden successfully',
      review
    });
  } catch (error) {
    console.error('Unhide review error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getAnalytics = async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    
    let dateFilter = {};
    const now = new Date();
    
    switch (period) {
      case '7d':
        dateFilter = { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) };
        break;
      case '30d':
        dateFilter = { $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) };
        break;
      case '90d':
        dateFilter = { $gte: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000) };
        break;
      case '1y':
        dateFilter = { $gte: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000) };
        break;
    }

    // User growth analytics
    const userGrowth = await User.aggregate([
      {
        $match: {
          createdAt: dateFilter
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
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    // Booking analytics
    const bookingAnalytics = await Booking.aggregate([
      {
        $match: {
          createdAt: dateFilter
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          totalBookings: { $sum: 1 },
          totalRevenue: { $sum: '$pricing.totalAmount' },
          averageBookingValue: { $avg: '$pricing.totalAmount' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    // Provider type distribution
    const providerDistribution = await Booking.aggregate([
      {
        $match: {
          createdAt: dateFilter
        }
      },
      {
        $group: {
          _id: '$providerType',
          count: { $sum: 1 },
          revenue: { $sum: '$pricing.totalAmount' }
        }
      }
    ]);

    res.json({
      period,
      userGrowth,
      bookingAnalytics,
      providerDistribution
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getRevenueStats = async (req, res) => {
  try {
    const { period = 'monthly' } = req.query;
    
    let groupBy = {};
    
    switch (period) {
      case 'daily':
        groupBy = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' }
        };
        break;
      case 'weekly':
        groupBy = {
          year: { $year: '$createdAt' },
          week: { $week: '$createdAt' }
        };
        break;
      case 'monthly':
        groupBy = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' }
        };
        break;
      case 'yearly':
        groupBy = {
          year: { $year: '$createdAt' }
        };
        break;
    }

    const revenueStats = await Booking.aggregate([
      {
        $match: {
          'payment.status': { $in: ['paid', 'partial'] }
        }
      },
      {
        $group: {
          _id: groupBy,
          totalRevenue: { $sum: '$pricing.totalAmount' },
          bookingCount: { $sum: 1 },
          averageBookingValue: { $avg: '$pricing.totalAmount' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.week': 1 } }
    ]);

    res.json({
      period,
      revenueStats
    });
  } catch (error) {
    console.error('Get revenue stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const exportData = async (req, res) => {
  try {
    const { type } = req.params;
    const { format = 'csv', dateFrom, dateTo } = req.body;

    let data = [];
    let filename = '';

    const dateFilter = {};
    if (dateFrom) dateFilter.$gte = new Date(dateFrom);
    if (dateTo) dateFilter.$lte = new Date(dateTo);

    switch (type) {
      case 'users':
        data = await User.find(dateFilter ? { createdAt: dateFilter } : {})
          .select('name email role createdAt isActive')
          .lean();
        filename = `users_export_${Date.now()}.${format}`;
        break;
      
      case 'bookings':
        data = await Booking.find(dateFilter ? { createdAt: dateFilter } : {})
          .populate('client', 'name email')
          .populate('provider', 'businessName')
          .lean();
        filename = `bookings_export_${Date.now()}.${format}`;
        break;
      
      case 'reviews':
        data = await Review.find(dateFilter ? { createdAt: dateFilter } : {})
          .populate('client', 'name')
          .populate('provider', 'businessName')
          .lean();
        filename = `reviews_export_${Date.now()}.${format}`;
        break;
      
      default:
        return res.status(400).json({ message: 'Invalid export type' });
    }

    if (format === 'csv') {
      // Convert to CSV format
      const csvData = convertToCSV(data);
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
      res.send(csvData);
    } else {
      res.json({
        data,
        filename,
        exportedAt: new Date(),
        totalRecords: data.length
      });
    }
  } catch (error) {
    console.error('Export data error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const sendBulkNotification = async (req, res) => {
  try {
    const { recipients, subject, message, type = 'email' } = req.body;

    let users = [];

    if (recipients === 'all') {
      users = await User.find({ isActive: true });
    } else if (recipients === 'photographers') {
      const photographers = await Photographer.find({ isActive: true }).populate('user');
      users = photographers.map(p => p.user);
    } else if (recipients === 'videographers') {
      const videographers = await Videographer.find({ isActive: true }).populate('user');
      users = videographers.map(v => v.user);
    } else if (Array.isArray(recipients)) {
      users = await User.find({ _id: { $in: recipients } });
    }

    // Send notifications
    const promises = users.map(user => 
      sendEmail({
        to: user.email,
        subject,
        html: `
          <h2>${subject}</h2>
          <p>Hello ${user.name},</p>
          <div>${message}</div>
          <p>Best regards,<br>Photography Booking Team</p>
        `
      })
    );

    await Promise.all(promises);

    res.json({
      message: 'Bulk notification sent successfully',
      sentTo: users.length
    });
  } catch (error) {
    console.error('Send bulk notification error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const manageSubscriptions = async (req, res) => {
  try {
    // This would integrate with a payment system like Stripe
    // For now, return subscription management data
    
    const subscriptions = await Photographer.aggregate([
      {
        $group: {
          _id: '$subscription.plan',
          count: { $sum: 1 }
        }
      }
    ]);

    const videographerSubscriptions = await Videographer.aggregate([
      {
        $group: {
          _id: '$subscription.plan',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      photographers: subscriptions,
      videographers: videographerSubscriptions
    });
  } catch (error) {
    console.error('Manage subscriptions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Helper function to convert data to CSV
const convertToCSV = (data) => {
  if (!data.length) return '';
  
  const headers = Object.keys(data[0]).join(',');
  const rows = data.map(row => 
    Object.values(row).map(value => 
      typeof value === 'string' ? `"${value}"` : value
    ).join(',')
  );
  
  return [headers, ...rows].join('\n');
};
