-- 工作流执行日志表
CREATE TABLE IF NOT EXISTS workflow_execution_logs (
  id VARCHAR(36) PRIMARY KEY,
  execution_id VARCHAR(36) NOT NULL COMMENT '执行ID',
  node_id VARCHAR(100) COMMENT '节点ID',
  skill_id VARCHAR(100) COMMENT '技能ID',
  status ENUM('pending', 'running', 'completed', 'failed', 'skipped') DEFAULT 'pending' COMMENT '节点状态',
  message TEXT COMMENT '日志消息',
  input_data JSON COMMENT '节点输入数据',
  output_data JSON COMMENT '节点输出数据',
  error_detail TEXT COMMENT '错误详情',
  started_at TIMESTAMP NULL COMMENT '节点开始时间',
  completed_at TIMESTAMP NULL COMMENT '节点完成时间',
  duration_ms INT COMMENT '执行耗时(毫秒)',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_execution_id (execution_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='工作流执行日志表';
