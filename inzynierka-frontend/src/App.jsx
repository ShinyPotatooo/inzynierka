import React from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import './components/styles/global.css';

import LoginPage from './pages/LoginPage';

import InventoryListPage from './pages/InventoryListPage';
import InventoryItemFormPage from './pages/InventoryItemFormPage';
import InventoryItemDetailsPage from './pages/InventoryItemDetailsPage';

import DashboardPage from './pages/DashboardPage';
import AdminPanelPage from './pages/AdminPanelPage';

import ProductsListPage from './pages/ProductsListPage';
import ProductPage from './pages/ProductPage';

import InventoryOperationsPage from './pages/InventoryOperationsPage';

import Navbar from './components/Navbar';
import PrivateRoute from './components/PrivateRoute';

import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider } from './context/AuthContext';

import AdminComposeNotification from './pages/AdminComposeNotification';
import NotificationDetailsPage from './pages/NotificationDetailsPage';
import NotificationsPage from './pages/NotificationsPage';
import DictionariesPage from './pages/DictionariesPage';

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
        {/* Login */}
        <Route path="/" element={<LoginPage />} />

        {/* Dashboard */}
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

        {/* Magazyn */}
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
          path="/inventory/operations"
          element={
            <PrivateRoute>
              <LayoutWrapper>
                <InventoryOperationsPage />
              </LayoutWrapper>
            </PrivateRoute>
          }
        />

        {/* Produkty */}
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
          path="/products/new"
          element={
            <PrivateRoute allowedRoles={['admin', 'manager']}>
              <LayoutWrapper>
                <ProductPage />
              </LayoutWrapper>
            </PrivateRoute>
          }
        />
        <Route
          path="/products/:id"
          element={
            <PrivateRoute allowedRoles={['admin', 'manager']}>
              <LayoutWrapper>
                <ProductPage />
              </LayoutWrapper>
            </PrivateRoute>
          }
        />

        {/* Powiadomienia */}
        <Route
          path="/notifications"
          element={
            <PrivateRoute>
              <LayoutWrapper>
                <NotificationsPage />
              </LayoutWrapper>
            </PrivateRoute>
          }
        />
        <Route
          path="/notifications/:id"
          element={
            <PrivateRoute>
              <LayoutWrapper>
                <NotificationDetailsPage />
              </LayoutWrapper>
            </PrivateRoute>
          }
        />

        {/* Composer powiadomień – dostępny dla ADMIN i MANAGER */}
        <Route
          path="/admin/notifications/new"
          element={
            <PrivateRoute allowedRoles={['admin', 'manager']}>
              <LayoutWrapper>
                <AdminComposeNotification />
              </LayoutWrapper>
            </PrivateRoute>
          }
        />

        {/* Admin panel */}
        <Route
          path="/admin"
          element={
            <PrivateRoute allowedRoles={['admin']}>
              <LayoutWrapper>
                <AdminPanelPage />
              </LayoutWrapper>
            </PrivateRoute>
          }
        />

        {/* Słowniki */}
        <Route
          path="/dictionaries"
          element={
            <PrivateRoute allowedRoles={['admin', 'manager']}>
              <LayoutWrapper>
                <DictionariesPage />
              </LayoutWrapper>
            </PrivateRoute>
          }
        />

        {/* Fallback */}
        <Route
          path="*"
          element={
            <PrivateRoute>
              <Navigate to="/inventory" replace />
            </PrivateRoute>
          }
        />
      </Routes>
    </AuthProvider>
  );
}
