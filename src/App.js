import React from 'react'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom'
import HomePage from './pages/HomePage'
import Auth from './pages/LoginPage'
import Layout from './components/Layout'
import RegisterPage from './pages/RegisterPage'
import ProfilePage from './pages/ProfilePage'
import ProtectedRoute from './components/ProtectedRoute'
import Dashboard from './pages/Dashboard'
import EventForm from './pages/events/EventRegister'
import UploadGalleryForm from './pages/galery/uploadFiles'
import CrewForm from './pages/crews/register-crew'
import Settings from './pages/users/userSettings'
import InputsShowcase from './pages/Test'
import EventPage from './pages/events/EventPage'

import './translations/index'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="login" element={<Auth />} />
          <Route path="register" element={<RegisterPage />} />
          <Route path="test" element={<InputsShowcase />} />
          <Route path="/event/:id" element={<EventPage />} />
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
            path="upload-file"
            element={
              <ProtectedRoute>
                <UploadGalleryForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="new-crew"
            element={
              <ProtectedRoute>
                <CrewForm />
              </ProtectedRoute>
            }
          />
          {/* User dropdown Routes */}
          <Route
            path="profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="settings"
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />
        </Route>
      </Routes>
    </Router>
  )
}

export default App
