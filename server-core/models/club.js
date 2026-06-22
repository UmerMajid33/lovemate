import mongoose from 'mongoose';

// A club is a small friend group (up to 5 members). Entirely separate from `home`.
const clubMemberSchema = new mongoose.Schema({
  email:   { type: String, lowercase: true, trim: true },
  name:    { type: String, default: '' },
  joinedat:{ type: Date, default: Date.now },
}, { _id: false });

const clubschema = new mongoose.Schema({
  clubname:     { type: String, required: true },
  clubcode:     { type: String, unique: true, sparse: true, lowercase: true, trim: true },
  founderemail: { type: String, lowercase: true, trim: true },
  members:      { type: [clubMemberSchema], default: [] },   // hard cap 5, enforced in routes
  createdat:    { type: Date, default: Date.now },
});

export const CLUB_MAX_MEMBERS = 5;

export default mongoose.model('club', clubschema);
