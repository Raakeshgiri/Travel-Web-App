import express from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import CustomTrip from "../models/CustomTrip.js";

const router = express.Router();

// Initialize Gemini AI with error handling
let genAI;
try {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not set in environment variables');
  }
  console.log('Initializing Gemini AI with API key:', process.env.GEMINI_API_KEY.substring(0, 10) + '...');
  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  console.log('Gemini AI initialized successfully');
} catch (error) {
  console.error('Failed to initialize Gemini AI:', error);
}

// Tour plan generation endpoint
router.post('/generate-plan', async (req, res) => {
  try {
    if (!genAI) {
      throw new Error('Gemini AI not initialized properly');
    }

    console.log('Received request with prompt:', req.body.userPrompt);
    const { userPrompt } = req.body;
    
    if (!userPrompt) {
      return res.status(400).json({
        message: "Please provide a prompt for the travel plan."
      });
    }
    
    // Extract information from the user prompt
    const info = extractTravelInfo(userPrompt);
    console.log('Extracted travel info:', info);
    
    if (!info.destination) {
      return res.json({
        message: "I'd need a bit more information to create your tour plan. Could you please specify your destination, how many days you'll be traveling, number of people, and your budget?"
      });
    }
    
    // Generate tour plan using Gemini AI
    console.log('Starting tour plan generation...');
    const tourPlan = await generateTourPlan(info);
    console.log('Generated tour plan:', tourPlan);
    
    // Return the generated plan
    res.json({
      message: "Here's a custom tour plan based on your preferences:",
      tourPlan
    });
    
  } catch (error) {
    console.error('Detailed error in generate-plan:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code,
      response: error.response?.data,
      cause: error.cause
    });
    
    // Send more detailed error response
    res.status(500).json({ 
      message: "Sorry, I'm having trouble creating your plan right now. Please try again.",
      error: error.message,
      details: error.response?.data || 'No additional details available',
      type: error.name
    });
  }
});

// Submit tour plan endpoint
router.post('/submit-plan', async (req, res) => {
  try {
    const { tourPlan, userDetails } = req.body;
    
    console.log('Submitting tour plan:', { tourPlan, userDetails });
    
    // Create a new custom trip request
    const customTrip = new CustomTrip({
      tourPlan,
      userDetails: userDetails || { name: 'Anonymous User' },
      status: 'pending',
      createdAt: new Date()
    });
    
    await customTrip.save();
    
    res.status(201).json({ 
      message: 'Custom trip request submitted successfully',
      tripId: customTrip._id 
    });
    
  } catch (error) {
    console.error('Error submitting custom trip:', error);
    res.status(500).json({ 
      message: 'Failed to submit tour plan',
      error: error.message 
    });
  }
});

// Get all custom trips
router.get('/custom-trips', async (req, res) => {
  try {
    const customTrips = await CustomTrip.find().sort({ createdAt: -1 });
    res.json(customTrips);
  } catch (error) {
    console.error('Error fetching custom trips:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch custom trips' 
    });
  }
});

// Update custom trip status
router.put('/custom-trips/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNotes } = req.body;
    
    const customTrip = await CustomTrip.findById(id);
    if (!customTrip) {
      return res.status(404).json({ 
        success: false,
        message: 'Custom trip not found' 
      });
    }
    
    customTrip.status = status;
    if (adminNotes) customTrip.adminNotes = adminNotes;
    customTrip.updatedAt = new Date();
    
    await customTrip.save();
    
    res.json({ 
      success: true,
      message: 'Custom trip updated successfully',
      customTrip 
    });
    
  } catch (error) {
    console.error('Error updating custom trip:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to update custom trip' 
    });
  }
});

// Extract travel information from user input
function extractTravelInfo(userPrompt) {
  const info = {
    destination: null,
    specificLocations: [],
    duration: null,
    people: null,
    budget: null
  };
  
  const prompt = userPrompt.toLowerCase();
  
  // Enhanced destination list with more locations and variations
  const commonDestinations = [
    // Major Cities
    'delhi', 'mumbai', 'bangalore', 'hyderabad', 'chennai', 
    'kolkata', 'ahmedabad', 'pune', 'jaipur', 'udaipur', 
    'jodhpur', 'goa', 'kerala', 'varanasi', 'agra', 
    'amritsar', 'shimla', 'manali', 'darjeeling', 'ooty',
    'munnar', 'alleppey', 'kodaikanal', 'mahabalipuram', 'hampi',
    'mysore', 'kochi', 'kanyakumari', 'gangtok', 'leh',
    // States/Regions
    'rajasthan', 'kerala', 'goa', 'himachal pradesh', 'uttarakhand',
    'tamil nadu', 'karnataka', 'maharashtra', 'gujarat', 'punjab',
    'west bengal', 'sikkim', 'ladakh', 'andaman and nicobar',
    'lakshadweep', 'kashmir'
  ];
  
  // Extract destination with better matching
  for (const dest of commonDestinations) {
    if (prompt.includes(dest)) {
      // Handle special cases for cities in countries
      if (dest === 'paris' && prompt.includes('france')) {
        info.destination = 'Paris, France';
      } else if (dest === 'london' && prompt.includes('uk')) {
        info.destination = 'London, UK';
      } else {
        info.destination = dest.charAt(0).toUpperCase() + dest.slice(1);
      }
      break;
    }
  }
  
  // Enhanced duration extraction
  const durationMatch = prompt.match(/(\d+)\s*(day|days|night|nights|week|weeks)/);
  if (durationMatch) {
    const number = durationMatch[1];
    const unit = durationMatch[2];
    info.duration = `${number} ${unit}`;
  }
  
  // Enhanced people count extraction
  const peopleMatch = prompt.match(/(\d+)\s*(person|people|adult|adults|traveler|travelers|traveller|travellers|family|families|group|groups)/);
  if (peopleMatch) {
    info.people = parseInt(peopleMatch[1]);
  }
  
  // Enhanced budget extraction with better currency handling
  const budgetMatch = prompt.match(/(\₹|\€|\£|\$)?(\d+)[k]?(\s*(-|to)\s*(\₹|\€|\£|\$)?(\d+)[k]?)?\s*(budget|dollars|usd|euro|rupees|pound|eur|gbp|inr)/i);
  if (budgetMatch) {
    const currency = budgetMatch[1] || '₹';
    const amount = budgetMatch[2];
    const range = budgetMatch[3] ? ` - ${budgetMatch[6]}` : '';
    const unit = budgetMatch[7] === 'dollars' ? 'rupees' : budgetMatch[7] || 'rupees';
    info.budget = `${currency}${amount}${range} ${unit}`;
  }
  
  return info;
}

// Generate tour plan using Gemini AI
async function generateTourPlan(info) {
  try {
    console.log('Creating Gemini model...');
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    console.log('Model created successfully');
    
    const promptTemplate = `
    Create a detailed travel itinerary for a trip to ${info.destination || '[destination]'}.
    
    Trip details:
    - Duration: ${info.duration || 'Not specified'}
    - Number of people: ${info.people || 'Not specified'}
    - Budget: ${info.budget ? info.budget : 'Not specified'} (all costs in ₹)
    - Specific locations of interest: ${info.specificLocations.length > 0 ? info.specificLocations.join(', ') : 'Not specified'}
    
    Please provide a detailed travel plan with the following structure:
    1. Day-by-day itinerary with specific activities and timings
    2. Accommodation recommendations based on the budget (prices in ₹)
    3. Transportation options and tips (costs in ₹)
    4. Must-see attractions and local experiences
    5. Estimated costs for major activities (in ₹)
    
    Format your response as a JSON object with these exact properties:
    {
      "destination": "string",
      "duration": "string",
      "budget": "string (in ₹)",
      "people": number,
      "itinerary": [
        {
          "day": "string (e.g., 'Day 1')",
          "activities": "string (comma-separated list of activities with costs in ₹)"
        }
      ],
      "accommodations": "string (with costs in ₹)",
      "transportation": "string (with costs in ₹)"
    }
    
    Make sure to:
    - Include specific timings for activities
    - Provide budget-friendly options
    - Include local tips and recommendations
    - Consider the number of people in the group
    - Suggest seasonal activities if applicable
    `;
    
    console.log('Generating content with Gemini...');
    const result = await model.generateContent([{ text: promptTemplate }]);
    console.log('Content generated, getting response...');
    const response = await result.response;
    console.log('Response received, getting text...');
    const responseText = response.text();
    console.log('Response text received:', responseText.substring(0, 100) + '...');
    
    // Extract JSON from the response
    try {
      // First try to directly parse the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        console.log('Found JSON in response, parsing...');
        const parsedResponse = JSON.parse(jsonMatch[0]);
        
        // Ensure the response matches the expected structure
        return {
          destination: parsedResponse.destination || info.destination || "Custom destination",
          duration: parsedResponse.duration || info.duration || "Custom duration",
          budget: parsedResponse.budget || info.budget || "Flexible budget",
          people: parsedResponse.people || info.people || 2,
          itinerary: Array.isArray(parsedResponse.itinerary) 
            ? parsedResponse.itinerary.map(day => ({
                day: day.day || "Day",
                activities: formatActivities(day.activities)
              }))
            : parseItinerary(responseText),
          accommodations: typeof parsedResponse.accommodations === 'string' 
            ? parsedResponse.accommodations 
            : "Various options available based on budget",
          transportation: typeof parsedResponse.transportation === 'string' 
            ? parsedResponse.transportation 
            : "Multiple options available"
        };
      }
      
      console.log('No JSON found in response, creating structured response...');
      // If direct parsing fails, create a structured response with available info
      return {
        destination: info.destination || "Custom destination",
        duration: info.duration || "Custom duration",
        budget: info.budget || "Flexible budget (₹)",
        people: info.people || 2,
        itinerary: parseItinerary(responseText),
        accommodations: extractSection(responseText, "accommodations", "accommodations") || "Various options available based on budget",
        transportation: extractSection(responseText, "transportation", "transportation") || "Multiple options available"
      };
    } catch (error) {
      console.error('Error parsing Gemini response:', error);
      
      // Fallback structured response
      return {
        destination: info.destination || "Custom destination",
        duration: info.duration || "Custom duration",
        budget: info.budget || "Flexible budget (₹)",
        people: info.people || 2,
        itinerary: [
          { day: "Day 1", activities: "Arrival and check-in to accommodation" },
          { day: "Day 2", activities: "Explore local attractions" },
          { day: "Final Day", activities: "Check-out and departure" }
        ],
        accommodations: "Options available based on budget",
        transportation: "Multiple options available"
      };
    }
    
  } catch (error) {
    console.error('Error with Gemini AI:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code,
      response: error.response?.data
    });
    throw error;
  }
}

// Helper function to format activities
function formatActivities(activities) {
  if (typeof activities === 'string') {
    return activities;
  }
  
  if (Array.isArray(activities)) {
    return activities.map(activity => {
      if (typeof activity === 'string') {
        return activity;
      }
      if (typeof activity === 'object') {
        // Handle time-based activities
        if (activity.time && activity.activity) {
          return `${activity.time}: ${activity.activity}`;
        }
        // Handle other object formats
        return Object.values(activity).join(': ');
      }
      return String(activity);
    }).join(', ');
  }
  
  if (typeof activities === 'object') {
    return Object.entries(activities)
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ');
  }
  
  return String(activities);
}

// Helper function to parse itinerary from text
function parseItinerary(text) {
  const itinerary = [];
  const dayPattern = /day\s*(\d+|one|two|three|four|five|six|seven|eight|nine|ten)[\s\S]*?(day\s*\d+|$)/gi;
  
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
      { day: "Day 3", activities: "Departure" }
    ];
  }
  
  // Process each day
  dayMatches.forEach((match, index) => {
    const dayText = match[0];
    const dayNumber = match[1];
    const activities = dayText
      .replace(/day\s*\d+/i, '')
      .replace(/morning|afternoon|evening/gi, '')
      .replace(/:/g, '')
      .trim();
    
    itinerary.push({
      day: `Day ${dayNumber}`,
      activities: activities.length > 10 ? activities : "Explore local attractions and cuisine"
    });
  });
  
  return itinerary;
}

// Helper to extract sections from text
function extractSection(text, sectionName, fallbackSectionName) {
  const patterns = [
    new RegExp(`${sectionName}[:\\s]+(.*?)(?=\\n\\s*\\n|$)`, 'i'),
    new RegExp(`${fallbackSectionName}[:\\s]+(.*?)(?=\\n\\s*\\n|$)`, 'i')
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  
  return null;
}

export default router;