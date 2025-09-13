import React from "react";
import moment from "moment";
import "./MessageBubble.css";

const MessageBubble = ({ message }) => {
  const { message: text, sender, timestamp, type } = message;

  const formatTime = (timestamp) => {
    return moment(timestamp).format("HH:mm");
  };

  const formatMessage = (text) => {
    // Handle line breaks and format the message nicely
    return text.split("\n").map((line, index) => (
      <span key={index}>
        {line}
        {index < text.split("\n").length - 1 && <br />}
      </span>
    ));
  };

  const getMessageIcon = () => {
    if (sender === "bot") {
      return (
        <div className="message-avatar bot-avatar">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
            <path d="M8 14s1.5 2 4 2 4-2 4-2" />
            <path d="M9 9h.01" />
            <path d="M15 9h.01" />
          </svg>
        </div>
      );
    } else {
      return (
        <div className="message-avatar user-avatar">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </div>
      );
    }
  };

  return (
    <div className={`message-bubble-container ${sender}`}>
      <div className={`message-bubble ${sender} ${type}`}>
        <div className="message-header">
          {getMessageIcon()}
          <div className="message-info">
            <span className="message-sender">
              {sender === "bot" ? "Tricog Assistant" : "You"}
            </span>
            <span className="message-time">{formatTime(timestamp)}</span>
          </div>
        </div>

        <div className="message-content">
          {type === "error" && (
            <div className="error-indicator">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </div>
          )}

          <div className="message-text">{formatMessage(text)}</div>
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
