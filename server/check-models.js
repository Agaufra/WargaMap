require('dotenv').config();
const axios = require('axios');

async function checkModels() {
    const key = process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
    
    try {
        const res = await axios.get(url);
        console.log("AVAILABLE MODELS:", res.data.models.map(m => m.name).join(', '));
    } catch (err) {
        console.log("STATUS:", err.response?.status);
        console.log("DATA:", JSON.stringify(err.response?.data, null, 2));
    }
}

checkModels();
