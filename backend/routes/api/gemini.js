// Assuming this is your existing gemini.js file
// Add the following function to it:

export const generateCustomTour = async (userPreferences) => {
    try {
      // Access your API key as an environment variable (make sure to add this to your .env file)
      const apiKey = process.env.GEMINI_API_KEY;
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });
  
      // Create a prompt based on user preferences
      const prompt = `Create a custom travel itinerary with the following details:
        Destinations: ${userPreferences.destinations.join(', ')}
        Duration: ${userPreferences.duration} days
        Budget: $${userPreferences.budget}
        Interests: ${userPreferences.interests ? userPreferences.interests.join(', ') : 'General tourism'}
        Accommodation preference: ${userPreferences.accommodation || 'mid-range'}
        Travel style: ${userPreferences.travelStyle || 'cultural'}
        
        Please structure the response as a JSON object with the following fields:
        - title: String (an attractive title for this tour)
        - description: String (an enticing summary of this tour)
        - itinerary: Array of day objects, each with:
          - day: Number
          - title: String (title for this day)
          - description: String (what happens on this day)
          - activities: Array of strings (main activities)
          - accommodation: String (where to stay)
        - activities: Array of strings (all major activities)
      `;
  
      // Generate content with Gemini
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Parse the response - assuming Gemini returns properly formatted JSON
      // You may need to add error handling here if the response is not valid JSON
      const tourPlan = JSON.parse(text);
      
      // Return the tour plan to be saved in MongoDB
      return {
        ...userPreferences,
        title: tourPlan.title,
        description: tourPlan.description,
        itinerary: tourPlan.itinerary,
        activities: tourPlan.activities,
        isAIGenerated: true,
      };
    } catch (error) {
      console.error("Error generating custom tour:", error);
      throw new Error("Failed to generate custom tour with AI");
    }
  };
  
  // Keep any other existing functions in your gemini.js file