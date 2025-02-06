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
import FullEventsPage from './pages/events/FullEventsPage'
import AboutPage from './pages/AboutPage'
import UnderConstruction from './pages/UnderConstruction'

import './translations/index'
import StaffControl from './pages/users/staffControl'
import PartnersForm from './pages/partners/partnersForm'

const publicRoutes = [
  { path: '/', element: <HomePage /> },
  { path: '/login', element: <Auth /> },
  { path: '/register', element: <RegisterPage /> },
  { path: '/test', element: <InputsShowcase /> },
  { path: '/events-list', element: <FullEventsPage /> },
  { path: '/event/:eventName', element: <EventPage /> },
  { path: '/about', element: <AboutPage /> },
  { path: '/partner-form', element: <PartnersForm /> },
]

const protectedRoutes = [
  { path: '/dashboard', element: <Dashboard /> },
  { path: '/staff-control', element: <StaffControl /> },
  { path: '/new-event', element: <EventForm /> },
  { path: '/upload-file', element: <UploadGalleryForm /> },
  { path: '/new-crew', element: <CrewForm /> },
  { path: '/profile', element: <ProfilePage /> },
  { path: '/settings', element: <Settings /> },
]

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          {/* Rutas públicas */}
          {publicRoutes.map(({ path, element }) => (
            <Route key={path} path={path} element={element} />
          ))}

          {/* Rutas protegidas */}
          {protectedRoutes.map(({ path, element }) => (
            <Route
              key={path}
              path={path}
              element={<ProtectedRoute>{element}</ProtectedRoute>}
            />
          ))}
          <Route path="*" element={<UnderConstruction />} />
        </Route>
      </Routes>
    </Router>
  )
}

export default App
