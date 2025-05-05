import React from 'react'
import HomePage from '../pages/HomePage'
import Auth from '../pages/access/LoginPage'
import RegisterPage from '../pages/access/RegisterPage'
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
import RecoverPassword from '../pages/access/RecoverPassword'
import ResetPassword from '../pages/access/ResetPassword'
import EventModify from '../pages/events/EventModify'
export const publicRoutes = [
  { path: '/', element: <HomePage /> },
  { path: '/login', element: <Auth /> },
  { path: '/register', element: <RegisterPage /> },
  { path: '/events-list', element: <FullEventsPage /> },
  { path: '/event/:eventName', element: <EventPage /> },
  { path: '/about', element: <AboutPage /> },
  { path: '/partner-form', element: <PartnersForm /> },
  { path: '/recover-password', element: <RecoverPassword /> },
  { path: '/reset-password', element: <ResetPassword /> },
]

export const protectedRoutes = [
  { path: '/dashboard', element: <Dashboard /> },
  { path: '/staff-control', element: <StaffControl /> },
  { path: '/new-event', element: <EventForm /> },
  { path: '/upload-file', element: <UploadGalleryForm /> },
  { path: '/new-crew', element: <CrewForm /> },
  { path: '/profile', element: <ProfilePage /> },
  { path: '/settings', element: <Settings /> },
  { path: '/edit-event/:eventName', element: <EventModify /> },
]
