// ISSUE IDENTIFICATION AND SOLUTION

/*
POTENTIAL ISSUES FOUND:

1. Missing Chatbot Route: The index.js imports "chatbotRoute" but your code doesn't show how chatbot.route.js is defined
2. Error Handling: The OpenRouter API integration has potential error handling issues
3. JSON Parsing: The JSON parsing from OpenRouter responses could be fragile
4. API Key: The implementation depends on OPENROUTER_API_KEY but doesn't have fallback handling

SOLUTION:
Create a proper chatbot.route.js file that handles the OpenRouter API correctly
*/

// chatbot.route.js - NEW IMPLEMENTATION
import express from "express";
import CustomTrip from "../models/CustomTrip.js";

const router = express.Router();

// Configuration for OpenRouter API
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
if (!OPENROUTER_API_KEY) {
  console.warn(
    "Warning: OPENROUTER_API_KEY is not set in environment variables"
  );
}

// Tour plan generation endpoint
router.post("/generate-plan", async (req, res) => {
  try {
    console.log("Received request payload:", req.body);

    const { userPrompt } = req.body;
    if (!userPrompt) {
      return res.status(400).json({
        message: "Please provide a prompt for the travel plan.",
      });
    }

    // Extract travel information
    const info = extractTravelInfo(userPrompt);
    console.log("Extracted travel info:", info);

    if (!info.destination) {
      return res.json({
        message:
          "I'd need a bit more information to create your tour plan. Could you please specify your destination, how many days you'll be traveling, number of people, and your budget?",
      });
    }

    try {
      // Generate tour plan using OpenRouter API
      console.log("Starting tour plan generation...");
      const tourPlan = await generateTourPlan(info);
      console.log("Generated tour plan:", tourPlan);

      // Return the generated plan
      res.json({
        message: "Here's a custom tour plan based on your preferences:",
        tourPlan,
      });
    } catch (aiError) {
      console.error("AI processing error:", aiError);
      // Fallback plan when AI fails
      const fallbackPlan = generateFallbackPlan(info);
      res.json({
        message:
          "Here's a custom tour plan based on your preferences (simplified version):",
        tourPlan: fallbackPlan,
      });
    }
  } catch (error) {
    console.error("Detailed error in generate-plan:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code,
      response: error.response?.data,
      cause: error.cause,
    });

    // Send more detailed error response
    res.status(500).json({
      message:
        "Sorry, I'm having trouble creating your plan right now. Please try again.",
      error: error.message,
      details: error.response?.data || "No additional details available",
      type: error.name,
    });
  }
});

// Submit tour plan endpoint
router.post("/submit-plan", async (req, res) => {
  try {
    const { tourPlan, userDetails } = req.body;

    if (!tourPlan) {
      return res.status(400).json({
        message: "Tour plan is required",
      });
    }

    console.log("Submitting tour plan:", { tourPlan, userDetails });

    // Create a new custom trip request
    const customTrip = new CustomTrip({
      tourPlan,
      userDetails: userDetails || { name: "Anonymous User" },
      status: "pending",
      createdAt: new Date(),
    });

    await customTrip.save();

    res.status(201).json({
      message: "Custom trip request submitted successfully",
      tripId: customTrip._id,
    });
  } catch (error) {
    console.error("Error submitting custom trip:", error);
    res.status(500).json({
      message: "Failed to submit tour plan",
      error: error.message,
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
    budget: null,
  };

  const prompt = userPrompt.toLowerCase();

  // Enhanced destination list with more locations and variations
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

  // Extract destination with better matching
  for (const dest of commonDestinations) {
    if (prompt.includes(dest)) {
      // Handle special cases for cities in countries
      if (dest === "paris" && prompt.includes("france")) {
        info.destination = "Paris, France";
      } else if (dest === "london" && prompt.includes("uk")) {
        info.destination = "London, UK";
      } else {
        info.destination = dest.charAt(0).toUpperCase() + dest.slice(1);
      }
      break;
    }
  }

  // Enhanced duration extraction
  const durationMatch = prompt.match(
    /(\d+)\s*(day|days|night|nights|week|weeks)/
  );
  if (durationMatch) {
    const number = durationMatch[1];
    const unit = durationMatch[2];
    info.duration = `${number} ${unit}`;
  }

  // Enhanced people count extraction
  const peopleMatch = prompt.match(
    /(\d+)\s*(person|people|adult|adults|traveler|travelers|traveller|travellers|family|families|group|groups)/
  );
  if (peopleMatch) {
    info.people = parseInt(peopleMatch[1]);
  }

  // Enhanced budget extraction with better currency handling
  const budgetMatch = prompt.match(
    /(\₹|\€|\£|\$)?(\d+)[k]?(\s*(-|to)\s*(\₹|\€|\£|\$)?(\d+)[k]?)?\s*(budget|dollars|usd|euro|rupees|pound|eur|gbp|inr)/i
  );
  if (budgetMatch) {
    const currency = budgetMatch[1] || "₹";
    const amount = budgetMatch[2];
    const range = budgetMatch[3] ? ` - ${budgetMatch[6]}` : "";
    const unit =
      budgetMatch[7] === "dollars" ? "rupees" : budgetMatch[7] || "rupees";
    info.budget = `${currency}${amount}${range} ${unit}`;
  }

  return info;
}

// Generate tour plan using OpenRouter API with robust error handling
async function generateTourPlan(info) {
  if (!OPENROUTER_API_KEY) {
    throw new Error("OpenRouter API key is not configured");
  }

  const prompt = `
Create a detailed travel itinerary for a trip to ${
    info.destination || "[destination]"
  }.

Trip details:
- Duration: ${info.duration || "Not specified"}
- Number of people: ${info.people || "Not specified"}
- Budget: ${info.budget || "Not specified"} (all costs in ₹)
- Specific locations of interest: ${
    info.specificLocations.length > 0
      ? info.specificLocations.join(", ")
      : "Not specified"
  }

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
`;

  try {
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        },
        body: JSON.stringify({
          model: "mistralai/mixtral-8x7b", // or any other OpenRouter-supported model
          messages: [
            {
              role: "system",
              content: "You are a helpful travel planning assistant.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          response_format: { type: "json_object" }, // Request JSON format explicitly
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `OpenRouter API Error (${response.status}): ${errorText}`
      );
    }

    const result = await response.json();

    if (!result.choices || !result.choices[0] || !result.choices[0].message) {
      throw new Error("Invalid response format from OpenRouter API");
    }

    const content = result.choices[0].message.content;

    // Improved JSON parsing with error handling
    try {
      // Try direct parsing first
      const parsedPlan = JSON.parse(content);
      return validateTourPlan(parsedPlan);
    } catch (parseError) {
      // If that fails, try to extract JSON from text
      console.warn(
        "Direct JSON parsing failed, attempting to extract JSON from text",
        parseError
      );
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const extractedJson = JSON.parse(jsonMatch[0]);
          return validateTourPlan(extractedJson);
        } catch (secondParseError) {
          throw new Error("Failed to parse JSON from API response");
        }
      } else {
        throw new Error("Could not find JSON in API response");
      }
    }
  } catch (error) {
    console.error("Error in generateTourPlan:", error);
    throw error;
  }
}

// Validate and normalize tour plan data
function validateTourPlan(plan) {
  // Ensure all required fields exist
  const validatedPlan = {
    destination: plan.destination || "Unknown destination",
    duration: plan.duration || "Not specified",
    budget: plan.budget || "Not specified",
    people: plan.people || 1,
    itinerary: Array.isArray(plan.itinerary) ? plan.itinerary : [],
    accommodations:
      plan.accommodations || "Standard accommodations based on availability",
    transportation: plan.transportation || "Local transportation options",
  };

  // Ensure itinerary has at least one day
  if (validatedPlan.itinerary.length === 0) {
    validatedPlan.itinerary = [
      {
        day: "Day 1",
        activities: "Explore the destination",
      },
    ];
  }

  // Ensure each day has the required format
  validatedPlan.itinerary = validatedPlan.itinerary.map((day, index) => {
    return {
      day: day.day || `Day ${index + 1}`,
      activities: day.activities || "Explore local attractions",
    };
  });

  return validatedPlan;
}

// Generate a fallback plan when AI fails with destination-specific itineraries
function generateFallbackPlan(info) {
  const destination = info.destination ? info.destination.toLowerCase() : "";

  // Destination-specific itineraries database
  const destinationData = {
    // Major Cities
    delhi: {
      itinerary: [
        {
          day: "Day 1",
          activities:
            "Morning: Visit India Gate and take photos at this iconic monument (Free). \nAfternoon: Explore Connaught Place for shopping and lunch at a local restaurant (₹500-800 per person). \nEvening: Enjoy cultural experiences at Dilli Haat, browse handicrafts and try regional cuisines (Entry: ₹30, Food: ₹300-600 per person). \nNight: Take a leisurely stroll at Rajpath and see the illuminated government buildings.",
        },
        {
          day: "Day 2",
          activities:
            "Morning: Tour the magnificent Red Fort, exploring the various pavilions and museums (Entry: ₹35 for Indians, ₹500 for foreigners). \nAfternoon: Visit Jama Masjid, one of India's largest mosques, and climb the minaret for city views (Free entry, Camera fee: ₹300). \nEvening: Wander through the bustling lanes of Chandni Chowk markets, trying famous street foods like Paranthe Wali Gali (₹200-400 for food). \nNight: Take a heritage walk in Old Delhi to experience the area's history and architecture (₹500-1000 for guided tour).",
        },
        {
          day: "Day 3",
          activities:
            "Morning: Visit UNESCO World Heritage Site Qutub Minar and explore the surrounding archaeological complex (Entry: ₹30 for Indians, ₹500 for foreigners). \nAfternoon: Tour Humayun's Tomb and its beautiful gardens, another UNESCO site (Entry: ₹30 for Indians, ₹500 for foreigners). \nEvening: Shopping expedition at Sarojini Nagar Market for budget fashion and souvenirs (Budget as per your shopping needs). \nNight: Enjoy dinner at Hauz Khas Village with views of the ancient reservoir and monuments (₹800-1500 per person).",
        },
      ],
      accommodations:
        "Options in Central Delhi, Karol Bagh, or Paharganj area (₹1,500-8,000 per night)",
      transportation:
        "Metro rail (₹10-60 per trip), auto-rickshaws (₹30-200 per trip), and ride-sharing services like Uber/Ola (₹100-300 per trip)",
    },
    mumbai: {
      itinerary: [
        {
          day: "Day 1",
          activities:
            "Morning: Visit the iconic Gateway of India and take a boat ride in the harbor (Boat ride: ₹100-200). \nAfternoon: Stroll along Marine Drive, also known as the 'Queen's Necklace', and enjoy the sea breeze (Free). \nEvening: Relax at Chowpatty Beach, try famous street foods like bhel puri and pav bhaji (₹100-300 for snacks). \nNight: Watch the sunset over the Arabian Sea and enjoy the illuminated skyline of South Mumbai.",
        },
        {
          day: "Day 2",
          activities:
            "Morning: Take a ferry to Elephanta Caves, exploring the ancient rock-cut temples (Ferry: ₹130-180, Entry: ₹30 for Indians, ₹500 for foreigners). \nAfternoon: Shop for souvenirs and fashion at Colaba Causeway's street markets (Budget as per shopping requirements). \nEvening: Visit the vibrant Juhu Beach, try Mumbai's famous street foods and watch the sunset (₹200-400 for food). \nNight: Enjoy dinner at one of the seaside restaurants with views of the beach (₹600-1200 per person).",
        },
        {
          day: "Day 3",
          activities:
            "Morning: Explore Sanjay Gandhi National Park, take a lion safari, and visit the ancient Kanheri Caves (Entry: ₹53, Safari: ₹139). \nAfternoon: Experience Bollywood with a Film City tour, seeing sets and maybe catching a film shoot (Tour: ₹599-999). \nEvening: Visit Bandra Bandstand for celebrity homes spotting and seaside views (Free). \nNight: Experience Mumbai's nightlife at Lower Parel's upscale bars and restaurants (₹1000-2000 per person).",
        },
      ],
      accommodations:
        "Options in South Mumbai, Bandra, or Juhu (₹2,000-10,000 per night)",
      transportation:
        "Local trains (₹10-30 per trip), BEST buses (₹10-40 per trip), auto-rickshaws (₹20-200 per trip), and taxis (₹100-400 per trip)",
    },
    bangalore: {
      itinerary: [
        {
          day: "Day 1",
          activities:
            "Morning: Explore the lush Lalbagh Botanical Garden with its famous glass house and diverse plant collections (Entry: ₹30). \nAfternoon: Relax at Cubbon Park, visit the Bangalore Aquarium and State Central Library within the park grounds (Aquarium entry: ₹30). \nEvening: Experience luxury shopping and fine dining at UB City mall, Bangalore's premium lifestyle destination (Dining: ₹800-1500 per person). \nNight: Enjoy the vibrant nightlife at Church Street, with its many cafes, pubs and restaurants (₹500-1000 per person).",
        },
        {
          day: "Day 2",
          activities:
            "Morning: Tour the magnificent Bangalore Palace, modeled after Windsor Castle, including the audio guide (Entry: ₹230 for Indians, ₹460 for foreigners). \nAfternoon: Visit the spiritual ISKCON Temple, attend the aarti ceremony, and enjoy the prasadam meal (Donation based, Prasadam: ₹50-200). \nEvening: Shop for souvenirs and fashion on MG Road and Brigade Road, Bangalore's premier shopping districts (Budget based on shopping). \nNight: Explore the National Gallery of Modern Art to appreciate contemporary Indian art (Entry: ₹20 for Indians, ₹500 for foreigners).",
        },
        {
          day: "Day 3",
          activities:
            "Morning: Take a day trip to Nandi Hills for spectacular sunrise views and visit the ancient Nandi Temple (Entry: ₹10, Transportation: ₹800-1500 for taxi). \nAfternoon: Visit Tipu Sultan's Summer Palace and explore the historical exhibits (Entry: ₹15 for Indians, ₹200 for foreigners). \nEvening: Experience Bangalore's famous microbreweries and pub culture in Indiranagar (₹300-600 per craft beer, ₹600-1200 for dinner). \nNight: Attend a live music performance or comedy show at one of Indiranagar's popular venues (Cover charge: ₹300-1000).",
        },
      ],
      accommodations:
        "Options in Central Bangalore, Indiranagar, or Koramangala (₹1,800-8,000 per night)",
      transportation:
        "Metro (₹10-60 per trip), city buses (₹5-30 per trip), auto-rickshaws (₹30-200 per trip), and ride-sharing services (₹100-300 per trip)",
    },
    hyderabad: {
      itinerary: [
        {
          day: "Day 1",
          activities:
            "Morning: Visit the iconic Charminar, climb to the top for panoramic views of the Old City (Entry: ₹25 for Indians, ₹300 for foreigners). \nAfternoon: Explore Laad Bazaar, famous for bangles and traditional jewelry, haggle for the best prices (Shopping budget as needed). \nEvening: Tour the opulent Chowmahalla Palace, former residence of the Nizams with its grand halls and vintage car collection (Entry: ₹50 for Indians, ₹200 for foreigners). \nNight: Enjoy authentic Hyderabadi cuisine at a traditional restaurant in the Old City area (₹400-800 per person).",
        },
        {
          day: "Day 2",
          activities:
            "Morning: Explore the massive Golconda Fort, learn about its ingenious water supply system and acoustic marvels (Entry: ₹25 for Indians, ₹300 for foreigners, Sound & Light Show: ₹140). \nAfternoon: Visit the Qutb Shahi Tombs, an elegant necropolis with mausoleums of seven Qutb Shahi rulers (Entry: ₹10 for Indians, ₹100 for foreigners). \nEvening: Relax at Hussain Sagar Lake, take a boat ride to the Buddha statue, and enjoy street food at Necklace Road (Boat ride: ₹50-100, Food: ₹200-400). \nNight: See the illuminated lake and city skyline from Tank Bund, with views of the world's tallest monolithic statue of the Buddha (Free).",
        },
        {
          day: "Day 3",
          activities:
            "Morning: Full day excursion to Ramoji Film City, the world's largest film studio complex with tours, attractions and shows (Entry: ₹1300-1500). \nAfternoon: Explore various film sets, gardens, and entertainment options within the complex (Included in entry). \nEvening: Return to city center and feast on the legendary Hyderabadi Biryani at Paradise restaurant (₹300-600 per person). \nNight: Visit Shilparamam crafts village for cultural performances and handicraft shopping (Entry: ₹50, performances may have additional charges).",
        },
      ],
      accommodations:
        "Options in Banjara Hills, Jubilee Hills, or near Hussain Sagar (₹1,500-7,000 per night)",
      transportation:
        "MMTS trains (₹5-15 per trip), city buses (₹5-30 per trip), auto-rickshaws (₹30-200 per trip), and metro rail (₹10-60 per trip)",
    },
    chennai: {
      itinerary: [
        {
          day: "Day 1",
          activities:
            "Morning: Walk along Marina Beach, the second-longest urban beach in the world, visit the statues and monuments along the promenade (Free). \nAfternoon: Explore San Thome Basilica, built over the tomb of St. Thomas the Apostle, admire its Neo-Gothic architecture (Free, donations welcome). \nEvening: Visit the colorful Kapaleeshwarar Temple in Mylapore, witness the evening aarti ceremony (Free, donations welcome). \nNight: Have dinner at a traditional South Indian restaurant, trying local specialties like dosa, idli, and filter coffee (₹200-400 per person).",
        },
        {
          day: "Day 2",
          activities:
            "Morning: Tour Fort St. George, the first British fortress in India, and its St. Mary's Church, the oldest Anglican church in Asia (Entry to museum: ₹15 for Indians, ₹200 for foreigners). \nAfternoon: Shop for silk sarees, jewelry, and handicrafts at T Nagar markets, especially Pondy Bazaar and Ranganathan Street (Shopping budget as needed). \nEvening: Relax at Elliot's Beach in Besant Nagar, a quieter alternative to Marina Beach, enjoy sunset views (Free). \nNight: Try seafood at the restaurants near the beach or explore the trendy cafes in Besant Nagar (₹500-1000 per person).",
        },
        {
          day: "Day 3",
          activities:
            "Morning: Take a day trip to Mahabalipuram, visit the UNESCO World Heritage Shore Temple and the massive bas-relief 'Descent of the Ganges' (Entry: ₹30 for Indians, ₹500 for foreigners, Transportation: ₹1000-1500 for taxi). \nAfternoon: Explore the Five Rathas, monolithic temples carved from single rocks, and the iconic Krishna's Butter Ball (Included in Mahabalipuram ticket). \nEvening: Drive back along the scenic East Coast Road (ECR), stopping at beaches and viewpoints (Free). \nNight: Dinner at a beachside restaurant along ECR, enjoying fresh seafood with ocean views (₹600-1200 per person).",
        },
      ],
      accommodations:
        "Options in Nungambakkam, T Nagar, or Mylapore (₹1,500-7,000 per night)",
      transportation:
        "Metro rail (₹10-70 per trip), MTC buses (₹5-30 per trip), auto-rickshaws (₹30-200 per trip), and local trains (₹5-15 per trip)",
    },
    jaipur: {
      itinerary: [
        {
          day: "Day 1",
          activities:
            "Morning: Visit the majestic Amber Fort, take an elephant ride to the entrance, and explore the Palace of Mirrors (Entry: ₹200 for Indians, ₹500 for foreigners, Elephant ride: ₹1100 per elephant for 2 people). \nAfternoon: Stop at Jal Mahal (Water Palace) for photos of this partially submerged architectural marvel (Viewing from outside only). \nEvening: Explore the City Palace complex, including its museums, courtyards, and the royal family's private quarters (Entry: ₹200 for Indians, ₹700 for foreigners). \nNight: Attend the spectacular sound and light show at Amber Fort, narrating the history of Jaipur (Show ticket: ₹200-300).",
        },
        {
          day: "Day 2",
          activities:
            "Morning: Photograph the intricate facade of Hawa Mahal (Palace of Winds) and visit its interior chambers (Entry: ₹50 for Indians, ₹200 for foreigners). \nAfternoon: Tour Jantar Mantar, the UNESCO-listed astronomical observatory with 19 massive instruments (Entry: ₹50 for Indians, ₹200 for foreigners). \nEvening: Shop for textiles, jewelry, and handicrafts at Johari Bazaar and Bapu Bazaar, practicing your bargaining skills (Shopping budget as needed). \nNight: Experience a traditional Rajasthani dinner with folk dance performances at Chokhi Dhani village resort (Entry + dinner: ₹1000-1500 per person).",
        },
        {
          day: "Day 3",
          activities:
            "Morning: Visit Nahargarh Fort atop the Aravalli Hills, offering spectacular views of Jaipur city (Entry: ₹200 for Indians, ₹500 for foreigners). \nAfternoon: Explore nearby Jaigarh Fort, home to the world's largest cannon on wheels, Jaivana (Entry: ₹85 for Indians, ₹200 for foreigners). \nEvening: Return to Amber Fort area to watch the stunning light show that illuminates the fort after sunset (Show ticket: ₹200-300). \nNight: Enjoy dinner at a rooftop restaurant in the old city with views of the illuminated historical monuments (₹600-1200 per person).",
        },
      ],
      accommodations:
        "Options in Old City, Bani Park, or Civil Lines (₹1,200-8,000 per night)",
      transportation:
        "City buses (₹10-30 per trip), auto-rickshaws (₹30-200 per trip), cycle-rickshaws (₹20-100 per trip), and tourist taxis (₹1000-2000 per day)",
    },
    goa: {
      itinerary: [
        {
          day: "Day 1",
          activities:
            "Morning: Start with Calangute Beach, Goa's largest beach, relax under beach umbrellas or try water sports (Beach chairs: ₹200-300, Water sports: ₹800-2000). \nAfternoon: Move to vibrant Baga Beach, enjoy paragliding, jet skiing or banana boat rides (Activities: ₹500-2000 per person). \nEvening: Experience the bohemian atmosphere of Anjuna Beach, famous for its full moon parties and flea market on Wednesdays (Free entry, Food and drinks: ₹500-1000). \nNight: Enjoy seafood dinner at a beachside shack with live music (₹600-1200 per person).",
        },
        {
          day: "Day 2",
          activities:
            "Morning: Visit the UNESCO-listed churches of Old Goa, including Basilica of Bom Jesus housing St. Francis Xavier's remains and Se Cathedral, Asia's largest church (Free, donations welcome). \nAfternoon: Explore Fort Aguada, a well-preserved 17th-century Portuguese fort with a lighthouse offering panoramic views (Entry: ₹50). \nEvening: Take a sunset cruise on the Mandovi River with live music and cultural performances (Cruise: ₹300-500 per person). \nNight: Experience Goa's famous nightlife at clubs in Candolim or Arpora (Cover charge: ₹500-1500, Drinks: ₹300-600 each).",
        },
        {
          day: "Day 3",
          activities:
            "Morning: Enjoy water sports at Candolim Beach, including parasailing, windsurfing, and scuba diving (Activities: ₹1000-3000 per person). \nAfternoon: Visit the famous Anjuna Flea Market (Wednesdays only) or Mapusa Market (Fridays) for souvenirs, clothing, jewelry, and spices (Shopping budget as needed). \nEvening: Take a backwater kayaking tour through Goa's mangroves, spotting birds and wildlife (Tour: ₹1200-1800 per person). \nNight: Attend a beach party or trance music event, depending on the season (Entry: ₹500-2000).",
        },
      ],
      accommodations:
        "Options in North Goa (Calangute, Baga) or South Goa (Palolem, Colva) (₹1,500-10,000 per night)",
      transportation:
        "Rented scooters (₹300-500 per day), taxis (₹500-3000 per day), and local buses (₹10-50 per trip)",
    },
    agra: {
      itinerary: [
        {
          day: "Day 1",
          activities:
            "Morning: Visit the Taj Mahal at sunrise to see it in golden light and avoid crowds, explore the main mausoleum and gardens (Entry: ₹50 for Indians, ₹1100 for foreigners). \nAfternoon: Tour the massive red sandstone Agra Fort, a UNESCO World Heritage site, see its palaces, audience halls and the view of Taj Mahal (Entry: ₹40 for Indians, ₹550 for foreigners). \nEvening: Visit Mehtab Bagh (Moonlight Garden) across the Yamuna River for sunset views of the Taj Mahal from a different perspective (Entry: ₹15 for Indians, ₹200 for foreigners). \nNight: Attend Mohabbat the Taj show, a live performance about the love story behind the Taj Mahal (Ticket: ₹1000-2000).",
        },
        {
          day: "Day 2",
          activities:
            "Morning: Take a day trip to Fatehpur Sikri, the abandoned Mughal capital with impressive red sandstone buildings (Entry: ₹40 for Indians, ₹550 for foreigners, Transportation: ₹1200-1800 for taxi). \nAfternoon: Visit Itmad-ud-Daulah (Baby Taj), an exquisite marble tomb that inspired the Taj Mahal's design (Entry: ₹25 for Indians, ₹300 for foreigners). \nEvening: Explore Kinari Bazaar and Sadar Bazaar for marble handicrafts, leather goods, and embroidery (Shopping budget as needed). \nNight: Enjoy a rooftop dinner with views of the illuminated Taj Mahal (₹600-1200 per person).",
        },
        {
          day: "Day 3",
          activities:
            "Morning: Visit Wildlife SOS Elephant Conservation and Care Centre, learn about elephant rescue and conservation efforts (Entry: ₹500 donation recommended). \nAfternoon: Tour Marble crafts workshops to see artisans creating inlay work similar to what adorns the Taj Mahal, with opportunity to purchase authentic pieces (Free demonstrations). \nEvening: Visit Sheroes Hangout Cafe, run by acid attack survivors, supporting an important social cause (Food: ₹200-400 per person). \nNight: Take an evening heritage walk through colonial-era Agra, learning about the city beyond its Mughal monuments (Guided tour: ₹500-1000 per person).",
        },
      ],
      accommodations:
        "Options near Taj Ganj or Sadar Bazaar (₹1,000-6,000 per night)",
      transportation:
        "Auto-rickshaws (₹30-200 per trip), cycle-rickshaws (₹20-100 per trip), and tourist taxis (₹1000-2000 per day)",
    },

    // States/Regions
    rajasthan: {
      itinerary: [
        {
          day: "Day 1",
          activities:
            "Morning: Begin your Rajasthan journey in Jaipur, visiting the grand Amber Fort with its stunning mirror work and artistic elements (Entry: ₹200 for Indians, ₹500 for foreigners). \nAfternoon: Explore Jaipur's City Palace complex, including museums housing royal garments, weapons, and artifacts (Entry: ₹200 for Indians, ₹700 for foreigners). \nEvening: Photograph the intricate Hawa Mahal (Palace of Winds) and shop at nearby bazaars for textiles and handicrafts (Entry: ₹50 for Indians, ₹200 for foreigners). \nNight: Experience traditional Rajasthani dinner with folk performances at Chokhi Dhani cultural village (Entry + dinner: ₹1000-1500 per person).",
        },
        {
          day: "Day 2",
          activities:
            "Morning: Travel to the Blue City of Jodhpur (4-5 hours from Jaipur), visit the imposing Mehrangarh Fort perched 400 feet above the city (Entry: ₹100 for Indians, ₹600 for foreigners). \nAfternoon: Explore the fort's extensive museum collections and enjoy panoramic views of blue-painted houses from the ramparts (Included in entry). \nEvening: Visit the serene white marble memorial Jaswant Thada and its beautiful gardens (Entry: ₹30 for Indians, ₹50 for foreigners). \nNight: Wander through the bustling Clock Tower market (Sardar Market), sampling local street food and shopping for spices, textiles, and leather goods (Food: ₹200-400, Shopping as per budget).",
        },
        {
          day: "Day 3",
          activities:
            "Morning: Drive to Udaipur (5-6 hours from Jodhpur), the City of Lakes, stopping at Ranakpur Jain Temple en route to admire its 1444 intricately carved marble pillars (Entry: ₹200 donation, Camera fee: ₹100). \nAfternoon: Tour Udaipur's City Palace, the largest royal complex in Rajasthan with multiple palaces, courtyards, and museums (Entry: ₹300 for Indians, ₹700 for foreigners). \nEvening: Take a serene boat ride on Lake Pichola, passing the famous Lake Palace and watching the sunset over the Aravalli Hills (Boat ride: ₹400-700 per person). \nNight: Enjoy dinner at a lakeside restaurant with views of the illuminated palaces (₹600-1200 per person).",
        },
        {
          day: "Day 4",
          activities:
            "Morning: Travel to the Golden City of Jaisalmer (5-6 hours from Jodhpur), explore the living Jaisalmer Fort, one of the world's few still-inhabited medieval forts (Entry: ₹50 for Indians, ₹250 for foreigners). \nAfternoon: Visit ornate Patwon Ki Haveli, a cluster of five havelis with intricate carvings and painted ceilings (Entry: ₹100 for Indians, ₹250 for foreigners). \nEvening: Take a camel safari into the Thar Desert to experience sand dunes at sunset (Safari: ₹1000-2000 per person). \nNight: Enjoy a desert camp dinner with traditional Rajasthani folk music and dance under the stars (Dinner + cultural show: ₹700-1500 per person).",
        },
      ],
      accommodations:
        "Heritage hotels, havelis, or budget accommodations (₹1,200-10,000 per night)",
      transportation:
        "Intercity buses (₹300-800 per trip), tourist taxis (₹2000-3000 per day), or rental cars with driver (₹2500-4000 per day)",
    },
    kerala: {
      itinerary: [
        {
          day: "Day 1",
          activities:
            "Morning: Begin your Kerala journey in Fort Kochi, visiting the iconic Chinese fishing nets operated by local fishermen, perhaps buying fresh catch to be cooked at nearby restaurants (Cooking charge: ₹200-300). \nAfternoon: Explore colonial heritage at St. Francis Church, the oldest European church in India, and see Santa Cruz Basilica's Gothic architecture (Free entry, donations welcome). \nEvening: Visit Mattancherry Palace (Dutch Palace) to view the exquisite Kerala murals depicting Hindu mythology (Entry: ₹5 for Indians, ₹100 for foreigners). \nNight: Watch a traditional Kathakali dance performance, arriving early to see the elaborate makeup application process (Ticket: ₹300-500).",
        },
        {
          day: "Day 2",
          activities:
            "Morning: Travel to Munnar (4-5 hours from Kochi), stopping at spice plantations and waterfalls en route (Plantation tour: ₹100-200). \nAfternoon: Explore Munnar's vast tea plantations, visit a tea factory to learn about processing and sample fresh tea (Factory entry: ₹100-200). \nEvening: Visit Eravikulam National Park, home to the endangered Nilgiri Tahr mountain goat and spectacular mountain views (Entry: ₹90 for Indians, ₹400 for foreigners). \nNight: Enjoy dinner at a restaurant offering Kerala hill cuisine featuring fresh local produce and spices (₹400-800 per person).",
        },
        {
          day: "Day 3",
          activities:
            "Morning: Travel to Alleppey (4-5 hours from Munnar), board a traditional houseboat for an overnight cruise on the backwaters (Houseboat: ₹6000-15000 for 24 hours, including accommodation and meals). \nAfternoon: Drift through narrow canals lined with villages, coconut groves, and paddy fields, observing rural Kerala life (Included in houseboat package). \nEvening: Witness spectacular sunset over the backwaters while enjoying fresh seafood prepared by your onboard chef (Included in houseboat package). \nNight: Experience the tranquility of staying overnight on the backwaters, with stars reflecting on the still water (Included in houseboat package).",
        },
        {
          day: "Day 4",
          activities:
            "Morning: Disembark from houseboat and travel to Kovalam or Varkala beach (3-4 hours from Alleppey) for the final leg of your Kerala journey. \nAfternoon: Relax on the crescent-shaped beaches of Kovalam or the dramatic cliff-backed beaches of Varkala, swimming in the Arabian Sea (Beach chairs: ₹100-200). \nEvening: Get an authentic Ayurvedic massage at a beach-side wellness center, experiencing Kerala's ancient healing tradition (Massage: ₹1000-3000). \nNight: Enjoy a fresh seafood dinner with sunset views at a beachfront restaurant, sampling Kerala's famous fish curry and appam (₹500-1000 per person).",
        },
      ],
      accommodations:
        "Resorts, homestays, or houseboats (₹1,500-10,000 per night)",
      transportation:
        "KSRTC buses (₹100-400 per trip), taxis (₹1500-3000 per day), or rental cars with driver (₹2000-3500 per day)",
    },
    "himachal pradesh": {
      itinerary: [
        {
          day: "Day 1",
          activities:
            "Morning: Arrive in Shimla, the charming colonial-era summer capital of British India, stroll along the famous pedestrian-only Mall Road with its shops and cafes (Free). \nAfternoon: Visit Christ Church, one of India's oldest churches with beautiful stained glass windows, and the nearby Scandal Point with views of the hills (Free entry to church, donations welcome). \nEvening: Hike up to Jakhu Temple dedicated to Lord Hanuman, meeting the resident monkeys and enjoying panoramic views of Shimla and surrounding mountains (Free entry, cable car option: ₹500 round trip). \nNight: Enjoy dinner at a restaurant on Mall Road, trying Himachali specialties like madra, dham, or siddu (₹400-800 per person).",
        },
        {
          day: "Day 2",
          activities:
            "Morning: Take a day trip to Kufri (14 km from Shimla), a popular hill station known for its winter skiing and summer hiking trails (Transportation: ₹600-1000 for taxi). \nAfternoon: Visit Himalayan Nature Park to see regional wildlife including musk deer, bears, and pheasants in a natural mountain setting (Entry: ₹50 for Indians, ₹200 for foreigners). \nEvening: Enjoy horseback riding through pine forests or try adventure activities like zipline and rope courses available in the area (Horseback riding: ₹300-500, Adventure activities: ₹500-1500). \nNight: Return to Shimla for dinner, perhaps at the historic Clarkes Hotel or another heritage property (₹600-1200 per person).",
        },
        {
          day: "Day 3",
          activities:
            "Morning: Travel to Manali (7-8 hours from Shimla), stopping at Kullu Valley and Pandoh Dam for photographs and river views (Transportation: ₹2000-3000 for taxi). \nAfternoon: Visit the ancient wooden Hadimba Temple surrounded by cedar forest, built in 1553 with its unique multi-tiered pagoda-style architecture (Entry: ₹20). \nEvening: Explore Old Manali's bohemian atmosphere with its quaint cafes, handicraft shops, and international cuisine options (Food and shopping as per budget). \nNight: Stroll along Manali Mall Road, sampling local street food and shopping for woolen garments, Kullu shawls, and handicrafts (Food: ₹200-400, Shopping as per budget).",
        },
        {
          day: "Day 4",
          activities:
            "Morning: Visit Solang Valley (13 km from Manali) for adventure activities including paragliding, zorbing, and ATV rides in summer or skiing and snowboarding in winter (Activities: ₹1000-4000 depending on choice). \nAfternoon: Travel to Rohtang Pass (51 km from Manali) if the season permits (open May-November), experiencing snow even in summer months and spectacular mountain views (Transportation: ₹2000-3000 for taxi, Permit required: ₹500). \nEvening: Visit Vashisht Hot Springs and Temple, taking a dip in the natural hot sulphur springs believed to have medicinal properties (Free). \nNight: Enjoy a traditional Himachali dinner with mountain views, perhaps trying the local alcoholic beverage called Lugdi (₹500-1000 per person).",
        },
      ],
      accommodations: "Hotels, cottages, or homestays (₹1,000-6,000 per night)",
      transportation:
        "Local buses (₹10-150 per trip), taxis (₹1500-3000 per day), or rental cars (₹2000-3500 per day)",
    },
    kashmir: {
      itinerary: [
        {
          day: "Day 1",
          activities:
            "Explore Srinagar - Dal Lake shikara ride, Mughal Gardens",
        },
        {
          day: "Day 2",
          activities: "Visit Gulmarg - Gondola ride, meadows exploration",
        },
        {
          day: "Day 3",
          activities: "Tour Pahalgam - Betaab Valley, Aru Valley",
        },
        {
          day: "Day 4",
          activities: "Explore Sonamarg - Thajiwas Glacier, meadows",
        },
      ],
      accommodations:
        "Hotels, houseboats on Dal Lake (₹1,500-10,000 per night)",
      transportation: "Tourist taxis, shared cabs between major destinations",
    },

    ahmedabad: {
      itinerary: [
        {
          day: "Day 1",
          activities:
            "Morning: Visit Sabarmati Ashram to learn about Mahatma Gandhi's life and India's independence movement (Free entry). \nAfternoon: Explore the Calico Museum of Textiles, showcasing a rich collection of fabrics (Entry: ₹100, prior booking required). \nEvening: Stroll along the Sabarmati Riverfront and enjoy the scenic views (Free). \nNight: Dine at Manek Chowk, a bustling night market offering a variety of local street foods (₹200-400 per person).",
        },
        {
          day: "Day 2",
          activities:
            "Morning: Visit the Adalaj Stepwell, an architectural marvel from the 15th century (Free entry). \nAfternoon: Explore the Sidi Saiyyed Mosque, famous for its intricate stone lattice work (Free entry). \nEvening: Shop for handicrafts and textiles at Law Garden Night Market (Budget as per your shopping needs). \nNight: Enjoy a traditional Gujarati thali at Agashiye, a rooftop restaurant (₹800-1200 per person).",
        },
        {
          day: "Day 3",
          activities:
            "Morning: Discover the Kite Museum, dedicated to the history of kites in India (Free entry). \nAfternoon: Visit the Auto World Vintage Car Museum to see a collection of classic cars (Entry: ₹50 for Indians, ₹200 for foreigners). \nEvening: Relax at Kankaria Lake, offering boat rides and a zoo (Entry: ₹10, Boat ride: ₹50-100). \nNight: Attend a cultural show at Shreyas Folk Museum to experience local traditions (Entry: ₹100-200).",
        },
      ],
      accommodations:
        "Options in Navrangpura, Ellis Bridge, or Ashram Road area (₹1,500-5,000 per night)",
      transportation:
        "Auto-rickshaws (₹30-150 per trip), city buses (₹10-50 per trip), and ride-sharing services like Uber/Ola (₹100-300 per trip)",
    },

    rajasthan: {
      itinerary: [
        {
          day: "Day 1",
          activities:
            "Morning: Explore the majestic Amber Fort in Jaipur (Entry: ₹100 for Indians, ₹500 for foreigners). \nAfternoon: Visit the City Palace and Jantar Mantar, both UNESCO World Heritage Sites (Combined Entry: ₹200 for Indians, ₹700 for foreigners). \nEvening: Stroll through the vibrant bazaars of Jaipur, shopping for handicrafts and textiles. \nNight: Enjoy a traditional Rajasthani dinner at Chokhi Dhani (₹700-1,200 per person).",
        },
        {
          day: "Day 2",
          activities:
            "Morning: Drive to Udaipur and visit the City Palace complex (Entry: ₹300 for Indians, ₹600 for foreigners). \nAfternoon: Take a boat ride on Lake Pichola, visiting Jag Mandir and enjoying views of the Lake Palace (₹400-600 per person). \nEvening: Watch a cultural dance performance at Bagore Ki Haveli (Entry: ₹90 for Indians, ₹150 for foreigners). \nNight: Dine at a rooftop restaurant overlooking the lake (₹800-1,500 per person).",
        },
        {
          day: "Day 3",
          activities:
            "Morning: Travel to Jodhpur and explore the imposing Mehrangarh Fort (Entry: ₹100 for Indians, ₹600 for foreigners). \nAfternoon: Visit Jaswant Thada and the Umaid Bhawan Palace Museum (Combined Entry: ₹50 for Indians, ₹300 for foreigners). \nEvening: Wander through the blue streets of the old city and shop at the Clock Tower Market. \nNight: Enjoy local delicacies like Laal Maas at a traditional eatery (₹500-1,000 per person).",
        },
      ],
      accommodations:
        "Options in Jaipur, Udaipur, and Jodhpur ranging from heritage hotels to budget guesthouses (₹1,500-10,000 per night)",
      transportation:
        "Intercity travel by train or private car (₹500-2,000 per trip), local transport via auto-rickshaws and taxis (₹50-300 per trip)",
    },
    himachal_pradesh: {
      itinerary: [
        {
          day: "Day 1",
          activities:
            "Morning: Arrive in Shimla and visit the historic Ridge and Christ Church (Free). \nAfternoon: Explore the Viceregal Lodge and the Himachal State Museum (Entry: ₹20-50). \nEvening: Stroll along Mall Road, shopping for woolens and handicrafts. \nNight: Enjoy dinner at a local café with views of the hills (₹500-1,000 per person).",
        },
        {
          day: "Day 2",
          activities:
            "Morning: Drive to Manali and visit the Hadimba Devi Temple (Free). \nAfternoon: Explore the Tibetan Monastery and the Manu Temple (Free). \nEvening: Walk along the Mall Road, sampling local snacks and shopping. \nNight: Dine at a riverside restaurant offering Himachali cuisine (₹600-1,200 per person).",
        },
        {
          day: "Day 3",
          activities:
            "Morning: Take a day trip to Solang Valley for adventure activities like paragliding and zorbing (₹500-2,000 per activity). \nAfternoon: Visit the Rohtang Pass (subject to weather conditions and permits; ₹500 permit fee). \nEvening: Return to Manali and relax at a local café. \nNight: Enjoy a bonfire dinner at your hotel (₹800-1,500 per person).",
        },
      ],
      accommodations:
        "Options in Shimla and Manali ranging from cozy homestays to luxury resorts (₹1,000-8,000 per night)",
      transportation:
        "Intercity travel by bus or private car (₹500-2,000 per trip), local transport via taxis and auto-rickshaws (₹50-300 per trip)",
    },
    uttarakhand: {
      itinerary: [
        {
          day: "Day 1",
          activities:
            "Morning: Arrive in Nainital and take a boat ride on Naini Lake (₹150-300 per person). \nAfternoon: Visit the Naina Devi Temple and explore the local zoo (Entry: ₹50-100). \nEvening: Stroll along Mall Road, shopping for souvenirs. \nNight: Enjoy dinner at a lakeside restaurant (₹500-1,000 per person).",
        },
        {
          day: "Day 2",
          activities:
            "Morning: Drive to Ranikhet and visit the Jhula Devi Temple and Chaubatia Gardens (Free). \nAfternoon: Explore the Kumaon Regimental Centre Museum (Entry: ₹20). \nEvening: Enjoy panoramic views of the Himalayas from Majhkhali. \nNight: Dine at your hotel or a local eatery offering Kumaoni cuisine (₹400-800 per person).",
        },
        {
          day: "Day 3",
          activities:
            "Morning: Travel to Jim Corbett National Park and embark on a wildlife safari (₹1,500-3,000 per person). \nAfternoon: Visit the Corbett Museum and Garjia Devi Temple (Entry: ₹10-50). \nEvening: Relax by the Kosi River. \nNight: Enjoy a barbecue dinner at your resort (₹800-1,500 per person).",
        },
      ],
      accommodations:
        "Options in Nainital, Ranikhet, and near Jim Corbett ranging from budget hotels to luxury resorts (₹1,000-10,000 per night)",
      transportation:
        "Intercity travel by bus or private car (₹500-2,000 per trip), local transport via taxis and shared jeeps (₹50-300 per trip)",
    },
    tamil_nadu: {
      itinerary: [
        {
          day: "Day 1",
          activities:
            "Morning: Explore Chennai's Marina Beach and visit the Kapaleeshwarar Temple (Free). \nAfternoon: Visit the Government Museum and Fort St. George (Entry: ₹15-50). \nEvening: Stroll through the vibrant streets of Mylapore. \nNight: Enjoy a traditional South Indian dinner at a local restaurant (₹300-800 per person).",
        },
        {
          day: "Day 2",
          activities:
            "Morning: Drive to Mahabalipuram and explore the Shore Temple and Pancha Rathas (Entry: ₹30-600). \nAfternoon: Visit the Mahabalipuram Beach and the lighthouse (Entry: ₹10-50). \nEvening: Return to Chennai and relax at your hotel. \nNight: Dine at a coastal restaurant offering seafood delicacies (₹500-1,200 per person).",
        },
        {
          day: "Day 3",
          activities:
            "Morning: Travel to Kanchipuram and visit the Kailasanathar and Ekambareswarar Temples (Free). \nAfternoon: Explore local silk weaving centers and shop for sarees. \nEvening: Return to Chennai and enjoy a cultural performance at Kalakshetra (Entry: ₹100-500). \nNight: Have dinner at a traditional Tamil restaurant (₹400-1,000 per person).",
        },
      ],
      accommodations:
        "Options in Chennai ranging from budget hotels to luxury accommodations (₹1,000-10,000 per night)",
      transportation:
        "Intercity travel by bus or private car (₹500-2,000 per trip), local transport via auto-rickshaws and taxis (₹50-300 per trip)",
    },
    karnataka: {
      itinerary: [
        {
          day: "Day 1",
          activities:
            "Morning: Explore Bangalore's Lalbagh Botanical Garden and Tipu Sultan's Summer Palace (Entry: ₹20-50). \nAfternoon: Visit the Bangalore Palace and Vidhana Soudha (Entry: ₹230). \nEvening: Stroll through the bustling streets of MG Road and Brigade Road. \nNight: Enjoy dinner at a local brewery or restaurant (₹500-1,500 per person).",
        },
        {
          day: "Day 2",
          activities:
            "Morning: Drive to Mysore and visit the Mysore Palace (Entry: ₹70). \nAfternoon: Explore the Chamundi Hills and St. Philomena's Church (Free). \nEvening: Visit the Brindavan Gardens and enjoy the musical fountain show (Entry: ₹15-50). \nNight: Dine at a traditional Mysore restaurant (₹400-1,000 per person).",
        },
        {
          day: "Day 3",
          activities:
            "Morning: Travel to Coorg and visit the Abbey Falls and Raja's Seat (Entry: ₹15-50). \nAfternoon: Explore coffee plantations and the Namdroling Monastery (Free). \nEvening: Relax at your resort amidst nature. \nNight: Enjoy a Coorgi-style dinner at your accommodation (₹500-1,200 per person).",
        },
      ],
      accommodations:
        "Options in Bangalore, Mysore, and Coorg ranging from budget hotels to luxury resorts (₹1,000-10,000 per night)",
      transportation:
        "Intercity travel by bus or private car (₹500-2,000 per trip), local transport via taxis and auto-rickshaws (₹50-300 per trip)",
    },
  };

  // Add generic itineraries for other popular destinations
  const otherDestinations = [
    "kolkata",
    "ahmedabad",
    "pune",
    "udaipur",
    "jodhpur",
    "varanasi",
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
  ];

  otherDestinations.forEach((dest) => {
    if (!destinationData[dest]) {
      destinationData[dest] = {
        itinerary: [
          {
            day: "Day 1",
            activities: `Arrival and exploration of main attractions in ${
              dest.charAt(0).toUpperCase() + dest.slice(1)
            }`,
          },
          {
            day: "Day 2",
            activities: `Visit popular landmarks and cultural sites in ${
              dest.charAt(0).toUpperCase() + dest.slice(1)
            }`,
          },
          {
            day: "Day 3",
            activities: `Experience local cuisine, markets, and traditional activities in ${
              dest.charAt(0).toUpperCase() + dest.slice(1)
            }`,
          },
        ],
        accommodations:
          "Options range from budget to luxury based on your preferences",
        transportation:
          "Local transportation options including taxi, public transit, and rental vehicles",
      };
    }
  });

  // Get destination-specific data or use default
  let planData = {
    itinerary: [
      {
        day: "Day 1",
        activities:
          "Arrival and check-in to accommodation, local area exploration",
      },
      { day: "Day 2", activities: "Visit main attractions and landmarks" },
      {
        day: "Day 3",
        activities: "Experience local culture, cuisine and shopping",
      },
      { day: "Final Day", activities: "Leisure time and departure" },
    ],
    accommodations:
      "Options range from budget to luxury based on your preferences",
    transportation:
      "Local transportation options including taxi, public transit, and rental vehicles",
  };

  // Check for destination match
  for (const [key, data] of Object.entries(destinationData)) {
    if (destination.includes(key)) {
      planData = data;
      break;
    }
  }

  // Adjust itinerary length based on duration if specified
  if (info.duration) {
    const durationMatch = info.duration.match(/(\d+)/);
    if (durationMatch) {
      const days = parseInt(durationMatch[1]);

      // If duration is specified, adjust itinerary length
      if (days > 0) {
        // Extend or shorten the itinerary based on specified days
        if (days > planData.itinerary.length) {
          // Add more days
          for (let i = planData.itinerary.length + 1; i <= days; i++) {
            planData.itinerary.push({
              day: `Day ${i}`,
              activities: `Explore local attractions, relaxation, and optional activities in ${
                info.destination || "your destination"
              }`,
            });
          }
        } else if (days < planData.itinerary.length) {
          // Shorten itinerary
          planData.itinerary = planData.itinerary.slice(0, days);
        }
      }
    }
  }

  return {
    destination: info.destination || "Your destination",
    duration: info.duration || "Your trip duration",
    budget: info.budget || "As per your budget",
    people: info.people || 1,
    itinerary: planData.itinerary,
    accommodations: planData.accommodations,
    transportation: planData.transportation,
  };
}

export default router;
