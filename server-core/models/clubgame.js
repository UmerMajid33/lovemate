import mongoose from 'mongoose';

// A club multiplayer game session: host invites, members join, game starts when
// the lobby is full, everyone plays the same seed, scores rank the winner.
const cgPlayer = new mongoose.Schema({
  email: { type: String, lowercase: true, trim: true },
  name:  { type: String, default: '' },
  score: { type: Number, default: null },
  done:  { type: Boolean, default: false },
}, { _id: false });

const clubgameschema = new mongoose.Schema({
  clubcode:  { type: String, required: true, lowercase: true, trim: true, index: true },
  game:      { type: String, default: 'racer' },
  hostemail: { type: String, lowercase: true, trim: true },
  required:  { type: Number, default: 2 },              // total players incl. host
  status:    { type: String, enum: ['lobby', 'playing', 'done'], default: 'lobby' },
  seed:      { type: Number, default: 0 },
  startat:   { type: Date, default: null },
  players:   { type: [cgPlayer], default: [] },
  // turn-based shared-state games (carrom): authoritative board posted by the shooter
  turnindex: { type: Number, default: 0 },
  state:     { type: mongoose.Schema.Types.Mixed, default: null },
  scoremap:  { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
  createdat: { type: Date, default: Date.now },
});

export default mongoose.model('clubgame', clubgameschema);
