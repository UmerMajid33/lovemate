import mongoose from 'mongoose';

// One-to-one couple chat. Messages are keyed by the shared home linkcode.
const chatschema = new mongoose.Schema({
  linkcode:  { type: String, required: true, lowercase: true, trim: true, index: true },
  role:      { type: String, enum: ['creator', 'joiner'], required: true },
  name:      { type: String, default: '' },
  text:      { type: String, required: true, trim: true, maxlength: 2000 },
  createdat: { type: Date, default: Date.now },
});

chatschema.index({ linkcode: 1, createdat: 1 });

export default mongoose.model('chatmessage', chatschema);
