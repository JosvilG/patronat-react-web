import React, { useContext, useEffect } from 'react'
import log from 'loglevel'
import { AuthContext } from '../contexts/AuthContext'

function ProfilePage() {
  const { userData, loading } = useContext(AuthContext)

  useEffect(() => {
    if (loading) {
      log.info('Cargando datos del usuario...')
    }
  }, [loading])

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div className="container p-6 mx-auto">
      <h1 className="mb-4 text-2xl font-bold">Perfil de Usuario</h1>

      {userData ? (
        <div>
          <p>
            <strong>Nombre:</strong> {userData.firstName} {userData.lastName}
          </p>
          <p>
            <strong>Correo Electrónico:</strong> {userData.email}
          </p>
          <p>
            <strong>Teléfono:</strong> {userData.phoneNumber}
          </p>
          <p>
            <strong>Fecha de Nacimiento:</strong> {userData.birthDate}
          </p>
          <p>
            <strong>Fecha de Registro:</strong>{' '}
            {new Date(userData.createdAt.seconds * 1000).toLocaleDateString()}
          </p>
        </div>
      ) : (
        <p>No se encontraron datos del usuario.</p>
      )}
    </div>
  )
}

export default ProfilePage
