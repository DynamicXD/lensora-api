// controllers/videographerController.js
import Videographer from '../models/Videographer.js';
import TeamMember from '../models/TeamMember.js';
import Equipment from '../models/Equipment.js';
import Booking from '../models/Booking.js';
import { uploadVideo, uploadImage, deleteFile, generateVideoThumbnail } from '../config/cloudinary.js';
import { calculateAvailability } from '../utils/availabilityChecker.js';

export const getVideographers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      city,
      specialization,
      minRating,
      maxPrice,
      sortBy = 'rating'
    } = req.query;

    const query = { isActive: true, isApproved: true };

    // Apply filters (same logic as photographers)
    if (search) {
      query.$or = [
        { businessName: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    if (city) {
      query['location.city'] = { $regex: city, $options: 'i' };
    }

    if (specialization) {
      query.specializations = specialization;
    }

    if (minRating) {
      query['ratings.average'] = { $gte: parseFloat(minRating) };
    }

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
      default:
        sortOptions.createdAt = -1;
    }

    const videographers = await Videographer.find(query)
      .populate('user', 'name email avatar')
      .populate('teamMembers')
      .sort(sortOptions)
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
    console.error('Get videographers error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getVideographerById = async (req, res) => {
  try {
    const { id } = req.params;

    const videographer = await Videographer.findById(id)
      .populate('user', 'name email avatar phone')
      .populate('teamMembers')
      .populate('equipment');

    if (!videographer || !videographer.isActive) {
      return res.status(404).json({ message: 'Videographer not found' });
    }

    // Increment profile views
    videographer.analytics.profileViews += 1;
    await videographer.save();

    res.json({ videographer });
  } catch (error) {
    console.error('Get videographer error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateVideographer = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const videographer = await Videographer.findOneAndUpdate(
      { _id: id, user: req.user._id },
      updates,
      { new: true, runValidators: true }
    ).populate('user', 'name email avatar');

    if (!videographer) {
      return res.status(404).json({ message: 'Videographer profile not found' });
    }

    res.json({ 
      message: 'Profile updated successfully',
      videographer 
    });
  } catch (error) {
    console.error('Update videographer error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const uploadPortfolioVideo = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, category } = req.body;

    const videographer = await Videographer.findOne({ _id: id, user: req.user._id });
    if (!videographer) {
      return res.status(404).json({ message: 'Videographer profile not found' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No video file provided' });
    }

    // Upload video to Cloudinary
    const uploadResult = await uploadVideo(req.file, 'videographer-portfolio');
    
    // Generate thumbnail
    const thumbnailUrl = generateVideoThumbnail(uploadResult.publicId);

    const portfolioItem = {
      title,
      description,
      videoUrl: uploadResult.url,
      thumbnailUrl,
      category,
      duration: uploadResult.duration,
      featured: false
    };

    videographer.portfolio.push(portfolioItem);
    await videographer.save();

    res.json({
      message: 'Portfolio video uploaded successfully',
      portfolioItem
    });
  } catch (error) {
    console.error('Upload portfolio video error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const deletePortfolioVideo = async (req, res) => {
  try {
    const { id, portfolioId } = req.params;

    const videographer = await Videographer.findOne({ _id: id, user: req.user._id });
    if (!videographer) {
      return res.status(404).json({ message: 'Videographer profile not found' });
    }

    const portfolioItem = videographer.portfolio.id(portfolioId);
    if (!portfolioItem) {
      return res.status(404).json({ message: 'Portfolio item not found' });
    }

    // Delete from Cloudinary
    const publicId = portfolioItem.videoUrl.split('/').pop().split('.')[0];
    await deleteFile(publicId);

    videographer.portfolio.pull(portfolioId);
    await videographer.save();

    res.json({ message: 'Portfolio video deleted successfully' });
  } catch (error) {
    console.error('Delete portfolio video error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const addTeamMember = async (req, res) => {
  try {
    const { id } = req.params;
    const teamMemberData = req.body;

    const videographer = await Videographer.findOne({ _id: id, user: req.user._id });
    if (!videographer) {
      return res.status(404).json({ message: 'Videographer profile not found' });
    }

    const teamMember = new TeamMember({
      ...teamMemberData,
      owner: videographer._id,
      ownerType: 'Videographer'
    });

    await teamMember.save();

    videographer.teamMembers.push(teamMember._id);
    await videographer.save();

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

    const videographer = await Videographer.findOne({ _id: id, user: req.user._id });
    if (!videographer) {
      return res.status(404).json({ message: 'Videographer profile not found' });
    }

    const teamMember = await TeamMember.findOneAndUpdate(
      { _id: memberId, owner: videographer._id },
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

export const deleteTeamMember = async (req, res) => {
  try {
    const { id, memberId } = req.params;

    const videographer = await Videographer.findOne({ _id: id, user: req.user._id });
    if (!videographer) {
      return res.status(404).json({ message: 'Videographer profile not found' });
    }

    await TeamMember.findOneAndDelete({ _id: memberId, owner: videographer._id });
    
    videographer.teamMembers.pull(memberId);
    await videographer.save();

    res.json({ message: 'Team member deleted successfully' });
  } catch (error) {
    console.error('Delete team member error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const addEquipment = async (req, res) => {
  try {
    const { id } = req.params;
    const equipmentData = req.body;

    const videographer = await Videographer.findOne({ _id: id, user: req.user._id });
    if (!videographer) {
      return res.status(404).json({ message: 'Videographer profile not found' });
    }

    // Handle image uploads
    let images = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const uploadResult = await uploadImage(file, 'equipment');
        images.push(uploadResult.url);
      }
    }

    const equipment = new Equipment({
      ...equipmentData,
      images,
      owner: videographer._id,
      ownerType: 'Videographer'
    });

    await equipment.save();

    videographer.equipment.push(equipment._id);
    await videographer.save();

    res.status(201).json({
      message: 'Equipment added successfully',
      equipment
    });
  } catch (error) {
    console.error('Add equipment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateEquipment = async (req, res) => {
  try {
    const { id, equipmentId } = req.params;
    const updates = req.body;

    const videographer = await Videographer.findOne({ _id: id, user: req.user._id });
    if (!videographer) {
      return res.status(404).json({ message: 'Videographer profile not found' });
    }

    const equipment = await Equipment.findOneAndUpdate(
      { _id: equipmentId, owner: videographer._id },
      updates,
      { new: true, runValidators: true }
    );

    if (!equipment) {
      return res.status(404).json({ message: 'Equipment not found' });
    }

    res.json({
      message: 'Equipment updated successfully',
      equipment
    });
  } catch (error) {
    console.error('Update equipment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteEquipment = async (req, res) => {
  try {
    const { id, equipmentId } = req.params;

    const videographer = await Videographer.findOne({ _id: id, user: req.user._id });
    if (!videographer) {
      return res.status(404).json({ message: 'Videographer profile not found' });
    }

    const equipment = await Equipment.findOne({ _id: equipmentId, owner: videographer._id });
    if (!equipment) {
      return res.status(404).json({ message: 'Equipment not found' });
    }

    // Delete images from Cloudinary
    for (const imageUrl of equipment.images) {
      const publicId = imageUrl.split('/').pop().split('.')[0];
      await deleteFile(publicId);
    }

    await Equipment.findByIdAndDelete(equipmentId);
    
    videographer.equipment.pull(equipmentId);
    await videographer.save();

    res.json({ message: 'Equipment deleted successfully' });
  } catch (error) {
    console.error('Delete equipment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateAvailability = async (req, res) => {
  try {
    const { id } = req.params;
    const { workingHours, blackoutDates } = req.body;

    const videographer = await Videographer.findOneAndUpdate(
      { _id: id, user: req.user._id },
      {
        'availability.workingHours': workingHours,
        'availability.blackoutDates': blackoutDates
      },
      { new: true, runValidators: true }
    );

    if (!videographer) {
      return res.status(404).json({ message: 'Videographer profile not found' });
    }

    res.json({
      message: 'Availability updated successfully',
      availability: videographer.availability
    });
  } catch (error) {
    console.error('Update availability error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getTeamAvailability = async (req, res) => {
  try {
    const { id } = req.params;
    const { date, duration } = req.query;

    const videographer = await Videographer.findById(id).populate('teamMembers');
    if (!videographer) {
      return res.status(404).json({ message: 'Videographer not found' });
    }

    const requestedDate = new Date(date);

    // Get existing bookings for that date
    const existingBookings = await Booking.find({
      provider: videographer._id,
      'eventDetails.date': {
        $gte: new Date(requestedDate.toDateString()),
        $lt: new Date(requestedDate.getTime() + 24 * 60 * 60 * 1000)
      },
      status: { $in: ['confirmed', 'in_progress'] }
    }).populate('teamAssignment.crewAssigned');

    // Calculate available crew members
    const availableMembers = videographer.teamMembers.filter(member => {
      if (!member.isActive) return false;

      const isBooked = existingBookings.some(booking => 
        booking.teamAssignment.crewAssigned.some(assigned => 
          assigned.toString() === member._id.toString()
        )
      );

      return !isBooked;
    });

    const totalCapacity = videographer.teamMembers.length;
    const availableCapacity = availableMembers.length;

    res.json({
      date: requestedDate,
      availability: {
        totalCrewMembers: totalCapacity,
        availableCrewMembers: availableCapacity,
        bookedCrewMembers: totalCapacity - availableCapacity,
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
    const videographer = await Videographer.findOne({ user: req.user._id });
    if (!videographer) {
      return res.status(404).json({ message: 'Videographer profile not found' });
    }

    const currentDate = new Date();
    const currentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);

    // Get bookings statistics
    const totalBookings = await Booking.countDocuments({
      provider: videographer._id,
      providerType: 'Videographer'
    });

    const monthlyBookings = await Booking.countDocuments({
      provider: videographer._id,
      providerType: 'Videographer',
      createdAt: { $gte: currentMonth }
    });

    const completedBookings = await Booking.countDocuments({
      provider: videographer._id,
      providerType: 'Videographer',
      status: 'completed'
    });

    const pendingBookings = await Booking.countDocuments({
      provider: videographer._id,
      providerType: 'Videographer',
      status: 'pending'
    });

    // Calculate revenue
    const revenueData = await Booking.aggregate([
      {
        $match: {
          provider: videographer._id,
          providerType: 'Videographer',
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
      provider: videographer._id,
      providerType: 'Videographer',
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
        profileViews: videographer.analytics.profileViews,
        averageRating: videographer.ratings.average,
        totalReviews: videographer.ratings.totalReviews
      },
      upcomingBookings,
      crewStats: {
        totalMembers: videographer.teamMembers.length,
        activeMembers: await TeamMember.countDocuments({
          owner: videographer._id,
          isActive: true
        })
      },
      equipmentStats: {
        totalEquipment: videographer.equipment.length,
        availableEquipment: await Equipment.countDocuments({
          owner: videographer._id,
          isAvailable: true
        })
      },
      postProductionStats: {
        editingServices: videographer.postProduction.editingServices,
        averageDeliveryTime: videographer.postProduction.deliveryTime,
        editingStyles: videographer.postProduction.editingStyles
      }
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getBookingHistory = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    
    const videographer = await Videographer.findOne({ user: req.user._id });
    if (!videographer) {
      return res.status(404).json({ message: 'Videographer profile not found' });
    }

    const query = { 
      provider: videographer._id,
      providerType: 'Videographer'
    };

    if (status) {
      query.status = status;
    }

    const bookings = await Booking.find(query)
      .populate('client', 'name email avatar')
      .sort({ 'eventDetails.date': -1 })
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
    console.error('Get booking history error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
