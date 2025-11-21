const User = require('../models/User');
const mysql = require('../utils/mysql');

exports.getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id || req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    const result = user.select('-password -refreshTokens');
    res.json(result);
  } catch (err) { next(err); }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const updates = req.body;
    const user = await User.findByIdAndUpdate(req.user._id || req.user.id, updates, { new: true });
    if (!user) return res.status(404).json({ message: 'User not found' });
    const result = user.select('-password -refreshTokens');
    res.json(result);
  } catch (err) { next(err); }
};

exports.deleteUser = async (req, res, next) => {
  try {
    await User.findByIdAndDelete(req.user._id || req.user.id);
    res.json({ success: true });
  } catch (err) { next(err); }
};

exports.addAddress = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    const b = req.body || {};
    // Normalize incoming address payload
    const normalized = {
      label: b.label || 'Home',
      name: b.fullName || b.name || req.user.name || '',
      street: b.address1 || b.street || '',
      city: b.city || b.district || '',
      state: b.state || '',
      postalCode: b.pincode || b.postalCode || '',
      country: b.country || 'IN',
      phone: b.phone || user.phone || ''
    };
    
    // Save to MySQL/SQLite addresses table
    await mysql.insertAddress(userId, {
      fullName: normalized.name,
      phone: normalized.phone,
      pincode: normalized.postalCode,
      state: normalized.state,
      district: b.district || '',
      city: normalized.city,
      address1: normalized.street,
      landmark: b.landmark || ''
    });
    
    // Return updated user with addresses
    const updated = await User.findById(userId);
    res.json(updated.addresses);
  } catch (err) { next(err); }
};

// Admin actions (create user)
exports.createUser = async (req, res, next) => {
  try {
    const { email, password, role } = req.body;
    const user = new User({ email, password, name: '', role: role || 'user' });
    await user.save();
    res.json({ id: user.id });
  } catch (err) { next(err); }
};
