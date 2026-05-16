require('dotenv').config();
const axios = require('axios');

async function testManual() {
    const key = process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`;
    
    try {
        const res = await axios.post(url, {
            contents: [{ parts: [{ text: "hi" }] }]
        });
        console.log("SUCCESS:", JSON.stringify(res.data, null, 2));
    } catch (err) {
        console.log("ERROR MESSAGE:", err.message);
        console.log("STATUS:", err.response?.status);
        console.log("DATA:", JSON.stringify(err.response?.data, null, 2));
    }
}

testManual();
