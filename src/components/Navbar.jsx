import React, { useContext, useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import log from 'loglevel'
import { useTranslation } from 'react-i18next'
import { AuthContext } from '../contexts/AuthContext'
import MenuIcon from '@mui/icons-material/Menu'
import { useSignOut } from '../hooks/signOut'
import { useOutsideClick } from '../hooks/useOutSideClickListener'
import { useResizeListener } from '../hooks/useResizeListener'
import { motion } from 'framer-motion'
import PropTypes from 'prop-types'
import useSlug from '../hooks/useSlug'

const navLinksData = [
  { to: '/events-list', label: 'components.navbar.eventTitle' },
  { to: '/gallery', label: 'components.navbar.galeryTitle' },
  { to: '/crews', label: 'components.navbar.crewTitle' },
  { to: '/about', label: 'components.navbar.whoWeAreTitle' },
  { to: '/partner-form', label: 'components.navbar.partnersTitle' },
]

// Estilo común para botones y enlaces en todos los menús
const commonMenuItemStyle =
  't12s flex px-4 py-2 w-full text-sm transition duration-300 ease-in-out mb-1 rounded-[27px] justify-center backdrop-blur-lg backdrop-saturate-[180%] hover:text-[#D9D9D9] bg-[rgba(255,255,255,0.75)] active:bg-gray-300 shadow-[0px_4px_4px_rgba(0,0,0,0.4)]'

const NavLink = ({ to, label, onClick, isSmallScreen }) => {
  // Si es pantalla pequeña, usar el estilo común del menú desplegable
  const baseClass = isSmallScreen
    ? commonMenuItemStyle
    : 'flex items-center px-4 py-2 rounded-[27px] transition duration-300 ease-in-out'

  const linkClass = isSmallScreen
    ? ''
    : 'text-[#1E1E1E] hover:text-[#D9D9D9] active:text-[#D9D9D9]'

  return (
    <div
      className={`h-auto min-h-[39px] flex flex-col justify-center items-center w-full ${isSmallScreen ? 'mb-2' : ''}`}
    >
      <Link
        to={to}
        className={`${baseClass} ${linkClass} ${isSmallScreen ? 'w-full' : 'w-auto'}`}
        onClick={onClick}
      >
        {label}
      </Link>
    </div>
  )
}

const MobileMenuButton = ({ onClick }) => (
  <button
    className="absolute pr-4 mt-6 focus:outline-none right-8"
    onClick={onClick}
  >
    <div className="flex justify-center items-center w-11 h-11 bg-[#3A3A3A] text-white hover:text-[#3A3A3A] hover:bg-gray-200 active:text-[#3A3A3A] active:bg-gray-300 rounded-[12px] shadow-[0px_4px_4px_rgba(0,0,0,0.4)]">
      <MenuIcon fontSize="medium" />
    </div>
  </button>
)

const DropdownMenu = ({ items, onClose }) => (
  <motion.div
    initial={{ opacity: 0, y: -20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    transition={{ duration: 0.3 }}
    className="absolute right-0 w-48 mt-2 bg-transparent rounded-md"
  >
    <div className="py-2">
      {items.map((item, index) =>
        item.isButton ? (
          <button
            key={index}
            onClick={() => {
              item.onClick()
              onClose()
            }}
            className={commonMenuItemStyle}
          >
            {item.label}
          </button>
        ) : item.onClick ? (
          <button
            key={index}
            onClick={() => {
              item.onClick()
              onClose()
            }}
            className={commonMenuItemStyle}
          >
            {item.label}
          </button>
        ) : (
          <Link
            key={index}
            to={item.to}
            className={commonMenuItemStyle}
            onClick={() => {
              onClose()
            }}
          >
            {item.label}
          </Link>
        )
      )}
    </div>
  </motion.div>
)

export function Navbar() {
  const handleSignOut = useSignOut()
  const { t } = useTranslation()
  const { user, userData } = useContext(AuthContext)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const isSmallScreen = useResizeListener()
  const dropdownRef = useRef(null)
  const mobileMenuRef = useRef(null)
  const navigate = useNavigate()
  const { generateSlug } = useSlug()

  log.setLevel('info')

  useOutsideClick(mobileMenuRef, () => setMobileMenuOpen(false))
  useOutsideClick(dropdownRef, () => !isSmallScreen && setDropdownOpen(false))
  const navigateToProfile = () => {
    if (userData) {
      const userId = userData.id || user.uid
      if (!userId) return

      const fullName =
        `${userData.firstName || ''} ${userData.lastName || ''}`.trim()
      const slug = fullName
        ? `${generateSlug(fullName)}-${userId.slice(0, 8)}`
        : userId

      navigate(`/profile/${slug}`, { state: { userId } })
      setDropdownOpen(false)
    }
  }

  const navLinks = navLinksData.map((link) => ({
    ...link,
    label: t(link.label),
  }))

  const renderNavLinks = () =>
    navLinks.map((link, index) => (
      <NavLink key={index} {...link} isSmallScreen={isSmallScreen} />
    ))

  return (
    <nav className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-gradient-to-b from-white to-95%">
      <div className="flex items-center ml-8">
        <Link to="/">
          <img
            src="/assets/logos/Patronat_color_1024x1024.webp"
            alt="Logo"
            className="mr-2 w-28 h-28 sm:w-28 sm:h-28 md:w-36 md:h-36 lg:w-36 lg:h-36"
          />
        </Link>
      </div>

      {!isSmallScreen && (
        <div className="t16r flex h-auto min-h-[41px] items-center max-w-[605px] w-full justify-center px-2 text-[#D9D9D9] backdrop-blur-lg backdrop-saturate-[180%] bg-[rgba(255,255,255,0.75)] rounded-full transition duration-300 shadow-[0px_4px_4px_rgba(0,0,0,0.4)]">
          {renderNavLinks()}
        </div>
      )}

      {isSmallScreen ? (
        <MobileMenuButton onClick={() => setMobileMenuOpen(!mobileMenuOpen)} />
      ) : (
        !user && (
          <Link
            to="/login"
            className="t16s px-6 py-2 t16b text-white bg-[#3A3A3A] rounded-full hover:bg-[#D9D9D9] hover:text-gray-900 transition duration-300 ease-in-out active:bg-[#D9D9D9] shadow-[0px_4px_4px_rgba(0,0,0,0.4)]"
          >
            {t('components.navbar.loginTitle')}
          </Link>
        )
      )}

      {isSmallScreen && mobileMenuOpen && (
        <motion.div
          ref={mobileMenuRef}
          className="absolute right-0 flex flex-col items-center w-[98%] h-auto bg-transparent rounded-lg mt-80 px-4 py-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.3 }}
        >
          {/* Para dispositivos móviles, ahora usamos botones y enlaces con el mismo estilo que el menú desplegable */}
          {navLinks.map((link, index) => (
            <Link
              key={index}
              to={link.to}
              className={commonMenuItemStyle}
              onClick={() => setMobileMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}

          {!user ? (
            <Link
              to="/login"
              className={commonMenuItemStyle}
              onClick={() => setMobileMenuOpen(false)}
            >
              {t('components.navbar.loginTitle')}
            </Link>
          ) : (
            <>
              <button
                onClick={() => {
                  navigateToProfile()
                  setMobileMenuOpen(false)
                }}
                className={commonMenuItemStyle}
              >
                {t('components.navbar.profileTitle')}
              </button>

              {userData?.role === 'admin' && (
                <Link
                  to="/dashboard"
                  className={commonMenuItemStyle}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t('components.navbar.dashboardTitle')}
                </Link>
              )}

              <button
                onClick={async () => {
                  await handleSignOut()
                  setMobileMenuOpen(false)
                }}
                className={commonMenuItemStyle}
              >
                {t('components.navbar.signOutTitle')}
              </button>
            </>
          )}
        </motion.div>
      )}

      {user && !isSmallScreen && (
        <div
          className="relative z-50 hidden md:block mr-[90px]"
          ref={dropdownRef}
        >
          <button
            type="button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center"
          >
            <img
              src="/assets/icons/user-circle-black.svg"
              alt="Perfil"
              className="w-10 h-10 rounded-full shadow-[0px_4px_4px_rgba(0,0,0,0.4)]"
            />
          </button>
          {dropdownOpen && userData && (
            <DropdownMenu
              items={[
                {
                  label: t('components.navbar.profileTitle'),
                  onClick: navigateToProfile,
                },
                {
                  to: '/settings',
                  label: t('components.navbar.settingsTitle'),
                },
                userData?.role === 'admin' && {
                  to: '/dashboard',
                  label: t('components.navbar.dashboardTitle'),
                },
                {
                  label: t('components.navbar.signOutTitle'),
                  onClick: handleSignOut,
                  isButton: true,
                },
              ].filter(Boolean)}
              onClose={() => setDropdownOpen(false)}
            />
          )}
        </div>
      )}
    </nav>
  )
}

NavLink.propTypes = {
  to: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  onClick: PropTypes.func,
  isSmallScreen: PropTypes.bool.isRequired,
}

DropdownMenu.propTypes = {
  items: PropTypes.arrayOf(
    PropTypes.shape({
      to: PropTypes.string,
      label: PropTypes.string.isRequired,
      onClick: PropTypes.func,
      isButton: PropTypes.bool,
    })
  ).isRequired,
  onClose: PropTypes.func.isRequired,
}

MobileMenuButton.propTypes = {
  onClick: PropTypes.func.isRequired,
}
