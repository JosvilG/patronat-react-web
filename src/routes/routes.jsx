import React from 'react'
import HomePage from '../pages/HomePage'
import Auth from '../pages/LoginPage'
import RegisterPage from '../pages/RegisterPage'
import InputsShowcase from '../pages/Test'
import FullEventsPage from '../pages/events/FullEventsPage'
import EventPage from '../pages/events/EventPage'
import AboutPage from '../pages/AboutPage'
import PartnersForm from '../pages/partners/partnersForm'

import Dashboard from '../pages/Dashboard'
import StaffControl from '../pages/users/staffControl'
import EventForm from '../pages/events/EventRegister'
import UploadGalleryForm from '../pages/galery/uploadFiles'
import CrewForm from '../pages/crews/register-crew'
import ProfilePage from '../pages/ProfilePage'
import Settings from '../pages/users/userSettings'

export const publicRoutes = [
  { path: '/', element: <HomePage /> },
  { path: '/login', element: <Auth /> },
  { path: '/register', element: <RegisterPage /> },
  { path: '/test', element: <InputsShowcase /> },
  { path: '/events-list', element: <FullEventsPage /> },
  { path: '/event/:eventName', element: <EventPage /> },
  { path: '/about', element: <AboutPage /> },
  { path: '/partner-form', element: <PartnersForm /> },
]

export const protectedRoutes = [
  { path: '/dashboard', element: <Dashboard /> },
  { path: '/staff-control', element: <StaffControl /> },
  { path: '/new-event', element: <EventForm /> },
  { path: '/upload-file', element: <UploadGalleryForm /> },
  { path: '/new-crew', element: <CrewForm /> },
  { path: '/profile', element: <ProfilePage /> },
  { path: '/settings', element: <Settings /> },
]
