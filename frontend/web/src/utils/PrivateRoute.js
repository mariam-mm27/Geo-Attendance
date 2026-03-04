import { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../utils/AuthContext";

const PrivateRoute = ({ children, allowedRoles }) => {
  const { user, role } = useContext(AuthContext);

  if (!user) return <Navigate to="/" replace />;
  if (!allowedRoles.includes(role)) return <Navigate to="/" />;

  return children;
};

export default PrivateRoute;