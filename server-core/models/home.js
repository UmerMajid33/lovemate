import mongoose from 'mongoose';

const homeschema = new mongoose.Schema({
  homename: { type: String, required: true },
  // lowercase: true forces 'MATE-1234' to be saved as 'mate-1234'
  invitecode: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
  partnera: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
  partnerb: { type: mongoose.Schema.Types.ObjectId, ref: 'user', default: null },
  status: { type: String, enum: ['pending', 'active'], default: 'pending', lowercase: true },
  createdat: { type: Date, default: Date.now }
});

export default mongoose.model('home', homeschema);