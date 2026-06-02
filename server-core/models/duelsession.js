import mongoose from 'mongoose';

// Generic head-to-head session for any score-based two-player game.
// `timed` games (tug, climbs) use startat for a synced window; others
// rely on each client's own timer and report done=true when finished.
const duelsessionschema = new mongoose.Schema({
  linkcode:    { type: String, required: true, lowercase: true, trim: true, unique: true },
  gametype:    { type: String, default: '' },
  status:      { type: String, enum: ['waiting', 'playing'], default: 'waiting' },
  joined:      { type: [String], default: [] },
  startat:     { type: Date, default: null },
  seed:        { type: Number, default: 0 },   // shared randomness (crash time, multiplier windows…)
  creatorscore:{ type: Number, default: 0 },
  joinerscore: { type: Number, default: 0 },
  creatordone: { type: Boolean, default: false },
  joinerdone:  { type: Boolean, default: false },
  updatedat:   { type: Date, default: Date.now },
});

export default mongoose.model('duelsession', duelsessionschema);
