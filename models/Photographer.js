// models/Photographer.js
import mongoose from 'mongoose';

const photographerSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  businessName: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  specializations: [{
    type: String,
    enum: ['wedding', 'portrait', 'event', 'fashion', 'landscape', 'product', 'corporate', 'sports', 'wildlife', 'street']
  }],
  experience: {
    type: Number, // years
    required: true
  },
  portfolio: [{
    title: String,
    description: String,
    images: [String],
    category: String,
    featured: {
      type: Boolean,
      default: false
    }
  }],
  services: [{
    name: String,
    description: String,
    basePrice: Number,
    duration: String, // e.g., "2 hours", "full day"
    includes: [String],
    addOns: [{
      name: String,
      price: Number,
      description: String
    }]
  }],
  pricing: {
    hourly: {
      type: Number,
      default: 0
    },
    halfDay: {
      type: Number,
      default: 0
    },
    fullDay: {
      type: Number,
      default: 0
    },
    custom: [{
      name: String,
      price: Number,
      description: String
    }]
  },
  equipment: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Equipment'
  }],
  teamMembers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TeamMember'
  }],
  availability: {
    calendar: [{
      date: Date,
      status: {
        type: String,
        enum: ['available', 'booked', 'unavailable'],
        default: 'available'
      },
      timeSlots: [{
        start: String,
        end: String,
        isBooked: {
          type: Boolean,
          default: false
        },
        teamMembersRequired: Number,
        teamMembersAssigned: [{
          type: mongoose.Schema.Types.ObjectId,
          ref: 'TeamMember'
        }]
      }]
    }],
    workingHours: {
      monday: { available: Boolean, start: String, end: String },
      tuesday: { available: Boolean, start: String, end: String },
      wednesday: { available: Boolean, start: String, end: String },
      thursday: { available: Boolean, start: String, end: String },
      friday: { available: Boolean, start: String, end: String },
      saturday: { available: Boolean, start: String, end: String },
      sunday: { available: Boolean, start: String, end: String }
    },
    blackoutDates: [Date]
  },
  location: {
    address: String,
    city: String,
    state: String,
    country: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    },
    serviceAreas: [String] // Cities/areas they serve
  },
  social: {
    website: String,
    instagram: String,
    facebook: String,
    twitter: String,
    youtube: String
  },
  ratings: {
    average: {
      type: Number,
      default: 0
    },
    totalReviews: {
      type: Number,
      default: 0
    },
    breakdown: {
      five: { type: Number, default: 0 },
      four: { type: Number, default: 0 },
      three: { type: Number, default: 0 },
      two: { type: Number, default: 0 },
      one: { type: Number, default: 0 }
    }
  },
  analytics: {
    profileViews: {
      type: Number,
      default: 0
    },
    bookingInquiries: {
      type: Number,
      default: 0
    },
    bookingConversions: {
      type: Number,
      default: 0
    },
    monthlyStats: [{
      month: Date,
      views: Number,
      bookings: Number,
      revenue: Number
    }]
  },
  verification: {
    isVerified: {
      type: Boolean,
      default: false
    },
    documents: [{
      type: String,
      url: String,
      uploadDate: Date
    }],
    badges: [String] // e.g., 'verified', 'top_rated', 'quick_response'
  },
  subscription: {
    plan: {
      type: String,
      enum: ['free', 'basic', 'premium', 'enterprise'],
      default: 'free'
    },
    expiresAt: Date,
    features: [String]
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isApproved: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for search optimization
photographerSchema.index({ 
  'location.city': 1, 
  specializations: 1, 
  'ratings.average': -1 
});

photographerSchema.index({ 
  businessName: 'text', 
  description: 'text',
  'services.name': 'text'
});

export default mongoose.model('Photographer', photographerSchema);
