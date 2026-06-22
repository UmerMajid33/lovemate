import mongoose from 'mongoose';

// Turn-based couple carrom, keyed by the home linkcode. creator = turn 0, joiner = 1.
const carromduelschema = new mongoose.Schema({
  linkcode:  { type: String, required: true, lowercase: true, trim: true, unique: true },
  state:     { type: mongoose.Schema.Types.Mixed, default: null },   // { coins, striker }
  turn:      { type: Number, default: 0 },                            // 0 creator, 1 joiner
  scoremap:  { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
  status:    { type: String, enum: ['playing', 'done'], default: 'playing' },
  updatedat: { type: Date, default: Date.now },
});

export default mongoose.model('carromduel', carromduelschema);
