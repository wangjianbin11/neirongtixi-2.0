-- 工作流定义表
CREATE TABLE IF NOT EXISTS workflows (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL COMMENT '工作流名称',
  description TEXT COMMENT '工作流描述',
  category VARCHAR(50) COMMENT '分类: blog, social_media, video, report',
  is_template BOOLEAN DEFAULT FALSE COMMENT '是否为模板',
  nodes_json JSON NOT NULL COMMENT '节点定义JSON',
  default_params JSON COMMENT '默认参数',
  estimated_time INT COMMENT '预估执行时间(秒)',
  estimated_cost DECIMAL(10,4) COMMENT '预估成本(美元)',
  created_by VARCHAR(36) COMMENT '创建者ID',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_category (category),
  INDEX idx_is_template (is_template),
  INDEX idx_created_by (created_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='工作流定义表';
