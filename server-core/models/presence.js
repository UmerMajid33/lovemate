import mongoose from 'mongoose';

const presenceschema = new mongoose.Schema({
  linkcode:  { type: String, required: true, lowercase: true, trim: true },
  role:      { type: String, enum: ['creator', 'joiner'], required: true },
  name:      { type: String, default: '' },
  lastseen:  { type: Date, default: Date.now },
});

// One record per role per home — upsert keeps it fresh
presenceschema.index({ linkcode: 1, role: 1 }, { unique: true });

export default mongoose.model('presence', presenceschema);
