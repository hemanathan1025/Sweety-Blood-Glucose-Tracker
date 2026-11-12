// Handles account registration, login, and profile requests.
const { pool } = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// The token carries the user ID used by private route checks.
function generateToken(user) {
  if (!process.env.JWT_SECRET) throw new Error('JWT authentication is not configured.');
  return jwt.sign(
    { userId: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1d' },
  );
}

function validEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Hash the password before saving a new account.
async function register(req, res) {
  const body = req.body || {};
  const fullName = body.full_name ?? body.name;
  const { email, password } = body;
  if (typeof fullName !== 'string' || !fullName.trim() || typeof email !== 'string' || !validEmail(email.trim()) || typeof password !== 'string') {
    return res.status(400).json({ success: false, message: 'Name, valid email and password are required.' });
  }
  if (password.length < 8 || password.length > 128) {
    return res.status(400).json({ success: false, message: 'Password must contain 8 to 128 characters.' });
  }

  try {
    const normalizedEmail = email.trim().toLowerCase();
    const passwordHash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      `INSERT INTO users (full_name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, full_name, email, created_at`,
      [fullName.trim(), normalizedEmail, passwordHash],
    );
    const user = result.rows[0];
    return res.status(201).json({ success: true, message: 'Registration successful.', token: generateToken(user), user });
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ success: false, message: 'Email already registered.' });
    return res.status(500).json({ success: false, message: 'Registration failed.' });
  }
}

// Compare the submitted password with its saved bcrypt hash.
async function login(req, res) {
  const { email, password } = req.body || {};
  if (typeof email !== 'string' || !validEmail(email.trim()) || typeof password !== 'string' || !password) {
    return res.status(400).json({ success: false, message: 'Valid email and password are required.' });
  }

  try {
    const result = await pool.query(
      `SELECT id, full_name, email, password_hash, is_active
       FROM users WHERE email = $1`,
      [email.trim().toLowerCase()],
    );
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }
    if (!user.is_active) return res.status(403).json({ success: false, message: 'Account is inactive.' });
    const safeUser = { id: user.id, full_name: user.full_name, email: user.email };
    return res.status(200).json({ success: true, message: 'Login successful.', token: generateToken(user), user: safeUser });
  } catch {
    return res.status(500).json({ success: false, message: 'Login failed.' });
  }
}

// Use the verified token ID to load the current profile.
async function getProfile(req, res) {
  try {
    const result = await pool.query(
      `SELECT id, full_name, email, created_at
       FROM users WHERE id = $1 AND is_active = TRUE`,
      [req.user.userId],
    );
    if (!result.rowCount) return res.status(404).json({ success: false, message: 'User not found.' });
    return res.status(200).json({ success: true, user: result.rows[0] });
  } catch {
    return res.status(500).json({ success: false, message: 'Unable to fetch profile.' });
  }
}


// This changes the name only; email and password stay untouched.
async function updateProfile(req, res) {
  const body = req.body || {};
  const fullName = body.full_name ?? body.name;
  if (typeof fullName !== 'string' || !fullName.trim()) {
    return res.status(400).json({ success: false, message: 'Name is required.' });
  }
  if (fullName.trim().length > 120) {
    return res.status(400).json({ success: false, message: 'Name must be 120 characters or fewer.' });
  }

  try {
    const result = await pool.query(
      'UPDATE users SET full_name = $1 WHERE id = $2 AND is_active = TRUE RETURNING id, full_name, email, created_at',
      [fullName.trim(), req.user.userId],
    );
    if (!result.rowCount) return res.status(404).json({ success: false, message: 'User not found.' });
    return res.status(200).json({ success: true, message: 'Profile updated.', user: result.rows[0] });
  } catch {
    return res.status(500).json({ success: false, message: 'Unable to update profile.' });
  }
}

module.exports = { register, login, getProfile, updateProfile };