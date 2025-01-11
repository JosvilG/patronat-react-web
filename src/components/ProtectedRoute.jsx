import React, { useContext } from 'react'
import { Navigate } from 'react-router-dom'
import log from 'loglevel'
import PropTypes from 'prop-types'
import { AuthContext } from '../contexts/AuthContext'

function ProtectedRoute({ children }) {
  const { user } = useContext(AuthContext)

  if (!user) {
    log.info('Usuario no autenticado, redirigiendo a la página principal.')
    return <Navigate to="/" />
  }

  log.info('Acceso autorizado, mostrando el contenido protegido.')
  return children
}

ProtectedRoute.propTypes = {
  children: PropTypes.node.isRequired,
}

export default ProtectedRoute
