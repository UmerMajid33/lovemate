import mongoose from 'mongoose';

// One daily challenge assigned to one partner. Three of these per role per day.
const feedtaskschema = new mongoose.Schema({
  linkcode:    { type: String, required: true, lowercase: true, trim: true, index: true },
  role:        { type: String, enum: ['creator', 'joiner'], required: true },
  date:        { type: String, required: true },        // YYYY-MM-DD — the day this set belongs to
  challengeid: { type: String, required: true },
  text:        { type: String, default: '' },
  emoji:       { type: String, default: '✨' },
  // todo → accepted (doer says done, awaiting partner) → verified / rejected
  status:      { type: String, enum: ['todo', 'accepted', 'verified', 'rejected'], default: 'todo' },
  points:      { type: Number, default: 0 },            // awarded once verified
  acceptedat:  { type: Date, default: null },
  verifiedat:  { type: Date, default: null },
  createdat:   { type: Date, default: Date.now },
});

// One row per challenge per role per day per home
feedtaskschema.index({ linkcode: 1, role: 1, date: 1, challengeid: 1 }, { unique: true });

export default mongoose.model('feedtask', feedtaskschema);
