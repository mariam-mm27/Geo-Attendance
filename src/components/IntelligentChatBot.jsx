import React, { useState, useEffect, useRef } from 'react';
import { getAuth } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import './IntelligentChatBot.css';

const IntelligentChatBot = ({ isOpen, onClose }) => {
  const auth = getAuth();
  const user = auth.currentUser;
  
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [userName, setUserName] = useState('');
  const [userId, setUserId] = useState(user?.uid || null); // Set immediately from user
  const [isMinimized, setIsMinimized] = useState(false);
  const messagesEndRef = useRef(null);

  const API_BASE_URL = "http://localhost:5000/api/chatbot";

  // Update userId when user changes
  useEffect(() => {
    if (user?.uid) {
      setUserId(user.uid);
    }
  }, [user?.uid]);

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Get user info and initialize conversation
  useEffect(() => {
    const initializeChat = async () => {
      // Only initialize once when chat opens and we don't have messages yet
      if (!isOpen || !user) return;
      
      // Skip if already initialized (has messages or conversationId)
      if (messages.length > 0 || conversationId) return;

      try {
        // Get user info
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUserRole(userData.role);
          setUserName(userData.name || user.displayName || 'User');
        }

        // Get or create conversation
        const response = await fetch(`${API_BASE_URL}/conversation/${user.uid}`);
        const data = await response.json();

        if (data.success) {
          setConversationId(data.conversationId);

          // Get welcome message
          const welcomeResponse = await fetch(`${API_BASE_URL}/welcome/${user.uid}`);
          const welcomeData = await welcomeResponse.json();

          if (welcomeData.success) {
            setMessages([{
              id: 'welcome',
              sender: 'ai_assistant',
              senderName: 'AI Assistant',
              text: welcomeData.message,
              timestamp: new Date()
            }]);
          } else {
            // Show error from backend
            setMessages([{
              id: 'welcome',
              sender: 'ai_assistant',
              senderName: 'AI Assistant',
              text: welcomeData.message || '👋 **Welcome!**\n\nI\'m your university assistant. How can I help you today?',
              timestamp: new Date()
            }]);
          }
        } else {
          // Show error from backend
          setMessages([{
            id: 'welcome',
            sender: 'ai_assistant',
            senderName: 'AI Assistant',
            text: data.message || '❌ **Unable to start conversation**\n\nPlease try again or contact support.',
            timestamp: new Date()
          }]);
        }
      } catch (error) {
        console.error('Error initializing chat:', error);
        // Show connection error
        setMessages([{
          id: 'welcome',
          sender: 'ai_assistant',
          senderName: 'AI Assistant',
          text: '❌ **Connection Error**\n\nUnable to connect to the chat service. Please check your internet connection and try again.',
          timestamp: new Date()
        }]);
      }
    };

    initializeChat();
  }, [isOpen]); // ONLY depend on isOpen, not user!

  // Send message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || !user) return;

    const userMessage = {
      id: `user-${Date.now()}`,
      sender: userId,
      senderName: userName,
      text: inputMessage.trim(),
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    
    const messageText = inputMessage.trim();
    setInputMessage('');
    setLoading(true);

    try {
      // If no conversationId yet, create one
      let convId = conversationId;
      if (!convId) {
        const response = await fetch(`${API_BASE_URL}/conversation/${user.uid}`);
        const data = await response.json();
        if (data.success) {
          convId = data.conversationId;
          setConversationId(convId);
        } else {
          throw new Error(data.message || 'Failed to create conversation');
        }
      }

      // Send message
      const response = await fetch(
        `${API_BASE_URL}/conversation/${convId}/message/${user.uid}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: messageText })
        }
      );

      const data = await response.json();

      if (data.success && data.message) {
        setMessages(prev => [...prev, {
          id: data.message.id,
          sender: 'ai_assistant',
          senderName: 'AI Assistant',
          text: data.message.text,
          timestamp: new Date(data.message.timestamp)
        }]);
      } else {
        // Show the actual error message from backend
        const errorMessage = data.message || 'Unable to process your message. Please try again.';
        setMessages(prev => [...prev, {
          id: `error-${Date.now()}`,
          sender: 'ai_assistant',
          senderName: 'AI Assistant',
          text: errorMessage,
          timestamp: new Date()
        }]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // Show a more helpful error message
      const errorText = error.message || 'Unable to connect to the server. Please check your connection and try again.';
      setMessages(prev => [...prev, {
        id: `error-${Date.now()}`,
        sender: 'ai_assistant',
        senderName: 'AI Assistant',
        text: `❌ **Connection Error**\n\n${errorText}\n\nPlease try again or contact support if the problem persists.`,
        timestamp: new Date()
      }]);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timestamp) => {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderMessageContent = (text) => {
    // Split by lines and render with proper formatting
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      // Check if line is a bullet point
      if (line.trim().startsWith('•') || line.trim().startsWith('-')) {
        return (
          <div key={idx} style={{ marginLeft: '12px', marginBottom: '4px' }}>
            {line}
          </div>
        );
      }
      // Check if line is bold (starts with **)
      if (line.includes('**')) {
        const parts = line.split('**');
        return (
          <div key={idx} style={{ marginBottom: '6px', fontWeight: '600' }}>
            {parts.map((part, i) => (
              i % 2 === 1 ? <strong key={i}>{part}</strong> : part
            ))}
          </div>
        );
      }
      // Regular line
      return (
        <div key={idx} style={{ marginBottom: '4px' }}>
          {line}
        </div>
      );
    });
  };

  if (!isOpen) return null;

  return (
    <div className="chatbot-overlay">
      <div className={`chatbot-container ${isMinimized ? 'minimized' : ''}`}>
        {/* Header */}
        <div className="chatbot-header">
          <div className="chatbot-header-content">
            <div className="chatbot-avatar">🤖</div>
            <div className="chatbot-header-text">
              <h3>AI Assistant</h3>
              <span className="status-indicator">Online</span>
            </div>
          </div>
          <div className="chatbot-header-actions">
            <button
              className="chatbot-minimize-btn"
              onClick={() => setIsMinimized(!isMinimized)}
              title={isMinimized ? 'Expand' : 'Minimize'}
            >
              {isMinimized ? '▲' : '▼'}
            </button>
            <button
              className="chatbot-close-btn"
              onClick={onClose}
              title="Close"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Messages */}
        {!isMinimized && (
          <>
            <div className="chatbot-messages">
              {messages.map((message) => {
                const isUserMessage = message.sender === userId;
                return (
                  <div
                    key={message.id}
                    className={`message-wrapper ${isUserMessage ? 'user' : 'ai'}`}
                  >
                    <div className="message-bubble">
                      <div className="message-text">
                        {renderMessageContent(message.text)}
                      </div>
                      <div className="message-time">{formatTime(message.timestamp)}</div>
                    </div>
                  </div>
                );
              })}

              {loading && (
                <div className="message-wrapper ai">
                  <div className="message-bubble loading">
                    <div className="typing-indicator">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSendMessage} className="chatbot-input-form">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Ask me anything..."
                disabled={loading}
                className="chatbot-input"
              />
              <button
                type="submit"
                disabled={!inputMessage.trim() || loading}
                className="chatbot-send-btn"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default IntelligentChatBot;
