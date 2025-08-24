// models/Equipment.js
import mongoose from 'mongoose';

const equipmentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: ['camera', 'lens', 'lighting', 'audio', 'drone', 'tripod', 'stabilizer', 'other']
  },
  brand: String,
  model: String,
  description: String,
  condition: {
    type: String,
    enum: ['excellent', 'good', 'fair', 'needs_repair'],
    default: 'excellent'
  },
  purchaseDate: Date,
  lastMaintenance: Date,
  isAvailable: {
    type: Boolean,
    default: true
  },
  rentalPrice: {
    type: Number,
    default: 0
  },
  images: [String],
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'ownerType',
    required: true
  },
  ownerType: {
    type: String,
    required: true,
    enum: ['Photographer', 'Videographer']
  }
}, {
  timestamps: true
});

export default mongoose.model('Equipment', equipmentSchema);
