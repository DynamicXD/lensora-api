// models/User.js
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true, // This creates an index automatically
    lowercase: true,
    trim: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please provide a valid email address'
    ]
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false // Don't include password in queries by default
  },
  role: {
    type: String,
    enum: {
      values: ['user', 'photographer', 'videographer', 'admin'],
      message: '{VALUE} is not a valid role'
    },
    default: 'user',
    index: true // Creates index for role field
  },
  avatar: {
    type: String,
    default: ''
  },
  phone: {
    type: String,
    trim: true,
    match: [/^\+?[\d\s\-\(\)]+$/, 'Please provide a valid phone number']
  },
  
  // Address information
  address: {
    street: {
      type: String,
      trim: true
    },
    city: {
      type: String,
      trim: true
    },
    state: {
      type: String,
      trim: true
    },
    zipCode: {
      type: String,
      trim: true
    },
    country: {
      type: String,
      trim: true,
      default: 'United States'
    }
  },
  
  // User preferences
  preferences: {
    emailNotifications: {
      type: Boolean,
      default: true
    },
    smsNotifications: {
      type: Boolean,
      default: false
    },
    marketingEmails: {
      type: Boolean,
      default: false
    },
    pushNotifications: {
      type: Boolean,
      default: true
    },
    preferredCategories: [{
      type: String,
      enum: ['wedding', 'portrait', 'event', 'fashion', 'landscape', 'product', 'corporate', 'sports', 'wildlife', 'street', 'music_video', 'documentary', 'commercial', 'promotional', 'real_estate', 'drone']
    }],
    preferredBudgetRange: {
      min: {
        type: Number,
        default: 0
      },
      max: {
        type: Number,
        default: 5000
      }
    },
    preferredLocation: {
      type: String,
      trim: true
    }
  },
  
  // Favorites and bookmarks
  favorites: [{
    provider: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'favorites.providerType'
    },
    providerType: {
      type: String,
      enum: ['Photographer', 'Videographer']
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Recently viewed providers
  recentlyViewed: [{
    provider: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'recentlyViewed.providerType'
    },
    providerType: {
      type: String,
      enum: ['Photographer', 'Videographer']
    },
    viewedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Password reset functionality
  passwordResetToken: String,
  passwordResetExpires: Date,
  passwordChangedAt: Date,
  
  // Email verification
  emailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  emailVerificationExpires: Date,
  emailVerifiedAt: Date,
  
  // Account status and security
  isActive: {
    type: Boolean,
    default: true,
    index: true // Creates index for isActive field
  },
  isBlocked: {
    type: Boolean,
    default: false
  },
  blockedReason: String,
  blockedAt: Date,
  blockedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Login and activity tracking
  lastLogin: {
    type: Date,
    default: Date.now,
    index: true // Creates index for lastLogin field
  },
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: Date,
  ipAddress: String,
  userAgent: String,
  
  // Social media links (optional)
  socialMedia: {
    facebook: {
      type: String,
      trim: true
    },
    instagram: {
      type: String,
      trim: true
    },
    twitter: {
      type: String,
      trim: true
    },
    linkedin: {
      type: String,
      trim: true
    }
  },
  
  // Subscription and billing (for future use)
  subscription: {
    plan: {
      type: String,
      enum: ['free', 'premium', 'pro'],
      default: 'free'
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'cancelled', 'expired'],
      default: 'active'
    },
    startDate: Date,
    endDate: Date,
    autoRenew: {
      type: Boolean,
      default: false
    }
  },
  
  // Communication preferences
  communicationPreferences: {
    preferredContactMethod: {
      type: String,
      enum: ['email', 'phone', 'sms', 'app'],
      default: 'email'
    },
    availableHours: {
      start: {
        type: String,
        default: '09:00'
      },
      end: {
        type: String,
        default: '18:00'
      }
    },
    timezone: {
      type: String,
      default: 'America/New_York'
    }
  },
  
  // Analytics and tracking
  analytics: {
    profileViews: {
      type: Number,
      default: 0
    },
    searchesPerformed: {
      type: Number,
      default: 0
    },
    bookingsCount: {
      type: Number,
      default: 0
    },
    totalSpent: {
      type: Number,
      default: 0
    },
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    lastSearchDate: Date,
    registrationSource: {
      type: String,
      enum: ['web', 'mobile', 'referral', 'social', 'advertisement'],
      default: 'web'
    }
  },
  
  // Terms and privacy
  termsAccepted: {
    accepted: {
      type: Boolean,
      default: false
    },
    acceptedAt: Date,
    version: {
      type: String,
      default: '1.0'
    }
  },
  privacyPolicyAccepted: {
    accepted: {
      type: Boolean,
      default: false
    },
    acceptedAt: Date,
    version: {
      type: String,
      default: '1.0'
    }
  },
  
  // Account verification and trust
  verified: {
    email: {
      type: Boolean,
      default: false
    },
    phone: {
      type: Boolean,
      default: false
    },
    identity: {
      type: Boolean,
      default: false
    }
  },
  trustScore: {
    type: Number,
    default: 50,
    min: 0,
    max: 100
  },
  
  // Referral system
  referralCode: {
    type: String,
    unique: true, // This creates a unique index automatically
    sparse: true  // Allows null values, only creates index for non-null values
  },
  referredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  referralCount: {
    type: Number,
    default: 0
  },
  
  // Account creation and updates
  accountCreated: {
    type: Date,
    default: Date.now
  },
  profileCompleteness: {
    type: Number,
    default: 30,
    min: 0,
    max: 100
  },
  
  // Emergency contact (optional)
  emergencyContact: {
    name: String,
    relationship: String,
    phone: String,
    email: String
  }
}, {
  timestamps: true, // This creates createdAt and updatedAt indexes automatically
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// REMOVED DUPLICATE INDEXES - Only keep the ones not already created by field definitions
// userSchema.index({ email: 1 }); // REMOVED - already created by unique: true
// userSchema.index({ role: 1 }); // REMOVED - already created by index: true
// userSchema.index({ isActive: 1 }); // REMOVED - already created by index: true
// userSchema.index({ referralCode: 1 }); // REMOVED - already created by unique: true
// userSchema.index({ createdAt: -1 }); // REMOVED - already created by timestamps: true
// userSchema.index({ lastLogin: -1 }); // REMOVED - already created by index: true

// Keep only the compound and custom indexes that aren't duplicated
userSchema.index({ 'preferences.preferredCategories': 1 });
userSchema.index({ 'favorites.provider': 1 });

// Virtual for account lock status
userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Virtual for full name (if you want to add first/last name later)
userSchema.virtual('fullName').get(function() {
  return this.name;
});

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  // Only hash if password is modified or new
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    
    // Set passwordChangedAt if password is being changed (not on new user)
    if (!this.isNew) {
      this.passwordChangedAt = Date.now() - 1000; // Subtract 1s to ensure JWT is created after password change
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

// Pre-save middleware to update profile completeness
userSchema.pre('save', function(next) {
  if (this.isModified()) {
    this.profileCompleteness = this.calculateProfileCompleteness();
  }
  next();
});

// Pre-save middleware to generate referral code
userSchema.pre('save', function(next) {
  if (this.isNew && !this.referralCode) {
    this.referralCode = this.generateReferralCode();
  }
  next();
});

// Pre-save middleware to limit recently viewed items
userSchema.pre('save', function(next) {
  if (this.recentlyViewed && this.recentlyViewed.length > 20) {
    this.recentlyViewed = this.recentlyViewed
      .sort((a, b) => b.viewedAt - a.viewedAt)
      .slice(0, 20);
  }
  next();
});

// Instance Methods

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    if (!this.password) {
      throw new Error('User password not available for comparison');
    }
    if (!candidatePassword) {
      throw new Error('No password provided for comparison');
    }
    
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    console.error('Password comparison error:', error.message);
    throw new Error('Password comparison failed');
  }
};

// Check if password was changed after JWT was issued
userSchema.methods.changedPasswordAfter = function(JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

// Increment login attempts
userSchema.methods.incLoginAttempts = function() {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $set: { loginAttempts: 1 },
      $unset: { lockUntil: 1 }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  
  // Lock account after 5 attempts for 2 hours
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }; // 2 hours
  }
  
  return this.updateOne(updates);
};

// Reset login attempts
userSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $unset: { loginAttempts: 1, lockUntil: 1 }
  });
};

// Add to favorites
userSchema.methods.addToFavorites = function(providerId, providerType) {
  const favorite = {
    provider: providerId,
    providerType: providerType,
    addedAt: new Date()
  };
  
  // Remove if already exists
  this.favorites = this.favorites.filter(
    fav => fav.provider.toString() !== providerId.toString()
  );
  
  // Add to beginning
  this.favorites.unshift(favorite);
  
  // Limit to 50 favorites
  if (this.favorites.length > 50) {
    this.favorites = this.favorites.slice(0, 50);
  }
  
  return this.save();
};

// Remove from favorites
userSchema.methods.removeFromFavorites = function(providerId) {
  this.favorites = this.favorites.filter(
    fav => fav.provider.toString() !== providerId.toString()
  );
  return this.save();
};

// Add to recently viewed
userSchema.methods.addToRecentlyViewed = function(providerId, providerType) {
  const viewed = {
    provider: providerId,
    providerType: providerType,
    viewedAt: new Date()
  };
  
  // Remove if already exists
  this.recentlyViewed = this.recentlyViewed.filter(
    item => item.provider.toString() !== providerId.toString()
  );
  
  // Add to beginning
  this.recentlyViewed.unshift(viewed);
  
  return this.save();
};

// Calculate profile completeness percentage
userSchema.methods.calculateProfileCompleteness = function() {
  let completeness = 0;
  const fields = [
    'name', 'email', 'phone', 'avatar',
    'address.city', 'address.state', 'address.country'
  ];
  
  fields.forEach(field => {
    const value = field.split('.').reduce((obj, key) => obj && obj[key], this);
    if (value && value.toString().trim() !== '') {
      completeness += 100 / fields.length;
    }
  });
  
  // Bonus points for verification
  if (this.verified.email) completeness += 5;
  if (this.verified.phone) completeness += 5;
  
  return Math.min(Math.round(completeness), 100);
};

// Generate referral code
userSchema.methods.generateReferralCode = function() {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
};

// Update trust score
userSchema.methods.updateTrustScore = function(change) {
  this.trustScore = Math.max(0, Math.min(100, this.trustScore + change));
  return this.save();
};

// Static Methods

// Find users by role
userSchema.statics.findByRole = function(role) {
  return this.find({ role, isActive: true });
};

// Find recently active users
userSchema.statics.findRecentlyActive = function(days = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  return this.find({
    lastLogin: { $gte: cutoffDate },
    isActive: true
  });
};

// Find users by referral code
userSchema.statics.findByReferralCode = function(code) {
  return this.findOne({ referralCode: code.toUpperCase() });
};

export default mongoose.model('User', userSchema);
