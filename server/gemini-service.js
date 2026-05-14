const axios = require('axios');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'YOUR_API_KEY_HERE');

/**
 * Geocoding verification helper using Nominatim (OpenStreetMap)
 * Ensures coordinates are accurate and match physical map locations.
 */
async function fetchAccurateCoords(name, contextLat, contextLng) {
    try {
        // Query Nominatim with the place name. 
        // We add a User-Agent to comply with Nominatim's usage policy.
        const response = await axios.get(`https://nominatim.openstreetmap.org/search`, {
            params: {
                q: name,
                format: 'json',
                limit: 1,
                // We provide viewbox/bounded to prioritize results near the user's current area
                viewbox: `${contextLng - 0.5},${contextLat + 0.5},${contextLng + 0.5},${contextLat - 0.5}`,
                bounded: 0
            },
            headers: {
                'User-Agent': 'CivicSense-Awareness-Dashboard/1.0'
            },
            timeout: 3000
        });

        if (response.data && response.data.length > 0) {
            return {
                lat: parseFloat(response.data[0].lat),
                lng: parseFloat(response.data[0].lon)
            };
        }
        return null;
    } catch (err) {
        console.error(`[GEO-VERIFY] Failed to lookup: ${name}`, err.message);
        return null;
    }
}

async function generateRecommendation(query, currentMapCenter) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

    const prompt = `
      You are an expert travel, culinary, and local guide assistant for Indonesia.
      The user is currently looking at a map centered near these coordinates: Latitude ${currentMapCenter[0]}, Longitude ${currentMapCenter[1]}.
      
      User query: "${query}"
      
      Return a response strictly in JSON format with an array of "recommendations". 
      Each recommendation must have:
      - "name": The name of the place.
      - "description": A short, catchy description (max 2 sentences).
      - "lat": The approximate latitude of the location.
      - "lng": The approximate longitude of the location.
      - "category": Either "Food", "Tourism", or "Other".
      
      Example Response Format:
      {
        "recommendations": [
          {
            "name": "Taman Safari Indonesia",
            "description": "Tempat wisata keluarga dimana satwa dilepasliarkan. Cocok untuk liburan akhir pekan bersama anak-anak.",
            "lat": -6.7196,
            "lng": 106.9472,
            "category": "Tourism"
          }
        ]
      }
      
      Ensure you only return valid JSON, and nothing else (no markdown formatting block like \`\`\`json).
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text().trim();
    
    // Clean up potential markdown JSON formatting
    let cleanedText = responseText;
    if (cleanedText.startsWith('```json')) {
      cleanedText = cleanedText.replace(/^```json/, '').replace(/```$/, '').trim();
    } else if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.replace(/^```/, '').replace(/```$/, '').trim();
    }
    
    try {
        const parsedResponse = JSON.parse(cleanedText);
        
        // --- ENHANCEMENT: Geocoding Verification Pass ---
        if (parsedResponse.recommendations && Array.isArray(parsedResponse.recommendations)) {
            console.log(`[GEO-VERIFY] Validating ${parsedResponse.recommendations.length} recommendations...`);
            
            // Map over results and attempt to fetch precise coordinates
            const verificationPromises = parsedResponse.recommendations.map(async (rec) => {
                const precise = await fetchAccurateCoords(rec.name, currentMapCenter[0], currentMapCenter[1]);
                if (precise) {
                    console.log(`[GEO-VERIFY] Corrected: ${rec.name} -> [${precise.lat}, ${precise.lng}]`);
                    return { ...rec, lat: precise.lat, lng: precise.lng };
                }
                return rec; // Fallback to AI coords if lookup fails
            });

            parsedResponse.recommendations = await Promise.all(verificationPromises);
        }

        return parsedResponse;
    } catch (parseError) {
        console.error("Failed to parse Gemini response as JSON:", cleanedText);
        return { error: 'Gagal memahami rekomendasi dari AI.' };
    }

  } catch (error) {
    console.error('Error in Gemini Service:', error);
    return { error: 'Maaf, sistem AI sedang offline.' };
  }
}

module.exports = {
  generateRecommendation
};
