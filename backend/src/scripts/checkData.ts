import { query } from '../utils/db';

(async () => {
  try {
    const topics = await query('SELECT COUNT(*) as count FROM topics');
    console.log('Topics count:', topics[0].count);

    const contents = await query('SELECT COUNT(*) as count FROM contents');
    console.log('Contents count:', contents[0].count);

    const topicSamples = await query('SELECT id, title, status FROM topics LIMIT 3');
    console.log('\nSample topics:');
    topicSamples.forEach((t: any) => console.log(`  - ${t.title} (${t.status})`));

    const contentSamples = await query('SELECT id, title, status FROM contents LIMIT 3');
    console.log('\nSample contents:');
    contentSamples.forEach((c: any) => console.log(`  - ${c.title} (${c.status})`));

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();
