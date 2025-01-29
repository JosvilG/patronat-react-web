import React from 'react'
import { Link } from 'react-router-dom'

export default function Dashboard() {
  const cards = [
    {
      id: 'events',
      title: 'Eventos',
      description: 'Gestiona todos los eventos de la plataforma.',
      icon: '📅',
      actions: [
        {
          id: 'create-event',
          title: 'Crear Evento',
          route: '/new-event',
        },
        {
          id: 'edit-event',
          title: 'Modificar Evento',
          route: '/edit-event',
        },
        {
          id: 'delete-event',
          title: 'Eliminar Evento',
          route: '/delete-event',
        },
        {
          id: 'event-history',
          title: 'Historial de Eventos',
          route: '/event-history',
        },
      ],
    },
    {
      id: 'users',
      title: 'Usuarios',
      description: 'Gestiona y consulta los usuarios registrados.',
      icon: '👤',
      actions: [
        {
          id: 'manage-users',
          title: 'Gestión de Usuarios',
          route: '/usuarios',
        },
        {
          id: 'user-history',
          title: 'Historial de Usuarios',
          route: '/user-history',
        },
      ],
    },
    {
      id: 'socios',
      title: 'Socios',
      description: 'Gestiona los socios de la plataforma.',
      icon: '🤝',
      actions: [
        {
          id: 'manage-socios',
          title: 'Gestión de Socios',
          route: '/socios',
        },
      ],
    },
    {
      id: 'penas',
      title: 'Peñas',
      description: 'Administra las peñas asociadas a los eventos.',
      icon: '🍻',
      actions: [
        {
          id: 'new-crew',
          title: 'Creación de Peñas',
          route: '/new-crew',
        },
        {
          id: 'edit-pena',
          title: 'Modificación de Peñas',
          route: '/edit-pena',
        },
        {
          id: 'pena-scores',
          title: 'Puntuación de Peñas',
          route: '/pena-scores',
        },
        {
          id: 'pena-history',
          title: 'Historial de Peñas',
          route: '/pena-history',
        },
        {
          id: 'pena-requests',
          title: 'Solicitudes de Peñas',
          route: '/pena-requests',
        },
      ],
    },
    {
      id: 'gallery',
      title: 'Galería',
      description: 'Gestiona los archivos multimedia de la plataforma.',
      icon: '🖼️',
      actions: [
        {
          id: 'add-files',
          title: 'Añadir Nuevos Archivos',
          route: '/upload-file',
        },
        {
          id: 'delete-files',
          title: 'Eliminar Archivos',
          route: '/delete-files',
        },
        {
          id: 'modify-files',
          title: 'Modificar Archivos',
          route: '/modify-files',
        },
      ],
    },
    {
      id: 'chat',
      title: 'Chat',
      description: 'Gestiona los mensajes y conversaciones.',
      icon: '💬',
      actions: [
        {
          id: 'inbox',
          title: 'Bandeja de Entrada',
          route: '/inbox',
        },
        {
          id: 'live-chat',
          title: 'Chat en Vivo',
          route: '/live-chat',
        },
      ],
    },
    {
      id: 'reports',
      title: 'Reportes',
      description: 'Consulta los reportes de los eventos y el sistema.',
      icon: '📊',
      route: '/reportes',
    },
  ]

  return (
    <div className="min-h-screen px-5 py-10 bg-gray-100">
      <h1 className="mb-8 text-4xl font-bold text-center text-gray-800">
        Panel de Administración
      </h1>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.id}
            className="p-6 transition duration-300 bg-white rounded-lg shadow-lg cursor-pointer hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <div className="mb-4 text-5xl text-gray-700">{card.icon}</div>
            <h2 className="mb-2 text-xl font-semibold">{card.title}</h2>
            <p className="text-gray-600">{card.description}</p>

            {/* Mostrar acciones si la sección tiene acciones definidas */}
            {card.actions && (
              <div className="mt-4 space-y-3">
                {card.actions.map((action) => (
                  <Link
                    key={action.id}
                    to={action.route}
                    className="block px-4 py-2 text-center text-white bg-blue-500 rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {action.title}
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
