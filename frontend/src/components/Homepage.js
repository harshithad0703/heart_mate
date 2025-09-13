import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaComments } from "react-icons/fa";
import Header from "./Header";
import "./Homepage.css";

export default function HomePage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("patient");
  const [formData, setFormData] = useState({
    email: "",
    fullName: "",
    password: "",
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const endpoint =
      activeTab === "patient"
        ? "http://localhost:8024/api/patient"
        : "http://localhost:8024/api/doctor";

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (activeTab === "patient") {
        if (data && data.success) {
          // Persist patient info for socket attach on chat load
          const patientPayload = {
            email: formData.email,
            fullName: formData.fullName,
          };
          try {
            localStorage.setItem("tricog_patient", JSON.stringify(patientPayload));
          } catch (_) {}
          navigate("/chat");
        } else {
          alert(`Failed: ${data?.error || "Unable to proceed"}`);
        }
      } else {
        alert(`Response: ${JSON.stringify(data)}`);
      }
    } catch (error) {
      console.error(error);
      alert("Error calling backend");
    }
  };

  const startChat = async () => {
    try {
      const res = await fetch("http://localhost:8024/api/start-chat", {
        method: "POST",
      });
      const data = await res.json();
      alert("Chat started: " + JSON.stringify(data));
    } catch (error) {
      console.error(error);
      alert("Chat initiation failed");
    }
  };

  return (
    <>
      <Header />
      <div className="homepage">
        {/* Left Heart Icon */}
        <div className="heart-section">
          <img src="/heart.png" alt="Heart" />
        </div>

        {/* Right Form */}
        <div className="form-card">
          <div className="tabs">
            <button
              className={activeTab === "patient" ? "active" : ""}
              onClick={() => setActiveTab("patient")}
            >
              Patient
            </button>
            <button
              className={activeTab === "doctor" ? "active" : ""}
              onClick={() => setActiveTab("doctor")}
            >
              Doctor
            </button>
          </div>

          <form className="form" onSubmit={handleSubmit}>
            <input
              type="email"
              name="email"
              placeholder="Email"
              onChange={handleChange}
              required
            />
            {activeTab === "patient" && (
              <input
                type="text"
                name="fullName"
                placeholder="Full Name"
                onChange={handleChange}
                required
              />
            )}
            {activeTab === "doctor" && (
              <input
                type="password"
                name="password"
                placeholder="Password"
                onChange={handleChange}
                required
              />
            )}
            <button type="submit" className="submit-btn">
              Submit
            </button>
          </form>
        </div>

        {/* Floating Chat Button */}
        <button className="chat-btn" onClick={startChat}>
          <FaComments size={22} />
        </button>
      </div>
    </>
  );
}
