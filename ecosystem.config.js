/**
 * PM2 Ecosystem Configuration for MaxantAgency
 *
 * Usage on production server:
 * - Start all services: pm2 start ecosystem.config.js
 * - View status: pm2 status
 * - View logs: pm2 logs
 * - Restart all: pm2 restart all
 * - Stop all: pm2 stop all
 * - Auto-restart on server reboot: pm2 startup && pm2 save
 */

module.exports = {
  apps: [
    {
      name: 'prospecting-engine',
      script: './prospecting-engine/server.js',
      cwd: './prospecting-engine',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: 3010
      },
      error_file: './logs/prospecting-error.log',
      out_file: './logs/prospecting-out.log',
      time: true
    },
    {
      name: 'analysis-engine',
      script: './analysis-engine/server.js',
      cwd: './analysis-engine',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      error_file: './logs/analysis-error.log',
      out_file: './logs/analysis-out.log',
      time: true
    },
    {
      name: 'outreach-engine',
      script: './outreach-engine/server.js',
      cwd: './outreach-engine',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: 3002
      },
      error_file: './logs/outreach-error.log',
      out_file: './logs/outreach-out.log',
      time: true
    },
    {
      name: 'pipeline-orchestrator',
      script: './pipeline-orchestrator/server.js',
      cwd: './pipeline-orchestrator',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: 3020
      },
      error_file: './logs/pipeline-error.log',
      out_file: './logs/pipeline-out.log',
      time: true
    },
    {
      name: 'command-center-ui',
      script: 'npm',
      args: 'run build && npm run start',
      cwd: './command-center-ui',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        // API endpoints (point to localhost on same server)
        NEXT_PUBLIC_PROSPECTING_API: 'http://localhost:3010',
        NEXT_PUBLIC_ANALYSIS_API: 'http://localhost:3001',
        NEXT_PUBLIC_OUTREACH_API: 'http://localhost:3002',
        NEXT_PUBLIC_PIPELINE_API: 'http://localhost:3020'
      },
      error_file: './logs/ui-error.log',
      out_file: './logs/ui-out.log',
      time: true
    }
  ]
};
