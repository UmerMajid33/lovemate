import mongoose from 'mongoose';

const gamelobbyschema = new mongoose.Schema({
  linkcode:  { type: String, required: true, lowercase: true, trim: true, unique: true },
  status:    { type: String, enum: ['idle', 'pending', 'active'], default: 'idle' },
  fromrole:  { type: String, enum: ['creator', 'joiner', null], default: null }, // who sent the invite
  fromname:  { type: String, default: '' },
  game:      { type: String, default: '' },   // which specific game the invite is for ('' = arena)
  updatedat: { type: Date, default: Date.now },
});

export default mongoose.model('gamelobby', gamelobbyschema);
