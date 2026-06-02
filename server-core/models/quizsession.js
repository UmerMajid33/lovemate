import mongoose from 'mongoose';

// One general-knowledge quiz shared by a couple. Both answer the same questions;
// the correct answer reveals only after both submit; points are per-partner.
const quizquestionschema = new mongoose.Schema({
  q:       { type: String, required: true },
  options: { type: [String], default: [] },
  answer:  { type: Number, required: true },   // index of correct option
}, { _id: false });

const quizsessionschema = new mongoose.Schema({
  linkcode:  { type: String, required: true, lowercase: true, trim: true, index: true },
  status:    { type: String, enum: ['pending', 'active', 'done'], default: 'pending' },
  fromrole:  { type: String, enum: ['creator', 'joiner'], default: 'creator' },
  fromname:  { type: String, default: '' },
  questions: { type: [quizquestionschema], default: [] },
  current:   { type: Number, default: 0 },
  // answers[role] = { '0': optIndex, '1': optIndex, ... }
  answers:   { type: mongoose.Schema.Types.Mixed, default: () => ({ creator: {}, joiner: {} }) },
  scores:    { type: mongoose.Schema.Types.Mixed, default: () => ({ creator: 0, joiner: 0 }) },
  createdat: { type: Date, default: Date.now },
  updatedat: { type: Date, default: Date.now },
});

export default mongoose.model('quizsession', quizsessionschema);
