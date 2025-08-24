// controllers/photographerController.js
import Photographer from '../models/Photographer.js';
import TeamMember from '../models/TeamMember.js';
import Equipment from '../models/Equipment.js';
import Booking from '../models/Booking.js';
import { calculateAvailability } from '../utils/availabilityChecker.js';
import mongoose from 'mongoose';

export const getPhotographers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      city,
      specialization,
      minRating,
      maxPrice,
      sortBy = 'rating',
      availability
    } = req.query;

    const query = { isActive: true, isApproved: true };

    // Search filter
    if (search) {
      query.$or = [
        { businessName: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Location filter
    if (city) {
      query['location.city'] = { $regex: city, $options: 'i' };
    }

    // Specialization filter
    if (specialization) {
      query.specializations = specialization;
    }

    // Rating filter
    if (minRating) {
      query['ratings.average'] = { $gte: parseFloat(minRating) };
    }

    // Price filter
    if (maxPrice) {
      query['pricing.hourly'] = { $lte: parseFloat(maxPrice) };
    }

    // Sort options
    const sortOptions = {};
    switch (sortBy) {
      case 'rating':
        sortOptions['ratings.average'] = -1;
        break;
      case 'price':
        sortOptions['pricing.hourly'] = 1;
        break;
      case 'experience':
        sortOptions.experience = -1;
        break;
      case 'popular':
        sortOptions['analytics.profileViews'] = -1;
        break;
      default:
        sortOptions.createdAt = -1;
    }

    const photographers = await Photographer.find(query)
      .populate('user', 'name email avatar')
      .populate('teamMembers')
      .populate('equipment')
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Filter by availability if requested
    let filteredPhotographers = photographers;
    if (availability) {
      const availabilityDate = new Date(availability);
      filteredPhotographers = photographers.filter(photographer => {
        return calculateAvailability(photographer, availabilityDate);
      });
    }

    const total = await Photographer.countDocuments(query);

    res.json({
      photographers: filteredPhotographers,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalResults: total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get photographers error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getPhotographerById = async (req, res) => {
  try {
    const { id } = req.params;

    const photographer = await Photographer.findById(id)
      .populate('user', 'name email avatar phone')
      .populate('teamMembers')
      .populate('equipment')
      .populate({
        path: 'reviews',
        populate: {
          path: 'client',
          select: 'name avatar'
        }
      });

    // Add this temporary debug code in your controller
    console.log('Searching for photographer with ID:', id);

    // Check if any photographers exist at all
    const totalPhotographers = await Photographer.countDocuments();
    console.log('Total photographers in database:', totalPhotographers);

    // List all photographer IDs
    const allPhotographers = await Photographer.find({}, '_id businessName');
    console.log('All photographers:', allPhotographers);


    if (!photographer || !photographer.isActive) {
      return res.status(404).json({ message: 'Photographer not found' });
    }

    // Increment profile views
    photographer.analytics.profileViews += 1;
    await photographer.save();

    res.json({ photographer });
  } catch (error) {
    console.error('Get photographer error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getPhotographerByUserId = async (req, res) => {
  try {
    const { userId } = req.params;
    console.log('Looking for photographer with user ID:', userId);

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user ID format' });
    }

    const photographer = await Photographer.findOne({ user: userId })
      .populate('user', 'name email avatar phone')
      .populate('teamMembers')
      .populate('equipment');

    if (!photographer || !photographer.isActive) {
      return res.status(404).json({ message: 'Photographer profile not found for this user' });
    }

    // Increment profile views
    photographer.analytics.profileViews += 1;
    await photographer.save();

    res.json({ photographer });
  } catch (error) {
    console.error('Get photographer by user ID error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updatePhotographer = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const photographer = await Photographer.findOneAndUpdate(
      { user: id },
      updates,
      { new: true, runValidators: true }
    ).populate('user', 'name email avatar');

    if (!photographer) {
      return res.status(404).json({ message: 'Photographer profile not found' });
    }

    res.json({
      message: 'Profile updated successfully',
      photographer
    });
  } catch (error) {
    console.error('Update photographer error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const addTeamMember = async (req, res) => {
  try {
    const { id } = req.params;
    const teamMemberData = req.body;

    const photographer = await Photographer.findOne({ user: id });
    if (!photographer) {
      return res.status(404).json({ message: 'Photographer profile not found' });
    }

    const teamMember = new TeamMember({
      ...teamMemberData,
      owner: photographer._id,
      ownerType: 'Photographer'
    });

    await teamMember.save();

    photographer.teamMembers.push(teamMember._id);
    await photographer.save();

    res.status(201).json({
      message: 'Team member added successfully',
      teamMember
    });
  } catch (error) {
    console.error('Add team member error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateTeamMember = async (req, res) => {
  try {
    const { id, memberId } = req.params;
    const updates = req.body;

    const photographer = await Photographer.findOne({ user: id });
    if (!photographer) {
      return res.status(404).json({ message: 'Photographer profile not found' });
    }

    const teamMember = await TeamMember.findOneAndUpdate(
      { _id: memberId, owner: photographer._id },
      updates,
      { new: true, runValidators: true }
    );

    if (!teamMember) {
      return res.status(404).json({ message: 'Team member not found' });
    }

    res.json({
      message: 'Team member updated successfully',
      teamMember
    });
  } catch (error) {
    console.error('Update team member error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getTeamAvailability = async (req, res) => {
  try {
    const { id } = req.params;
    const { date, duration } = req.query;

    const photographer = await Photographer.findById(id).populate('teamMembers');
    if (!photographer) {
      return res.status(404).json({ message: 'Photographer not found' });
    }

    const requestedDate = new Date(date);
    const requiredHours = parseInt(duration) || 4;

    // Get all bookings for that date
    const existingBookings = await Booking.find({
      provider: photographer._id,
      'eventDetails.date': {
        $gte: new Date(requestedDate.toDateString()),
        $lt: new Date(requestedDate.getTime() + 24 * 60 * 60 * 1000)
      },
      status: { $in: ['confirmed', 'in_progress'] }
    }).populate('teamAssignment.teamMembers.member');

    // Calculate available team members
    const availableMembers = photographer.teamMembers.filter(member => {
      if (!member.isActive) return false;

      // Check if member is already booked
      const isBooked = existingBookings.some(booking =>
        booking.teamAssignment.teamMembers.some(assigned =>
          assigned.member.toString() === member._id.toString()
        )
      );

      return !isBooked;
    });

    // Calculate capacity
    const totalCapacity = photographer.teamMembers.length;
    const availableCapacity = availableMembers.length;
    const bookedCapacity = totalCapacity - availableCapacity;

    res.json({
      date: requestedDate,
      availability: {
        totalTeamMembers: totalCapacity,
        availableTeamMembers: availableCapacity,
        bookedTeamMembers: bookedCapacity,
        canAcceptBooking: availableCapacity > 0,
        availableMembers: availableMembers.map(member => ({
          id: member._id,
          name: member.name,
          role: member.role,
          specializations: member.specializations
        }))
      }
    });
  } catch (error) {
    console.error('Get team availability error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getDashboardStats = async (req, res) => {
  try {
    const photographer = await Photographer.findOne({ user: req.user._id });
    if (!photographer) {
      return res.status(404).json({ message: 'Photographer profile not found' });
    }

    const currentDate = new Date();
    const currentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const lastMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);

    // Get bookings statistics
    const totalBookings = await Booking.countDocuments({
      provider: photographer._id,
      providerType: 'Photographer'
    });

    const monthlyBookings = await Booking.countDocuments({
      provider: photographer._id,
      providerType: 'Photographer',
      createdAt: { $gte: currentMonth }
    });

    const completedBookings = await Booking.countDocuments({
      provider: photographer._id,
      providerType: 'Photographer',
      status: 'completed'
    });

    const pendingBookings = await Booking.countDocuments({
      provider: photographer._id,
      providerType: 'Photographer',
      status: 'pending'
    });

    // Calculate revenue
    const revenueData = await Booking.aggregate([
      {
        $match: {
          provider: photographer._id,
          providerType: 'Photographer',
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

    // Upcoming bookings
    const upcomingBookings = await Booking.find({
      provider: photographer._id,
      providerType: 'Photographer',
      'eventDetails.date': { $gte: new Date() },
      status: { $in: ['confirmed', 'pending'] }
    }).sort({ 'eventDetails.date': 1 }).limit(5).populate('client', 'name email');

    res.json({
      stats: {
        totalBookings,
        monthlyBookings,
        completedBookings,
        pendingBookings,
        totalRevenue: revenue.totalRevenue,
        monthlyRevenue: revenue.monthlyRevenue,
        profileViews: photographer.analytics.profileViews,
        averageRating: photographer.ratings.average,
        totalReviews: photographer.ratings.totalReviews
      },
      upcomingBookings,
      teamStats: {
        totalMembers: photographer.teamMembers.length,
        activeMembers: await TeamMember.countDocuments({
          owner: photographer._id,
          isActive: true
        })
      },
      equipmentStats: {
        totalEquipment: photographer.equipment.length,
        availableEquipment: await Equipment.countDocuments({
          owner: photographer._id,
          isAvailable: true
        })
      }
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
