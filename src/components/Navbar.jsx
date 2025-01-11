import React, { useContext, useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getAuth, signOut } from 'firebase/auth'
import log from 'loglevel'
import { AuthContext } from '../contexts/AuthContext'

export function Navbar() {
  const { user, userData } = useContext(AuthContext)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [isDarkBackground, setIsDarkBackground] = useState(true)
  const navigate = useNavigate()
  const auth = getAuth()

  log.setLevel('info')

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

  useEffect(() => {
    const videoSection = document.getElementById('video-section')

    const options = {
      root: null,
      threshold: 0.1,
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setIsDarkBackground(true)
        } else {
          setIsDarkBackground(false)
        }
      })
    }, options)

    if (videoSection) {
      observer.observe(videoSection)
    }

    return () => {
      if (videoSection) observer.disconnect()
    }
  }, [])

  const getNavbarTextColor = () => {
    return isDarkBackground ? 'text-white' : 'text-black'
  }

  return (
    <nav
      className={`fixed top-0 left-0 z-50 w-full p-4 bg-transparent ${getNavbarTextColor()}`}
    >
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
            className={`hover:text-gray-300 ${getNavbarTextColor()}`}
            onClick={() => log.info('Navegando a la página de eventos.')}
          >
            Eventos
          </Link>
          <Link
            to="/gallery"
            className={`hover:text-gray-300 ${getNavbarTextColor()}`}
            onClick={() => log.info('Navegando a la galería.')}
          >
            Galería
          </Link>
          <Link
            to="/penas"
            className={`hover:text-gray-300 ${getNavbarTextColor()}`}
            onClick={() => log.info('Navegando a la página de Peñas.')}
          >
            Peñas
          </Link>
          <Link
            to="/about"
            className={`hover:text-gray-300 ${getNavbarTextColor()}`}
            onClick={() => log.info("Navegando a la página 'Quiénes somos'.")}
          >
            Quiénes somos
          </Link>
          {user && userData.role === 'admin' ? (
            <Link
              to="/dashboard"
              className={`hover:text-gray-300 ${getNavbarTextColor()}`}
              onClick={() => log.info('Navegando al dashboard')}
            >
              Dashboard
            </Link>
          ) : null}
        </div>

        <div className="flex items-center space-x-4">
          {!user ? (
            <Link
              to="/login"
              className={`hover:text-gray-300 ${getNavbarTextColor()}`}
              onClick={() =>
                log.info('Navegando a la página de inicio de sesión.')
              }
            >
              Iniciar Sesión
            </Link>
          ) : (
            <div className="relative">
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
                  src={
                    userData?.profilePicture || isDarkBackground
                      ? '/assets/icons/user-circle-white.svg'
                      : '/assets/icons/user-circle-black.svg'
                  }
                  alt="Perfil"
                  className="w-10 h-10 rounded-full"
                />
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 w-48 mt-2 text-gray-700 bg-white rounded-md shadow-lg">
                  <div className="py-2">
                    <Link
                      to="/profile"
                      className="block px-4 py-2 text-sm hover:bg-gray-200"
                      onClick={() =>
                        log.info('Navegando al perfil del usuario.')
                      }
                    >
                      Mi Perfil
                    </Link>
                    <Link
                      to="/settings"
                      className="block px-4 py-2 text-sm hover:bg-gray-200"
                      onClick={() =>
                        log.info('Navegando a los ajustes del usuario.')
                      }
                    >
                      Ajustes
                    </Link>
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="block w-full px-4 py-2 text-sm text-left hover:bg-gray-200"
                    >
                      Cerrar Sesión
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
