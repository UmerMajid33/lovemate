import mongoose from 'mongoose';

const userschema = new mongoose.Schema({
  name: { type: String, required: true },
  // email is strictly lowercased so 'Umer@Example.com' matches 'umer@example.com'
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  currenthomeid: { type: mongoose.Schema.Types.ObjectId, ref: 'home', default: null },
  role: { type: String, enum: ['partner_a', 'partner_b', 'unassigned'], default: 'unassigned', lowercase: true }
});

export default mongoose.model('user', userschema);