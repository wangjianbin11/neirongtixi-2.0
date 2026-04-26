-- ============================================
-- 修复keywords表结构
-- 添加缺失的字段以匹配后端代码
-- 兼容MySQL 5.7
-- ============================================

-- 添加category字段（如果不存在）
SET @column_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'keywords'
    AND COLUMN_NAME = 'category'
);

SET @sql = IF(@column_exists = 0,
    'ALTER TABLE keywords ADD COLUMN category VARCHAR(50) COMMENT ''关键词分类'' AFTER status',
    'SELECT ''Column category already exists'' AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 添加target_customer字段
SET @column_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'keywords'
    AND COLUMN_NAME = 'target_customer'
);

SET @sql = IF(@column_exists = 0,
    'ALTER TABLE keywords ADD COLUMN target_customer ENUM(''C1-Entrepreneur'', ''C2-Experienced'', ''C3-TeamSeller'', ''C4-LocalToGlobal'') COMMENT ''目标客户'' AFTER category',
    'SELECT ''Column target_customer already exists'' AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 添加created_by字段
SET @column_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'keywords'
    AND COLUMN_NAME = 'created_by'
);

SET @sql = IF(@column_exists = 0,
    'ALTER TABLE keywords ADD COLUMN created_by CHAR(36) COMMENT ''创建人ID'' AFTER target_customer',
    'SELECT ''Column created_by already exists'' AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 添加competition字段
SET @column_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'keywords'
    AND COLUMN_NAME = 'competition'
);

SET @sql = IF(@column_exists = 0,
    'ALTER TABLE keywords ADD COLUMN competition ENUM(''low'', ''medium'', ''high'') DEFAULT ''medium'' COMMENT ''竞争度'' AFTER kd_score',
    'SELECT ''Column competition already exists'' AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 添加索引
SET @index_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'keywords'
    AND INDEX_NAME = 'idx_category'
);

SET @sql = IF(@index_exists = 0,
    'CREATE INDEX idx_category ON keywords(category)',
    'SELECT ''Index idx_category already exists'' AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @index_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'keywords'
    AND INDEX_NAME = 'idx_target_customer'
);

SET @sql = IF(@index_exists = 0,
    'CREATE INDEX idx_target_customer ON keywords(target_customer)',
    'SELECT ''Index idx_target_customer already exists'' AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @index_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'keywords'
    AND INDEX_NAME = 'idx_competition'
);

SET @sql = IF(@index_exists = 0,
    'CREATE INDEX idx_competition ON keywords(competition)',
    'SELECT ''Index idx_competition already exists'' AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 添加外键约束
SET @constraint_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'keywords'
    AND CONSTRAINT_NAME = 'fk_keywords_created_by'
    AND CONSTRAINT_TYPE = 'FOREIGN KEY'
);

SET @sql = IF(@constraint_exists = 0,
    'ALTER TABLE keywords ADD CONSTRAINT fk_keywords_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL',
    'SELECT ''Foreign key fk_keywords_created_by already exists'' AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT 'Keywords table structure update completed!' AS message;
