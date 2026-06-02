import mongoose from 'mongoose';

const txschema = new mongoose.Schema({
  type:        { type: String, enum: ['earn', 'spend'], required: true },
  amount:      { type: Number, required: true },
  description: { type: String, default: '' },
  at:          { type: Date, default: Date.now },
}, { _id: false });

const walletschema = new mongoose.Schema({
  linkcode:     { type: String, required: true, lowercase: true, trim: true },
  role:         { type: String, enum: ['creator', 'joiner'], required: true },
  name:         { type: String, default: '' },
  balance:      { type: Number, default: 0 },
  transactions: { type: [txschema], default: [] },
});

walletschema.index({ linkcode: 1, role: 1 }, { unique: true });

export default mongoose.model('wallet', walletschema);
