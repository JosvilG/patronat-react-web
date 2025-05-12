import React, { useContext } from 'react'
import { Navigate } from 'react-router-dom'
import PropTypes from 'prop-types'
import { AuthContext } from '../contexts/AuthContext'

function ProtectedRoute({ children }) {
  const { user } = useContext(AuthContext)

  if (!user) {
    return <Navigate to="/" />
  }

  return children
}

ProtectedRoute.propTypes = {
  children: PropTypes.node.isRequired,
}

export default ProtectedRoute
