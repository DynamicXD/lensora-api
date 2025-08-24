// controllers/userController.js
import User from '../models/User.js';
import Photographer from '../models/Photographer.js';
import Videographer from '../models/Videographer.js';
import Booking from '../models/Booking.js';
import { uploadImage, deleteFile } from '../config/cloudinary.js';

export const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json({ user });
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateUserProfile = async (req, res) => {
  try {
    const { name, phone, address } = req.body;
    const updateData = { name, phone, address };

    // Handle avatar upload
    if (req.file) {
      const uploadResult = await uploadImage(req.file, 'avatars');
      
      // Delete old avatar if exists
      if (req.user.avatar) {
        const publicId = req.user.avatar.split('/').pop().split('.')[0];
        await deleteFile(publicId);
      }
      
      updateData.avatar = uploadResult.url;
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      message: 'Profile updated successfully',
      user
    });
  } catch (error) {
    console.error('Update user profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteUserAccount = async (req, res) => {
  try {
    const userId = req.user._id;

    // Check for active bookings
    const activeBookings = await Booking.countDocuments({
      $or: [
        { client: userId },
        { provider: userId }
      ],
      status: { $in: ['confirmed', 'in_progress'] }
    });

    if (activeBookings > 0) {
      return res.status(400).json({
        message: 'Cannot delete account with active bookings'
      });
    }

    // Delete associated provider profile
    if (req.user.role === 'photographer') {
      await Photographer.findOneAndDelete({ user: userId });
    } else if (req.user.role === 'videographer') {
      await Videographer.findOneAndDelete({ user: userId });
    }

    // Mark user as inactive instead of deleting
    await User.findByIdAndUpdate(userId, { 
      isActive: false,
      email: `deleted_${Date.now()}_${req.user.email}`
    });

    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Delete user account error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getUserBookings = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const query = { client: req.user._id };

    if (status) {
      query.status = status;
    }

    const bookings = await Booking.find(query)
      .populate('provider', 'businessName')
      .populate({
        path: 'provider',
        populate: {
          path: 'user',
          select: 'name avatar'
        }
      })
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
    console.error('Get user bookings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const addToFavorites = async (req, res) => {
  try {
    const { providerId, providerType } = req.params;
    
    // Validate provider exists
    const Model = providerType === 'Photographer' ? Photographer : Videographer;
    const provider = await Model.findById(providerId);
    
    if (!provider) {
      return res.status(404).json({ message: 'Provider not found' });
    }

    const user = await User.findById(req.user._id);
    
    // Check if already in favorites
    const isAlreadyFavorite = user.favorites.some(
      fav => fav.toString() === providerId
    );

    if (isAlreadyFavorite) {
      return res.status(400).json({ message: 'Already in favorites' });
    }

    user.favorites.push(providerId);
    user.favoriteType = providerType;
    await user.save();

    res.json({ message: 'Added to favorites' });
  } catch (error) {
    console.error('Add to favorites error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const removeFromFavorites = async (req, res) => {
  try {
    const { providerId } = req.params;

    const user = await User.findById(req.user._id);
    user.favorites = user.favorites.filter(
      fav => fav.toString() !== providerId
    );
    await user.save();

    res.json({ message: 'Removed from favorites' });
  } catch (error) {
    console.error('Remove from favorites error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getFavorites = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate({
        path: 'favorites',
        populate: {
          path: 'user',
          select: 'name avatar'
        }
      });

    res.json({ favorites: user.favorites });
  } catch (error) {
    console.error('Get favorites error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updatePreferences = async (req, res) => {
  try {
    const { emailNotifications, smsNotifications, preferredCategories } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        'preferences.emailNotifications': emailNotifications,
        'preferences.smsNotifications': smsNotifications,
        'preferences.preferredCategories': preferredCategories
      },
      { new: true }
    ).select('-password');

    res.json({
      message: 'Preferences updated successfully',
      user
    });
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
