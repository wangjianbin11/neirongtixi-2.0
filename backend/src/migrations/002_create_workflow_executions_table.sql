-- 工作流执行记录表
CREATE TABLE IF NOT EXISTS workflow_executions (
  id VARCHAR(36) PRIMARY KEY,
  workflow_id VARCHAR(36) NOT NULL COMMENT '工作流ID',
  workflow_name VARCHAR(255) COMMENT '工作流名称快照',
  status ENUM('pending', 'running', 'completed', 'failed', 'cancelled') DEFAULT 'pending' COMMENT '执行状态',
  input_data JSON COMMENT '输入数据',
  result_json JSON COMMENT '执行结果',
  error_message TEXT COMMENT '错误信息',
  progress INT DEFAULT 0 COMMENT '进度百分比',
  started_at TIMESTAMP NULL COMMENT '开始时间',
  completed_at TIMESTAMP NULL COMMENT '完成时间',
  created_by VARCHAR(36) COMMENT '执行者ID',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_workflow_id (workflow_id),
  INDEX idx_status (status),
  INDEX idx_created_by (created_by),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='工作流执行记录表';
