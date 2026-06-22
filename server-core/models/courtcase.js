import mongoose from 'mongoose';

// One running court case per home (keyed by linkcode). Fully isolated from chat.
const courtMsg = new mongoose.Schema({
  sender:    { type: String, enum: ['PLAINTIFF', 'DEFENDANT', 'JUDGE'], required: true },  // side, for alignment
  name:      { type: String, default: '' },   // real display name (or 'JUDGE GAVELTRON')
  text:      { type: String, required: true, trim: true, maxlength: 2000 },
  createdat: { type: Date, default: Date.now },
});

const courtcaseschema = new mongoose.Schema({
  linkcode:  { type: String, required: true, lowercase: true, trim: true, unique: true },
  messages:  { type: [courtMsg], default: [] },
  updatedat: { type: Date, default: Date.now },
});

export default mongoose.model('courtcase', courtcaseschema);
