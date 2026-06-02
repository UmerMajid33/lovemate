import express from 'express';
import wallet from '../models/wallet.js';
import inventory from '../models/inventory.js';

const router = express.Router();

export const CATALOG = [
  { id: 'gift_rose',      name: 'rose bouquet',   price: 3000,  category: 'gift',  icon: 'rose' },
  { id: 'gift_chocolate', name: 'chocolate box',   price: 1500,  category: 'gift',  icon: 'chocolate' },
  { id: 'gift_star',      name: 'shooting star',   price: 6000,  category: 'gift',  icon: 'star' },
  { id: 'gift_balloon',   name: 'heart balloon',   price: 4000,  category: 'gift',  icon: 'balloon' },
  { id: 'gift_teddy',     name: 'teddy bear',      price: 12000, category: 'gift',  icon: 'teddy' },
  { id: 'gift_diamond',   name: 'diamond gem',     price: 50000, category: 'gift',  icon: 'diamond' },
  { id: 'badge_flame',    name: 'flame badge',     price: 8000,  category: 'badge', icon: 'flame' },
  { id: 'badge_crown',    name: 'crown badge',     price: 25000, category: 'badge', icon: 'crown' },
  { id: 'badge_lucky',    name: 'lucky charm',     price: 2000,  category: 'badge', icon: 'lucky' },
  { id: 'stamp_love',     name: 'love stamp',      price: 1000,  category: 'stamp', icon: 'love' },
];

async function deduct(linkcode, role, amount, description) {
  const w = await wallet.findOne({ linkcode, role });
  if (!w || w.balance < amount) throw new Error('insufficient fc');
  await wallet.findOneAndUpdate(
    { linkcode, role },
    { $inc: { balance: -amount }, $push: { transactions: { type: 'spend', amount, description } } }
  );
  return w.balance - amount;
}

// GET /api/shop/catalog
router.get('/catalog', (req, res) => res.status(200).json({ items: CATALOG }));

// POST /api/shop/buy  — buy an item for yourself
router.post('/buy', async (req, res) => {
  const { linkcode, role, name, itemid } = req.body;
  const item = CATALOG.find(i => i.id === itemid);
  if (!item) return res.status(404).json({ error: 'item not found' });
  try {
    const newbal = await deduct(linkcode.toLowerCase(), role, item.price, `bought ${item.name}`);
    await inventory.create({ linkcode: linkcode.toLowerCase(), ownerrole: role, itemid: item.id, itemname: item.name, itemprice: item.price, source: 'purchased' });
    res.status(200).json({ ok: true, newbalance: newbal });
  } catch (err) {
    res.status(400).json({ error: err.message || 'purchase failed' });
  }
});

// POST /api/shop/gift  — buy an item and send to partner
router.post('/gift', async (req, res) => {
  const { linkcode, fromrole, itemid } = req.body;
  const torole = fromrole === 'creator' ? 'joiner' : 'creator';
  const item   = CATALOG.find(i => i.id === itemid);
  if (!item) return res.status(404).json({ error: 'item not found' });
  try {
    const newbal = await deduct(linkcode.toLowerCase(), fromrole, item.price, `gifted ${item.name} to partner`);
    await inventory.create({ linkcode: linkcode.toLowerCase(), ownerrole: torole, itemid: item.id, itemname: item.name, itemprice: item.price, source: 'gifted', giftedfrom: fromrole });
    res.status(200).json({ ok: true, newbalance: newbal });
  } catch (err) {
    res.status(400).json({ error: err.message || 'gift failed' });
  }
});

// GET /api/shop/inventory/:linkcode/:role
router.get('/inventory/:linkcode/:role', async (req, res) => {
  try {
    const items = await inventory.find({
      linkcode: req.params.linkcode.toLowerCase(), ownerrole: req.params.role,
    }).sort({ acquiredat: -1 }).lean();
    res.status(200).json({ items });
  } catch (err) {
    res.status(500).json({ error: 'failed to fetch inventory' });
  }
});

export default router;
