import React, { useState, useEffect } from "react";
import "./ConnectionStatus.css";

const ConnectionStatus = ({ isConnected }) => {
  const [showStatus, setShowStatus] = useState(false);
  const [lastConnectionTime, setLastConnectionTime] = useState(null);

  useEffect(() => {
    if (isConnected) {
      setLastConnectionTime(new Date());
    }

    // Show status briefly when connection changes
    setShowStatus(true);
    const timer = setTimeout(() => {
      setShowStatus(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, [isConnected]);

  if (!showStatus && isConnected) {
    return null; // Hide when connected and timeout passed
  }

  const getStatusMessage = () => {
    if (isConnected) {
      return "Connected to Tricog Health Assistant";
    } else {
      return "Connecting to Tricog Health Assistant...";
    }
  };

  const getStatusIcon = () => {
    if (isConnected) {
      return (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22,4 12,14.01 9,11.01" />
        </svg>
      );
    } else {
      return (
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
      );
    }
  };

  return (
    <div
      className={`connection-status ${
        isConnected ? "connected" : "disconnected"
      }`}
    >
      <div className="status-content">
        <div className="status-icon">{getStatusIcon()}</div>
        <span className="status-message">{getStatusMessage()}</span>
        {lastConnectionTime && isConnected && (
          <span className="connection-time">
            Connected at {lastConnectionTime.toLocaleTimeString()}
          </span>
        )}
      </div>
    </div>
  );
};

export default ConnectionStatus;
