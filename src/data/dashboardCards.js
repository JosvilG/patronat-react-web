export const cards = [
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
        title: 'Listado de Usuarios',
        route: '/users-list',
        type: 'edit',
      },
      {
        id: 'user-history',
        title: 'Historial de Usuarios',
        route: '/users-history',
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
    id: 'archivos',
    title: 'Archivos',
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
        id: 'upload-list',
        title: 'Listado de Archivos',
        route: '/upload-list',
        type: 'view',
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
