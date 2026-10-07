import { Navigate } from 'react-router-dom';
import { authUtils } from '../utils/auth';

interface RoleRouteProps {
  allowed: string[];
  children: React.ReactNode;
}

const RoleRoute = ({ allowed, children }: RoleRouteProps) => {
  const user = authUtils.getUser();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowed.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default RoleRoute;
