import React, { useState, useRef, useEffect } from 'react';
import axios from '../../utils/axios';
import './TravelChatbot.css'; // You'll need to create this CSS file
import { useSelector } from 'react-redux';

const TravelChatbot = ({ isOpen, onClose }) =>  {
  const { currentUser } = useSelector((state) => state.user);
  const [messages, setMessages] = useState([
    { 
      text: "Hello! I'm your travel assistant. Please provide your destination, specific locations (optional), number of days/nights, people count, and budget for a customized tour plan.", 
      sender: 'bot' 
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [tourPlan, setTourPlan] = useState(null);
  const [waitingForConfirmation, setWaitingForConfirmation] = useState(false);
  const messagesEndRef = useRef(null);

  // Scroll to bottom of chat whenever messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") onClose();
    };
    
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = 'hidden'; // Prevent scrolling when modal is open
    }
    
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = 'unset'; // Restore scrolling when modal is closed
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
  };

  const handleSend = async () => {
    if (inputValue.trim() === '') return;

    // Add user message to chat
    const userMessage = { text: inputValue, sender: 'user' };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      if (waitingForConfirmation) {
        // Handle confirmation response
        if (inputValue.toLowerCase().includes('yes') || inputValue.toLowerCase().includes('confirm')) {
          // Send the tour plan to admin
          await submitTourPlan();
          setMessages(prev => [...prev, { 
            text: "Great! Your tour plan has been submitted. An admin will contact you soon.", 
            sender: 'bot' 
          }]);
          setWaitingForConfirmation(false);
          setTourPlan(null);
        } else {
          // User didn't confirm
          setMessages(prev => [...prev, { 
            text: "No problem! Let me know if you'd like any changes to the plan or want to start over.", 
            sender: 'bot' 
          }]);
          setWaitingForConfirmation(false);
        }
      } else {
        // Process normal user input with Gemini AI
        const response = await axios.post('/api/chatbot/generate-plan', { 
          userPrompt: inputValue 
        });

        if (response.data.tourPlan) {
          // Store the tour plan
          setTourPlan(response.data.tourPlan);
          
          // Display the generated tour plan
          setMessages(prev => [...prev, { 
            text: response.data.message, 
            sender: 'bot',
            isPlan: true,
            plan: response.data.tourPlan
          }]);

          // Ask for confirmation
          setMessages(prev => [...prev, { 
            text: "Does this plan work for you? Type 'yes' to confirm and submit this to our travel team, or 'no' to make changes.",
            sender: 'bot' 
          }]);
          
          setWaitingForConfirmation(true);
        } else {
          // Handle regular response
          setMessages(prev => [...prev, { 
            text: response.data.message, 
            sender: 'bot' 
          }]);
        }
      }
    } catch (error) {
      console.error('Error communicating with chatbot:', error);
      setMessages(prev => [...prev, { 
        text: "Sorry, I encountered an error. Please try again.", 
        sender: 'bot' 
      }]);
    }

    setIsLoading(false);
  };

  // Handle Enter key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  // Submit the tour plan to admin dashboard
  const submitTourPlan = async () => {
    try {
      const response = await axios.post('/api/chatbot/submit-plan', {
        tourPlan,
        userDetails: {
          name: currentUser ? currentUser.username : 'Anonymous User',
          email: currentUser ? currentUser.email : 'No email provided',
          userId: currentUser ? currentUser._id : null
        }
      });

      console.log('Tour plan submitted:', response.data);
      
      if (!response.data.tripId) {
        throw new Error('No trip ID received from server');
      }

    } catch (error) {
      console.error('Error submitting tour plan:', error);
      setMessages(prev => [...prev, { 
        text: "Sorry, I encountered an error while submitting your tour plan. Please try again.", 
        sender: 'bot' 
      }]);
    }
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
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`mb-4 ${
                  message.sender === 'user' ? 'text-right' : 'text-left'
                }`}
              >
                <div
                  className={`inline-block p-3 rounded-lg ${
                    message.sender === 'user'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-800'
                  }`}
                >
                  {message.isPlan ? (
                    <div className="bg-blue-50 p-3 rounded-lg border-l-4 border-blue-500">
                      <h4 className="mt-2 mb-1 text-blue-600">Your Customized Tour Plan</h4>
                      <p><strong>Destination:</strong> {message.plan.destination}</p>
                      <p><strong>Duration:</strong> {message.plan.duration}</p>
                      <p><strong>Budget:</strong> {message.plan.budget}</p>
                      <p><strong>Group Size:</strong> {message.plan.people}</p>
                      
                      <h5 className="mt-2 mb-1 text-blue-600">Itinerary:</h5>
                      <ul className="pl-5 list-disc">
                        {message.plan.itinerary.map((day, idx) => (
                          <li key={idx}>
                            <strong>{day.day}:</strong> {day.activities}
                          </li>
                        ))}
                      </ul>
                      
                      <p><strong>Accommodations:</strong> {message.plan.accommodations}</p>
                      <p><strong>Transportation:</strong> {message.plan.transportation}</p>
                    </div>
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
              />
              <button
                onClick={handleSend}
                disabled={isLoading || !inputValue.trim()}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50"
              >
                {isLoading ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default TravelChatbot;