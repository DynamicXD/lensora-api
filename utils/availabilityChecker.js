// utils/availabilityChecker.js
import Booking from '../models/Booking.js';
import moment from 'moment';

export const calculateAvailability = async (provider, requestedDate, duration = 4) => {
  try {
    const date = moment(requestedDate).startOf('day');
    const endOfDay = moment(requestedDate).endOf('day');

    // Get existing bookings for that day
    const existingBookings = await Booking.find({
      provider: provider._id,
      'eventDetails.date': {
        $gte: date.toDate(),
        $lte: endOfDay.toDate()
      },
      status: { $in: ['confirmed', 'in_progress'] }
    });

    console.log(provider)

    // Check if the day is marked as unavailable
    const dayOfWeek = date.format('dddd').toLowerCase();
    const workingHours = provider?.availability?.workingHours[dayOfWeek];

    if (!workingHours || !workingHours.available) {
      return {
        available: false,
        reason: 'Not available on this day',
        workingHours: null,
        bookedSlots: []
      };
    }

    // Check blackout dates
    const isBlackoutDate = provider.availability.blackoutDates.some(blackoutDate => 
      moment(blackoutDate).isSame(date, 'day')
    );

    if (isBlackoutDate) {
      return {
        available: false,
        reason: 'Blackout date',
        workingHours,
        bookedSlots: []
      };
    }

    // Calculate booked time slots
    const bookedSlots = existingBookings.map(booking => ({
      start: booking.eventDetails.startTime,
      end: booking.eventDetails.endTime,
      bookingId: booking._id
    }));

    // Calculate available team members
    const totalTeamMembers = provider.teamMembers.length;
    const bookedTeamMembers = existingBookings.reduce((total, booking) => {
      return total + (booking.teamAssignment.teamMembers?.length || 1);
    }, 0);

    const availableTeamMembers = Math.max(0, totalTeamMembers - bookedTeamMembers);

    return {
      available: availableTeamMembers > 0,
      reason: availableTeamMembers > 0 ? null : 'No team members available',
      workingHours,
      bookedSlots,
      capacity: {
        total: totalTeamMembers,
        available: availableTeamMembers,
        booked: bookedTeamMembers
      }
    };
  } catch (error) {
    console.error('Availability calculation error:', error);
    return {
      available: false,
      reason: 'Error calculating availability',
      workingHours: null,
      bookedSlots: []
    };
  }
};

export const findAvailableSlots = async (provider, date, duration) => {
  try {
    const availability = await calculateAvailability(provider, date, duration);
    
    if (!availability.available || !availability.workingHours) {
      return [];
    }

    const workStart = moment(`${date} ${availability.workingHours.start}`);
    const workEnd = moment(`${date} ${availability.workingHours.end}`);
    const slotDuration = parseInt(duration) || 4; // hours
    const slots = [];

    let currentSlot = workStart.clone();

    while (currentSlot.clone().add(slotDuration, 'hours').isSameOrBefore(workEnd)) {
      const slotEnd = currentSlot.clone().add(slotDuration, 'hours');
      
      // Check if this slot conflicts with existing bookings
      const hasConflict = availability.bookedSlots.some(bookedSlot => {
        const bookedStart = moment(`${date} ${bookedSlot.start}`);
        const bookedEnd = moment(`${date} ${bookedSlot.end}`);
        
        return currentSlot.isBefore(bookedEnd) && slotEnd.isAfter(bookedStart);
      });

      if (!hasConflict) {
        slots.push({
          start: currentSlot.format('HH:mm'),
          end: slotEnd.format('HH:mm'),
          available: true
        });
      }

      currentSlot.add(1, 'hour'); // Move to next hour
    }

    return slots;
  } catch (error) {
    console.error('Find available slots error:', error);
    return [];
  }
};
