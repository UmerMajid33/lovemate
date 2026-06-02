import mongoose from 'mongoose';

const inventoryschema = new mongoose.Schema({
  linkcode:   { type: String, required: true, lowercase: true, trim: true, index: true },
  ownerrole:  { type: String, enum: ['creator', 'joiner'], required: true },
  itemid:     { type: String, required: true },
  itemname:   { type: String, required: true },
  itemprice:  { type: Number, default: 0 },
  source:     { type: String, enum: ['purchased', 'gifted'], required: true },
  giftedfrom: { type: String, default: null },  // role that sent it
  acquiredat: { type: Date, default: Date.now },
});

export default mongoose.model('inventory', inventoryschema);
