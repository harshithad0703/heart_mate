import React from "react";
import { Navigate, useLocation } from "react-router-dom";

export default function ProtectedRoute({ children }) {
  const location = useLocation();
  let isAuthenticated = false;
  try {
    const raw = localStorage.getItem("tricog_doctor");
    isAuthenticated = !!raw;
  } catch (_) {}

  if (!isAuthenticated) {
    const redirect = `/?tab=doctor`;
    return <Navigate to={redirect} state={{ from: location }} replace />;
  }

  return children;
}


