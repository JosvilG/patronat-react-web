import React from 'react'
import { Link } from 'react-router-dom'
import DynamicButton from '../components/Buttons'

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
          type: 'add',
        },
        {
          id: 'event-history',
          title: 'Historial de Eventos',
          route: '/event-history',
          type: 'view',
        },
        {
          id: 'events-control-list',
          title: 'Lista de Eventos',
          route: '/events-control-list',
          type: 'view',
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
          type: 'edit',
        },
        {
          id: 'user-history',
          title: 'Historial de Usuarios',
          route: '/user-history',
          type: 'view',
        },
        {
          id: 'staff-control',
          title: 'Staff control',
          route: '/staff-control',
          type: 'edit',
        },
      ],
    },
    {
      id: 'socios',
      title: 'Socios',
      description:
        'Gestiona los socios del Patronat de Festes. Modifica las cuotas, datos personales, etc.',
      icon: '🤝',
      actions: [
        {
          id: 'manage-socios',
          title: 'Gestión de Socios',
          route: '/socios',
          type: 'edit',
        },
      ],
    },
    {
      id: 'colaboradores',
      title: 'Colaboradores',
      description:
        'Gestiona los colaborares del Patronat de Festes. Entidades, organizaciones o personas que colaboran.',
      icon: '🤲',
      actions: [
        {
          id: 'create-collaborator',
          title: 'Crear nuevo colaborador',
          route: '/new-collaborator',
          type: 'add',
        },
        {
          id: 'list-collaborator',
          title: 'Lista de colaboradores',
          route: '/list-collaborator',
          type: 'view',
        },
      ],
    },
    {
      id: 'participantes',
      title: 'Participantes',
      description:
        'Gestiona los participantes en los eventos del Patronat de Festes. Dj, grupos musicales, etc.',
      icon: '🎵',
      actions: [
        {
          id: 'create-participants',
          title: 'Crear nuevo participante',
          route: '/new-participant',
          type: 'add',
        },
        {
          id: 'list-participants',
          title: 'Lista de participantes',
          route: '/list-participant',
          type: 'view',
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
          type: 'add',
        },
        {
          id: 'edit-pena',
          title: 'Modificación de Peñas',
          route: '/edit-pena',
          type: 'edit',
        },
        {
          id: 'pena-scores',
          title: 'Puntuación de Peñas',
          route: '/pena-scores',
          type: 'edit',
        },
        {
          id: 'pena-history',
          title: 'Historial de Peñas',
          route: '/pena-history',
          type: 'view',
        },
        {
          id: 'pena-requests',
          title: 'Solicitudes de Peñas',
          route: '/pena-requests',
          type: 'view',
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
          type: 'add',
        },
        {
          id: 'delete-files',
          title: 'Eliminar Archivos',
          route: '/delete-files',
          type: 'delete',
        },
        {
          id: 'modify-files',
          title: 'Modificar Archivos',
          route: '/modify-files',
          type: 'edit',
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
          type: 'view',
        },
        {
          id: 'live-chat',
          title: 'Chat en Vivo',
          route: '/live-chat',
          type: 'submit',
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
    <div className="min-h-screen px-5 py-10 ">
      <h1 className="mb-10 text-4xl font-bold text-center text-gray-800">
        Panel de Administración
      </h1>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.id}
            className="overflow-hidden transition-all duration-300 border border-gray-200 shadow-lg rounded-2xl hover:shadow-xl hover:scale-[1.01] hover:border-gray-300 text-[#696969] backdrop-blur-lg backdrop-saturate-[180%] bg-[rgba(255,255,255,0.75)]"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="text-5xl">{card.icon || '📄'}</div>
                <div className="px-3 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-full">
                  {card.actions ? `${card.actions.length} acciones` : ''}
                </div>
              </div>

              <h2 className="mb-2 text-2xl font-bold text-gray-800">
                {card.title}
              </h2>
              <p className="mb-6 text-gray-600">{card.description}</p>

              {/* Mostrar acciones si la sección tiene acciones definidas */}
              {card.actions && (
                <div className="flex flex-col gap-2 mt-6 -ml-4 w-fit">
                  {card.actions.map((action) => (
                    <Link key={action.id} to={action.route} className="block">
                      <DynamicButton size="medium" state="normal" type="button">
                        {action.title}
                      </DynamicButton>
                    </Link>
                  ))}
                </div>
              )}

              {/* Para cards sin acciones, mostrar un botón único */}
              {!card.actions && card.route && (
                <Link to={card.route} className="block mt-4">
                  <DynamicButton
                    type="view"
                    state="normal"
                    size="medium"
                    className="w-full"
                  >
                    Acceder
                  </DynamicButton>
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
