import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  allowedRoles?: string[]; // e.g., ['Librarian'] or ['User']
}

export default function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuth();

  // 1. If no token exists, kick to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // 2. If the route requires a specific role and the user doesn't have it
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    // Route them to their correct dashboard
    return <Navigate to={user.role === 'Librarian' ? '/librarian-dashboard' : '/user-dashboard'} replace />;
  }

  // 3. If they pass the checks, render the page
  return <Outlet />; 
}