import mongoose from 'mongoose';

// Group chat for a club (up to 5 members). Keyed by clubcode; sender by email.
const clubmsgschema = new mongoose.Schema({
  clubcode:  { type: String, required: true, lowercase: true, trim: true, index: true },
  email:     { type: String, lowercase: true, trim: true },
  name:      { type: String, default: '' },
  text:      { type: String, required: true, trim: true, maxlength: 2000 },
  createdat: { type: Date, default: Date.now },
});

clubmsgschema.index({ clubcode: 1, createdat: 1 });

export default mongoose.model('clubmessage', clubmsgschema);
