/**
 * Chase Mail - Supabase Safe Backup Utility
 * Exports database tables non-destructively to a timestamped JSON archive.
 * Run with: node scripts/backup_database.js [optional_service_role_key]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env variables
const envPath = path.resolve(__dirname, '..', '.env');
let supabaseUrl = process.env.VITE_SUPABASE_URL;
let supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Check CLI arguments for an override key
if (process.argv[2]) {
  supabaseKey = process.argv[2];
}

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [key, ...rest] = trimmed.split('=');
    const val = rest.join('=').trim().replace(/^["']|["']$/g, '');
    if (key === 'VITE_SUPABASE_URL' && !supabaseUrl) supabaseUrl = val;
    if ((key === 'SUPABASE_SERVICE_ROLE_KEY' || key === 'VITE_SUPABASE_ANON_KEY' || key === 'VITE_SUPABASE_PUBLISHABLE_KEY') && !supabaseKey) {
      supabaseKey = val;
    }
  }
}

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY not set.');
  process.exit(1);
}

const tables = [
  'mail_accounts',
  'mail_contacts',
  'mail_drafts',
  'mail_messages',
  'mail_external_messages',
  'mail_delivery_events',
  'profiles'
];

async function runBackup() {
  console.log(`[Backup] Initiating safe non-destructive backup from ${supabaseUrl}...`);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.resolve(__dirname, '..', 'backups');

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const backupData = {
    metadata: {
      timestamp: new Date().toISOString(),
      supabaseUrl,
      source: 'Chase Mail Backup Tool v1.0'
    },
    tables: {}
  };

  for (const table of tables) {
    try {
      const endpoint = `${supabaseUrl}/rest/v1/${table}?select=*`;
      const res = await fetch(endpoint, {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`
        }
      });

      if (!res.ok) {
        console.warn(`[Backup] Table '${table}' returned HTTP ${res.status}: ${res.statusText}`);
        backupData.tables[table] = { status: 'denied_or_empty', code: res.status };
        continue;
      }

      const rows = await res.json();
      backupData.tables[table] = {
        count: Array.isArray(rows) ? rows.length : 0,
        rows: rows
      };
      console.log(`[Backup] Table '${table}': successfully archived ${backupData.tables[table].count} rows.`);
    } catch (err) {
      console.error(`[Backup] Failed to fetch table '${table}':`, err.message);
      backupData.tables[table] = { status: 'error', error: err.message };
    }
  }

  const outFilePath = path.join(backupDir, `chase_mail_backup_${timestamp}.json`);
  fs.writeFileSync(outFilePath, JSON.stringify(backupData, null, 2), 'utf-8');
  console.log(`[Backup] Completed! Archive safely stored at: ${outFilePath}`);
}

runBackup().catch(err => {
  console.error('[Backup] Fatal error during backup execution:', err);
  process.exit(1);
});
