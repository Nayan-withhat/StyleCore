const { query } = require('../config/mysql');
const bcrypt = require('bcryptjs');
const mysql = require('../utils/mysql');

// User model using SQL queries
class User {
  constructor(data = {}) {
    Object.assign(this, data);
    this.addresses = this.addresses || [];
  }

  async save() {
    if (this.id) {
      // Update existing user
      await mysql.updateUserFields(this.id, {
        name: this.name,
        email: this.email,
        phone: this.phone,
        is_verified: this.isVerified ? 1 : 0,
        is_phone_verified: this.isPhoneVerified ? 1 : 0
      });
    } else {
      // Create new user
      this.id = this.id || require('crypto').randomUUID();
      await mysql.createUser({
        id: this.id,
        name: this.name,
        email: this.email,
        passwordHash: this.password,
        phone: this.phone,
        isPhoneVerified: this.isPhoneVerified ? 1 : 0,
        isVerified: this.isVerified ? 1 : 0
      });
    }
    return User.findById(this.id);
  }

  static async findById(id) {
    const user = await mysql.getUserById(id);
    if (!user) return null;
    // Load addresses for this user
    const addresses = await mysql.getAddressesByUserId(id);
    return new User({
      id: user.id,
      _id: user.id, // Legacy compatibility
      name: user.name,
      email: user.email,
      password: user.password,
      phone: user.phone,
      isPhoneVerified: user.is_phone_verified === 1,
      isVerified: user.is_verified === 1,
      refreshTokens: user.refresh_tokens || [],
      wishlist: (() => { try { return Array.isArray(user.wishlist) ? user.wishlist : JSON.parse(user.wishlist || '[]'); } catch(e) { return []; } })(),
      addresses: addresses || []
    });
  }

  static async findByEmail(email) {
    const user = await mysql.getUserByEmail(email);
    if (!user) return null;
    const addresses = await mysql.getAddressesByUserId(user.id);
    return new User({
      id: user.id,
      _id: user.id, // Legacy compatibility
      name: user.name,
      email: user.email,
      password: user.password,
      phone: user.phone,
      isPhoneVerified: user.is_phone_verified === 1,
      isVerified: user.is_verified === 1,
      refreshTokens: user.refresh_tokens || [],
      wishlist: (() => { try { return Array.isArray(user.wishlist) ? user.wishlist : JSON.parse(user.wishlist || '[]'); } catch(e) { return []; } })(),
      addresses: addresses || []
    });
  }

  static async findByIdAndUpdate(id, updates, opts = {}) {
    const existing = await User.findById(id);
    if (!existing) return null;
    const updated = Object.assign({}, existing, updates);
    const u = new User(updated);
    await u.save();
    if (opts && opts.new) return User.findById(id);
    return null;
  }

  static async findByIdAndDelete(id) {
    await query(`DELETE FROM addresses WHERE user_id = ?`, [id]);
    await query(`DELETE FROM users WHERE id = ?`, [id]);
  }

  select(fields) {
    // Mock mongoose select for backwards compatibility
    // Remove fields if prefixed with '-'
    const omit = fields.split(' ').filter(f => f.startsWith('-')).map(f => f.substring(1));
    const result = { ...this };
    omit.forEach(f => delete result[f]);
    return result;
  }

  comparePassword(candidate) {
    return bcrypt.compare(candidate, this.password || '');
  }
}

module.exports = User;
