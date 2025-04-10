import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from root directory
dotenv.config({ path: path.join(__dirname, '../.env') });

async function testGeminiAPI() {
  try {
    console.log('Testing Gemini API...');
    console.log('API Key:', process.env.GEMINI_API_KEY?.substring(0, 10) + '...');
    
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not set');
    }
    
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    console.log('Initialized GoogleGenerativeAI');
    
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    console.log('Model created successfully');
    
    const prompt = { text: "What is 1 + 1?" };
    console.log('Sending prompt:', prompt);
    
    const result = await model.generateContent([prompt]);
    console.log('Got result');
    
    const response = await result.response;
    console.log('Got response');
    
    const text = response.text();
    console.log('Got text');
    
    console.log('API test successful!');
    console.log('Response:', text);
    
  } catch (error) {
    console.error('API test failed:', {
      message: error.message,
      name: error.name,
      stack: error.stack,
      response: error.response?.data
    });
  }
}

testGeminiAPI(); 