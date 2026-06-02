import mongoose from 'mongoose';

const gamesessionschema = new mongoose.Schema({
  linkcode:           { type: String, required: true, lowercase: true, trim: true, index: true },
  gametype:           { type: String, required: true },         // 'reaction' | 'memory' | 'emoji'
  challengerrole:     { type: String, enum: ['creator', 'joiner'], required: true },
  challengername:     { type: String, default: '' },
  challengerscore:    { type: Number, default: null },
  opponentname:       { type: String, default: '' },
  opponentscore:      { type: Number, default: null },
  status:             { type: String, enum: ['waiting', 'completed', 'expired'], default: 'waiting' },
  winner:             { type: String, enum: ['challenger', 'opponent', 'tie', null], default: null },
  fcearnedchallenger: { type: Number, default: 0 },
  fcearnedopponent:   { type: Number, default: 0 },
  createdat:          { type: Date, default: Date.now },
  completedat:        { type: Date, default: null },
});

export default mongoose.model('gamesession', gamesessionschema);
