import { query } from '../utils/db';

(async () => {
  try {
    const columns = await query('DESCRIBE users');
    console.log('Users table columns:');
    columns.forEach((c: any) => console.log(`  - ${c.Field} (${c.Type})`));
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();
