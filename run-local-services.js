const { spawn } = require('child_process');
const path = require('path');

const services = [
  { name: 'Auth Service', command: 'npm', args: ['run', 'dev:auth'] },
  { name: 'API Service', command: 'npm', args: ['run', 'dev:api'] },
  { name: 'WS Signaling', command: 'npm', args: ['run', 'dev:websocket'] },
  { name: 'Billing', command: 'npm', args: ['run', 'dev:billing'] },
  { name: 'Alert Dispatch', command: 'npm', args: ['run', 'dev:notifications'] },
  { name: 'Landing Page', command: 'npm', args: ['run', 'dev:landing'] },
  { name: 'Dashboard App', command: 'npm', args: ['run', 'dev:dashboard'] },
  { name: 'Admin Console', command: 'npm', args: ['run', 'dev:admin'] }
];

const children = [];

console.log('=====================================================');
console.log('      Teleport support platform - Starting Local Dev ');
console.log('=====================================================');
console.log('Database-less / In-Memory fallbacks are active.');
console.log('Starting all microservices and frontends...\n');

services.forEach((service, index) => {
  const child = spawn(service.command, service.args, {
    cwd: __dirname,
    shell: true,
    env: { ...process.env, FORCE_COLOR: '1' }
  });

  children.push(child);

  child.stdout.on('data', (data) => {
    const lines = data.toString().split('\n');
    lines.forEach(line => {
      if (line.trim()) {
        console.log(`[${service.name}]: ${line.trim()}`);
      }
    });
  });

  child.stderr.on('data', (data) => {
    const lines = data.toString().split('\n');
    lines.forEach(line => {
      if (line.trim()) {
        console.error(`[${service.name}] [ERROR]: ${line.trim()}`);
      }
    });
  });

  child.on('close', (code) => {
    console.log(`[${service.name}] exited with code ${code}`);
  });
});

process.on('SIGINT', () => {
  console.log('\nShutting down all services...');
  children.forEach(child => {
    child.kill('SIGINT');
  });
  process.exit();
});

process.on('exit', () => {
  children.forEach(child => {
    child.kill();
  });
});
