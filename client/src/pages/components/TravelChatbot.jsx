import React, { useState, useRef, useEffect } from "react";
import axios from "../../utils/axios";
import "./TravelChatbot.css";
import { useSelector } from "react-redux";

const TravelChatbot = ({ isOpen, onClose }) => {
  const { currentUser } = useSelector((state) => state.user);
  const [messages, setMessages] = useState([
    {
      text: "Hello! I'm your travel assistant. Please provide your destination, specific locations (optional), number of days/nights, people count, and budget for a customized tour plan.",
      sender: "bot",
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [tourPlan, setTourPlan] = useState(null);
  const [waitingForConfirmation, setWaitingForConfirmation] = useState(false);
  const [errorCount, setErrorCount] = useState(0); // Track API errors
  const messagesEndRef = useRef(null);

  // Scroll to bottom of chat whenever messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
  };

  const handleSend = async () => {
    if (inputValue.trim() === "") return;

    // Add user message to chat
    const userMessage = { text: inputValue, sender: "user" };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      if (waitingForConfirmation) {
        handleConfirmation();
      } else {
        await generatePlan();
      }
    } catch (error) {
      handleError(error);
    }

    setIsLoading(false);
  };

  // Handle user confirmation of plan
  const handleConfirmation = async () => {
    if (
      inputValue.toLowerCase().includes("yes") ||
      inputValue.toLowerCase().includes("confirm")
    ) {
      try {
        // Send the tour plan to admin
        await submitTourPlan();
        setMessages((prev) => [
          ...prev,
          {
            text: "Great! Your tour plan has been submitted. An admin will contact you soon.",
            sender: "bot",
          },
        ]);
      } catch (error) {
        setMessages((prev) => [
          ...prev,
          {
            text: "I had trouble submitting your plan. Please try again or contact our support team.",
            sender: "bot",
          },
        ]);
        console.error("Error submitting plan:", error);
      }
    } else {
      // User didn't confirm
      setMessages((prev) => [
        ...prev,
        {
          text: "No problem! Let me know if you'd like any changes to the plan or want to start over.",
          sender: "bot",
        },
      ]);
    }
    setWaitingForConfirmation(false);
    setTourPlan(null);
  };

  // Generate plan using API
  const generatePlan = async () => {
    try {
      const response = await axios.post("/api/chatbot/generate-plan", {
        userPrompt: inputValue,
      });

      // Reset error count on success
      if (errorCount > 0) setErrorCount(0);

      if (response.data.tourPlan) {
        // Store the tour plan
        setTourPlan(response.data.tourPlan);

        // Display the generated tour plan
        setMessages((prev) => [
          ...prev,
          {
            text: response.data.message,
            sender: "bot",
            isPlan: true,
            plan: response.data.tourPlan,
          },
        ]);

        // Ask for confirmation
        setMessages((prev) => [
          ...prev,
          {
            text: "Does this plan work for you? Type 'yes' to confirm and submit this to our travel team, or 'no' to make changes.",
            sender: "bot",
          },
        ]);

        setWaitingForConfirmation(true);
      } else {
        // Handle regular response
        setMessages((prev) => [
          ...prev,
          {
            text: response.data.message,
            sender: "bot",
          },
        ]);
      }
    } catch (error) {
      // Increment error count
      setErrorCount((prev) => prev + 1);
      throw error;
    }
  };

  // Handle errors more gracefully
  const handleError = (error) => {
    console.error("Error communicating with chatbot:", error);

    let errorMessage = "Sorry, I encountered an error. Please try again.";

    // Check for specific error types
    if (error.response) {
      // Server returned an error response
      if (error.response.status === 429) {
        errorMessage =
          "I'm receiving too many requests right now. Please try again in a moment.";
      } else if (
        error.response.status === 401 ||
        error.response.status === 403
      ) {
        errorMessage =
          "There seems to be an authentication issue with my services. Please contact support.";
      } else if (error.response.status >= 500) {
        errorMessage =
          "I'm having trouble with my server. Please try again later or contact support.";
      }
    } else if (error.request) {
      // Request was made but no response received (network issue)
      errorMessage =
        "I can't reach my services right now. Please check your internet connection and try again.";
    }

    // Special handling for multiple consecutive errors
    if (errorCount >= 2) {
      errorMessage +=
        " If this problem persists, please contact our support team or try refreshing the page.";
    }

    setMessages((prev) => [
      ...prev,
      {
        text: errorMessage,
        sender: "bot",
      },
    ]);
  };

  // Handle Enter key press
  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleSend();
    }
  };

  // Submit the tour plan to admin dashboard
  const submitTourPlan = async () => {
    try {
      const response = await axios.post("/api/chatbot/submit-plan", {
        tourPlan,
        userDetails: {
          name: currentUser ? currentUser.username : "Anonymous User",
          email: currentUser ? currentUser.email : "No email provided",
          userId: currentUser ? currentUser._id : null,
        },
      });

      console.log("Tour plan submitted:", response.data);

      if (!response.data.tripId) {
        throw new Error("No trip ID received from server");
      }

      return response.data;
    } catch (error) {
      console.error("Error submitting tour plan:", error);
      throw error;
    }
  };

  // Format plan for display
  const formatPlan = (plan) => {
    if (!plan) return null;

    return (
      <div className="bg-blue-50 p-3 rounded-lg border-l-4 border-blue-500">
        <h4 className="mt-2 mb-1 text-blue-600">Your Customized Tour Plan</h4>
        <p>
          <strong>Destination:</strong> {plan.destination}
        </p>
        <p>
          <strong>Duration:</strong> {plan.duration}
        </p>
        <p>
          <strong>Budget:</strong> {plan.budget}
        </p>
        <p>
          <strong>Group Size:</strong> {plan.people}
        </p>

        <h5 className="mt-2 mb-1 text-blue-600">Itinerary:</h5>
        <ul className="pl-5 list-disc">
          {plan.itinerary.map((day, idx) => (
            <li key={idx}>
              <strong>{day.day}:</strong> {day.activities}
            </li>
          ))}
        </ul>

        <p>
          <strong>Accommodations:</strong> {plan.accommodations}
        </p>
        <p>
          <strong>Transportation:</strong> {plan.transportation}
        </p>
      </div>
    );
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl h-[80vh] flex flex-col">
          {/* Header */}
          <div className="flex justify-between items-center p-4 border-b">
            <h2 className="text-xl font-semibold">Travel Assistant</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`mb-4 ${
                  message.sender === "user" ? "text-right" : "text-left"
                }`}
              >
                <div
                  className={`inline-block p-3 rounded-lg ${
                    message.sender === "user"
                      ? "bg-blue-500 text-white"
                      : "bg-gray-200 text-gray-800"
                  }`}
                >
                  {message.isPlan ? (
                    formatPlan(message.plan)
                  ) : (
                    <div>{message.text}</div>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 border-t">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
              />
              <button
                onClick={handleSend}
                disabled={isLoading || !inputValue.trim()}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50"
              >
                {isLoading ? "Sending..." : "Send"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default TravelChatbot;
