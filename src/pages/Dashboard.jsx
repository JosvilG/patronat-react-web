import React from 'react'
import { Link } from 'react-router-dom'
import { FaHome, FaUser, FaCog, FaSignOutAlt } from 'react-icons/fa'

export default function Dashboard() {
  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      {/* Barra lateral */}
      <div className="flex-none w-64 p-4 text-white bg-gray-800">
        <h2 className="mb-6 text-2xl font-semibold">Panel de Control</h2>
        <nav>
          <ul>
            <li className="mb-4">
              <Link
                to="/"
                className="flex items-center space-x-2 hover:text-gray-300"
              >
                <FaHome /> <span>Inicio</span>
              </Link>
            </li>
            <li className="mb-4">
              <Link
                to="/profile"
                className="flex items-center space-x-2 hover:text-gray-300"
              >
                <FaUser /> <span>Perfil</span>
              </Link>
            </li>
            <li className="mb-4">
              <Link
                to="/settings"
                className="flex items-center space-x-2 hover:text-gray-300"
              >
                <FaCog /> <span>Ajustes</span>
              </Link>
            </li>
            <li className="mb-4">
              <button
                type="submit"
                className="flex items-center space-x-2 hover:text-gray-300"
              >
                <FaSignOutAlt /> <span>Cerrar Sesión</span>
              </button>
            </li>
          </ul>
        </nav>
      </div>

      {/* Contenido del Dashboard */}
      <div className="flex-1 p-8">
        <h1 className="mb-6 text-3xl font-bold">Bienvenido al Dashboard</h1>
        <p className="text-lg">Este es un panel de control básico.</p>
      </div>
    </div>
  )
}
