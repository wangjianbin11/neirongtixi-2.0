/**
 * 完整数据初始化脚本
 * 用于服务器部署后初始化所有必要数据
 */

import { initWorkflowTemplates } from './initWorkflowTemplates';
import { initBilingualWorkflows } from './initBilingualWorkflows';
import { createTestUser } from './createTestUser';
import { query } from '../utils/db';

async function initAll() {
  console.log('================================');
  console.log('开始初始化数据...');
  console.log('================================\n');

  try {
    // 1. 创建测试用户
    console.log('[1/4] 创建测试用户...');
    await createTestUser();
    console.log('✓ 测试用户创建完成\n');

    // 2. 初始化技能注册表（已在代码中定义）
    console.log('[2/4] 技能注册表...');
    console.log('✓ 技能注册表已在代码中定义（skillRegistry.ts）\n');

    // 3. 初始化工作流模板
    console.log('[3/4] 初始化工作流模板...');
    await initWorkflowTemplates();
    console.log('✓ 工作流模板初始化完成\n');

    // 4. 初始化双语工作流
    console.log('[4/4] 初始化双语工作流...');
    await initBilingualWorkflows();
    console.log('✓ 双语工作流初始化完成\n');

    console.log('================================');
    console.log('✅ 数据初始化完成！');
    console.log('================================\n');

    // 显示统计
    const [workflowCount] = await query('SELECT COUNT(*) as count FROM workflows');
    const [skillNodeCount] = await query('SELECT COUNT(*) as count FROM skill_nodes');
    const [userCount] = await query('SELECT COUNT(*) as count FROM users');

    console.log('数据统计:');
    console.log(`  工作流模板: ${workflowCount[0].count} 个`);
    console.log(`  技能节点: ${skillNodeCount[0].count} 个`);
    console.log(`  用户: ${userCount[0].count} 个\n');

  } catch (error) {
    console.error('初始化失败:', error);
    process.exit(1);
  }
}

initAll();
