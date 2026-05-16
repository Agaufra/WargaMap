const { Pool } = require('pg');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

let db;

async function initDb() {
  // Check if we are in production (Railway) or local
  const isPostgres = process.env.DATABASE_URL;

  if (isPostgres) {
    console.log('[DATABASE] Using PostgreSQL (Production)');
    const { types } = require('pg');
    types.setTypeParser(20, function(val) {
      return parseInt(val, 10);
    });

    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false // Required for Railway/Supabase
      }
    });

    // Wrapper to make PG behave like SQLite for easier migration in existing code
    db = {
      run: async (sql, params = []) => {
        const queryParams = Array.isArray(params) ? params : [params];
        let i = 1;
        let pgSql = sql.replace(/\?/g, () => `$${i++}`);
        
        // If it's an INSERT, we append RETURNING id to get the lastID
        if (pgSql.trim().toUpperCase().startsWith('INSERT')) {
          pgSql += ' RETURNING id';
          const res = await pool.query(pgSql, queryParams);
          return { lastID: res.rows[0]?.id };
        }
        
        return pool.query(pgSql, queryParams);
      },
      get: async (sql, params = []) => {
        const queryParams = Array.isArray(params) ? params : [params];
        let i = 1;
        const pgSql = sql.replace(/\?/g, () => `$${i++}`);
        const res = await pool.query(pgSql, queryParams);
        return res.rows[0];
      },
      all: async (sql, params = []) => {
        const queryParams = Array.isArray(params) ? params : [params];
        let i = 1;
        const pgSql = sql.replace(/\?/g, () => `$${i++}`);
        const res = await pool.query(pgSql, queryParams);
        return res.rows;
      },
      exec: async (sql) => {
        return pool.query(sql);
      }
    };
  } else {
    console.log('[DATABASE] Using SQLite (Local)');
    db = await open({
      filename: './database.sqlite',
      driver: sqlite3.Database
    });
  }

  // Define Table Structures (Ensuring compatibility for both)
  const schema = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT,
      username TEXT UNIQUE,
      ktpNumber TEXT UNIQUE,
      password TEXT,
      trustScore INTEGER DEFAULT 50,
      reportCountToday INTEGER DEFAULT 0,
      lastReportDate TEXT,
      createdAt BIGINT
    );

    CREATE TABLE IF NOT EXISTS reports (
      id SERIAL PRIMARY KEY,
      title TEXT,
      description TEXT,
      category TEXT,
      lat REAL,
      lng REAL,
      image TEXT,
      status TEXT DEFAULT 'Reported',
      priorityScore INTEGER DEFAULT 0,
      priorityLevel TEXT DEFAULT 'Low',
      source TEXT DEFAULT 'user',
      url TEXT,
      userId INTEGER,
      upvotes INTEGER DEFAULT 0,
      downvotes INTEGER DEFAULT 0,
      routeData TEXT,
      createdAt BIGINT
    );

    CREATE TABLE IF NOT EXISTS votes (
      id SERIAL PRIMARY KEY,
      reportId INTEGER,
      userId INTEGER,
      voteType TEXT,
      createdAt BIGINT,
      UNIQUE(reportId, userId)
    );

    CREATE TABLE IF NOT EXISTS cctvs (
      id SERIAL PRIMARY KEY,
      name TEXT,
      lat REAL,
      lng REAL,
      streamUrl TEXT,
      status TEXT DEFAULT 'Online'
    );

    CREATE TABLE IF NOT EXISTS chats (
      id SERIAL PRIMARY KEY,
      userId INTEGER,
      message TEXT,
      createdAt BIGINT
    );
  `;

  // SQLite doesn't support SERIAL PRIMARY KEY, so we adjust if needed
  if (!isPostgres) {
    const sqliteSchema = schema.replace(/SERIAL PRIMARY KEY/g, 'INTEGER PRIMARY KEY AUTOINCREMENT')
                               .replace(/BIGINT/g, 'INTEGER');
    await db.exec(sqliteSchema);
  } else {
    await db.exec(schema);
  }

  return db;
}

module.exports = { initDb };
