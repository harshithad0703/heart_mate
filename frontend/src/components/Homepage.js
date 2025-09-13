import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FaComments } from "react-icons/fa";
import Header from "./Header";
import "./Homepage.css";

export default function HomePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState("patient");
  const [formData, setFormData] = useState({
    email: "",
    fullName: "",
    password: "",
  });

  // support switching to doctor tab via URL: /?tab=doctor
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get("tab");
    if (tab === "doctor") setActiveTab("doctor");
  }, [location.search]);

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
        if (data && data.success && data.doctor) {
          try {
            localStorage.setItem("tricog_doctor", JSON.stringify(data.doctor));
          } catch (_) {}
          navigate("/doctor");
        } else {
          alert(`Login failed: ${data?.error || "Invalid credentials"}`);
        }
      }
    } catch (error) {
      console.error(error);
      alert("Error calling backend");
    }
  };

  const startChat = async () => {
    navigate("/chat");
  };

  return (
    <>
      <Header />

      <div className="homepage">
        {/* Welcome text section */}
        <div className="welcome-text">
          <h2>Welcome to Doctor’s AI Assistant for Cardiology </h2>
          <p>
            Please click on <strong>Patient</strong> tab if you are a patient
            and on <strong>Doctor</strong> tab if you are a doctor to proceed.
          </p>
        </div>
        <div className="main">
          {/* Left Heart Icon */}
          <div className="heart-section">
            <img src="/heart3.png" alt="Heart" />
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
              {/* Email */}
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                name="email"
                placeholder="Enter your email"
                onChange={handleChange}
                required
              />

              {/* Patient field */}
              {activeTab === "patient" && (
                <>
                  <label htmlFor="fullName">Full Name</label>
                  <input
                    id="fullName"
                    type="text"
                    name="fullName"
                    placeholder="Enter your full name"
                    onChange={handleChange}
                    required
                  />
                </>
              )}

              {/* Doctor field */}
              {activeTab === "doctor" && (
                <>
                  <label htmlFor="password">Password</label>
                  <input
                    id="password"
                    type="password"
                    name="password"
                    placeholder="Enter your password"
                    onChange={handleChange}
                    required
                  />
                </>
              )}

              <button type="submit" className="submit-btn">
                Submit
              </button>
            </form>
          </div>
        </div>
       
      </div>
    </>
  );
}
