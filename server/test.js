require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function test() {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'YOUR_API_KEY_HERE');
    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
    const result = await model.generateContent("hello");
    console.log("SUCCESS:", result.response.text());
  } catch (err) {
    console.log("ERROR:", err.message);
  }
}
test();
