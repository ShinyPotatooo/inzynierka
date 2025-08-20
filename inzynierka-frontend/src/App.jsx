import React from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import InventoryListPage from './pages/InventoryListPage';       // ⬅️ nowy
import InventoryItemFormPage from './pages/InventoryItemFormPage'; // ⬅️ nowy
import InventoryItemDetailsPage from './pages/InventoryItemDetailsPage'; // ⬅️ nowy
import DashboardPage from './pages/DashboardPage';
import AdminPanelPage from './pages/AdminPanelPage';
import ProductsListPage from './pages/ProductsListPage';
import ProductPage from './pages/ProductPage';
import InventoryOperationsPage from './pages/InventoryOperationsPage';
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

export default function App() {
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
                <InventoryListPage />
              </LayoutWrapper>
            </PrivateRoute>
          }
        />
        <Route
          path="/inventory/new"
          element={
            <PrivateRoute>
              <LayoutWrapper>
                <InventoryItemFormPage />
              </LayoutWrapper>
            </PrivateRoute>
          }
        />
        <Route
          path="/inventory/:id"
          element={
            <PrivateRoute>
              <LayoutWrapper>
                <InventoryItemDetailsPage />
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
            <PrivateRoute>
              <LayoutWrapper>
                <ProductsListPage />
              </LayoutWrapper>
            </PrivateRoute>
          }
        />

        <Route
          path="/inventory/operations"
          element={
            <PrivateRoute>
              <LayoutWrapper>
                <InventoryOperationsPage />
              </LayoutWrapper>
            </PrivateRoute>
          }
        />

        <Route
          path="/products/new"
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










