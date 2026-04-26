-- 关键词调研任务表
CREATE TABLE IF NOT EXISTS keyword_research_tasks (
  id VARCHAR(36) PRIMARY KEY,
  keyword_id VARCHAR(36) NOT NULL COMMENT '关键词ID',
  keyword VARCHAR(500) NOT NULL COMMENT '关键词文本',
  status ENUM('pending', 'in_progress', 'completed', 'failed', 'cancelled') DEFAULT 'pending' COMMENT '任务状态',
  current_batch INT DEFAULT 0 COMMENT '当前批次',
  total_batches INT DEFAULT 0 COMMENT '总批次数',
  results JSON COMMENT '各渠道调研结果',
  knowledge_searched BOOLEAN DEFAULT FALSE COMMENT '是否已搜索知识库',
  knowledge_results JSON COMMENT '知识库搜索结果',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL,
  INDEX idx_keyword_id (keyword_id),
  INDEX idx_status (status),
  FOREIGN KEY (keyword_id) REFERENCES keywords(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='关键词调研任务表';

-- 话题调研任务表
CREATE TABLE IF NOT EXISTS topic_research_tasks (
  id VARCHAR(36) PRIMARY KEY,
  topic_id VARCHAR(36) NOT NULL COMMENT '话题ID',
  topic_title VARCHAR(500) NOT NULL COMMENT '话题标题',
  status ENUM('pending', 'in_progress', 'completed', 'failed', 'cancelled') DEFAULT 'pending' COMMENT '任务状态',
  current_batch INT DEFAULT 0 COMMENT '当前批次',
  total_batches INT DEFAULT 0 COMMENT '总批次数',
  results JSON COMMENT '各渠道调研结果',
  knowledge_searched BOOLEAN DEFAULT FALSE COMMENT '是否已搜索知识库',
  knowledge_results JSON COMMENT '知识库搜索结果',
  platform_candidates JSON COMMENT '候选平台列表',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL,
  INDEX idx_topic_id (topic_id),
  INDEX idx_status (status),
  FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='话题调研任务表';

-- 内容评分表
CREATE TABLE IF NOT EXISTS content_scores (
  id VARCHAR(36) PRIMARY KEY,
  content_id VARCHAR(36) NOT NULL COMMENT '内容ID',
  overall_score INT COMMENT '总分 0-100',
  is_ymyl BOOLEAN DEFAULT FALSE COMMENT '是否为YMYL内容',
  eeat_score JSON COMMENT 'E-E-A-T评分详情',
  main_content_score JSON COMMENT '主体内容质量评分',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_content_id (content_id),
  FOREIGN KEY (content_id) REFERENCES contents(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='内容评分表';
