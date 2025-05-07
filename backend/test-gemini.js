import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
const axios = require("axios");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from root directory
dotenv.config({ path: path.join(__dirname, "../.env") });

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

async function testOpenRouterAPI() {
  try {
    console.log("Testing OpenRouter API...");
    const response = await axios.post(
      "https://api.openrouter.ai/v1/generate",
      {
        prompt: "Test prompt for OpenRouter API",
        max_tokens: 100,
      },
      {
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("OpenRouter API response:", response.data);
  } catch (error) {
    console.error("Error testing OpenRouter API:", error);
  }
}

testOpenRouterAPI();
