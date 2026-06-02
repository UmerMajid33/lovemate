import express from 'express';
import bcrypt from 'bcrypt';
import user from '../models/user.js';
import otp from '../models/otp.js';
import { sendOtpEmail } from '../mailer.js';

const router = express.Router();

// ─── EMAIL OTP (for non-google registration) ─────────────────────────────────

// POST /api/user/send-otp — generate + email a 6-digit code
router.post('/send-otp', async (req, res) => {
  const { email } = req.body;
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'a valid email is required' });
  }
  try {
    const code      = String(Math.floor(100000 + Math.random() * 900000));
    const expiresat = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    await otp.findOneAndUpdate(
      { email: email.toLowerCase() },
      { code, expiresat, attempts: 0 },
      { upsert: true }
    );
    const emailed = await sendOtpEmail(email, code);
    // In dev (no SMTP configured) we return the code so testing still works.
    res.status(200).json({ ok: true, emailed, devCode: emailed ? undefined : code });
  } catch (error) {
    console.error('❌ send-otp error:', error?.message || error);
    res.status(500).json({ error: 'failed to send verification code' });
  }
});

// POST /api/user/verify-otp — check a code
router.post('/verify-otp', async (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) return res.status(400).json({ error: 'email and code are required' });
  try {
    const rec = await otp.findOne({ email: email.toLowerCase() });
    if (!rec)                       return res.status(400).json({ error: 'no code found — request a new one' });
    if (rec.expiresat < new Date()) return res.status(400).json({ error: 'code expired — request a new one' });
    if (rec.attempts >= 5)          return res.status(400).json({ error: 'too many attempts — request a new code' });
    if (rec.code !== code) {
      rec.attempts += 1; await rec.save();
      return res.status(400).json({ error: 'incorrect code' });
    }
    await otp.deleteOne({ email: email.toLowerCase() });
    res.status(200).json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: 'failed to verify code' });
  }
});

// 1. REGISTRATION ROUTE (Sign Up)
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;

  try {
    // Check if a user with this email already exists
    const existinguser = await user.findOne({ email: email.toLowerCase() });
    if (existinguser) {
      return res.status(400).json({ error: 'an account with this email already exists' });
    }

    // Hash the password so it's encrypted securely in the database
    const saltrounds = 10;
    const hashedpassword = await bcrypt.hash(password, saltrounds);

    // Create the new user profile
    const newuser = new user({
      name,
      email: email.toLowerCase(), // Ensure email is saved in lowercase
      password: hashedpassword
    });

    await newuser.save();

    res.status(201).json({ 
      message: 'account created successfully',
      userid: newuser._id,
      name: newuser.name
    });

  } catch (error) {
    res.status(500).json({ error: 'failed to register user' });
  }
});

// 2. LOGIN ROUTE (Sign In)
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Find the user by email
    const founduser = await user.findOne({ email: email.toLowerCase() });
    if (!founduser) {
      return res.status(400).json({ error: 'invalid email or password' });
    }

    // Compare the entered password with the encrypted database password
    const ismatch = await bcrypt.compare(password, founduser.password);
    if (!ismatch) {
      return res.status(400).json({ error: 'invalid email or password' });
    }

    // Return user details along with their current home status
    res.status(200).json({
      message: 'login successful',
      userid: founduser._id,
      name: founduser.name,
      currenthomeid: founduser.currenthomeid,
      role: founduser.role
    });

  } catch (error) {
    res.status(500).json({ error: 'failed to sign in' });
  }
});

// 3. GOOGLE AUTH (Sign in / up with Google)
router.post('/google', async (req, res) => {
  const { name, email, googleid } = req.body;

  if (!email) return res.status(400).json({ error: 'email is required' });

  try {
    let founduser = await user.findOne({ email: email.toLowerCase() });
    let isNew = false;

    // First time with this Google account → create a record.
    // Google users have no chosen password, so we store a random hashed one.
    if (!founduser) {
      isNew = true;
      const randompassword = await bcrypt.hash(`${googleid || ''}-${Date.now()}`, 10);
      founduser = new user({
        name: name || 'mate',
        email: email.toLowerCase(),
        password: randompassword,
      });
      await founduser.save();
    }

    res.status(200).json({
      message: 'google sign-in successful',
      isNew,
      userid: founduser._id,
      name: founduser.name,
      currenthomeid: founduser.currenthomeid,
      role: founduser.role,
    });
  } catch (error) {
    res.status(500).json({ error: 'google sign-in failed' });
  }
});

export default router;