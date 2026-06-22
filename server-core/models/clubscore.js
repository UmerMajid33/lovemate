import mongoose from 'mongoose';

// One row per (club, member, game) holding that member's BEST score in the game.
const clubscoreschema = new mongoose.Schema({
  clubcode:  { type: String, required: true, lowercase: true, trim: true, index: true },
  email:     { type: String, lowercase: true, trim: true },
  name:      { type: String, default: '' },
  game:      { type: String, default: '' },
  best:      { type: Number, default: 0 },
  updatedat: { type: Date, default: Date.now },
});

clubscoreschema.index({ clubcode: 1, email: 1, game: 1 }, { unique: true });

export default mongoose.model('clubscore', clubscoreschema);
