-- 知识库功能迁移文件
-- 创建日期: 2026-01-31

-- 知识库分组表
CREATE TABLE IF NOT EXISTS knowledge_base_groups (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL COMMENT '分组名称',
  description TEXT COMMENT '分组描述',
  color VARCHAR(7) DEFAULT '#1890ff' COMMENT '主题颜色',
  icon VARCHAR(50) COMMENT '图标',
  sort_order INT DEFAULT 0 COMMENT '排序',
  created_by VARCHAR(36) COMMENT '创建者ID',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_created_by (created_by),
  INDEX idx_sort_order (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='知识库分组表';

-- 知识库表
CREATE TABLE IF NOT EXISTS knowledge_bases (
  id VARCHAR(36) PRIMARY KEY,
  group_id VARCHAR(36) COMMENT '所属分组ID',
  name VARCHAR(255) NOT NULL COMMENT '知识库名称',
  description TEXT COMMENT '知识库描述',
  type ENUM('manual', 'ai_generated', 'imported') DEFAULT 'manual' COMMENT '知识库类型',
  tags JSON COMMENT '标签',
  document_count INT DEFAULT 0 COMMENT '文档数量',
  is_active BOOLEAN DEFAULT TRUE COMMENT '是否启用',
  created_by VARCHAR(36) COMMENT '创建者ID',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (group_id) REFERENCES knowledge_base_groups(id) ON DELETE SET NULL,
  INDEX idx_group_id (group_id),
  INDEX idx_type (type),
  INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='知识库表';

-- 知识库文档表
CREATE TABLE IF NOT EXISTS knowledge_base_documents (
  id VARCHAR(36) PRIMARY KEY,
  knowledge_base_id VARCHAR(36) NOT NULL COMMENT '所属知识库ID',
  title VARCHAR(500) NOT NULL COMMENT '文档标题',
  content LONGTEXT COMMENT '文档内容（纯文本）',
  source_type ENUM('url', 'pdf', 'word', 'excel', 'markdown', 'image', 'text') NOT NULL COMMENT '来源类型',
  source_url VARCHAR(1000) COMMENT '来源URL',
  file_path VARCHAR(500) COMMENT '文件路径',
  file_size BIGINT COMMENT '文件大小',
  file_mime_type VARCHAR(100) COMMENT '文件MIME类型',
  word_count INT COMMENT '字数统计',
  current_version_id VARCHAR(36) COMMENT '当前版本ID',
  status ENUM('draft', 'active', 'archived') DEFAULT 'active' COMMENT '文档状态',
  created_by VARCHAR(36) COMMENT '创建者ID',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (knowledge_base_id) REFERENCES knowledge_bases(id) ON DELETE CASCADE,
  INDEX idx_knowledge_base_id (knowledge_base_id),
  INDEX idx_source_type (source_type),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='知识库文档表';

-- 文档版本表
CREATE TABLE IF NOT EXISTS knowledge_base_document_versions (
  id VARCHAR(36) PRIMARY KEY,
  document_id VARCHAR(36) NOT NULL COMMENT '文档ID',
  version_number INT NOT NULL COMMENT '版本号',
  title VARCHAR(500) COMMENT '标题',
  content LONGTEXT COMMENT '内容',
  file_path VARCHAR(500) COMMENT '文件路径',
  change_summary TEXT COMMENT '变更摘要',
  created_by VARCHAR(36) COMMENT '创建者',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (document_id) REFERENCES knowledge_base_documents(id) ON DELETE CASCADE,
  UNIQUE KEY uk_document_version (document_id, version_number),
  INDEX idx_document_id (document_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='文档版本表';

-- 文档向量嵌入表（用于语义搜索）
CREATE TABLE IF NOT EXISTS knowledge_base_embeddings (
  id VARCHAR(36) PRIMARY KEY,
  document_id VARCHAR(36) NOT NULL COMMENT '文档ID',
  chunk_index INT NOT NULL COMMENT '文本块索引',
  chunk_text TEXT NOT NULL COMMENT '文本块内容',
  embedding JSON NOT NULL COMMENT '向量嵌入（1536维数组）',
  model_name VARCHAR(100) DEFAULT 'text-embedding-ada-002' COMMENT '嵌入模型',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (document_id) REFERENCES knowledge_base_documents(id) ON DELETE CASCADE,
  INDEX idx_document_id (document_id),
  INDEX idx_chunk_index (chunk_index)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='向量嵌入表';
