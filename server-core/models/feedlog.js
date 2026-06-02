import mongoose from 'mongoose';

const feedlogschema = new mongoose.Schema({
  linkcode:    { type: String, required: true, lowercase: true, trim: true, index: true },
  cardid:      { type: String, required: true },
  role:        { type: String, enum: ['creator', 'joiner'], required: true },
  partnername: { type: String, default: '' },
  date:        { type: String, required: true }, // YYYY-MM-DD — scopes completions to one day
  completedat: { type: Date, default: Date.now },
});

// One completion per card per role per day per home
feedlogschema.index({ linkcode: 1, cardid: 1, role: 1, date: 1 }, { unique: true });

export default mongoose.model('feedlog', feedlogschema);
