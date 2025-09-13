import React from 'react';
import './Header.css';


const Header = () => {
  return (
    <header className="app-header">
      <div className="header-content">
        <div className="header-logo">
        
            <img src="/logo.png" alt="App Logo" />
          
          {/* <div className="logo-text">
            <h1>Tricog Health</h1>
            <p>AI-Powered Cardiac Care Assistant</p>
          </div> */}
        </div>

        <div className="header-info">
          <div className="security-badge">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span>Secure & Private</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
