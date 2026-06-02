import mongoose from 'mongoose';

// A shared home keyed by its bond code, so both partners connect to the SAME home.
const homenodeschema = new mongoose.Schema({
  linkcode:     { type: String, required: true, lowercase: true, trim: true, unique: true },
  homename:     { type: String, default: 'our sanctuary' },
  creatorname:  { type: String, default: '' },
  joinername:   { type: String, default: '' },
  // A home belongs to exactly two people, identified by email. Once both
  // slots are taken the bond code stops working for anyone else.
  members:      { type: [String], default: [] },   // lowercased emails, max 2
  creatoremail: { type: String, default: '', lowercase: true, trim: true },
  joineremail:  { type: String, default: '', lowercase: true, trim: true },
  anniversary:  { type: String, default: '' },   // ISO date — shared by both partners
  createdat:    { type: Date, default: Date.now },
});

export default mongoose.model('homenode', homenodeschema);
