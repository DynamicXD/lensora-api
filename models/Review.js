// models/Review.js
import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true
  },
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  provider: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'providerType',
    required: true
  },
  providerType: {
    type: String,
    required: true,
    enum: ['Photographer', 'Videographer']
  },
  ratings: {
    overall: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    quality: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    professionalism: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    communication: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    valueForMoney: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    timeliness: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    }
  },
  title: {
    type: String,
    required: true,
    maxlength: 100
  },
  content: {
    type: String,
    required: true,
    maxlength: 1000
  },
  photos: [String], // URLs to photos uploaded with review
  recommended: {
    type: Boolean,
    required: true
  },
  response: {
    content: String,
    date: Date,
    respondedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  helpful: {
    count: {
      type: Number,
      default: 0
    },
    users: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }]
  },
  isVerified: {
    type: Boolean,
    default: true // Since it's tied to a booking
  },
  isHidden: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes
reviewSchema.index({ provider: 1, providerType: 1, createdAt: -1 });
reviewSchema.index({ client: 1, createdAt: -1 });
reviewSchema.index({ 'ratings.overall': -1 });

export default mongoose.model('Review', reviewSchema);
