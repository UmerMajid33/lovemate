import express from 'express';
import wallet from '../models/wallet.js';

const router = express.Router();

// GET /api/wallet/:linkcode/:role
router.get('/:linkcode/:role', async (req, res) => {
  try {
    const w = await wallet.findOne({
      linkcode: req.params.linkcode.toLowerCase(), role: req.params.role,
    }).lean();
    res.status(200).json(w || { balance: 0, transactions: [] });
  } catch (err) {
    res.status(500).json({ error: 'failed to fetch wallet' });
  }
});

// GET /api/wallet/both/:linkcode — both partners' balances and names
router.get('/both/:linkcode', async (req, res) => {
  try {
    const wallets = await wallet.find({ linkcode: req.params.linkcode.toLowerCase() }).lean();
    const result  = { creator: { balance: 0, name: '' }, joiner: { balance: 0, name: '' } };
    wallets.forEach(w => { result[w.role] = { balance: w.balance, name: w.name }; });
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ error: 'failed to fetch wallets' });
  }
});

export default router;
