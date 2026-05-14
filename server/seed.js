const { initDb } = require('./db');
const { calculatePriorityScore } = require('./ai-scoring');

async function seed() {
  const db = await initDb();

  // Clean db
  await db.exec('DELETE FROM reports');

  const issues = [
    { title: "Excessive Trash in Park", category: "Garbage", description: "Bins overflowed since last week.", lat: -6.200000, lng: 106.816666, hoursAgo: 24 },
    { title: "Street lamp broken", category: "Street light", description: "Dark alleyway.", lat: -6.195000, lng: 106.820000, hoursAgo: 48 },
    { title: "Massive Pothole on main road", category: "Road damage", description: "Dangerous for motorcycles.", lat: -6.205000, lng: 106.810000, hoursAgo: 10 },
    { title: "Heavy water pooling", category: "Flood", description: "Water up to knees after short rain.", lat: -6.210000, lng: 106.815000, hoursAgo: 3 },
    { title: "Suspected drug activity", category: "Crime", description: "Suspicious people gathering night.", lat: -6.190000, lng: 106.825000, hoursAgo: 5 },
    // Cluster of crime to boost density score
    { title: "Mugging attempt", category: "Crime", description: "Someone tried to snatch a phone.", lat: -6.190100, lng: 106.825100, hoursAgo: 2 },
    { title: "Stolen motorbike", category: "Crime", description: "Motorcycle stolen from mart parking.", lat: -6.190200, lng: 106.825200, hoursAgo: 1 },
  ];

  for (const issue of issues) {
    const createdAt = Date.now() - (issue.hoursAgo * 60 * 60 * 1000);
    const issueToScore = { category: issue.category, lat: issue.lat, lng: issue.lng, createdAt };
    const { score, level } = await calculatePriorityScore(issueToScore, db);

    await db.run(
      `INSERT INTO reports (title, description, category, lat, lng, image, status, priorityScore, priorityLevel, createdAt) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [issue.title, issue.description, issue.category, issue.lat, issue.lng, '', 'Reported', score, level, createdAt]
    );
  }

  console.log("Database seeded successfully with AI scores!");
}

seed();
