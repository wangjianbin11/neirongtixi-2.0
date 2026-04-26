import { query } from '../utils/db';

(async () => {
  try {
    const users = await query('SELECT id, email, role FROM users LIMIT 5');
    console.log('Users in database:');
    users.forEach((u: any) => console.log(`  - ${u.email} (${u.role})`));
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();
