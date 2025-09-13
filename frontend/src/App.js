import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import HomePage from "./components/Homepage";
import Chat from "./components/Chat"
import DoctorDashboard from "./components/DoctorDashboard";
import ProtectedRoute from "./components/ProtectedRoute";
function App() {
  
  return (
    <Router>
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/chat" element={<Chat />} />
      <Route
        path="/doctor"
        element={
          <ProtectedRoute>
            <DoctorDashboard />
          </ProtectedRoute>
        }
      />
    </Routes>
  </Router>
  );
}

export default App;
