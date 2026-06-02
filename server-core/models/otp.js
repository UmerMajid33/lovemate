import mongoose from 'mongoose';

const otpschema = new mongoose.Schema({
  email:     { type: String, required: true, lowercase: true, trim: true, unique: true },
  code:      { type: String, required: true },
  expiresat: { type: Date, required: true },
  attempts:  { type: Number, default: 0 },
});

export default mongoose.model('otp', otpschema);
