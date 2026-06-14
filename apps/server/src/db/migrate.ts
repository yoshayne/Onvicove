import 'dotenv/config';
import { db } from './client';
import { readFileSync } from 'fs';
import { join } from 'path';

async function migrate() {
  console.log('Running database migration...');
  try {
    const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf-8');
    await db.unsafe(schema);
    console.log('✓ Migration complete');
  } catch (err) {
    console.error('✗ Migration failed:', err);
    process.exit(1);
  } finally {
    await db.end();
    process.exit(0);
  }
}

migrate();
