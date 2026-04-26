import { query } from '../utils/db';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

(async () => {
  try {
    // 检查测试用户是否已存在
    const existing = await query('SELECT id FROM users WHERE email = ?', ['test@test.com']);
    if (existing.length > 0) {
      console.log('Test user already exists');
      console.log('Email: test@test.com');
      console.log('Password: test123456');
      process.exit(0);
    }

    // 创建测试用户
    const id = uuidv4();
    const hashedPassword = await bcrypt.hash('test123456', 10);

    await query(
      `INSERT INTO users (id, email, password, password_hash, full_name, username, role, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, 'test@test.com', hashedPassword, hashedPassword, 'Test User', 'testuser', 'admin', 'active']
    );

    console.log('Test user created successfully!');
    console.log('Email: test@test.com');
    console.log('Password: test123456');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();
