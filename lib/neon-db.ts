import { neon, neonConfig } from '@neondatabase/serverless';
import { Pool } from 'pg';

// Check if we're in a server component context or edge function
// Config for edge runtime
if (process.env.NEXT_RUNTIME === 'edge') {
  neonConfig.fetchConnectionCache = true;
}

// Environment variables for connection
const connectionString = process.env.DATABASE_URL;

// Create database query clients
const queryEdgeFn = connectionString ? neon(connectionString) : null;
export const pool = connectionString ? new Pool({ connectionString }) : null;

export async function query(sql: string, params: any[] = []) {
  // For edge runtime
  if (process.env.NEXT_RUNTIME === 'edge') {
    if (!queryEdgeFn) {
      throw new Error('No connection string provided for Neon database');
    }
    return queryEdgeFn(sql, params);
  }

  // For Node.js runtime
  if (!pool) {
    throw new Error('No connection string provided for Neon database');
  }
  
  const client = await pool.connect();
  try {
    return await client.query(sql, params);
  } finally {
    client.release();
  }
}

// Migration functions to set up tables
export async function setupDatabase() {
  try {
    // Create study_sets table
    await query(`
      CREATE TABLE IF NOT EXISTS study_sets (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL,
        source_type TEXT NOT NULL,
        source_name TEXT
      )
    `);

    // Create study_items table
    await query(`
      CREATE TABLE IF NOT EXISTS study_items (
        id TEXT PRIMARY KEY,
        study_set_id TEXT NOT NULL REFERENCES study_sets(id) ON DELETE CASCADE,
        term TEXT NOT NULL,
        definition TEXT NOT NULL,
        options TEXT[],
        correct_answer TEXT,
        CONSTRAINT fk_study_set
          FOREIGN KEY(study_set_id)
          REFERENCES study_sets(id)
          ON DELETE CASCADE
      )
    `);

    // Create user_progress table
    await query(`
      CREATE TABLE IF NOT EXISTS user_progress (
        id SERIAL PRIMARY KEY,
        study_set_id TEXT NOT NULL,
        mode TEXT NOT NULL,
        updated_at BIGINT NOT NULL,
        items_studied INTEGER NOT NULL DEFAULT 0,
        correct_answers INTEGER NOT NULL DEFAULT 0,
        incorrect_answers INTEGER NOT NULL DEFAULT 0,
        completed_sessions INTEGER NOT NULL DEFAULT 0,
        CONSTRAINT fk_study_set
          FOREIGN KEY(study_set_id)
          REFERENCES study_sets(id)
          ON DELETE CASCADE,
        UNIQUE(study_set_id, mode)
      )
    `);
    
    console.log('Database setup complete.');
    return { success: true };
  } catch (error) {
    console.error('Error setting up database:', error);
    return { success: false, error };
  }
}

// Call this function at the application startup or in a migration script
// setupDatabase().catch(console.error);
