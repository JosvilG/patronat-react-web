import React from 'react'

// Páginas de acceso
import Auth from '../pages/access/LoginPage'
import RegisterPage from '../pages/access/RegisterPage'
import RecoverPassword from '../pages/access/RecoverPassword'
import ResetPassword from '../pages/access/ResetPassword'

// Páginas de inicio y generales
import HomePage from '../pages/HomePage'
import AboutPage from '../pages/AboutPage'
import PartnersForm from '../pages/partners/partnersForm'

// Páginas de eventos
import FullEventsPage from '../pages/events/FullEventsPage'
import EventPage from '../pages/events/EventPage'
import EventForm from '../pages/events/EventRegister'
import EventModify from '../pages/events/EventModify'
import EventList from '../pages/events/EventList'

// Páginas de colaboradores
import CollaboratorRegisterForm from '../pages/collaborators/CollabRegister'
import CollaboratorModifyForm from '../pages/collaborators/CollabModify'
import CollabList from '../pages/collaborators/CollabList'

// Páginas de participantes
import ParticipantRegisterForm from '../pages/participants/ParticipantRegister'
import ParticipantModifyForm from '../pages/participants/ParticipantModify'
import ParticipantList from '../pages/participants/ParticipantList'

// Páginas de archivos
import GalleryPage from '../pages/files/GalleryMain'
import UploadList from '../pages/files/UploadList'
import UploadFileForm from '../pages/files/UploadFiles'

// Páginas de administración y configuración
import Dashboard from '../pages/Dashboard'
import StaffControl from '../pages/users/staffControl'
import CrewForm from '../pages/crews/register-crew'
import ProfilePage from '../pages/ProfilePage'
import Settings from '../pages/users/userSettings'

export const publicRoutes = [
  // Rutas públicas
  { path: '/', element: <HomePage /> },
  { path: '/login', element: <Auth /> },
  { path: '/register', element: <RegisterPage /> },
  { path: '/events-list', element: <FullEventsPage /> },
  { path: '/event/:eventName', element: <EventPage /> },
  { path: '/about', element: <AboutPage /> },
  { path: '/partner-form', element: <PartnersForm /> },
  { path: '/recover-password', element: <RecoverPassword /> },
  { path: '/reset-password', element: <ResetPassword /> },
  { path: '/gallery', element: <GalleryPage /> },
]

export const protectedRoutes = [
  // Rutas protegidas
  { path: '/dashboard', element: <Dashboard /> },
  { path: '/staff-control', element: <StaffControl /> },
  { path: '/new-event', element: <EventForm /> },
  { path: '/edit-event/:slug', element: <EventModify /> },
  { path: '/events-control-list', element: <EventList /> },
  { path: '/new-collaborator', element: <CollaboratorRegisterForm /> },
  { path: '/modify-collaborator/:slug', element: <CollaboratorModifyForm /> },
  { path: '/list-collaborator', element: <CollabList /> },
  { path: '/new-participant', element: <ParticipantRegisterForm /> },
  { path: '/modify-participant/:slug', element: <ParticipantModifyForm /> },
  { path: '/list-participant', element: <ParticipantList /> },
  { path: '/upload-file', element: <UploadFileForm /> },
  { path: '/upload-list', element: <UploadList /> },
  { path: '/new-crew', element: <CrewForm /> },
  { path: '/profile', element: <ProfilePage /> },
  { path: '/settings', element: <Settings /> },
]
