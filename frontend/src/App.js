import React, { useState, useEffect, useRef } from "react";
import io from "socket.io-client";
import ChatContainer from "./components/ChatContainer";
import ConnectionStatus from "./components/ConnectionStatus";
import Header from "./components/Header";
import "./App.css";

function App() {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    // Initialize socket connection
    const newSocket = io("http://localhost:8024", {
      transports: ["websocket", "polling"],
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    // Connection event handlers
    newSocket.on("connect", () => {
      console.log("Connected to server");
      setIsConnected(true);
      // Welcome message will be sent automatically by the server
    });

    newSocket.on("disconnect", () => {
      console.log("Disconnected from server");
      setIsConnected(false);
    });

    newSocket.on("connect_error", (error) => {
      console.error("Connection error:", error);
      setIsConnected(false);
    });

    // Message event handlers
    newSocket.on("bot_message", (data) => {
      console.log("Received bot message:", data);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          message: data.message,
          sender: "bot",
          timestamp: data.timestamp || new Date().toISOString(),
          type: data.type || "text",
        },
      ]);
      setIsTyping(false);
    });

    newSocket.on("user_typing", (data) => {
      console.log("User typing:", data);
      setIsTyping(true);
      // Clear typing indicator after 3 seconds
      setTimeout(() => setIsTyping(false), 3000);
    });

    newSocket.on("error", (data) => {
      console.error("Socket error:", data);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          message: data.message || "An error occurred. Please try again.",
          sender: "bot",
          timestamp: new Date().toISOString(),
          type: "error",
        },
      ]);
    });

    // Cleanup on unmount
    return () => {
      newSocket.close();
    };
  }, []);

  const sendMessage = (message) => {
    if (socket && message.trim()) {
      const messageData = {
        message: message.trim(),
        timestamp: new Date().toISOString(),
      };

      // Add user message to chat immediately
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          message: message.trim(),
          sender: "user",
          timestamp: new Date().toISOString(),
          type: "text",
        },
      ]);

      // Show typing indicator
      setIsTyping(true);

      // Send to server
      socket.emit("chat_message", messageData);
    }
  };

  const handleTyping = () => {
    if (socket) {
      socket.emit("typing", { timestamp: new Date().toISOString() });
    }
  };

  return (
    <div className="App">
      <Header />
      <ConnectionStatus isConnected={isConnected} />
      <main className="app-main">
        <ChatContainer
          messages={messages}
          onSendMessage={sendMessage}
          onTyping={handleTyping}
          isTyping={isTyping}
          isConnected={isConnected}
        />
      </main>
      <footer className="app-footer">
        <p>Tricog Health Assistant - Secure Healthcare Communication</p>
      </footer>
    </div>
  );
}

export default App;
