cd C:\studio-imori

rename japan-visa japan-visa-backup-v56

tar -xzf japan-visa-v57-charts-patched.tar.gz

rename japan-visa-export japan-visa

cd C:\studio-imori\japan-visa

C:\studio-imori\node-v20\node-v20.11.1-win-x64\npm.cmd install
C:\studio-imori\node-v20\node-v20.11.1-win-x64\npm.cmd run build

pm2 reload visa-prod


C:\studio-imori\node-v20\node-v20.11.1-win-x64\npm.cmd run build

pm2 reload visa-prod

pm2 save