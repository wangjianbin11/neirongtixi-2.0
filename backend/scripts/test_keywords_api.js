/**
 * 测试关键词API
 * 运行: node scripts/test_keywords_api.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const http = require('http');

// ANSI颜色代码
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

async function testApi(endpoint, method = 'GET', body = null) {
  const options = {
    hostname: 'localhost',
    port: process.env.PORT || 4000,
    path: `/api/v1${endpoint}`,
    method: method,
    headers: {
      'Content-Type': 'application/json',
      // 注意：实际使用时需要有效的JWT token
      // 'Authorization': 'Bearer YOUR_TOKEN_HERE'
    }
  };

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
  log('\n====================================', 'cyan');
  log('关键词API测试工具', 'cyan');
  log('====================================\n', 'cyan');

  // 1. 测试健康检查
  log('1. 测试服务器健康状态...', 'blue');
  const healthCheck = await testApi('/health');
  if (healthCheck.error) {
    log(`  ✗ 服务器未运行: ${healthCheck.error}`, 'red');
    log('  请先启动后端服务器: npm run dev', 'yellow');
    return;
  }
  log(`  ✓ 服务器运行中 (状态码: ${healthCheck.statusCode})\n`, 'green');

  // 2. 测试关键词列表API（无需认证）
  log('2. 测试关键词列表API...', 'blue');
  const keywordsList = await testApi('/keywords?page=1&pageSize=5');

  if (keywordsList.error) {
    log(`  ✗ API请求失败: ${keywordsList.error}`, 'red');
  } else if (keywordsList.statusCode === 401) {
    log(`  ⚠ 需要认证 (状态码: 401)`, 'yellow');
    log('  这是正常的，API需要JWT token\n', 'green');
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
    log(`  响应: ${JSON.stringify(keywordsList.data).substring(0, 200)}...`, 'yellow');
  }
  console.log();

  // 3. 测试关键词统计API
  log('3. 测试关键词统计API...', 'blue');
  const keywordsStats = await testApi('/keywords/stats');

  if (keywordsStats.error) {
    log(`  ✗ API请求失败: ${keywordsStats.error}`, 'red');
  } else if (keywordsStats.statusCode === 401) {
    log(`  ⚠ 需要认证 (状态码: 401)`, 'yellow');
    log('  这是正常的，API需要JWT token\n', 'green');
  } else if (keywordsStats.statusCode === 200) {
    log(`  ✓ API返回成功 (状态码: 200)`, 'green');
    if (keywordsStats.data.success && keywordsStats.data.data) {
      log(`  ✓ 返回数据格式正确`, 'green');
      const stats = keywordsStats.data.data;
      log(`  - 总数: ${stats.total}`, 'cyan');
      log(`  - 按状态分组: ${JSON.stringify(stats.byStatus)}`, 'cyan');
    }
  }
  console.log();

  log('\n====================================', 'cyan');
  log('测试完成', 'cyan');
  log('====================================\n', 'cyan');
  log('提示：API需要认证才能访问完整数据', 'yellow');
  log('请确保后端服务器正在运行 (npm run dev)', 'yellow');
  log('并使用有效的JWT token进行认证\n', 'yellow');
}

main();
