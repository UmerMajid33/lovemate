import express from 'express';
import home from './home.js';
import user from '../models/user.js';

const router = express.Router();

// 1. Create a New Home and Generate a Lowercase Code
router.post('/create-home', async (req, res) => {
  const { homename, userid } = req.body;

  try {
    const uniquenumber = Math.floor(1000 + Math.random() * 9000);
    // Explicitly lowercase the generated prefix token string
    const invitecode = `mate-${uniquenumber}`.toLowerCase();

    const newhome = new home({
      homename,
      partnera: userid,
      invitecode,
      status: 'pending'
    });

    await newhome.save();

    await user.findByIdAndUpdate(userid, { 
      currenthomeid: newhome._id,
      role: 'partner_a'
    });

    res.status(201).json({ 
      message: 'home setup initialized successfully', 
      invitecode, 
      homeid: newhome._id 
    });
  } catch (error) {
    res.status(500).json({ error: 'failed to build the home profile' });
  }
});

// 2. Enter an Existing Home using Lowercase Sanitization
router.post('/enter-home', async (req, res) => {
  let { invitecode, userid } = req.body;

  try {
    // Sanitize incoming input immediately before passing to the query engine
    invitecode = invitecode.trim().toLowerCase();

    const targethome = await home.findOne({ invitecode, status: 'pending' });

    if (!targethome) {
      return res.status(404).json({ error: 'invalid or expired invite code' });
    }

    if (targethome.partnera.toString() === userid) {
      return res.status(400).json({ error: 'you cannot join your own home' });
    }

    targethome.partnerb = userid;
    targethome.status = 'active';
    targethome.invitecode = undefined; 
    await targethome.save();

    await user.findByIdAndUpdate(userid, { 
      currenthomeid: targethome._id,
      role: 'partner_b'
    });

    res.status(200).json({ 
      message: 'welcome inside! your shared space is active.', 
      homeid: targethome._id 
    });
  } catch (error) {
    res.status(500).json({ error: 'failed to join the home' });
  }
});

export default router;