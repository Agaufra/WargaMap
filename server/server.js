require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { initDb } = require('./db');
const { calculatePriorityScore } = require('./ai-scoring');
const { fetchNewsAndIngest } = require('./news-service');
const { generateRecommendation } = require('./gemini-service');
const { decryptAES, encryptAES, decryptChaCha20 } = require('./crypto');

const http = require('http');
const { Server } = require('socket.io');

const app = express();
const PORT = process.env.PORT || 3001;
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));

let db;
const https = require('https');

async function start() {
  db = await initDb();
  await fetchNewsAndIngest(db);

  // Auto-refresh news every hour to keep the Intel Feed fresh
  setInterval(async () => {
    try {
      await fetchNewsAndIngest(db);
    } catch (err) {
      console.error('[SYSTEM] Error in background news sync:', err.message);
    }
  }, 3600000); // 1 hour interval

  // Proxy route for Bandung CCTV to bypass strict CORS
  app.get('/api/proxy/bandung/:file', async (req, res) => {
    try {
      const file = req.params.file;
      const targetUrl = `https://pelindung.bandung.go.id:3443/video/HIKSVISION/${file}`;

      const response = await axios({
        method: 'GET',
        url: targetUrl,
        responseType: 'stream',
        headers: {
          'Referer': 'https://pelindung.bandung.go.id/',
          'Origin': 'https://pelindung.bandung.go.id'
        },
        httpsAgent: new https.Agent({ rejectUnauthorized: false })
      });

      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Content-Type', response.headers['content-type']);
      response.data.pipe(res);
    } catch (err) {
      res.status(500).send(err.message);
    }
  });

  // --- AUTHENTICATION ROUTES ---

  // 1. Register User (with AES-128 Decryption)
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { data } = req.body;
      const decrypted = decryptAES(data);
      if (!decrypted) return res.status(400).json({ error: 'Invalid Encrypted Data' });

      const { name, username, ktpNumber, password } = decrypted;
      
      // Encrypt sensitive data for Database Storage
      const encryptedKtp = encryptAES(ktpNumber);
      const encryptedPassword = encryptAES(password);

      const result = await db.run(
        'INSERT INTO users (name, username, ktpNumber, password, createdAt) VALUES (?, ?, ?, ?, ?)',
        [name, username, encryptedKtp, encryptedPassword, Date.now()]
      );
      res.status(201).json({ id: result.lastID, name, username, trustScore: 50 });
    } catch (err) {
      if (err.message.includes('UNIQUE')) {
        const field = err.message.includes('ktpNumber') ? 'KTP Number' : 'Username';
        return res.status(400).json({ error: `${field} already registered.` });
      }
      res.status(500).json({ error: err.message });
    }
  });

  // 2. Login User (with AES-128 Decryption)
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { data } = req.body;
      const decrypted = decryptAES(data);
      if (!decrypted) return res.status(400).json({ error: 'Invalid Encrypted Data' });

      const { identity, password } = decrypted; // identity can be KTP or Username
      
      // Encrypt for DB lookup (Deterministic)
      const encryptedIdentity = encryptAES(identity);
      const encryptedPassword = encryptAES(password);

      const user = await db.get(
        'SELECT id, name, username, ktpNumber, password, trustScore FROM users WHERE (ktpNumber = ? OR username = ?) AND password = ?',
        [encryptedIdentity, identity, encryptedPassword]
      );

      if (user) {
        res.json({ 
          id: user.id, 
          name: user.name, 
          username: user.username, 
          trustScore: user.trustScore 
        });
      } else {
        res.status(401).json({ error: 'Invalid Identity or Password.' });
      }
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- REPORTING ROUTES ---

  // 3. Get all reports
  app.get('/api/reports', async (req, res) => {
    try {
      // Join with users to see trustScore of reporter
      const reports = await db.all(`
        SELECT 
          r.id, r.title, r.description, r.category, r.lat, r.lng, r.image, r.status, r.source, r.url,
          r.priorityScore AS "priorityScore", 
          r.priorityLevel AS "priorityLevel", 
          r.userId AS "userId", 
          r.upvotes, r.downvotes, 
          r.routeData AS "routeData", 
          r.createdAt AS "createdAt",
          u.name AS "reporterName", 
          u.trustScore AS "reporterTrust"
        FROM reports r
        LEFT JOIN users u ON r.userId = u.id
        ORDER BY r.createdAt DESC
      `);
      res.json(reports);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 4. Submit a new report (with Anti-Spam & User Check)
  app.post('/api/reports', async (req, res) => {
    try {
      const { title, description, category, lat, lng, image, userId, routeData } = req.body;
      const createdAt = Date.now();
      const today = new Date().toISOString().split('T')[0];

      if (!userId) return res.status(401).json({ error: 'Please login to report.' });

      // Check Anti-Spam (Max 3/day)
      const user = await db.get('SELECT id, lastReportDate AS "lastReportDate", reportCountToday AS "reportCountToday" FROM users WHERE id = ?', [userId]);
      if (user.lastReportDate === today && user.reportCountToday >= 3) {
        return res.status(429).json({ error: 'Daily limit reached (Max 3 reports/day).' });
      }

      const issue = { category, lat, lng, createdAt };
      const { score, level } = await calculatePriorityScore(issue, db);

      const result = await db.run(
        `INSERT INTO reports (title, description, category, lat, lng, image, status, priorityScore, priorityLevel, source, userId, routeData, createdAt) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [title, description, category, lat, lng, image, 'Reported', score, level, 'user', userId, routeData ? JSON.stringify(routeData) : null, createdAt]
      );

      // Update user anti-spam counter
      const newCount = (user.lastReportDate === today) ? user.reportCountToday + 1 : 1;
      await db.run('UPDATE users SET reportCountToday = ?, lastReportDate = ? WHERE id = ?', [newCount, today, userId]);

      const newReport = await db.get('SELECT id, title, description, category, lat, lng, image, status, priorityScore AS "priorityScore", priorityLevel AS "priorityLevel", source, url, userId AS "userId", upvotes, downvotes, routeData AS "routeData", createdAt AS "createdAt" FROM reports WHERE id = ?', result.lastID);
      res.status(201).json(newReport);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 5. Community Voting & Trust Score Logic
  app.post('/api/reports/:id/vote', async (req, res) => {
    try {
      const { userId, voteType } = req.body; // voteType: 'upvote' or 'downvote'
      const reportId = req.params.id;

      // 1. Record the vote (prevent duplicates via DB unique constraint)
      await db.run(
        'INSERT INTO votes (reportId, userId, voteType, createdAt) VALUES (?, ?, ?, ?)',
        [reportId, userId, voteType, Date.now()]
      );

      // 2. Update report vote counts
      if (voteType === 'upvote') {
        await db.run('UPDATE reports SET upvotes = upvotes + 1 WHERE id = ?', [reportId]);
      } else {
        await db.run('UPDATE reports SET downvotes = downvotes + 1 WHERE id = ?', [reportId]);
      }

      // 3. Update reporter's Trust Score
      const report = await db.get('SELECT userId FROM reports WHERE id = ?', [reportId]);
      if (report && report.userId) {
        const impact = (voteType === 'upvote') ? 2 : -5; // Upvote +2, Hoax/Downvote -5
        await db.run('UPDATE users SET trustScore = trustScore + ? WHERE id = ?', [impact, report.userId]);
      }

      res.json({ success: true });
    } catch (err) {
      if (err.message.includes('UNIQUE')) {
        return res.status(400).json({ error: 'You have already verified this report.' });
      }
      res.status(500).json({ error: err.message });
    }
  });

  // Haversine distance helper
  function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // 6. Stats & Dashboard - Fixed Hyper-Local Enforcement (Strict 5km)
  app.get('/api/reports/top-critical', async (req, res) => {
    try {
      const { lat, lng } = req.query;
      const targetLat = parseFloat(lat);
      const targetLng = parseFloat(lng);

      if (!isNaN(targetLat) && !isNaN(targetLng)) {
        console.log(`[RADAR SCAN] Investigating Location: ${targetLat}, ${targetLng}`);
      }

      // Fetch non-resolved reports
      let reports = await db.all('SELECT id, title, description, category, lat, lng, image, status, priorityScore AS "priorityScore", priorityLevel AS "priorityLevel", source, url, userId AS "userId", upvotes, downvotes, routeData AS "routeData", createdAt AS "createdAt" FROM reports WHERE (status != \'Resolved\' OR status IS NULL) ORDER BY priorityscore DESC');

      // STRICT ENFORCEMENT: If no valid coordinates, return empty list (prevent nationwide leakage)
      if (isNaN(targetLat) || isNaN(targetLng)) {
        console.warn('[RADAR ALERT] No coordinates provided. Blocking nationwide results.');
        return res.json([]);
      }

      // Calculate distance for all and filter strictly by 5km radius
      const localized = reports.map(r => ({
        ...r,
        distance: getDistance(targetLat, targetLng, r.lat, r.lng)
      })).filter(r => r.distance <= 5) // 5km Hard Limit for "Per Daerah"
        .sort((a, b) => a.distance - b.distance); // Nearest first

      console.log(`[RADAR RESULT] Found ${localized.length} localized reports in 5km radius.`);

      // Return top 5 closest in that 5km area
      res.json(localized.slice(0, 5));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 7. CCTV Monitor Integration
  // Initial Seed for Bogor CCTV
  const seedCCTVs = async () => {

    const cameras = [
      //Bogor
      { name: 'CCTV - Tugu Kujang', lat: -6.600969934103324, lng: 106.80523719030639, stream: 'https://restreamer2.kotabogor.go.id/memfs/5a5cf878-9d9b-4400-a73a-27a5b24a6ec4.m3u8' },
      { name: 'CCTV - Gang Aut', lat: -6.6104, lng: 106.8040, stream: 'https://restreamer2.kotabogor.go.id/memfs/64b180ce-d237-44d9-b857-c610e1d0c75c.m3u8' },
      { name: 'CCTV - Kapten Muslihat', lat: -6.5956, lng: 106.7869, stream: 'https://restreamer2.kotabogor.go.id/memfs/3ec6eaf2-4da1-4adb-8c15-0251e69121d6.m3u8' },
      { name: 'CCTV - Ciheleut', lat: -6.607777251284848, lng: 106.80985502953055, stream: 'https://restreamer2.kotabogor.go.id/memfs/f5ca1d37-c267-4806-850b-d1ca537fb29a_output_0.m3u8' },
      { name: 'CCTV - Djuanda Arah Balaikota', lat: -6.604002936431409, lng: 106.7963435259686, stream: 'https://restreamer2.kotabogor.go.id/memfs/5a5cf878-9d9b-4400-a73a-27a5b24a6ec4.m3u8' },
      { name: 'CCTV - Depan Alun-alun Kota Bogor', lat: -6.596193425005201, lng: 106.79100776817194, stream: 'https://restreamer2.kotabogor.go.id/memfs/c07c1926-288c-46e4-a19c-9f51022edc5d_output_0.m3u8' },
      { name: 'CCTV - Keluar Stasiun Kota Bogor', lat: -6.594553183389407, lng: 106.78981568428935, stream: 'https://restreamer4.kotabogor.go.id/memfs/66a4ac45-9646-42e7-804c-5293af4ee4fc_output_0.m3u8' },
      //Bandung
      { name: 'CCTV - Arah Balkot Braga 01', lat: -6.915775434468083, lng: 107.60892694425833, stream: 'http://localhost:3001/api/proxy/bandung/braga.m3u8' },
      { name: 'CCTV - Balaikota Wastukencana', lat: -6.912682948357106, lng: 107.60910612520917, stream: 'http://localhost:3001/api/proxy/bandung/balkott.m3u8' },

    ];
    for (const cam of cameras) {
      const existing = await db.get('SELECT id, streamUrl FROM cctvs WHERE name = ?', [cam.name]);
      if (!existing) {
        console.log(`[SYSTEM] Syncing New Camera: ${cam.name}`);
        await db.run('INSERT INTO cctvs (name, lat, lng, streamUrl) VALUES (?, ?, ?, ?)', [cam.name, cam.lat, cam.lng, cam.stream]);
      } else if (existing.streamUrl !== cam.stream) {
        console.log(`[SYSTEM] Updating Stream URL for: ${cam.name}`);
        await db.run('UPDATE cctvs SET streamUrl = ? WHERE id = ?', [cam.stream, existing.id]);
      }
    }
  };
  await seedCCTVs();

  app.get('/api/debug-db', async (req, res) => {
    try {
      const reportsCount = await db.get('SELECT COUNT(*) as count FROM reports');
      const cctvCount = await db.get('SELECT COUNT(*) as count FROM cctvs');
      const firstReport = await db.get('SELECT id, title, lat, lng FROM reports LIMIT 1');
      const firstCCTV = await db.get('SELECT id, name, lat, lng FROM cctvs LIMIT 1');
      
      res.json({
        database: process.env.DATABASE_URL ? 'PostgreSQL' : 'SQLite',
        env: {
          DATABASE_URL: process.env.DATABASE_URL ? 'PRESENT' : 'MISSING',
          PORT: process.env.PORT || '3001'
        },
        counts: { 
          reports: reportsCount ? reportsCount.count : 0, 
          cctvs: cctvCount ? cctvCount.count : 0 
        },
        samples: { 
          report: firstReport, 
          cctv: firstCCTV 
        }
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/cctvs', async (req, res) => {
    try {
      const cameras = await db.all('SELECT id, name, lat, lng, streamUrl AS "streamUrl", status FROM cctvs');
      res.json(cameras);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- COMMUNITY CHAT ROUTES ---
  app.get('/api/chats', async (req, res) => {
    try {
      const chats = await db.all(`
        SELECT 
          c.id, 
          c.userId AS "userId", 
          c.message, 
          c.createdAt AS "createdAt",
          u.name AS "userName", 
          u.username AS "userHandle", 
          u.trustScore AS "trustScore"
        FROM chats c
        LEFT JOIN users u ON c.userId = u.id
        ORDER BY c.createdAt ASC
      `);
      res.json(chats);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Real-time chat via WebSockets
  io.on('connection', (socket) => {
    console.log(`[Socket] A user connected: ${socket.id}`);

    socket.on('chatMessage', async (data) => {
      try {
        const { userId, message, tempId } = data; 
        if (!userId || !message) return;

        const messageString = JSON.stringify(message);
        const createdAt = Date.now();
        
        const result = await db.run(
          'INSERT INTO chats (userId, message, createdAt) VALUES (?, ?, ?)',
          [userId, messageString, createdAt]
        );

        const newChat = await db.get(`
          SELECT c.*, u.name as userName, u.username as userHandle, u.trustScore 
          FROM chats c
          LEFT JOIN users u ON c.userId = u.id
          WHERE c.id = ?
        `, result.lastID);

        // Broadcast to everyone, including tempId for reconciliation
        io.emit('newMessage', { ...newChat, tempId });
      } catch (err) {
        console.error('[Socket] Error saving chat message:', err.message);
      }
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] User disconnected: ${socket.id}`);
    });
  });

  app.get('/api/stats', async (req, res) => {
    try {
      const total = await db.get('SELECT COUNT(*) as count FROM reports');
      const users = await db.get('SELECT COUNT(*) as count FROM users');

      const byCategory = await db.all('SELECT category, COUNT(*) as count FROM reports GROUP BY category');
      const byPriority = await db.all('SELECT priorityLevel, COUNT(*) as count FROM reports GROUP BY priorityLevel');
      const byStatus = await db.all('SELECT status, COUNT(*) as count FROM reports GROUP BY status');

      res.json({
        total: total.count,
        activeUsers: users.count,
        byCategory,
        byPriority,
        byStatus
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 7. Smart City Intelligence (Real-Time Streams & Crowd-Sourced DeFlock)
  const NATIONWIDE_CCTVS = [
    { id: 'cctv-bgr-1', type: 'cctv', name: 'CCTV Gang Aut (Bogor)', streamUrl: 'https://restreamer2.kotabogor.go.id/memfs/64b180ce-d237-44d9-b857-c610e1d0c75c_output_0.m3u8', lat: -6.6111, lng: 106.8041, status: 'Active' },
    { id: 'cctv-bgr-2', type: 'cctv', name: 'CCTV Kapten Muslihat (Bogor)', streamUrl: 'https://restreamer2.kotabogor.go.id/memfs/3ec6eaf2-4da1-4adb-8c15-0251e69121d6_output_0.m3u8', lat: -6.5947, lng: 106.7884, status: 'Active' },
    { id: 'cctv-jkt-1', type: 'cctv', name: 'Bundaran HI Live Cam', streamUrl: 'https://www.w3schools.com/html/mov_bbb.mp4', lat: -6.1950, lng: 106.8230, status: 'Active' },
  ];

  app.get('/api/smart-city-data', async (req, res) => {
    try {
      // Return real-time CCTVs
      res.json({ infrastructure: NATIONWIDE_CCTVS });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- AI ASSISTANT ROUTES ---
  app.post('/api/ai/recommend', async (req, res) => {
    try {
      const { query, currentMapCenter } = req.body;
      const result = await generateRecommendation(query, currentMapCenter);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  server.listen(PORT, () => {
    console.log(`CivicSense backend running on http://localhost:${PORT}`);
  });
}

start();
