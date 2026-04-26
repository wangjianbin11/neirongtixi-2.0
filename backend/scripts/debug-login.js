const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

async function debugLogin() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'f78d06aa32c2',
    database: 'asgbook',
  });

  try {
    console.log('=== 检查用户数据 ===\n');

    const [users] = await connection.query('SELECT id, username, email, password, role, is_active FROM users WHERE username = ?', ['admin']);

    if (users.length === 0) {
      console.log('❌ 用户不存在!');
      return;
    }

    const user = users[0];
    console.log('找到用户:');
    console.log('  ID:', user.id);
    console.log('  用户名:', user.username);
    console.log('  邮箱:', user.email);
    console.log('  密码哈希:', user.password.substring(0, 50) + '...');
    console.log('  角色:', user.role);
    console.log('  激活状态:', user.is_active);

    // 测试密码验证
    console.log('\n=== 测试密码验证 ===');
    const testPassword = 'admin123';
    const isValid = await bcrypt.compare(testPassword, user.password);
    console.log('密码 "admin123" 验证结果:', isValid ? '✅ 通过' : '❌ 失败');

    if (!isValid) {
      console.log('\n=== 重置密码 ===');
      const newHash = await bcrypt.hash('admin123', 10);
      await connection.query('UPDATE users SET password = ? WHERE username = ?', [newHash, 'admin']);
      console.log('✅ 密码已重置为: admin123');

      // 验证新密码
      const newIsValid = await bcrypt.compare('admin123', newHash);
      console.log('新密码验证结果:', newIsValid ? '✅ 通过' : '❌ 失败');
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await connection.end();
  }
}

debugLogin();
