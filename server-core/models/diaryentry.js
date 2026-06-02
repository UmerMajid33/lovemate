import mongoose from 'mongoose';

// A shared couple-diary memory, kept forever and tied to the home's bond code.
const diaryschema = new mongoose.Schema({
  linkcode:   { type: String, required: true, lowercase: true, trim: true, index: true },
  author:     { type: String, enum: ['creator', 'joiner'], required: true },
  authorname: { type: String, default: '' },
  mood:       { type: String, default: '📖' },   // small emoji marking the memory
  title:      { type: String, default: '' },
  text:       { type: String, required: true },
  createdat:  { type: Date, default: Date.now },
});

diaryschema.index({ linkcode: 1, createdat: -1 });

export default mongoose.model('diaryentry', diaryschema);
