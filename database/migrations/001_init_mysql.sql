-- ============================================
-- ASG内容系统 - MySQL数据库初始化脚本
-- ============================================
-- 版本: v2.0
-- 数据库: MySQL 5.7+
-- 创建日期: 2025-01-28
-- ============================================

-- 设置字符集
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- ============================================
-- 用户与权限模块
-- ============================================

-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id CHAR(36) PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'editor', 'publisher', 'viewer') NOT NULL DEFAULT 'viewer',
    status ENUM('active', 'inactive', 'suspended') NOT NULL DEFAULT 'active',
    avatar_url VARCHAR(500),
    full_name VARCHAR(100),
    phone VARCHAR(20),
    last_login_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_username (username),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 用户会话表
CREATE TABLE IF NOT EXISTS user_sessions (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    token VARCHAR(500) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_expires_at (expires_at),
    INDEX idx_token (token(255))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 关键词模块
-- ============================================

-- 关键词表
CREATE TABLE IF NOT EXISTS keywords (
    id CHAR(36) PRIMARY KEY,
    keyword VARCHAR(255) UNIQUE NOT NULL,
    search_volume INT DEFAULT 0,
    kd_score DECIMAL(5,2),
    cpc DECIMAL(10,2),
    intent ENUM('informational', 'commercial', 'transactional', 'navigational') NOT NULL,
    asg_relevance TINYINT UNSIGNED CHECK (asg_relevance BETWEEN 1 AND 10),
    priority ENUM('S', 'A', 'B', 'C'),
    status ENUM('pending', 'selected', 'in_use', 'completed') DEFAULT 'pending',
    source VARCHAR(100),
    tags JSON,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_status (status),
    INDEX idx_priority (priority),
    INDEX idx_intent (intent)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 关键词分类表
CREATE TABLE IF NOT EXISTS keyword_categories (
    id CHAR(36) PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    parent_id CHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES keyword_categories(id) ON DELETE SET NULL,
    INDEX idx_parent_id (parent_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 关键词-分类关联表
CREATE TABLE IF NOT EXISTS keyword_category_relations (
    keyword_id CHAR(36) NOT NULL,
    category_id CHAR(36) NOT NULL,
    PRIMARY KEY (keyword_id, category_id),
    FOREIGN KEY (keyword_id) REFERENCES keywords(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES keyword_categories(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 话题模块
-- ============================================

-- 话题表
CREATE TABLE IF NOT EXISTS topics (
    id CHAR(36) PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    topic_type ENUM('tutorial', 'qa', 'case_study', 'insight', 'review', 'comparison') NOT NULL,
    target_customer ENUM('startup', 'experienced', 'team', 'local'),
    priority ENUM('S', 'A', 'B', 'C'),
    status ENUM('pending', 'approved', 'in_production', 'completed', 'published') DEFAULT 'pending',
    estimated_effort INT,
    created_by CHAR(36),
    assigned_to CHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    published_at TIMESTAMP NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_status (status),
    INDEX idx_priority (priority),
    INDEX idx_type (topic_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 话题-关键词关联表
CREATE TABLE IF NOT EXISTS topic_keywords (
    topic_id CHAR(36) NOT NULL,
    keyword_id CHAR(36) NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (topic_id, keyword_id),
    FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE,
    FOREIGN KEY (keyword_id) REFERENCES keywords(id) ON DELETE CASCADE,
    INDEX idx_topic_id (topic_id),
    INDEX idx_keyword_id (keyword_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 话题-平台分配表
CREATE TABLE IF NOT EXISTS topic_platforms (
    id CHAR(36) PRIMARY KEY,
    topic_id CHAR(36) NOT NULL,
    platform ENUM('youtube', 'tiktok', 'blog', 'twitter', 'linkedin', 'reddit', 'quora') NOT NULL,
    content_format VARCHAR(50),
    status ENUM('pending', 'in_production', 'completed', 'published') DEFAULT 'pending',
    scheduled_at TIMESTAMP NULL,
    published_at TIMESTAMP NULL,
    url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_topic_platform (topic_id, platform),
    FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE,
    INDEX idx_topic_id (topic_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 技能模块
-- ============================================

-- 技能模板表
CREATE TABLE IF NOT EXISTS skill_templates (
    id CHAR(36) PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    category ENUM('data_input', 'content_production', 'distribution', 'optimization', 'support'),
    prompt_template TEXT NOT NULL,
    input_schema JSON,
    output_schema JSON,
    version VARCHAR(20) DEFAULT '1.0',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_code (code),
    INDEX idx_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 技能执行记录表
CREATE TABLE IF NOT EXISTS skill_executions (
    id CHAR(36) PRIMARY KEY,
    skill_code VARCHAR(50) NOT NULL,
    input_data JSON,
    output_data JSON,
    status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending',
    error_message TEXT,
    execution_time_ms INT,
    cost_usd DECIMAL(10,4),
    created_by CHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_status (status),
    INDEX idx_skill_code (skill_code),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 内容模块
-- ============================================

-- 内容表
CREATE TABLE IF NOT EXISTS contents (
    id CHAR(36) PRIMARY KEY,
    topic_id CHAR(36),
    title VARCHAR(500) NOT NULL,
    content_type ENUM('article', 'video_script', 'social_post', 'forum_answer') NOT NULL,
    platform VARCHAR(30) NOT NULL,
    status ENUM('draft', 'review', 'approved', 'published', 'archived') DEFAULT 'draft',
    content_text TEXT,
    content_metadata JSON,
    generated_by_skill VARCHAR(50),
    created_by CHAR(36) NOT NULL,
    reviewed_by CHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    published_at TIMESTAMP NULL,
    FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_status (status),
    INDEX idx_platform (platform),
    INDEX idx_topic_id (topic_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 内容版本表
CREATE TABLE IF NOT EXISTS content_versions (
    id CHAR(36) PRIMARY KEY,
    content_id CHAR(36) NOT NULL,
    version_number INT NOT NULL,
    content_text TEXT NOT NULL,
    change_summary TEXT,
    created_by CHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (content_id) REFERENCES contents(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE KEY unique_content_version (content_id, version_number),
    INDEX idx_content_id (content_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 素材模块
-- ============================================

-- 素材表
CREATE TABLE IF NOT EXISTS assets (
    id CHAR(36) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    type ENUM('case', 'data', 'quote', 'image', 'video', 'template') NOT NULL,
    category VARCHAR(50),
    description TEXT,
    file_url VARCHAR(500),
    file_size BIGINT,
    file_type VARCHAR(50),
    tags JSON,
    source VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_by CHAR(36) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 发布模块
-- ============================================

-- 发布任务表
CREATE TABLE IF NOT EXISTS publish_tasks (
    id CHAR(36) PRIMARY KEY,
    content_id CHAR(36) NOT NULL,
    platform VARCHAR(30) NOT NULL,
    status ENUM('pending', 'scheduled', 'publishing', 'published', 'failed') DEFAULT 'pending',
    scheduled_at TIMESTAMP NULL,
    published_at TIMESTAMP NULL,
    platform_post_id VARCHAR(255),
    platform_post_url VARCHAR(500),
    error_message TEXT,
    retry_count INT DEFAULT 0,
    created_by CHAR(36) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (content_id) REFERENCES contents(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_status (status),
    INDEX idx_scheduled_at (scheduled_at),
    INDEX idx_content_id (content_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 数据与分析模块
-- ============================================

-- 平台数据表
CREATE TABLE IF NOT EXISTS platform_metrics (
    id CHAR(36) PRIMARY KEY,
    platform VARCHAR(30) NOT NULL,
    content_id CHAR(36),
    metric_date DATE NOT NULL,
    views INT DEFAULT 0,
    clicks INT DEFAULT 0,
    likes INT DEFAULT 0,
    comments INT DEFAULT 0,
    shares INT DEFAULT 0,
    saves INT DEFAULT 0,
    engagement_rate DECIMAL(5,2),
    ctr DECIMAL(5,2),
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_platform_content_date (platform, content_id, metric_date),
    FOREIGN KEY (content_id) REFERENCES contents(id) ON DELETE SET NULL,
    INDEX idx_metric_date (metric_date),
    INDEX idx_platform (platform),
    INDEX idx_content_id (content_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 关键词排名数据表
CREATE TABLE IF NOT EXISTS keyword_rankings (
    id CHAR(36) PRIMARY KEY,
    keyword_id CHAR(36) NOT NULL,
    platform VARCHAR(30) NOT NULL,
    position INT,
    search_volume INT,
    url VARCHAR(500),
    checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (keyword_id) REFERENCES keywords(id) ON DELETE CASCADE,
    INDEX idx_keyword_id (keyword_id),
    INDEX idx_checked_at (checked_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 系统配置模块
-- ============================================

-- 系统配置表
CREATE TABLE IF NOT EXISTS system_configs (
    id CHAR(36) PRIMARY KEY,
    `key` VARCHAR(100) UNIQUE NOT NULL,
    value JSON NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_key (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- API密钥表
CREATE TABLE IF NOT EXISTS api_keys (
    id CHAR(36) PRIMARY KEY,
    service VARCHAR(50) NOT NULL,
    key_name VARCHAR(100) NOT NULL,
    encrypted_key TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    last_used_at TIMESTAMP NULL,
    created_by CHAR(36) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_service_key (service, key_name),
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_service (service)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 工作流与调度模块
-- ============================================

-- 工作流定义表
CREATE TABLE IF NOT EXISTS workflows (
    id CHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    workflow_definition JSON NOT NULL,
    trigger_type ENUM('manual', 'scheduled', 'event'),
    trigger_config JSON,
    is_active BOOLEAN DEFAULT TRUE,
    created_by CHAR(36) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 工作流执行记录表
CREATE TABLE IF NOT EXISTS workflow_executions (
    id CHAR(36) PRIMARY KEY,
    workflow_id CHAR(36) NOT NULL,
    status ENUM('running', 'completed', 'failed', 'cancelled') DEFAULT 'running',
    input_data JSON,
    output_data JSON,
    error_message TEXT,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    triggered_by CHAR(36),
    FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE,
    FOREIGN KEY (triggered_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_workflow_id (workflow_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 定时任务表
CREATE TABLE IF NOT EXISTS scheduled_tasks (
    id CHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    task_type VARCHAR(50) NOT NULL,
    schedule_expression VARCHAR(100),
    task_config JSON,
    is_active BOOLEAN DEFAULT TRUE,
    last_run_at TIMESTAMP NULL,
    next_run_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_is_active (is_active),
    INDEX idx_next_run_at (next_run_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 通知模块
-- ============================================

-- 通知表
CREATE TABLE IF NOT EXISTS notifications (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    type ENUM('info', 'warning', 'error', 'success') NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    action_url VARCHAR(500),
    is_read BOOLEAN DEFAULT FALSE,
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_is_read (is_read),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 上传文件模块
-- ============================================

-- 上传文件表
CREATE TABLE IF NOT EXISTS uploaded_files (
    id CHAR(36) PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    original_name VARCHAR(500) NOT NULL,
    mime_type VARCHAR(100),
    size BIGINT NOT NULL,
    path VARCHAR(500),
    url VARCHAR(500),
    uploaded_by CHAR(36) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (uploaded_by) REFERENCES users(id),
    INDEX idx_uploaded_by (uploaded_by),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 创建默认管理员用户
-- ============================================
-- 密码: admin123 (bcrypt hash)
INSERT INTO users (id, username, email, password_hash, role, status)
VALUES (
    UUID(),
    'admin',
    'admin@asg.com',
    '$2a$10$YourHashedPasswordHere',
    'admin',
    'active'
) ON DUPLICATE KEY UPDATE email = email;

-- ============================================
-- 完成初始化
-- ============================================
-- 数据库初始化完成
