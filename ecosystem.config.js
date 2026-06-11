module.exports = {
  apps: [{
    name: 'shakeabsen',
    script: './backend/dist/index.js',
    cwd: '.',
    env: {
      NODE_ENV: 'production',
      PORT: '3001',
      DATABASE_URL: 'mysql://root@localhost:3306/absensi',
      CORS_ORIGIN: 'https://absensi.manbontang.sch.id',
      BETTER_AUTH_SECRET: 'super_secret_session_key_for_jwt_auth_123456',
      BETTER_AUTH_URL: 'https://absensi.manbontang.sch.id',
      SCHOOL_LATITUDE: '0.144011',
      SCHOOL_LONGITUDE: '117.473191',
      SCHOOL_RADIUS_METERS: '50',
      MAX_ACCURACY_METERS: '30',
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
