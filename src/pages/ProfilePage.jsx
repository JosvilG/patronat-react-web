import React, { useContext, useEffect, useState } from 'react'
import { useParams, useLocation } from 'react-router-dom'
import log from 'loglevel'
import { AuthContext } from '../contexts/AuthContext'
import { doc, getDoc, collection, getDocs } from 'firebase/firestore'
import { db } from '../firebase/firebase'
import Loader from '../components/Loader'

function ProfilePage() {
  const { userData: authUserData, loading: authLoading } =
    useContext(AuthContext)
  const [profileData, setProfileData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const { slug } = useParams()
  const location = useLocation()
  const userId = location.state?.userId

  const generateUserSlug = (firstName, lastName) => {
    const fullName = `${firstName || ''} ${lastName || ''}`.trim()
    return (
      fullName
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim() || 'usuario'
    )
  }

  useEffect(() => {
    const fetchUserData = async () => {
      setLoading(true)
      try {
        // Si tenemos el userId del state, lo usamos directamente
        if (userId) {
          const userDoc = await getDoc(doc(db, 'users', userId))
          if (userDoc.exists()) {
            setProfileData({ id: userDoc.id, ...userDoc.data() })
          } else {
            setError('Usuario no encontrado')
          }
        }
        // Si no tenemos userId pero sí un slug, buscamos por slug
        else if (slug) {
          const usersSnapshot = await getDocs(collection(db, 'users'))
          let found = false

          for (const userDoc of usersSnapshot.docs) {
            const userData = userDoc.data()
            const currentSlug = generateUserSlug(
              userData.firstName,
              userData.lastName
            )

            if (currentSlug === slug) {
              setProfileData({ id: userDoc.id, ...userData })
              found = true
              break
            }
          }

          if (!found) {
            setError('Usuario no encontrado')
          }
        }
        // Sin userId ni slug, usamos el usuario autenticado
        else {
          setProfileData(authUserData)
        }
      } catch (err) {
        log.error('Error al cargar datos del perfil:', err)
        setError('No se pudieron cargar los datos del usuario')
      } finally {
        setLoading(false)
      }
    }

    fetchUserData()
  }, [slug, userId, authUserData, authLoading])

  if (loading || authLoading) {
    return <Loader loading={true} text="Cargando perfil de usuario..." />
  }

  if (error) {
    return <div className="p-4 text-center text-red-600">{error}</div>
  }

  const userData = profileData || authUserData

  return (
    <div className="container p-6 mx-auto">
      <h1 className="mb-4 text-center t64b">Perfil de Usuario</h1>

      {userData ? (
        <div className="p-6 bg-white rounded-lg shadow-md">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <h2 className="mb-4 t24b">Información Personal</h2>
              <p className="mb-2 t16r">
                <span className="font-bold">Nombre:</span> {userData.firstName}{' '}
                {userData.lastName}
              </p>
              <p className="mb-2 t16r">
                <span className="font-bold">Correo Electrónico:</span>{' '}
                {userData.email}
              </p>
              <p className="mb-2 t16r">
                <span className="font-bold">DNI:</span> {userData.dni}
              </p>
              <p className="mb-2 t16r">
                <span className="font-bold">Teléfono:</span>{' '}
                {userData.phoneNumber}
              </p>
              <p className="mb-2 t16r">
                <span className="font-bold">Fecha de Nacimiento:</span>{' '}
                {userData.birthDate}
              </p>
              <p className="mb-2 t16r">
                <span className="font-bold">Edad:</span> {userData.age} años
              </p>
            </div>

            {userData.isStaff && (
              <div>
                <h2 className="mb-4 t24b">Información de Staff</h2>
                <p className="mb-2 t16r">
                  <span className="font-bold">Posición:</span>{' '}
                  {userData.position}
                </p>
                <p className="mb-2 t16r">
                  <span className="font-bold">Fecha de Incorporación:</span>{' '}
                  {userData.startDate}
                </p>
                {userData.endDate && (
                  <p className="mb-2 t16r">
                    <span className="font-bold">Fecha de Finalización:</span>{' '}
                    {userData.endDate}
                  </p>
                )}
                <p className="mb-2 t16r">
                  <span className="font-bold">Descripción:</span>{' '}
                  {userData.description}
                </p>

                {userData.documentUrl && (
                  <div className="mt-4">
                    <p className="mb-2 font-bold t16r">Documento:</p>
                    <a
                      href={userData.documentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700"
                    >
                      Ver Documento
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>

          {userData.createdAt && (
            <p className="mt-6 text-sm text-gray-500">
              <span className="font-bold">Fecha de Registro:</span>{' '}
              {new Date(userData.createdAt.seconds * 1000).toLocaleDateString()}
            </p>
          )}
        </div>
      ) : (
        <p>No se encontraron datos del usuario.</p>
      )}
    </div>
  )
}

export default ProfilePage
