import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Services from './pages/Services';
import OilProducts from './pages/OilProducts';
import Users from './pages/Users';
import Garages from './pages/Garages';
import GarageDetails from './pages/GarageDetails';
import Approvals from './pages/Approvals';
import Mechanics from './pages/Mechanics';
import MechanicDetails from './pages/MechanicDetails';
import ServiceRequests from './pages/ServiceRequests';
import Reports from './pages/Reports';
import Notifications from './pages/Notifications';
import Settings from './pages/Settings';
import RegisterGarageAdmin from './pages/RegisterGarageAdmin';
import Landing from './pages/Landing';
import DashboardLayout from './components/DashboardLayout';
import ProtectedRoute from './components/ProtectedRoute';
import RoleRoute from './components/RoleRoute';
import { authUtils } from './utils/auth';
import './App.css';

function App() {
  const defaultRoute =
    authUtils.isAuthenticated() && authUtils.isAdmin() ? '/dashboard' : '/';

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            authUtils.isAuthenticated() && authUtils.isAdmin() ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <Landing />
            )
          }
        />
        <Route
          path="/login"
          element={
            authUtils.isAuthenticated() && authUtils.isAdmin() ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <Login />
            )
          }
        />
        <Route path="/register-garage-admin" element={<RegisterGarageAdmin />} />
        <Route path="/verify-garage-admin-email" element={<Navigate to="/login" replace />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route
            path="users"
            element={
              <RoleRoute allowed={['super_admin']}>
                <Users />
              </RoleRoute>
            }
          />
          <Route
            path="garages"
            element={
              <RoleRoute allowed={['super_admin', 'garage_admin']}>
                <Garages />
              </RoleRoute>
            }
          />
          <Route
            path="garages/:id"
            element={
              <RoleRoute allowed={['super_admin', 'garage_admin']}>
                <GarageDetails />
              </RoleRoute>
            }
          />
          <Route
            path="approvals"
            element={
              <RoleRoute allowed={['super_admin']}>
                <Approvals />
              </RoleRoute>
            }
          />
          <Route
            path="services"
            element={
              <RoleRoute allowed={['super_admin']}>
                <Services />
              </RoleRoute>
            }
          />
          <Route
            path="oil-products"
            element={
              <RoleRoute allowed={['super_admin']}>
                <OilProducts />
              </RoleRoute>
            }
          />
          <Route
            path="mechanics"
            element={
              <RoleRoute allowed={['garage_admin', 'super_admin']}>
                <Mechanics />
              </RoleRoute>
            }
          />
          <Route
            path="mechanics/:id"
            element={
              <RoleRoute allowed={['garage_admin', 'super_admin']}>
                <MechanicDetails />
              </RoleRoute>
            }
          />
          <Route
            path="service-requests"
            element={
              <RoleRoute allowed={['garage_admin', 'super_admin']}>
                <ServiceRequests />
              </RoleRoute>
            }
          />
          <Route
            path="my-services"
            element={
              <RoleRoute allowed={['garage_admin']}>
                <ServiceRequests />
              </RoleRoute>
            }
          />
          <Route
            path="reports"
            element={
              <RoleRoute allowed={['garage_admin', 'super_admin']}>
                <Reports />
              </RoleRoute>
            }
          />
          <Route
            path="notifications"
            element={
              <RoleRoute allowed={['garage_admin', 'super_admin']}>
                <Notifications />
              </RoleRoute>
            }
          />
          <Route
            path="settings"
            element={
              <RoleRoute allowed={['garage_admin', 'super_admin']}>
                <Settings />
              </RoleRoute>
            }
          />
        </Route>
        <Route path="*" element={<Navigate to={defaultRoute} replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App
