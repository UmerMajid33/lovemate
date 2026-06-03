import mongoose from 'mongoose';

// Turn-based tic-tac-toe for a couple. creator = X, joiner = O.
const xoschema = new mongoose.Schema({
  linkcode:  { type: String, required: true, lowercase: true, trim: true, unique: true },
  board:     { type: [String], default: () => Array(9).fill('') },   // '', 'X', 'O'
  turn:      { type: String, enum: ['creator', 'joiner'], default: 'creator' },
  winner:    { type: String, enum: ['creator', 'joiner', 'draw', null], default: null },
  line:      { type: [Number], default: [] },   // winning cell indices
  wins:      { type: mongoose.Schema.Types.Mixed, default: () => ({ creator: 0, joiner: 0 }) },
  updatedat: { type: Date, default: Date.now },
});

export default mongoose.model('xosession', xoschema);
