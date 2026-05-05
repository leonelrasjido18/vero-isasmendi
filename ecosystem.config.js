module.exports = {
  apps: [
    {
      name: 'vero-backend',
      script: './backend/server.js',
      cwd: '/var/www/vero-isasmendi',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
    },
  ],
};
