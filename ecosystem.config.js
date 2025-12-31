module.exports = {
  apps: [{
    name: 'rea-backend-staging',
    script: 'dist/main.js',
    cwd: '/var/www/rea-bible-backend-staging',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3002
    },
    env_file: '/var/www/rea-bible-backend-staging/.env',
    error_file: '/var/log/pm2/rea-backend-staging-error.log',
    out_file: '/var/log/pm2/rea-backend-staging-out.log',
    max_memory_restart: '500M',
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s'
  }, {
    name: 'rea-backend-prod',
    script: 'dist/main.js',
    cwd: '/var/www/rea-bible-backend-prod',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    env_file: '/var/www/rea-bible-backend-prod/.env',
    error_file: '/var/log/pm2/rea-backend-prod-error.log',
    out_file: '/var/log/pm2/rea-backend-prod-out.log',
    max_memory_restart: '500M',
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s'
  }]
}
