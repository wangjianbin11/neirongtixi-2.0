const mysql = require('mysql2/promise');

async function checkSkills() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'f78d06aa32c2',
    database: 'asgbook',
  });

  try {
    console.log('=== 检查技能模板数据 ===\n');

    const [skills] = await connection.query('SELECT code, name, category, is_active FROM skill_templates LIMIT 10');

    if (skills.length === 0) {
      console.log('❌ 数据库中没有技能模板数据！');
      console.log('\n需要插入技能模板数据...');
      return;
    }

    console.log(`✅ 找到 ${skills.length} 个技能模板:`);
    skills.forEach(skill => {
      console.log(`  - ${skill.code}: ${skill.name} (${skill.category}) ${skill.is_active ? '✓' : '✗'}`);
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await connection.end();
  }
}

checkSkills();
