import mongoose from 'mongoose';

// A live, shared tap-race between the two partners of a home.
const racesessionschema = new mongoose.Schema({
  linkcode:    { type: String, required: true, lowercase: true, trim: true, unique: true },
  status:      { type: String, enum: ['waiting', 'racing', 'finished'], default: 'waiting' },
  joined:      { type: [String], default: [] },   // roles currently in the race
  startat:     { type: Date, default: null },      // synced race start time
  creatortaps: { type: Number, default: 0 },
  joinertaps:  { type: Number, default: 0 },
  updatedat:   { type: Date, default: Date.now },
});

export default mongoose.model('racesession', racesessionschema);
