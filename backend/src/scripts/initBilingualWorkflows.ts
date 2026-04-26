import { createBilingualWorkflowTemplate } from '../templates/bilingualWorkflow';
import { workflowService } from '../services/workflowService';

/**
 * 初始化双语内容生成工作流模板
 * 运行此脚本将预定义的工作流模板添加到数据库中
 */
(async () => {
  try {
    console.log('=== 初始化双语内容生成工作流模板 ===\n');

    // 检查现有模板
    const { workflows } = await workflowService.list({
      category: 'bilingual',
      is_template: true,
    });

    console.log('现有的双语工作流模板:');
    workflows.forEach(w => {
      console.log(`  - ${w.name} (${w.id})`);
    });

    // 创建完整版工作流模板
    console.log('\n正在创建完整版双语内容生成工作流模板...');
    const fullWorkflow = await createBilingualWorkflowTemplate();
    console.log(`✓ 已创建: ${fullWorkflow.name} (${fullWorkflow.id})`);

    // 创建简化版工作流模板
    console.log('\n正在创建简化版双语内容生成工作流模板...');
    const { BILINGUAL_SINGLE_PLATFORM_WORKFLOW_TEMPLATE } = await import('../templates/bilingualWorkflow');

    const existingSingle = workflows.find(w => w.name === BILINGUAL_SINGLE_PLATFORM_WORKFLOW_TEMPLATE.name);
    let singleWorkflow;
    if (!existingSingle) {
      singleWorkflow = await workflowService.create(BILINGUAL_SINGLE_PLATFORM_WORKFLOW_TEMPLATE);
      console.log(`✓ 已创建: ${singleWorkflow.name} (${singleWorkflow.id})`);
    } else {
      singleWorkflow = existingSingle;
      console.log(`- 已存在: ${singleWorkflow.name} (${singleWorkflow.id})`);
    }

    // 创建批量版工作流模板
    console.log('\n正在创建批量版双语内容生成工作流模板...');
    const { BILINGUAL_BATCH_WORKFLOW_TEMPLATE } = await import('../templates/bilingualWorkflow');

    const existingBatch = workflows.find(w => w.name === BILINGUAL_BATCH_WORKFLOW_TEMPLATE.name);
    let batchWorkflow;
    if (!existingBatch) {
      batchWorkflow = await workflowService.create(BILINGUAL_BATCH_WORKFLOW_TEMPLATE);
      console.log(`✓ 已创建: ${batchWorkflow.name} (${batchWorkflow.id})`);
    } else {
      batchWorkflow = existingBatch;
      console.log(`- 已存在: ${batchWorkflow.name} (${batchWorkflow.id})`);
    }

    // 验证技能注册
    console.log('\n=== 验证技能注册 ===\n');
    const { skillRegistry } = await import('../skills/skillRegistry');

    const requiredSkills = [
      'keyword-crawl-research',
      'en-topic-generator',
      'deep-research-20-channels',
      'en-content-generator',
      'platform-adaptation',
      'zh-translation',
    ];

    console.log('检查双语工作流所需技能:');
    let allSkillsRegistered = true;
    for (const skillId of requiredSkills) {
      const skill = skillRegistry.get(skillId);
      if (skill) {
        console.log(`  ✓ ${skillId} - ${skill.name} (${skill.category})`);
      } else {
        console.log(`  ✗ ${skillId} - 未注册`);
        allSkillsRegistered = false;
      }
    }

    if (!allSkillsRegistered) {
      console.warn('\n⚠ 警告: 部分技能未注册，工作流可能无法正常执行');
    }

    // 输出工作流使用说明
    console.log('\n=== 工作流使用说明 ===\n');
    console.log('1. 完整版双语内容生成工作流:');
    console.log(`   ID: ${fullWorkflow.id}`);
    console.log(`   名称: ${fullWorkflow.name}`);
    console.log(`   预计时间: ${fullWorkflow.estimated_time}秒`);
    console.log(`   预计成本: $${fullWorkflow.estimated_cost}`);
    console.log(`   流程: 关键词调研 → 英文话题生成 → 深度调研 → 内容生成 → 平台适配 → 中文翻译\n`);

    console.log('2. 简化版双语内容生成工作流（单平台）:');
    console.log(`   ID: ${singleWorkflow.id}`);
    console.log(`   名称: ${singleWorkflow.name}`);
    console.log(`   预计时间: ${singleWorkflow.estimated_time}秒`);
    console.log(`   预计成本: $${singleWorkflow.estimated_cost}`);
    console.log(`   流程: 深度调研 → 内容生成 → 中文翻译\n`);

    console.log('3. 批量版双语内容生成工作流:');
    console.log(`   ID: ${batchWorkflow.id}`);
    console.log(`   名称: ${batchWorkflow.name}`);
    console.log(`   预计时间: ${batchWorkflow.estimated_time}秒`);
    console.log(`   预计成本: $${batchWorkflow.estimated_cost}`);
    console.log(`   流程: 深度调研 → 内容生成 → 批量平台适配 → 中文翻译\n`);

    console.log('=== 初始化完成 ===');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();
