import mongoose from 'mongoose';

// A live penalty shootout: one partner shoots, the other keeps goal.
const goalsessionschema = new mongoose.Schema({
  linkcode:    { type: String, required: true, lowercase: true, trim: true, unique: true },
  status:      { type: String, enum: ['waiting', 'playing', 'finished'], default: 'waiting' },
  joined:      { type: [String], default: [] },
  shooterrole: { type: String, default: 'creator' }, // which role shoots this match
  round:       { type: Number, default: 0 },
  totalrounds: { type: Number, default: 5 },
  shooterpick: { type: String, default: null },       // 'left' | 'center' | 'right'
  keeperpick:  { type: String, default: null },
  shootergoals:{ type: Number, default: 0 },
  // last resolved round (for the reveal animation)
  lastround:   { type: Number, default: -1 },
  lastshoot:   { type: String, default: null },
  lastkeep:    { type: String, default: null },
  lastgoal:    { type: Boolean, default: false },
  updatedat:   { type: Date, default: Date.now },
});

export default mongoose.model('goalsession', goalsessionschema);
