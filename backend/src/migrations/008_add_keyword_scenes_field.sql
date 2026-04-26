-- ============================================
-- Migration 008: Add scenes field to keywords table
-- ============================================
-- Description: 添加场景分类字段支持多选场景（网站、TikTok、YouTube等）
-- Author: System
-- Date: 2025-02-05
-- Note: 此迁移假设场景字段不存在，如已存在请跳过

-- 添加 scenes 字段 (JSON 类型)
ALTER TABLE keywords ADD COLUMN scenes JSON COMMENT '场景分类（多选）' AFTER target_customer;

-- 添加虚拟生成列用于索引（查询优化）
ALTER TABLE keywords ADD COLUMN scenes_first VARCHAR(20) AS (JSON_UNQUOTE(JSON_EXTRACT(scenes, '$[0]'))) VIRTUAL AFTER scenes;

-- 添加索引
CREATE INDEX idx_scenes_first ON keywords(scenes_first);

SELECT 'Migration 008 completed: scenes field added to keywords table' AS message;
