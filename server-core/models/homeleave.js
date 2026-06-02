import mongoose from 'mongoose';

const homeleaveschema = new mongoose.Schema({
  linkcode:          { type: String, required: true, lowercase: true, trim: true, unique: true },
  creatorwantsleave: { type: Boolean, default: false },
  joinerwantsleave:  { type: Boolean, default: false },
  updatedat:         { type: Date, default: Date.now },
});

export default mongoose.model('homeleave', homeleaveschema);
