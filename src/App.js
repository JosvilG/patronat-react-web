import React from 'react'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom'
import HomePage from './pages/HomePage'
import Auth from './pages/LoginPage'
import Layout from './components/Layout'
import RegisterPage from './pages/RegisterPage'
import ProfilePage from './pages/ProfilePage'
import ProtectedRoute from './components/ProtectedRoute'
import Dashboard from './pages/Dashboard'
import EventForm from './pages/EventRegister'

function App() {
  return (
    // Envuelve toda la aplicación con el PopupProvider
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="login" element={<Auth />} />
          <Route path="register" element={<RegisterPage />} />
          <Route
            path="dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="new-event"
            element={
              <ProtectedRoute>
                <EventForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
        </Route>
      </Routes>
    </Router>
  )
}

export default App
