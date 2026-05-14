const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

async function initDb() {
  const db = await open({
    filename: './database.sqlite',
    driver: sqlite3.Database
  });

  // Set busy timeout to prevent hangs during high concurrency
  await db.run('PRAGMA busy_timeout = 5000');

  // 1. Table Reports (Updated)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
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
      createdAt INTEGER
    )
  `);

  // Add routeData column if it doesn't exist (for existing databases)
  try {
    await db.run('ALTER TABLE reports ADD COLUMN routeData TEXT');
  } catch (e) {
    // Column likely already exists
  }

  // 2. Table Users (Identity & Trust Score)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      username TEXT UNIQUE,
      ktpNumber TEXT UNIQUE,
      password TEXT, -- In real app, must be hashed
      trustScore INTEGER DEFAULT 50, -- Start with neutral trust
      reportCountToday INTEGER DEFAULT 0,
      lastReportDate TEXT,
      createdAt INTEGER
    )
  `);

  // Add username column if it doesn't exist (for existing databases)
  try {
    await db.run('ALTER TABLE users ADD COLUMN username TEXT');
    await db.run('CREATE UNIQUE INDEX idx_users_username ON users(username)');
  } catch (e) {
    // Column likely already exists
  }

  // 3. Table Votes (Citizen Verification Tracking)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS votes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reportId INTEGER,
      userId INTEGER,
      voteType TEXT, -- 'upvote' or 'downvote'
      createdAt INTEGER,
      UNIQUE(reportId, userId)
    )
  `);

  // 4. Table CCTVs (Live Monitor Integration)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS cctvs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      lat REAL,
      lng REAL,
      streamUrl TEXT,
      status TEXT DEFAULT 'Online'
    )
  `);

  // 5. Table Chats (Community Intel Feed)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS chats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER,
      message TEXT,
      createdAt INTEGER
    )
  `);

  return db;
}

module.exports = { initDb };
