import React from "react";
import { Navigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

const PrivateRoute = ({ children, allowedRoles }) => {

  const { user, role, loading } = useAuth();

  // ================= LOADING =================

  if (loading) {
    return <div>Loading...</div>;
  }

  // ================= NOT LOGGED IN =================

  if (!user) {
    return <Navigate to="/" replace />;
  }

  // ================= ROLE NOT ALLOWED =================

  if (!allowedRoles.includes(role)) {
    return <Navigate to="/" replace />;
  }

  // ================= ACCESS GRANTED =================

  return children;
};

export default PrivateRoute;