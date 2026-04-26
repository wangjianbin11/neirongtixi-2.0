module.exports = {
  apps: [{
    name: 'asg-backend',
    script: './dist/index.js',
    cwd: '/www/wwwroot/asg-content-system/backend',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 4000
    },
    error_file: '/www/wwwlogs/asg-backend-error.log',
    out_file: '/www/wwwlogs/asg-backend-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    // 健康检查
    min_uptime: '10s',
    max_restarts: 10,
    // 重启延迟
    restart_delay: 4000
  }]
};
