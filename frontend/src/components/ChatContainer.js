import React, { useState, useRef, useEffect } from 'react';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import TypingIndicator from './TypingIndicator';
import './ChatContainer.css';

const ChatContainer = ({ messages, onSendMessage, onTyping, isTyping, isConnected }) => {
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const [isScrolledUp, setIsScrolledUp] = useState(false);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle scroll detection
  useEffect(() => {
    const handleScroll = () => {
      if (chatContainerRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
        const isAtBottom = scrollHeight - scrollTop <= clientHeight + 100;
        setIsScrolledUp(!isAtBottom);
      }
    };

    const chatContainer = chatContainerRef.current;
    if (chatContainer) {
      chatContainer.addEventListener('scroll', handleScroll);
      return () => chatContainer.removeEventListener('scroll', handleScroll);
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = (message) => {
    onSendMessage(message);
    // Ensure we scroll to bottom after sending
    setTimeout(scrollToBottom, 100);
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <div className="chat-header-info">
          <div className="chat-title">
            <h2>Tricog Health Assistant</h2>
            <p>Your AI-powered cardiac health companion</p>
          </div>
          <div className={`connection-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
            <div className="indicator-dot"></div>
            <span>{isConnected ? 'Online' : 'Offline'}</span>
          </div>
        </div>
      </div>

      <div className="chat-messages" ref={chatContainerRef}>
        <div className="messages-list">
          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
            />
          ))}
          
          {isTyping && <TypingIndicator />}
          
          <div ref={messagesEndRef} />
        </div>

        {isScrolledUp && (
          <button 
            className="scroll-to-bottom"
            onClick={scrollToBottom}
            aria-label="Scroll to bottom"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M7 13l3 3 7-7"/>
              <path d="M7 6l3 3 7-7"/>
            </svg>
          </button>
        )}
      </div>

      <MessageInput
        onSendMessage={handleSendMessage}
        onTyping={onTyping}
        disabled={!isConnected}
        placeholder={isConnected ? "Type your message..." : "Connecting..."}
      />
    </div>
  );
};

export default ChatContainer;
