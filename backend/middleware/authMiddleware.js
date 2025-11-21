const jwt = require('jsonwebtoken');
const mysql = require('../utils/mysql');

module.exports = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || (req.cookies && req.cookies.token);
    let token = null;
    if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) token = authHeader.split(' ')[1];
    else if (req.cookies && req.cookies.token) token = req.cookies.token;
    if (!token) return res.status(401).json({ message: 'Not authorized' });

    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    const user = await mysql.getUserById(decoded.id);
    if (!user) return res.status(401).json({ message: 'User not found' });
    // Provide legacy _id property used around code
    req.user = { _id: user.id, id: user.id, email: user.email, name: user.name, phone: user.phone };
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Not authorized', error: err.message });
  }
};
