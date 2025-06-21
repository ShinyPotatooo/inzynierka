import React, { useContext } from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import InventoryPage from './pages/InventoryPage';
import DashboardPage from './pages/DashboardPage';
import AdminPanelPage from './AdminPanelPage';
import Navbar from './components/Navbar';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider, AuthContext } from './context/AuthContext';

function LayoutWrapper() {
  const location = useLocation();
  const hideNavbar = location.pathname === '/';
  const { user } = useContext(AuthContext);

  return (
    <>
      {!hideNavbar && <Navbar />}
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/inventory" element={<InventoryPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/admin" element={user?.role === 'admin' ? <AdminPanelPage /> : <Navigate to="/" />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <ToastContainer />
      <LayoutWrapper />
    </AuthProvider>
  );
}

export default App;




