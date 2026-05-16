const axios = require('axios');

async function testLocal() {
    try {
        const res = await axios.post('http://localhost:3001/api/ai/recommend', {
            query: "tempat wisata",
            currentMapCenter: [-6.2, 106.8]
        });
        console.log("SUCCESS:", JSON.stringify(res.data, null, 2));
    } catch (err) {
        console.error("FAILED:", err.message);
    }
}
testLocal();
