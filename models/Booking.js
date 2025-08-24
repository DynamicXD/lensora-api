// models/Booking.js
import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema({
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
  eventDetails: {
    type: {
      type: String,
      required: true,
      enum: ['wedding', 'portrait', 'event', 'corporate', 'commercial', 'other']
    },
    title: {
      type: String,
      required: true
    },
    description: String,
    date: {
      type: Date,
      required: true
    },
    startTime: {
      type: String,
      required: true
    },
    endTime: {
      type: String,
      required: true
    },
    duration: Number, // in hours
    location: {
      venue: String,
      address: String,
      city: String,
      state: String,
      coordinates: {
        latitude: Number,
        longitude: Number
      }
    },
    guestCount: Number,
    specialRequirements: String
  },
  services: [{
    serviceId: String,
    name: String,
    price: Number,
    addOns: [{
      name: String,
      price: Number
    }]
  }],
  teamAssignment: {
    mainProvider: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'providerType'
    },
    teamMembers: [{
      member: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TeamMember'
      },
      role: String,
      confirmed: {
        type: Boolean,
        default: false
      }
    }],
    equipment: [{
      item: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Equipment'
      },
      quantity: Number,
      reserved: {
        type: Boolean,
        default: false
      }
    }]
  },
  pricing: {
    basePrice: {
      type: Number,
      required: true
    },
    addOnsTotal: {
      type: Number,
      default: 0
    },
    taxes: {
      type: Number,
      default: 0
    },
    discount: {
      amount: Number,
      reason: String,
      code: String
    },
    totalAmount: {
      type: Number,
      required: true
    }
  },
  payment: {
    status: {
      type: String,
      enum: ['pending', 'partial', 'paid', 'refunded'],
      default: 'pending'
    },
    method: String,
    transactions: [{
      amount: Number,
      transactionId: String,
      date: Date,
      type: {
        type: String,
        enum: ['payment', 'refund']
      }
    }],
    deposit: {
      amount: Number,
      dueDate: Date,
      paid: {
        type: Boolean,
        default: false
      }
    }
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'disputed'],
    default: 'pending'
  },
  communication: [{
    from: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    message: String,
    timestamp: {
      type: Date,
      default: Date.now
    },
    type: {
      type: String,
      enum: ['message', 'status_update', 'payment_reminder'],
      default: 'message'
    }
  }],
  milestones: [{
    name: String,
    description: String,
    dueDate: Date,
    completed: {
      type: Boolean,
      default: false
    },
    completedDate: Date
  }],
  deliverables: [{
    name: String,
    description: String,
    type: {
      type: String,
      enum: ['photos', 'videos', 'edited_content', 'raw_files']
    },
    urls: [String],
    deliveredDate: Date,
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'delivered'],
      default: 'pending'
    }
  }],
  cancellation: {
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reason: String,
    cancellationDate: Date,
    refundAmount: Number
  },
  review: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Review'
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
bookingSchema.index({ client: 1, 'eventDetails.date': -1 });
bookingSchema.index({ provider: 1, providerType: 1, 'eventDetails.date': -1 });
bookingSchema.index({ status: 1, 'eventDetails.date': 1 });

export default mongoose.model('Booking', bookingSchema);
