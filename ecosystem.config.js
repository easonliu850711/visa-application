module.exports = {
  apps: [
    {
      name: 'visa-prod',
      script: './node_modules/next/dist/bin/next',
      args: 'start -p 3002',
      interpreter: 'C:\\studio-imori\\node-v20\\node-v20.11.1-win-x64\\node.exe',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};