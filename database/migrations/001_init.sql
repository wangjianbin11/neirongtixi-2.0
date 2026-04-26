-- ============================================
-- ASG内容系统 - 数据库初始化脚本
-- ============================================
-- 版本: v1.0
-- 创建日期: 2026-01-28
-- ============================================

-- ============================================
-- 用户与权限模块
-- ============================================

-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'editor', 'publisher', 'viewer')),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    avatar_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 用户会话表
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(500) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_expires ON user_sessions(expires_at);

-- ============================================
-- 关键词模块
-- ============================================

-- 关键词表
CREATE TABLE IF NOT EXISTS keywords (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    keyword VARCHAR(255) NOT NULL,
    search_volume INTEGER DEFAULT 0,
    kd_score DECIMAL(5,2),
    cpc DECIMAL(10,2),
    intent VARCHAR(30) NOT NULL CHECK (intent IN ('informational', 'commercial', 'transactional', 'navigational')),
    asg_relevance SMALLINT CHECK (asg_relevance BETWEEN 1 AND 10),
    priority VARCHAR(5) CHECK (priority IN ('S', 'A', 'B', 'C')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'selected', 'in_use', 'completed')),
    source VARCHAR(100),
    tags TEXT[],
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(keyword)
);

CREATE INDEX idx_keywords_status ON keywords(status);
CREATE INDEX idx_keywords_priority ON keywords(priority);
CREATE INDEX idx_keywords_intent ON keywords(intent);
CREATE INDEX idx_keywords_tags ON keywords USING GIN(tags);

-- 关键词分类表
CREATE TABLE IF NOT EXISTS keyword_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    parent_id UUID REFERENCES keyword_categories(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 关键词-分类关联表
CREATE TABLE IF NOT EXISTS keyword_category_relations (
    keyword_id UUID REFERENCES keywords(id) ON DELETE CASCADE,
    category_id UUID REFERENCES keyword_categories(id) ON DELETE CASCADE,
    PRIMARY KEY (keyword_id, category_id)
);

-- ============================================
-- 话题模块
-- ============================================

-- 话题表
CREATE TABLE IF NOT EXISTS topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(500) NOT NULL,
    description TEXT,
    topic_type VARCHAR(30) NOT NULL CHECK (topic_type IN ('tutorial', 'qa', 'case_study', 'insight', 'review', 'comparison')),
    target_customer VARCHAR(20) CHECK (target_customer IN ('startup', 'experienced', 'team', 'local')),
    priority VARCHAR(5) CHECK (priority IN ('S', 'A', 'B', 'C')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'in_production', 'completed', 'published')),
    estimated_effort INTEGER,
    created_by UUID REFERENCES users(id),
    assigned_to UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    published_at TIMESTAMP
);

CREATE INDEX idx_topics_status ON topics(status);
CREATE INDEX idx_topics_priority ON topics(priority);
CREATE INDEX idx_topics_type ON topics(topic_type);

-- 话题-关键词关联表
CREATE TABLE IF NOT EXISTS topic_keywords (
    topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
    keyword_id UUID REFERENCES keywords(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (topic_id, keyword_id)
);

CREATE INDEX idx_topic_keywords_topic ON topic_keywords(topic_id);
CREATE INDEX idx_topic_keywords_keyword ON topic_keywords(keyword_id);

-- 话题-平台分配表
CREATE TABLE IF NOT EXISTS topic_platforms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
    platform VARCHAR(30) NOT NULL CHECK (platform IN ('youtube', 'tiktok', 'blog', 'twitter', 'linkedin', 'reddit', 'quora')),
    content_format VARCHAR(50),
    status VARCHAR(20) DEFAULT 'pending',
    scheduled_at TIMESTAMP,
    published_at TIMESTAMP,
    url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(topic_id, platform)
);

CREATE INDEX idx_topic_platforms_topic ON topic_platforms(topic_id);
CREATE INDEX idx_topic_platforms_status ON topic_platforms(status);

-- ============================================
-- 技能模块
-- ============================================

-- 技能模板表
CREATE TABLE IF NOT EXISTS skill_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(50) CHECK (category IN ('data_input', 'content_production', 'distribution', 'optimization', 'support')),
    prompt_template TEXT NOT NULL,
    input_schema JSONB,
    output_schema JSONB,
    version VARCHAR(20) DEFAULT '1.0',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_skill_templates_code ON skill_templates(code);
CREATE INDEX idx_skill_templates_category ON skill_templates(category);

-- 技能执行记录表
CREATE TABLE IF NOT EXISTS skill_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    skill_code VARCHAR(50) NOT NULL,
    input_data JSONB,
    output_data JSONB,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    error_message TEXT,
    execution_time_ms INTEGER,
    cost_usd DECIMAL(10,4),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

CREATE INDEX idx_skill_executions_status ON skill_executions(status);
CREATE INDEX idx_skill_executions_skill ON skill_executions(skill_code);
CREATE INDEX idx_skill_executions_created ON skill_executions(created_at);

-- ============================================
-- 内容模块
-- ============================================

-- 内容表
CREATE TABLE IF NOT EXISTS contents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic_id UUID REFERENCES topics(id) ON DELETE SET NULL,
    title VARCHAR(500) NOT NULL,
    content_type VARCHAR(30) NOT NULL CHECK (content_type IN ('article', 'video_script', 'social_post', 'forum_answer')),
    platform VARCHAR(30) NOT NULL,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'approved', 'published', 'archived')),
    content_text TEXT,
    content_metadata JSONB,
    generated_by_skill VARCHAR(50),
    created_by UUID REFERENCES users(id),
    reviewed_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    published_at TIMESTAMP
);

CREATE INDEX idx_contents_status ON contents(status);
CREATE INDEX idx_contents_platform ON contents(platform);
CREATE INDEX idx_contents_topic ON contents(topic_id);

-- 内容版本表
CREATE TABLE IF NOT EXISTS content_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_id UUID REFERENCES contents(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    content_text TEXT NOT NULL,
    change_summary TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(content_id, version_number)
);

CREATE INDEX idx_content_versions_content ON content_versions(content_id);

-- ============================================
-- 素材模块
-- ============================================

-- 素材表
CREATE TABLE IF NOT EXISTS assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    type VARCHAR(30) NOT NULL CHECK (type IN ('case', 'data', 'quote', 'image', 'video', 'template')),
    category VARCHAR(50),
    description TEXT,
    file_url VARCHAR(500),
    file_size BIGINT,
    file_type VARCHAR(50),
    tags TEXT[],
    source VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_assets_type ON assets(type);
CREATE INDEX idx_assets_tags ON assets USING GIN(tags);

-- ============================================
-- 发布模块
-- ============================================

-- 发布任务表
CREATE TABLE IF NOT EXISTS publish_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_id UUID REFERENCES contents(id) ON DELETE CASCADE,
    platform VARCHAR(30) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'publishing', 'published', 'failed')),
    scheduled_at TIMESTAMP,
    published_at TIMESTAMP,
    platform_post_id VARCHAR(255),
    platform_post_url VARCHAR(500),
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_publish_tasks_status ON publish_tasks(status);
CREATE INDEX idx_publish_tasks_scheduled ON publish_tasks(scheduled_at);
CREATE INDEX idx_publish_tasks_content ON publish_tasks(content_id);

-- ============================================
-- 数据与分析模块
-- ============================================

-- 平台数据表
CREATE TABLE IF NOT EXISTS platform_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform VARCHAR(30) NOT NULL,
    content_id UUID REFERENCES contents(id) ON DELETE SET NULL,
    metric_date DATE NOT NULL,
    views INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    likes INTEGER DEFAULT 0,
    comments INTEGER DEFAULT 0,
    shares INTEGER DEFAULT 0,
    saves INTEGER DEFAULT 0,
    engagement_rate DECIMAL(5,2),
    ctr DECIMAL(5,2),
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(platform, content_id, metric_date)
);

CREATE INDEX idx_platform_metrics_date ON platform_metrics(metric_date);
CREATE INDEX idx_platform_metrics_platform ON platform_metrics(platform);
CREATE INDEX idx_platform_metrics_content ON platform_metrics(content_id);

-- 关键词排名数据表
CREATE TABLE IF NOT EXISTS keyword_rankings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    keyword_id UUID REFERENCES keywords(id) ON DELETE CASCADE,
    platform VARCHAR(30) NOT NULL,
    position INTEGER,
    search_volume INTEGER,
    url VARCHAR(500),
    checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_keyword_rankings_keyword ON keyword_rankings(keyword_id);
CREATE INDEX idx_keyword_rankings_checked ON keyword_rankings(checked_at);

-- ============================================
-- 系统配置模块
-- ============================================

-- 系统配置表
CREATE TABLE IF NOT EXISTS system_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(100) UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- API密钥表
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service VARCHAR(50) NOT NULL,
    key_name VARCHAR(100) NOT NULL,
    encrypted_key TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    last_used_at TIMESTAMP,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(service, key_name)
);

-- ============================================
-- 工作流与调度模块
-- ============================================

-- 工作流定义表
CREATE TABLE IF NOT EXISTS workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    workflow_definition JSONB NOT NULL,
    trigger_type VARCHAR(30) CHECK (trigger_type IN ('manual', 'scheduled', 'event')),
    trigger_config JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 工作流执行记录表
CREATE TABLE IF NOT EXISTS workflow_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
    input_data JSONB,
    output_data JSONB,
    error_message TEXT,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    triggered_by UUID REFERENCES users(id)
);

CREATE INDEX idx_workflow_executions_workflow ON workflow_executions(workflow_id);
CREATE INDEX idx_workflow_executions_status ON workflow_executions(status);

-- 定时任务表
CREATE TABLE IF NOT EXISTS scheduled_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    task_type VARCHAR(50) NOT NULL,
    schedule_expression VARCHAR(100),
    task_config JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    last_run_at TIMESTAMP,
    next_run_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 通知模块
-- ============================================

-- 通知表
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('info', 'warning', 'error', 'success')),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    action_url VARCHAR(500),
    is_read BOOLEAN DEFAULT FALSE,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(is_read);
CREATE INDEX idx_notifications_created ON notifications(created_at);

-- ============================================
-- 创建默认管理员用户
-- ============================================
-- 密码: admin123 (需要在应用层使用bcrypt加密)
INSERT INTO users (id, username, email, password_hash, role)
VALUES (
    gen_random_uuid(),
    'admin',
    'admin@asg.com',
    '$2a$10$placeholder_hash_replace_on_deployment',
    'admin'
) ON CONFLICT (email) DO NOTHING;

-- ============================================
-- 创建函数: 自动更新updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为需要的表添加触发器
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_keywords_updated_at BEFORE UPDATE ON keywords
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_topics_updated_at BEFORE UPDATE ON topics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contents_updated_at BEFORE UPDATE ON contents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assets_updated_at BEFORE UPDATE ON assets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_publish_tasks_updated_at BEFORE UPDATE ON publish_tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_configs_updated_at BEFORE UPDATE ON system_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workflows_updated_at BEFORE UPDATE ON workflows
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 完成初始化
-- ============================================
-- 数据库初始化完成
