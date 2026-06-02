import mongoose from 'mongoose';

const inboxschema = new mongoose.Schema({
  linkcode:  { type: String, required: true, lowercase: true, trim: true, index: true },
  from:      { type: String, enum: ['creator', 'joiner'], required: true },
  fromname:  { type: String, default: '' },
  type:      { type: String, enum: ['letter', 'mood', 'game', 'complaint', 'feed', 'quiz'], required: true },
  emoji:     { type: String, default: '💌' },
  content:   { type: String, required: true },
  game:      { type: String, default: '' },   // game id for 'game' invite messages
  meta:      { type: mongoose.Schema.Types.Mixed, default: null }, // feed verify payload, etc.
  readby:    { type: [String], default: [] },  // array of roles that have read this message
  createdat: { type: Date, default: Date.now },
});

// Fast latest-first retrieval per home
inboxschema.index({ linkcode: 1, createdat: -1 });

export default mongoose.model('inboxmessage', inboxschema);
