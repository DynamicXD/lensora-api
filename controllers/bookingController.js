// controllers/bookingController.js
import Booking from '../models/Booking.js';
import Photographer from '../models/Photographer.js';
import Videographer from '../models/Videographer.js';
import User from '../models/User.js';
import { sendBookingConfirmation } from '../services/notificationService.js';
import { calculateAvailability, findAvailableSlots } from '../utils/availabilityChecker.js';

export const createBooking = async (req, res) => {
  try {
    const {
      providerId,
      providerType,
      eventDetails,
      services,
      teamRequirements,
      equipmentRequirements,
      pricing
    } = req.body;

    // Validate provider
    const ProviderModel = providerType === 'Photographer' ? Photographer : Videographer;
    const provider = await ProviderModel.find({ user: providerId }).populate('teamMembers equipment');

    if (!provider) {
      return res.status(404).json({ message: 'Provider not found' });
    }

    // Check availability
    const availability = await calculateAvailability(provider, eventDetails.date);
    if (!availability.available) {
      return res.status(400).json({ 
        message: 'Provider not available on selected date',
        reason: availability.reason
      });
    }

    // Create booking
    const booking = new Booking({
      client: req.user._id,
      provider: providerId,
      providerType,
      eventDetails,
      services,
      pricing: {
        basePrice: pricing.basePrice,
        addOnsTotal: pricing.addOnsTotal || 0,
        taxes: pricing.taxes || 0,
        discount: pricing.discount || {},
        totalAmount: pricing.totalAmount
      },
      teamAssignment: {
        mainProvider: providerId,
        teamMembers: [],
        equipment: []
      }
    });

    await booking.save();

    // Send confirmation emails
    await sendBookingConfirmation(booking);

    res.status(201).json({
      message: 'Booking created successfully',
      booking: await Booking.findById(booking._id)
        .populate('client', 'name email')
        .populate('provider')
    });
  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getBookings = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, role } = req.query;
    let query = {};

    // Determine query based on user role
    if (req.user.role === 'user') {
      query.client = req.user._id;
    } else if (req.user.role === 'photographer') {
      const photographer = await Photographer.findOne({ user: req.user._id });
      if (photographer) {
        query.provider = photographer._id;
        query.providerType = 'Photographer';
      }
    } else if (req.user.role === 'videographer') {
      const videographer = await Videographer.findOne({ user: req.user._id });
      if (videographer) {
        query.provider = videographer._id;
        query.providerType = 'Videographer';
      }
    }

    if (status) {
      query.status = status;
    }

    const bookings = await Booking.find(query)
      .populate('client', 'name email avatar')
      .populate('provider')
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
    console.error('Get bookings error:', error);
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
      .populate('teamAssignment.equipment.item')
      .populate('review');

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Check authorization
    const isClient = booking.client._id.toString() === req.user._id.toString();
    const isProvider = booking.provider.user && booking.provider.user.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isClient && !isProvider && !isAdmin) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({ booking });
  } catch (error) {
    console.error('Get booking error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateBookingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason, teamAssignment, milestones } = req.body;

    // Find the provider's profile
    let providerProfile;
    if (req.user.role === 'photographer') {
      providerProfile = await Photographer.findOne({ user: req.user._id });
    } else if (req.user.role === 'videographer') {
      providerProfile = await Videographer.findOne({ user: req.user._id });
    }

    const booking = await Booking.findOne({
      _id: id,
      provider: providerProfile._id
    });

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    const updateData = { status };

    if (reason) {
      updateData['communication'] = [
        ...booking.communication,
        {
          from: req.user._id,
          message: reason,
          type: 'status_update'
        }
      ];
    }

    if (teamAssignment) {
      updateData['teamAssignment'] = {
        ...booking.teamAssignment,
        ...teamAssignment
      };
    }

    if (milestones) {
      updateData.milestones = milestones;
    }

    const updatedBooking = await Booking.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    ).populate('client', 'name email');

    // Send notification based on status
    if (status === 'confirmed') {
      await sendBookingConfirmation(updatedBooking);
    }

    res.json({
      message: 'Booking status updated successfully',
      booking: updatedBooking
    });
  } catch (error) {
    console.error('Update booking status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const cancelBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Check authorization
    const isClient = booking.client.toString() === req.user._id.toString();
    const isProvider = booking.provider.user && booking.provider.user.toString() === req.user._id.toString();

    if (!isClient && !isProvider) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Check if booking can be cancelled
    if (booking.status === 'completed' || booking.status === 'cancelled') {
      return res.status(400).json({ message: 'Booking cannot be cancelled' });
    }

    booking.status = 'cancelled';
    booking.cancellation = {
      cancelledBy: req.user._id,
      reason,
      cancellationDate: new Date()
    };

    await booking.save();

    res.json({
      message: 'Booking cancelled successfully',
      booking
    });
  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const addMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Check authorization
    const isClient = booking.client.toString() === req.user._id.toString();
    const isProvider = booking.provider.user && booking.provider.user.toString() === req.user._id.toString();

    if (!isClient && !isProvider) {
      return res.status(403).json({ message: 'Access denied' });
    }

    booking.communication.push({
      from: req.user._id,
      message,
      type: 'message'
    });

    await booking.save();

    const updatedBooking = await Booking.findById(id)
      .populate('communication.from', 'name avatar');

    res.json({
      message: 'Message added successfully',
      communication: updatedBooking.communication
    });
  } catch (error) {
    console.error('Add message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getAvailableSlots = async (req, res) => {
  try {
    const { providerId, providerType } = req.params;
    const { date, duration = 4 } = req.query;

    const ProviderModel = providerType === 'Photographer' ? Photographer : Videographer;
    const provider = await ProviderModel.findById(providerId).populate('teamMembers');

    if (!provider) {
      return res.status(404).json({ message: 'Provider not found' });
    }

    const availableSlots = await findAvailableSlots(provider, date, duration);

    res.json({
      date,
      duration,
      availableSlots
    });
  } catch (error) {
    console.error('Get available slots error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
