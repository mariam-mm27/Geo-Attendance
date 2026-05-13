import React, { useState } from 'react';
import IntelligentChatBot from './IntelligentChatBot';
import './ChatBotButton.css';

const ChatBotButton = () => {
  const [isChatOpen, setIsChatOpen] = useState(false);

  return (
    <>
      {/* Floating Chat Icon Button */}
      {!isChatOpen && (
        <button
          className="chatbot-icon-button"
          onClick={() => setIsChatOpen(true)}
          title="Open AI Assistant"
        >
          <span className="chatbot-icon">🤖</span>
        </button>
      )}

      {/* Corner Chat Widget - Opens only when icon clicked */}
      {isChatOpen && (
        <IntelligentChatBot
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
        />
      )}
    </>
  );
};

export default ChatBotButton;
