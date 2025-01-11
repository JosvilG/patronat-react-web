import React from 'react'

export function EventCard() {
  return (
    <div className="overflow-hidden bg-white rounded-lg shadow-lg">
      <div className="h-48 bg-gray-300" />
      <div className="p-4">
        <h3 className="text-xl font-semibold">Evento de Ejemplo</h3>
        <p className="mt-2 text-gray-600">
          Descripción breve del evento. Más detalles sobre lo que ocurrirá.
        </p>
      </div>
    </div>
  )
}
