// models/Videographer.js (similar structure to Photographer with video-specific fields)
import mongoose from 'mongoose';

const videographerSchema = new mongoose.Schema({
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
    enum: ['wedding', 'corporate', 'music_video', 'documentary', 'commercial', 'event', 'promotional', 'real_estate', 'drone']
  }],
  experience: {
    type: Number,
    required: true
  },
  portfolio: [{
    title: String,
    description: String,
    videoUrl: String,
    thumbnailUrl: String,
    category: String,
    duration: String,
    featured: {
      type: Boolean,
      default: false
    }
  }],
  services: [{
    name: String,
    description: String,
    basePrice: Number,
    duration: String,
    includes: [String],
    deliverables: [String], // e.g., 'raw footage', 'edited video', 'highlights reel'
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
  postProduction: {
    editingServices: {
      type: Boolean,
      default: true
    },
    deliveryTime: {
      type: String,
      default: '7-10 days'
    },
    editingStyles: [String], // e.g., 'cinematic', 'documentary', 'commercial'
    revisions: {
      type: Number,
      default: 2
    }
  },
  // ... (similar availability, location, social, ratings, analytics, verification fields as Photographer)
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
        crewRequired: Number,
        crewAssigned: [{
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
    serviceAreas: [String]
  },
  social: {
    website: String,
    instagram: String,
    facebook: String,
    twitter: String,
    youtube: String,
    vimeo: String
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
    badges: [String]
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

videographerSchema.index({ 
  'location.city': 1, 
  specializations: 1, 
  'ratings.average': -1 
});

videographerSchema.index({ 
  businessName: 'text', 
  description: 'text',
  'services.name': 'text'
});

export default mongoose.model('Videographer', videographerSchema);
