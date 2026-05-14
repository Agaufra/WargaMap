const { calculatePriorityScore } = require('./ai-scoring');
const Parser = require('rss-parser');
const parser = new Parser({
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
});

// AI Geolocation Map (Massive Expansion for All Indonesia)
const LOCATION_MAP = {
    // Sumatera
    "banda aceh": { lat: 5.5483, lng: 95.3238 },
    "medan": { lat: 3.5952, lng: 98.6722 },
    "padang": { lat: -0.9492, lng: 100.3543 },
    "pekanbaru": { lat: 0.5105, lng: 101.4443 },
    "palembang": { lat: -2.9761, lng: 104.7754 },
    "jambi": { lat: -1.6101, lng: 103.6131 },
    "bengkulu": { lat: -3.8004, lng: 102.2562 },
    "bandar lampung": { lat: -5.4500, lng: 105.2667 },
    "pangkalpinang": { lat: -2.1290, lng: 106.1042 },
    "tanjung pinang": { lat: 0.9167, lng: 104.4500 },
    "batam": { lat: 1.0828, lng: 104.0305 },

    // Jawa & Bali
    "jakarta": { lat: -6.2000, lng: 106.8166 },
    "tangerang": { lat: -6.1783, lng: 106.6319 },
    "bekasi": { lat: -6.2333, lng: 106.9833 },
    "depok": { lat: -6.4000, lng: 106.8180 },
    "bogor": { lat: -6.5944, lng: 106.7892 },
    "bandung": { lat: -6.9175, lng: 107.6191 },
    "jatinangor": { lat: -6.9341, lng: 107.7651 },
    "jatinangor": { lat: -6.933466798224653, lng: 107.76380712566443 },
    "sumedang": { lat: -6.8525, lng: 107.9231 },
    "garut": { lat: -7.2279, lng: 107.9087 },
    "tasikmalaya": { lat: -7.3274, lng: 108.2207 },
    "ciamis": { lat: -7.3274, lng: 108.3551 },
    "kuningan": { lat: -6.9768, lng: 108.4844 },
    "subang": { lat: -6.5592, lng: 107.7584 },
    "purwakarta": { lat: -6.5564, lng: 107.4426 },
    "karawang": { lat: -6.3227, lng: 107.3376 },
    "cimahi": { lat: -6.8722, lng: 107.5458 },
    "sukabumi": { lat: -6.9237, lng: 106.9272 },
    "cirebon": { lat: -6.7320, lng: 108.5523 },
    "semarang": { lat: -6.9667, lng: 110.4167 },
    "surakarta": { lat: -7.5561, lng: 110.8317 },
    "solo": { lat: -7.5561, lng: 110.8317 },
    "magelang": { lat: -7.4797, lng: 110.2177 },
    "yogyakarta": { lat: -7.7971, lng: 110.3705 },
    "kudus": { lat: -6.8048, lng: 110.8404 },
    "jepara": { lat: -6.5888, lng: 110.6685 },
    "brebes": { lat: -6.8708, lng: 109.0375 },
    "tegal": { lat: -6.8676, lng: 109.1386 },
    "cilacap": { lat: -7.7028, lng: 109.0236 },
    "pekalongan": { lat: -6.8886, lng: 109.6753 },
    "surabaya": { lat: -7.2575, lng: 112.7521 },
    "malang": { lat: -7.9839, lng: 112.6214 },
    "lumajang": { lat: -8.1303, lng: 113.2235 },
    "probolinggo": { lat: -7.7754, lng: 113.2038 },
    "jember": { lat: -8.1844, lng: 113.6681 },
    "banyuwangi": { lat: -8.2192, lng: 114.3692 },
    "pasuruan": { lat: -7.6441, lng: 112.9067 },
    "mojokerto": { lat: -7.4726, lng: 112.4381 },
    "madiun": { lat: -7.6298, lng: 111.5239 },
    "bojonegoro": { lat: -7.1506, lng: 111.8817 },
    "tuban": { lat: -6.9031, lng: 112.0622 },
    "sidoarjo": { lat: -7.4478, lng: 112.7183 },
    "kediri": { lat: -7.8228, lng: 112.0119 },
    "denpasar": { lat: -8.6705, lng: 115.2126 },
    "gianyar": { lat: -8.5413, lng: 115.3262 },
    "tabanan": { lat: -8.5411, lng: 115.1252 },
    "badung": { lat: -8.5861, lng: 115.1711 },
    "singaraja": { lat: -8.1147, lng: 115.0933 },
    "karangasem": { lat: -8.4411, lng: 115.6075 },
    "buleleng": { lat: -8.1124, lng: 115.0882 },
    "jembrana": { lat: -8.3000, lng: 114.6667 },
    "bangli": { lat: -8.4500, lng: 115.3333 },
    "klungkung": { lat: -8.5333, lng: 115.4000 },
    "serang": { lat: -6.1153, lng: 106.1511 },
    "cilegon": { lat: -6.0125, lng: 106.0275 },
    "lebak": { lat: -6.5861, lng: 106.2411 },
    "pandeglang": { lat: -6.3125, lng: 105.8450 },

    // Kalimantan
    "pontianak": { lat: -0.0276, lng: 109.3425 },
    "palangkaraya": { lat: -2.2083, lng: 113.9167 },
    "banjarmasin": { lat: -3.3167, lng: 114.5833 },
    "samarinda": { lat: -0.5022, lng: 117.1536 },
    "balikpapan": { lat: -1.2379, lng: 116.8529 },
    "tarakan": { lat: 3.3000, lng: 117.6333 },

    // Sulawesi, Maluku & Papua
    "makassar": { lat: -5.1476, lng: 119.4327 },
    "manado": { lat: 1.4870, lng: 124.8455 },
    "palu": { lat: -0.8917, lng: 119.8707 },
    "kendari": { lat: -3.9983, lng: 122.5131 },
    "gorontalo": { lat: 0.5408, lng: 123.0605 },
    "ambon": { lat: -3.6954, lng: 128.1814 },
    "ternate": { lat: 0.8000, lng: 127.4000 },
    "jayapura": { lat: -2.5333, lng: 140.7167 },
    "sorong": { lat: -0.8833, lng: 131.2500 },
    "kupang": { lat: -10.1583, lng: 123.5972 },
    "mataram": { lat: -8.5833, lng: 116.1167 }
};

// AI Category Keywords (Expanded with Fire and Accident)
const CATEGORY_KEYWORDS = {
    'flood': ['banjir', 'genangan', 'hujan deras', 'tanggul jebol', 'longsor'],
    'fire': ['kebakaran', 'dilalap api', 'si jago merah', 'hangus'],
    'accident': ['kecelakaan', 'tabrakan', 'terguling', 'lakalantas', 'beruntun', 'jalan tol'],
    'garbage': ['sampah', 'limbah', 'kotor', 'tumpukan'],
    'road damage': ['jalan rusak', 'lubang', 'aspal', 'ambles', 'pothole'],
    'street light': ['penerangan', 'lampu mati', 'gelap', 'pju'],
    'crime': ['pencurian', 'begal', 'tawuran', 'kriminal', 'pembegalan', 'copet', 'perampokan', 'narkoba'],
};

// Array of RSS News Portals (Massively Expanded)
const NEWS_SOURCES = [
    'https://feeds.bbci.co.uk/indonesia/rss.xml',
    'https://sindonews.com/feed',
    'https://www.republika.co.id/rss',
    'https://www.viva.co.id/get/all',
    'https://rss.tempo.co/nasional', // Updated to subdomain
    // Regional & Local Portals (Tribun & Local News)
    'https://jatim.tribunnews.com/rss',
    'https://bogor.tribunnews.com/rss',
    'https://jakarta.tribunnews.com/rss',
    'https://jogja.tribunnews.com/rss',
    'https://makassar.tribunnews.com/rss',
    'https://medan.tribunnews.com/rss',
    'https://bali.tribunnews.com/rss',
    'https://jabar.tribunnews.com/rss',
    'https://lumajangsatu.com/feed', // Updated from /rss
    // Smart Search: Scanning all platforms via Google News for specific disaster keywords
    'https://news.google.com/rss/search?q=kejahatan+OR+begal+OR+tawuran+OR+kriminal+OR+pembegalan+OR+copet+OR+perampokan+OR+narkoba+OR+banjir+OR+kecelakaan+OR+kebakaran+when:48h&hl=id&gl=ID&ceid=ID:id'
];

async function fetchNewsAndIngest(db) {
    console.log(`[NEWS-AI] Connecting to ${NEWS_SOURCES.length} news platforms for nation-wide scanning...`);

    let totalIngested = 0;
    const TWO_DAYS_MS = 48 * 60 * 60 * 1000;

    for (const source of NEWS_SOURCES) {
        try {
            const feed = await parser.parseURL(source);

            for (const item of feed.items) {
                const text = (item.title + " " + (item.contentSnippet || "")).toLowerCase();

                // --- FILTER WAKTU (Baru) ---
                // Hanya ambil berita jika terbit dalam 48 jam terakhir
                const pubDate = new Date(item.pubDate || item.isoDate).getTime();
                if (Date.now() - pubDate > TWO_DAYS_MS) continue;

                // 2. AI Logic: Categorize
                let detectedCategory = null;
                for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
                    if (keywords.some(k => text.includes(k))) {
                        detectedCategory = cat;
                        break;
                    }
                }

                // 3. AI Logic: Geolocate
                let detectedLocation = null;
                for (const [city, coords] of Object.entries(LOCATION_MAP)) {
                    const regex = new RegExp(`\\b${city}\\b`, 'i');
                    if (regex.test(text)) {
                        detectedLocation = {
                            lat: coords.lat + (Math.random() - 0.5) * 0.05,
                            lng: coords.lng + (Math.random() - 0.5) * 0.05
                        };
                        break;
                    }
                }

                // 4. Save to DB
                if (detectedCategory && detectedLocation) {
                    const url = item.link;
                    const exists = await db.get('SELECT id FROM reports WHERE url = ?', url);

                    if (!exists) {
                        const newsData = {
                            category: detectedCategory,
                            lat: detectedLocation.lat,
                            lng: detectedLocation.lng,
                            createdAt: pubDate // Gunakan waktu terbit asli berita
                        };

                        const { score, level } = await calculatePriorityScore(newsData, db);

                        await db.run(
                            `INSERT INTO reports (title, description, category, lat, lng, status, priorityScore, priorityLevel, source, url, createdAt) 
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                            [item.title, "Reported via AI Nationwide News Scanner", detectedCategory, detectedLocation.lat, detectedLocation.lng, 'Reported', score, level, 'news', url, pubDate]
                        );
                        totalIngested++;
                        console.log(`[NEWS-AI] 🚨 Incident: ${item.title.substring(0, 40)}... (${detectedCategory})`);
                    }
                }
            }
        } catch (error) {
            console.error(`[NEWS-AI] Error fetching from ${source.substring(0, 30)}...:`, error.message);
        }
    }

    console.log(`[NEWS-AI] Scan complete. Found ${totalIngested} new fresh incidents across Indonesia.`);
}

module.exports = { fetchNewsAndIngest, CATEGORY_KEYWORDS, LOCATION_MAP };
