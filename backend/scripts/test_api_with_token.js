/**
 * API测试脚本 - 使用认证token测试API
 * 运行: node scripts/test_api_with_token.js YOUR_TOKEN_HERE
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const http = require('http');

// ANSI颜色
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testApi(endpoint, method = 'GET', body = null, token = null) {
  const options = {
    hostname: 'localhost',
    port: process.env.PORT || 4000,
    path: `/api/v1${endpoint}`,
    method: method,
    headers: {
      'Content-Type': 'application/json',
    }
  };

  if (token) {
    options.headers['Authorization'] = `Bearer ${token}`;
  }

  if (body) {
    const bodyStr = JSON.stringify(body);
    options.headers['Content-Length'] = Buffer.byteLength(bodyStr);
  }

  return new Promise((resolve) => {
    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({
            statusCode: res.statusCode,
            data: jsonData
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            data: data
          });
        }
      });
    });

    req.on('error', (error) => {
      resolve({
        error: error.message
      });
    });

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

async function main() {
  const token = process.argv[2];

  if (!token) {
    log('\n====================================', 'cyan');
    log('API测试工具 (需要认证)', 'cyan');
    log('====================================\n', 'cyan');
    log('用法: node scripts/test_api_with_token.js YOUR_ACCESS_TOKEN\n', 'yellow');
    log('获取token方式:', 'yellow');
    log('1. 在浏览器登录后，打开开发者工具', 'white');
    log('2. 进入 Application/Storage -> Local Storage', 'white');
    log('3. 复制 accessToken 的值\n', 'white');
    return;
  }

  log('\n====================================', 'cyan');
  log('API测试工具 (已提供token)', 'cyan');
  log('====================================\n', 'cyan');

  // 1. 测试认证状态
  log('1. 测试认证状态...', 'blue');
  const authTest = await testApi('/auth/me', 'GET', null, token);
  if (authTest.statusCode === 200) {
    log(`  ✓ 认证成功`, 'green');
    log(`  用户: ${authTest.data.data?.user?.username || 'unknown'}\n`, 'cyan');
  } else if (authTest.statusCode === 401) {
    log(`  ✗ Token无效或已过期 (状态码: 401)`, 'red');
    log(`  响应: ${JSON.stringify(authTest.data).substring(0, 200)}\n`, 'yellow');
    return;
  } else {
    log(`  ⚠ 状态码: ${authTest.statusCode}`, 'yellow');
    log(`  响应: ${JSON.stringify(authTest.data).substring(0, 200)}\n`, 'yellow');
  }

  // 2. 测试关键词列表
  log('2. 测试关键词列表API...', 'blue');
  const keywordsList = await testApi('/keywords?page=1&pageSize=5', 'GET', null, token);

  if (keywordsList.error) {
    log(`  ✗ API请求失败: ${keywordsList.error}`, 'red');
  } else if (keywordsList.statusCode === 200) {
    log(`  ✓ API返回成功 (状态码: 200)`, 'green');
    if (keywordsList.data.success && keywordsList.data.data) {
      log(`  ✓ 返回数据格式正确`, 'green');
      log(`  - 关键词数量: ${keywordsList.data.data.keywords?.length || 0}`, 'cyan');
      log(`  - 总记录数: ${keywordsList.data.data.total || 0}`, 'cyan');
      if (keywordsList.data.data.keywords && keywordsList.data.data.keywords.length > 0) {
        log(`  - 示例关键词: ${keywordsList.data.data.keywords[0].keyword}`, 'cyan');
      }
    }
  } else {
    log(`  ⚠ 状态码: ${keywordsList.statusCode}`, 'yellow');
    log(`  响应: ${JSON.stringify(keywordsList.data).substring(0, 500)}`, 'yellow');
  }
  console.log();

  // 3. 测试未读通知数量
  log('3. 测试未读通知数量API...', 'blue');
  const unreadCount = await testApi('/notifications/unread-count', 'GET', null, token);

  if (unreadCount.error) {
    log(`  ✗ API请求失败: ${unreadCount.error}`, 'red');
  } else if (unreadCount.statusCode === 200) {
    log(`  ✓ API返回成功 (状态码: 200)`, 'green');
    log(`  完整响应: ${JSON.stringify(unreadCount.data)}`, 'cyan');
    if (unreadCount.data.success && unreadCount.data.data) {
      log(`  ✓ 返回数据格式正确`, 'green');
      log(`  - 未读数量: ${unreadCount.data.data.count}`, 'cyan');
    } else {
      log(`  ⚠ 数据格式异常`, 'yellow');
    }
  } else {
    log(`  ⚠ 状态码: ${unreadCount.statusCode}`, 'yellow');
    log(`  响应: ${JSON.stringify(unreadCount.data)}`, 'yellow');
  }
  console.log();

  // 4. 测试通知列表
  log('4. 测试通知列表API...', 'blue');
  const notifications = await testApi('/notifications?page=1&pageSize=5', 'GET', null, token);

  if (notifications.error) {
    log(`  ✗ API请求失败: ${notifications.error}`, 'red');
  } else if (notifications.statusCode === 200) {
    log(`  ✓ API返回成功 (状态码: 200)`, 'green');
    if (notifications.data.success && notifications.data.data) {
      log(`  ✓ 返回数据格式正确`, 'green');
      log(`  - 通知数量: ${notifications.data.data.notifications?.length || 0}`, 'cyan');
      log(`  - 总记录数: ${notifications.data.data.total || 0}`, 'cyan');
      log(`  - 未读数量: ${notifications.data.data.unreadCount || 0}`, 'cyan');
    }
  } else {
    log(`  ⚠ 状态码: ${notifications.statusCode}`, 'yellow');
    log(`  响应: ${JSON.stringify(notifications.data).substring(0, 500)}`, 'yellow');
  }
  console.log();

  log('\n====================================', 'cyan');
  log('测试完成', 'cyan');
  log('====================================\n', 'cyan');
}

main();
