import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

let loaded = false;

export function ensureSharedEnv() {
  if (loaded) return;

  const roots = [
    path.resolve(process.cwd(), '.env.local'),
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), '..', '.env'),
    path.resolve(process.cwd(), '..', 'website-audit-tool', '.env')
  ];

  for (const file of roots) {
    if (fs.existsSync(file)) {
      dotenv.config({ path: file, override: false });
    }
  }

  loaded = true;
}

