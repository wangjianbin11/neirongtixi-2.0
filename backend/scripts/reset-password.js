const bcrypt = require('bcrypt');
const { query, queryOne } = require('../dist/utils/db');

async function resetPassword() {
  try {
    console.log('Resetting admin password...\n');

    const user = await queryOne('SELECT id FROM users WHERE username = ?', ['admin']);

    if (user) {
      const hashedPassword = await bcrypt.hash('admin123', 10);

      await query(`UPDATE users SET password = ? WHERE id = ?`, [hashedPassword, user.id]);

      console.log('Password reset successful!');
      console.log('Username: admin');
      console.log('Password: admin123');
    } else {
      console.log('Admin user not found!');
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    process.exit(0);
  }
}

resetPassword();
