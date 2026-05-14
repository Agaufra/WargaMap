// AI Priority Scoring Logic

// Calculates distance in meters between two coordinates
function getDistanceFromLatLonInM(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Radius of the earth in m
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  const d = R * c; 
  return d;
}

// Calculate the priority score (0-100) and Level
async function calculatePriorityScore(issue, db) {
  let score = 0;
  
  // 1. Category Base Score
  const categoryScores = {
    'fire': 90,
    'crime': 80,
    'accident': 70,
    'flood': 60,
    'road damage': 40,
    'street light': 20,
    'garbage': 10
  };
  score += categoryScores[issue.category.toLowerCase()] || 10;
  
  // 2. Location Density Score (Number of unresolved reports within 500m)
  // Max +20 points (5 points per report)
  let nearbyCount = 0;
  if (db && issue.lat && issue.lng) {
    const existingReports = await db.all(`SELECT lat, lng FROM reports WHERE status != 'Resolved'`);
    for (const r of existingReports) {
      if (r.lat && r.lng) {
        const dist = getDistanceFromLatLonInM(issue.lat, issue.lng, r.lat, r.lng);
        if (dist <= 500) {
          nearbyCount++;
        }
      }
    }
  }
  score += Math.min(nearbyCount * 5, 20);
  
  // 3. Time Factor (Urgency increases if not resolved)
  // For new reports, this is 0. But we can export a recalculate function later.
  // We'll calculate it if an issue has a past createdAt.
  const createdAt = issue.createdAt || Date.now();
  const hoursSinceReport = (Date.now() - createdAt) / (1000 * 60 * 60);
  score += Math.min(hoursSinceReport * 1, 20);
  
  // Cap at 100
  score = Math.round(Math.min(score, 100));
  
  // Determine Level
  let level = 'Low';
  if (score >= 80) level = 'Critical';
  else if (score >= 60) level = 'High';
  else if (score >= 40) level = 'Medium';
  
  return { score, level };
}

module.exports = { calculatePriorityScore, getDistanceFromLatLonInM };
