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
import CollaboratorRegisterForm from '../pages/collaborators/CollabRegister'
import CollaboratorModifyForm from '../pages/collaborators/CollabModify'
import CollabList from '../pages/collaborators/CollabList'
import ParticipantRegisterForm from '../pages/participants/ParticipantRegister'
import ParticipantModifyForm from '../pages/participants/ParticipantModify'
import ParticipantList from '../pages/participants/ParticipantList'
import EventModify from '../pages/events/EventModify'
import EventList from '../pages/events/EventList'

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
  { path: '/new-collaborator', element: <CollaboratorRegisterForm /> },
  { path: '/modify-collaborator/:slug', element: <CollaboratorModifyForm /> },
  { path: '/list-collaborator', element: <CollabList /> },
  { path: '/new-participant', element: <ParticipantRegisterForm /> },
  { path: '/modify-participant/:slug', element: <ParticipantModifyForm /> },
  { path: '/list-participant', element: <ParticipantList /> },
  { path: '/events-control-list', element: <EventList /> },
  { path: '/edit-event/:slug', element: <EventModify /> },
]
