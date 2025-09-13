import React, { useState, useEffect, useRef } from "react";
import io from "socket.io-client";
import ChatContainer from "./ChatContainer";
import ConnectionStatus from "./ConnectionStatus";
import Header from "./Header";


function Chat() {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    const newSocket = io("http://localhost:8024", {
      transports: ["websocket", "polling"],
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    newSocket.on("connect", () => {
      console.log("Connected to server");
      setIsConnected(true);
    });

    newSocket.on("disconnect", () => {
      console.log("Disconnected from server");
      setIsConnected(false);
    });

    newSocket.on("connect_error", (error) => {
      console.error("Connection error:", error);
      setIsConnected(false);
    });

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

      setIsTyping(true);
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
      {/* <footer className="app-footer">
        <p>Tricog Health Assistant - Secure Healthcare Communication</p>
      </footer> */}
    </div>
  );
}

export default Chat;
