// CustomizationModal.jsx - Updated with Google Gemini API
import React, { useState, useRef, useEffect } from "react";
import { useSelector } from "react-redux";
import axios from "axios";

const CustomizationModal = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState([
    {
      sender: "bot",
      content: "Hi there! I can help you create a customized tour plan. Please tell me your destination, number of people, duration (days/nights), and budget."
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [tourPlan, setTourPlan] = useState(null);
  const [confirmationRequested, setConfirmationRequested] = useState(false);
  const messageEndRef = useRef(null);
  const { currentUser } = useSelector((state) => state.user);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Close modal on Escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") onClose();
    };
    
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
    }
    
    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleInputChange = (e) => {
    setInput(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (input.trim() === "") return;

    // Add user message
    const userMessage = { sender: "user", content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      if (confirmationRequested) {
        // Handle confirmation
        if (input.toLowerCase().includes("yes") || input.toLowerCase().includes("ok") || input.toLowerCase().includes("sure")) {
          // Submit plan to backend
          await submitPlanToDatabase(tourPlan);
          
          setMessages(prev => [
            ...prev,
            { 
              sender: "bot", 
              content: "Great! Your customized tour plan has been submitted to our team. Someone will contact you soon with more details." 
            }
          ]);
          setConfirmationRequested(false);
        } else {
          setMessages(prev => [
            ...prev,
            { 
              sender: "bot", 
              content: "No problem. Would you like to make any changes to your plan? Please provide details." 
            }
          ]);
          setConfirmationRequested(false);
        }
      } else {
        // Process user input to generate tour plan
        const generatedPlan = await generateTourPlan(userMessage.content);
        setTourPlan(generatedPlan);
        
        // Add AI response
        setMessages(prev => [
          ...prev,
          { 
            sender: "bot", 
            content: `Here's a customized tour plan based on your requirements:\n\n${generatedPlan.planDetails}\n\nWould you like me to submit this plan to our team for further processing?` 
          }
        ]);
        
        setConfirmationRequested(true);
      }
    } catch (error) {
      console.error("Error processing request:", error);
      setMessages(prev => [
        ...prev,
        { 
          sender: "bot", 
          content: "Sorry, I encountered an error while processing your request. Please try again." 
        }
      ]);
    }
    
    setIsLoading(false);
  };

  // Function to generate tour plan using Google Gemini API
  const generateTourPlan = async (userInput) => {
    try {
      // Extract basic information for structuring the API request
      const destination = extractDestination(userInput);
      const people = extractPeople(userInput);
      const duration = extractDuration(userInput);
      const budget = extractBudget(userInput);
      
      // Make request to your backend which will call the Gemini API
      // In production, you would have this as an actual API endpoint
      const response = await axios.post("/api/gemini/generate-plan", {
        userInput,
        extractedInfo: {
          destination,
          people,
          duration,
          budget
        }
      });
      
      // Get the plan details from the response
      const planDetails = response.data.planDetails;
      
      return {
        destination,
        people,
        duration,
        budget,
        userId: currentUser?._id,
        planDetails
      };
    } catch (error) {
      console.error("Error generating tour plan:", error);
      throw error;
    }
  };

  // Extract basic information from user input (fallback if AI extraction fails)
  const extractDestination = (text) => {
    const destinations = ["paris", "bali", "tokyo", "new york", "rome", "london", "dubai"];
    text = text.toLowerCase();
    
    for (const city of destinations) {
      if (text.includes(city)) return city.charAt(0).toUpperCase() + city.slice(1);
    }
    
    // Default or if no match found
    return "Your Destination";
  };
  
  const extractPeople = (text) => {
    const match = text.match(/(\d+)\s*(?:people|person|traveler|traveller|guest|adult|individual)/i);
    return match ? parseInt(match[1]) : 2;
  };
  
  const extractDuration = (text) => {
    const daysMatch = text.match(/(\d+)\s*(?:day)/i);
    const nightsMatch = text.match(/(\d+)\s*(?:night)/i);
    
    return {
      days: daysMatch ? parseInt(daysMatch[1]) : 3,
      nights: nightsMatch ? parseInt(nightsMatch[1]) : 2
    };
  };
  
  const extractBudget = (text) => {
    const match = text.match(/(\d+)(?:\s*k)?\s*(?:budget|dollars|usd|\$)/i);
    return match ? `$${match[1]}${match[0].includes('k') ? ',000' : ''}` : "$1,500";
  };

  // Function to submit plan to database
  const submitPlanToDatabase = async (plan) => {
    try {
      // In production, this would call your backend API
      const response = await axios.post("/api/custom-plans", {
        ...plan,
        userId: currentUser?._id,
        status: "pending",
        createdAt: new Date()
      });
      
      console.log("Plan submitted:", response.data);
      return true;
    } catch (error) {
      console.error("Error submitting plan:", error);
      throw error;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-lg rounded-lg shadow-xl flex flex-col h-[80vh]">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-semibold">Customize Your Tour</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="flex-1 p-4 overflow-y-auto">
          {messages.map((message, index) => (
            <div 
              key={index} 
              className={`mb-4 ${message.sender === "user" ? "text-right" : "text-left"}`}
            >
              <div 
                className={`inline-block p-3 rounded-lg max-w-[80%] ${
                  message.sender === "user" 
                    ? "bg-blue-500 text-white" 
                    : "bg-gray-200 text-gray-800"
                }`}
                style={{ whiteSpace: "pre-line" }}
              >
                {message.content}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="text-left mb-4">
              <div className="inline-block p-3 rounded-lg bg-gray-200 text-gray-800">
                <div className="flex space-x-2">
                  <div className="w-3 h-3 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-3 h-3 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                  <div className="w-3 h-3 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.4s" }}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messageEndRef} />
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 border-t">
          <div className="flex space-x-2">
            <input
              type="text"
              value={input}
              onChange={handleInputChange}
              placeholder="Tell me your dream destination..."
              className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            />
            <button
              type="submit"
              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-blue-300"
              disabled={isLoading}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CustomizationModal;