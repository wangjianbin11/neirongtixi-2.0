const { query, queryOne } = require('../dist/utils/db');

async function checkUserStatus() {
  try {
    // Check if is_active column exists
    const columns = await query('SHOW COLUMNS FROM users WHERE Field = ?', ['is_active']);

    if (columns.length === 0) {
      console.log('Adding is_active column...');
      await query(`ALTER TABLE users ADD COLUMN is_active TINYINT(1) DEFAULT 1`);
      await query(`UPDATE users SET is_active = 1 WHERE status = 'active'`);
      console.log('Done!');
    } else {
      console.log('is_active column already exists');
    }

    const user = await queryOne('SELECT id, username, status, is_active FROM users WHERE username = ?', ['admin']);

    if (user) {
      console.log('\nUser status:');
      console.log('  status:', user.status);
      console.log('  is_active:', user.is_active);
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    process.exit(0);
  }
}

checkUserStatus();
