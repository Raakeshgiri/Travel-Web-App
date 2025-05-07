const express = require("express");
const router = express.Router();
const axios = require("axios");
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

// Tour plan generation endpoint
router.post("/generate-plan", async (req, res) => {
  try {
    const { userPrompt } = req.body;

    // Extract information from the user prompt
    const info = extractTravelInfo(userPrompt);

    if (!info.destination) {
      return res.json({
        message:
          "I'd need a bit more information to create your tour plan. Could you please specify your destination, how many days you'll be traveling, number of people, and your budget?",
      });
    }

    // Generate tour plan using OpenRouter API
    const tourPlan = await generateTourPlan(info);

    // Return the generated plan
    res.json({
      message: "Here's a custom tour plan based on your preferences:",
      tourPlan,
    });
  } catch (error) {
    console.error("Error generating tour plan:", error);
    res.status(500).json({
      message:
        "Sorry, I'm having trouble creating your plan right now. Please try again.",
    });
  }
});

// Extract travel information from user input
function extractTravelInfo(userPrompt) {
  // This is a simple extraction - in production, you might use regex or NLP
  const info = {
    destination: null,
    specificLocations: [],
    duration: null,
    people: null,
    budget: null,
  };

  const prompt = userPrompt.toLowerCase();

  // Extract destination (simple approach)
  const commonDestinations = [
    // Major Cities
    "delhi",
    "mumbai",
    "bangalore",
    "hyderabad",
    "chennai",
    "kolkata",
    "ahmedabad",
    "pune",
    "jaipur",
    "udaipur",
    "jodhpur",
    "goa",
    "kerala",
    "varanasi",
    "agra",
    "amritsar",
    "shimla",
    "manali",
    "darjeeling",
    "ooty",
    "munnar",
    "alleppey",
    "kodaikanal",
    "mahabalipuram",
    "hampi",
    "mysore",
    "kochi",
    "kanyakumari",
    "gangtok",
    "leh",
    // States/Regions
    "rajasthan",
    "kerala",
    "goa",
    "himachal pradesh",
    "uttarakhand",
    "tamil nadu",
    "karnataka",
    "maharashtra",
    "gujarat",
    "punjab",
    "west bengal",
    "sikkim",
    "ladakh",
    "andaman and nicobar",
    "lakshadweep",
    "kashmir",
  ];

  commonDestinations.forEach((dest) => {
    if (prompt.includes(dest)) {
      info.destination = dest.charAt(0).toUpperCase() + dest.slice(1);
    }
  });

  // Extract duration (days/nights)
  const durationMatch = prompt.match(/(\d+)\s*(day|days|night|nights)/);
  if (durationMatch) {
    info.duration = `${durationMatch[1]} ${durationMatch[2]}`;
  }

  // Extract number of people
  const peopleMatch = prompt.match(
    /(\d+)\s*(person|people|adult|adults|traveler|travelers|traveller|travellers)/
  );
  if (peopleMatch) {
    info.people = parseInt(peopleMatch[1]);
  }

  // Extract budget
  const budgetMatch = prompt.match(
    /(\$|\€|\£|\₹)?(\d+)[k]?(\s*(-|to)\s*(\$|\€|\£|\₹)?(\d+)[k]?)?\s*(budget|dollars|usd|euro|rupees|pound)/i
  );
  if (budgetMatch) {
    info.budget = budgetMatch[0];
  }

  return info;
}

// Generate tour plan using OpenRouter API
async function generateTourPlan(info) {
  try {
    const promptTemplate = `
    Create a detailed travel itinerary for a trip to ${
      info.destination || "[destination]"
    }.
    
    Trip details:
    - Duration: ${info.duration || "Not specified"}
    - Number of people: ${info.people || "Not specified"}
    - Budget: ${info.budget || "Not specified"}
    - Specific locations of interest: ${
      info.specificLocations.length > 0
        ? info.specificLocations.join(", ")
        : "Not specified"
    }
    
    Please provide:
    1. A day-by-day itinerary with morning, afternoon, and evening activities
    2. Suggested accommodations within the budget
    3. Transportation recommendations
    4. Estimated costs for major activities
    5. Any must-see attractions or local experiences
    
    Format the response as a structured JSON object with the following properties:
    - destination (string)
    - duration (string)
    - budget (string)
    - people (number)
    - itinerary (array of objects with 'day' and 'activities')
    - accommodations (string)
    - transportation (string)
    `;

    const response = await axios.post(
      "https://api.openrouter.ai/v1/generate",
      {
        prompt: promptTemplate,
        max_tokens: 1000,
      },
      {
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error("Error with OpenRouter API:", error);
    throw error;
  }
}

// Helper function to parse itinerary from text
function parseItinerary(text) {
  const itinerary = [];
  const dayPattern =
    /day\s*(\d+|one|two|three|four|five|six|seven|eight|nine|ten)[\s\S]*?(day\s*\d+|$)/gi;

  let match;
  let dayMatches = [];

  // Find all day sections
  while ((match = dayPattern.exec(text.toLowerCase())) !== null) {
    dayMatches.push(match);
  }

  if (dayMatches.length === 0) {
    // Fallback itinerary
    return [
      { day: "Day 1", activities: "Arrival and exploration" },
      { day: "Day 2", activities: "Visit main attractions" },
      { day: "Day 3", activities: "Departure" },
    ];
  }

  // Process each day
  dayMatches.forEach((match, index) => {
    const dayText = match[0];
    const dayNumber = match[1];
    const activities = dayText
      .replace(/day\s*\d+/i, "")
      .replace(/morning|afternoon|evening/gi, "")
      .replace(/:/g, "")
      .trim();

    itinerary.push({
      day: `Day ${dayNumber}`,
      activities:
        activities.length > 10
          ? activities
          : "Explore local attractions and cuisine",
    });
  });

  return itinerary;
}

// Helper to extract sections from text
function extractSection(text, sectionName, fallbackSectionName) {
  const patterns = [
    new RegExp(`${sectionName}[:\\s]+(.*?)(?=\\n\\s*\\n|$)`, "i"),
    new RegExp(`${fallbackSectionName}[:\\s]+(.*?)(?=\\n\\s*\\n|$)`, "i"),
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  return null;
}

module.exports = router;
