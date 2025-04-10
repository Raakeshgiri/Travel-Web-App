import mongoose from "mongoose";

const CustomTripSchema = new mongoose.Schema({
  tourPlan: {
    destination: {
      type: String,
      required: true
    },
    duration: {
      type: String,
      required: true
    },
    budget: {
      type: String,
      required: true
    },
    people: {
      type: Number,
      required: true
    },
    itinerary: [{
      day: String,
      activities: String
    }],
    accommodations: String,
    transportation: String
  },
  userDetails: {
    name: {
      type: String,
      default: 'Anonymous User'
    },
    email: String,
    phone: String,
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'completed'],
    default: 'pending'
  },
  adminNotes: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date
  }
});

export default mongoose.model('CustomTrip', CustomTripSchema);