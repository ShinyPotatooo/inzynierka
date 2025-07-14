import React from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import InventoryPage from './pages/InventoryPage';
import DashboardPage from './pages/DashboardPage';
import AdminPanelPage from './pages/AdminPanelPage';
import ProductPage from './pages/ProductPage'; // ✅ NOWE
import Navbar from './components/Navbar';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';

function LayoutWrapper({ children }) {
  const location = useLocation();
  const hideNavbar = location.pathname === '/';

  return (
    <>
      {!hideNavbar && <Navbar />}
      {children}
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <ToastContainer />
      <Routes>
        <Route path="/" element={<LoginPage />} />

        <Route
          path="/inventory"
          element={
            <PrivateRoute>
              <LayoutWrapper>
                <InventoryPage />
              </LayoutWrapper>
            </PrivateRoute>
          }
        />

        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <LayoutWrapper>
                <DashboardPage />
              </LayoutWrapper>
            </PrivateRoute>
          }
        />

        <Route
          path="/admin"
          element={
            <PrivateRoute requiredRole="admin">
              <LayoutWrapper>
                <AdminPanelPage />
              </LayoutWrapper>
            </PrivateRoute>
          }
        />

        <Route
          path="/products"
          element={
            <PrivateRoute requiredRole="admin">
              <LayoutWrapper>
                <ProductPage />
              </LayoutWrapper>
            </PrivateRoute>
          }
        />
      </Routes>
    </AuthProvider>
  );
}

export default App;









