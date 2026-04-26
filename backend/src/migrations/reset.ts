import { query } from '../utils/db';

async function resetTables() {
  console.log('Dropping workflow tables...');

  try {
    await query('DROP TABLE IF EXISTS workflow_execution_logs');
    console.log('  ✓ Dropped workflow_execution_logs');

    await query('DROP TABLE IF EXISTS workflow_executions');
    console.log('  ✓ Dropped workflow_executions');

    await query('DROP TABLE IF EXISTS drafts');
    console.log('  ✓ Dropped drafts');

    await query('DROP TABLE IF EXISTS workflows');
    console.log('  ✓ Dropped workflows');

    await query('DROP TABLE IF EXISTS schema_migrations');
    console.log('  ✓ Dropped schema_migrations');

    console.log('Reset completed!');
  } catch (error) {
    console.error('Reset failed:', error);
    throw error;
  }
}

resetTables()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
