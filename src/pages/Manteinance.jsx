import React from 'react'

const MaintenancePage = () => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-lg p-8 text-center bg-white rounded-lg shadow-lg">
        <h1 className="mb-4 text-4xl font-bold text-blue-600">
          Sitio en Mantenimiento
        </h1>
        <p className="mb-6 text-xl text-gray-700">
          Estamos trabajando para mejorar nuestro sitio. ¡Volveremos pronto!
        </p>
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 border-t-4 border-blue-600 border-solid rounded-full animate-spin"></div>
        </div>
        <p className="text-lg text-gray-500">
          Mientras tanto, si necesitas ayuda, por favor{' '}
          <a
            href="mailto:soporte@tusitio.com"
            className="text-blue-600 hover:underline"
          >
            contáctanos
          </a>
          .
        </p>
      </div>
    </div>
  )
}

export default MaintenancePage
