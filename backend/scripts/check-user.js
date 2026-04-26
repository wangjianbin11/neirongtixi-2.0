const { query, queryOne } = require('../dist/utils/db');

async function checkUser() {
  try {
    const user = await queryOne('SELECT id, username, email, password, role, status FROM users WHERE username = ?', ['admin']);

    if (user) {
      console.log('User found:');
      console.log('  ID:', user.id);
      console.log('  Username:', user.username);
      console.log('  Email:', user.email);
      console.log('  Password:', user.password ? user.password.substring(0, 20) + '...' : 'NULL or EMPTY');
      console.log('  Role:', user.role);
      console.log('  Status:', user.status);
    } else {
      console.log('User not found!');
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    process.exit(0);
  }
}

checkUser();
