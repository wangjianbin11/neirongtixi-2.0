const { query } = require('../dist/utils/db');

async function alterUsersTable() {
  try {
    console.log('Updating users table structure...\n');

    // Add password column
    try {
      await query(`ALTER TABLE users ADD COLUMN password VARCHAR(255) AFTER email`);
      console.log('Added password column');

      // Copy password_hash to password
      await query(`UPDATE users SET password = password_hash WHERE password_hash IS NOT NULL`);
      console.log('Copied password_hash to password');
    } catch (e) {
      if (e.code !== 'ER_DUP_FIELDNAME') {
        throw e;
      }
      console.log('password column already exists');
    }

    console.log('\nDone!');
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    process.exit(0);
  }
}

alterUsersTable();
