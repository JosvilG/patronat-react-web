import React, { useContext, useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getAuth, signOut } from 'firebase/auth'
import log from 'loglevel'
import { useTranslation } from 'react-i18next'
import { AuthContext } from '../contexts/AuthContext'

export function Navbar() {
  const { t } = useTranslation()
  const { user, userData } = useContext(AuthContext)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const navigate = useNavigate()
  const auth = getAuth()
  const dropdownRef = useRef(null)

  log.setLevel('info')

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleSignOut = async () => {
    try {
      log.info('Intentando cerrar sesión...')
      await signOut(auth)
      log.info('Cierre de sesión exitoso, redirigiendo a la página principal.')
      navigate('/')
    } catch (err) {
      log.error('Error al cerrar sesión:', err)
    }
  }

  return (
    <nav className="top-0 left-0 z-50 w-full p-4 text-black bg-transparent">
      <div className="flex items-center justify-between mx-auto max-w-7xl">
        <div className="flex items-center">
          <Link to="/">
            <img
              src="/assets/logos/Patronat_color_1024x1024.webp"
              alt="Logo"
              className="h-24"
            />
          </Link>
        </div>

        <div className="flex justify-center flex-grow space-x-8">
          <Link
            to="/events"
            className="text-black hover:text-gray-300"
            onClick={() => log.info('Navegando a la página de eventos.')}
          >
            {t('components.navbar.eventTitle')}
          </Link>
          <Link
            to="/gallery"
            className="text-black hover:text-gray-300"
            onClick={() => log.info('Navegando a la galería.')}
          >
            {t('components.navbar.galeryTitle')}
          </Link>
          <Link
            to="/penas"
            className="text-black hover:text-gray-300"
            onClick={() => log.info('Navegando a la página de Peñas.')}
          >
            {t('components.navbar.crewTitle')}
          </Link>
          <Link
            to="/about"
            className="text-black hover:text-gray-300"
            onClick={() => log.info("Navegando a la página 'Quiénes somos'.")}
          >
            {t('components.navbar.whoWeAreTitle')}
          </Link>
          {user && userData.role === 'admin' && (
            <Link
              to="/dashboard"
              className="text-black hover:text-gray-300"
              onClick={() => log.info('Navegando al dashboard')}
            >
              {t('components.navbar.dashboardTitle')}
            </Link>
          )}
        </div>

        <div className="flex items-center space-x-4">
          {!user ? (
            <Link
              to="/login"
              className="text-black hover:text-gray-300"
              onClick={() =>
                log.info('Navegando a la página de inicio de sesión.')
              }
            >
              {t('components.navbar.loginTitle')}
            </Link>
          ) : (
            <div className="relative z-50">
              <button
                type="button"
                onClick={() => {
                  setDropdownOpen(!dropdownOpen)
                  log.info(
                    `Menú desplegable ${dropdownOpen ? 'cerrado' : 'abierto'}.`
                  )
                }}
                className="flex items-center"
              >
                <img
                  src="/assets/icons/user-circle-black.svg"
                  alt="Perfil"
                  className="w-10 h-10 rounded-full"
                />
              </button>

              {dropdownOpen && (
                <div
                  ref={dropdownRef}
                  className="absolute right-0 w-48 mt-2 text-gray-700 bg-white rounded-md shadow-lg"
                >
                  <div className="py-2">
                    <Link
                      to="/profile"
                      className="block px-4 py-2 text-sm hover:bg-gray-200"
                      onClick={() =>
                        log.info('Navegando al perfil del usuario.')
                      }
                    >
                      {t('components.navbar.profileTitle')}
                    </Link>
                    <Link
                      to="/settings"
                      className="block px-4 py-2 text-sm hover:bg-gray-200"
                      onClick={() =>
                        log.info('Navegando a los ajustes del usuario.')
                      }
                    >
                      {t('components.navbar.settingsTitle')}
                    </Link>
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="block w-full px-4 py-2 text-sm text-left hover:bg-gray-200"
                    >
                      {t('components.navbar.signOutTitle')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
