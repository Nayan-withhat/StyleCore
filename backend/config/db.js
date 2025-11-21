// MongoDB connection removed - using SQL (MySQL/SQLite) via utils/mysql.js
// This file is kept for backward compatibility but does nothing

module.exports = async () => {
  console.log('✅ Database initialized via utils/mysql.js (SQLite or MySQL)');
  return null;
};
