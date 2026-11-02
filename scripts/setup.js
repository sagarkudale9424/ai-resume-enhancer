const { copyFileSync, existsSync } = require('node:fs');

const files = [
  ['backend/.env.example', 'backend/.env'],
  ['frontend/.env.local.example', 'frontend/.env.local'],
];

for (const [source, target] of files) {
  if (existsSync(target)) {
    console.log(`Keeping existing ${target}`);
    continue;
  }

  copyFileSync(source, target);
  console.log(`Created ${target}`);
}
