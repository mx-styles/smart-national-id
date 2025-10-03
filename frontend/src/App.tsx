import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/auth/ProtectedRoute';

// Pages
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import Dashboard from './pages/Dashboard';
import BookAppointment from './pages/BookAppointment';
import Appointments from './pages/Appointments';
import MyQueue from './pages/MyQueue';
import Profile from './pages/Profile';
import AdminDashboard from './pages/AdminDashboard';
import ServiceCenters from './pages/ServiceCenters';

import theme from './theme';

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            {/* Protected routes */}
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Routes>
                      <Route path="/dashboard" element={<Dashboard />} />
                      <Route path="/book-appointment" element={<BookAppointment />} />
                      <Route path="/appointments" element={<Appointments />} />
                      <Route path="/my-queue" element={<MyQueue />} />
                      <Route path="/profile" element={<Profile />} />
                      <Route 
                        path="/admin" 
                        element={
                          <ProtectedRoute adminOnly>
                            <AdminDashboard />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/service-centers" 
                        element={
                          <ProtectedRoute adminOnly>
                            <ServiceCenters />
                          </ProtectedRoute>
                        } 
                      />
                      <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    </Routes>
                  </Layout>
                </ProtectedRoute>
              }
            />
          </Routes>
        </Router>
        
        <ToastContainer
          position="top-right"
          autoClose={4000}
          hideProgressBar
          closeOnClick
          theme="colored"
        />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
