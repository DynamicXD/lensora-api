// models/TeamMember.js
import mongoose from 'mongoose';

const teamMemberSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  role: {
    type: String,
    required: true,
    enum: ['photographer', 'assistant', 'editor', 'equipment_manager', 'drone_operator', 'lighting_specialist']
  },
  specializations: [String],
  experience: {
    type: Number, // years
    default: 0
  },
  hourlyRate: {
    type: Number,
    default: 0
  },
  availability: {
    monday: { available: Boolean, hours: { start: String, end: String } },
    tuesday: { available: Boolean, hours: { start: String, end: String } },
    wednesday: { available: Boolean, hours: { start: String, end: String } },
    thursday: { available: Boolean, hours: { start: String, end: String } },
    friday: { available: Boolean, hours: { start: String, end: String } },
    saturday: { available: Boolean, hours: { start: String, end: String } },
    sunday: { available: Boolean, hours: { start: String, end: String } }
  },
  skills: [String],
  portfolio: [String], // Image URLs
  isActive: {
    type: Boolean,
    default: true
  },
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

export default mongoose.model('TeamMember', teamMemberSchema);
