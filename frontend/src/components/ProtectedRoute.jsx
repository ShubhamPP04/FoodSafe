import { Navigate } from 'react-router-dom';
import { useStore } from '../store';

export default function ProtectedRoute({ children }) {
  const { refreshToken, guestMode } = useStore();

  // Allow if there's a refresh token or guest mode is active
  if (!refreshToken && !guestMode) {
    return <Navigate to="/auth" replace />;
  }

  return children;
}
