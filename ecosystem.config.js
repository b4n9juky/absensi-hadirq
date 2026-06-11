module.exports = {
  apps: [{
    name: 'shakeabsen',
    script: './backend/dist/index.js',
    cwd: '.',
    env: {
      NODE_ENV: 'production',
    },
    instances: 1,
    exec_mode: 'fork',
    watch: false,
    max_memory_restart: '500M',
    error_file: './logs/backend-error.log',
    out_file: './logs/backend-out.log',
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
  }]
};
