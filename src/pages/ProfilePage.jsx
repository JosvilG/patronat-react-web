import React, { useContext, useEffect, useState } from 'react'
import { useParams, useLocation } from 'react-router-dom'
import log from 'loglevel'
import { AuthContext } from '../contexts/AuthContext'
import { doc, getDoc, collection, getDocs } from 'firebase/firestore'
import { db } from '../firebase/firebase'
import Loader from '../components/Loader'
import { useTranslation } from 'react-i18next'
import useSlug from '../hooks/useSlug'
import DynamicButton from '../components/Buttons'

function ProfilePage() {
  const { userData: authUserData, loading: authLoading } =
    useContext(AuthContext)
  const [profileData, setProfileData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const { slug } = useParams()
  const location = useLocation()
  const userId = location.state?.userId
  const { t } = useTranslation()
  const viewDictionary = 'pages.users.userProfile'
  const { generateSlug } = useSlug()

  useEffect(() => {
    if (authLoading) return

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
            const fullName =
              `${userData.firstName || ''} ${userData.lastName || ''}`.trim()
            const currentSlug = generateSlug(fullName) || 'usuario'

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
    return (
      <Loader
        loading={true}
        text={t(`${viewDictionary}.loading`, 'Cargando perfil de usuario...')}
      />
    )
  }

  if (error) {
    return (
      <div className="p-4 text-center text-red-600">
        {t(`${viewDictionary}.${error}`, error)}
      </div>
    )
  }

  const userData = profileData || authUserData

  return (
    <div className="container pb-6 mx-auto sm:max-w-none max-w-[300px]">
      <h1 className="mb-4 text-center sm:t64b t24b">
        {t(`${viewDictionary}.title`, 'Perfil de Usuario')}
      </h1>

      {userData ? (
        <div className="p-6 space-y-4 bg-[#D9D9D9] rounded-[60px] h-fit  mb-8 text-black backdrop-blur-lg backdrop-saturate-[180%] bg-[rgba(255,255,255,0.75)]">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <h2 className="mb-4 t24b">
                {t(
                  `${viewDictionary}.personalInformation.title`,
                  'Información Personal'
                )}
              </h2>
              <p className="mb-2 t16r">
                <span className="font-bold">
                  {t(`${viewDictionary}.personalInformation.name`, 'Nombre:')}
                </span>{' '}
                {userData.firstName} {userData.lastName}
              </p>
              <p className="mb-2 t16r">
                <span className="font-bold">
                  {t(
                    `${viewDictionary}.personalInformation.email`,
                    'Correo Electrónico:'
                  )}
                </span>{' '}
                {userData.email}
              </p>
              <p className="mb-2 t16r">
                <span className="font-bold">
                  {t(`${viewDictionary}.personalInformation.dni`, 'DNI:')}
                </span>{' '}
                {userData.dni}
              </p>
              <p className="mb-2 t16r">
                <span className="font-bold">
                  {t(
                    `${viewDictionary}.personalInformation.phoneNumber`,
                    'Teléfono:'
                  )}
                </span>{' '}
                {userData.phoneNumber}
              </p>
              <p className="mb-2 t16r">
                <span className="font-bold">
                  {t(
                    `${viewDictionary}.personalInformation.birthDate`,
                    'Fecha de Nacimiento:'
                  )}
                </span>{' '}
                {userData.birthDate}
              </p>
              <p className="mb-2 t16r">
                <span className="font-bold">
                  {t(`${viewDictionary}.personalInformation.age`, 'Edad:')}
                </span>{' '}
                {userData.age} años
              </p>
            </div>

            {userData.isStaff && (
              <div>
                <h2 className="mb-4 t24b">
                  {t(
                    `${viewDictionary}.staffInformation.title`,
                    'Información de Staff'
                  )}
                </h2>
                <p className="mb-2 t16r">
                  <span className="font-bold">
                    {t(
                      `${viewDictionary}.staffInformation.position`,
                      'Posición:'
                    )}
                  </span>{' '}
                  {userData.position}
                </p>
                <p className="mb-2 t16r">
                  <span className="font-bold">
                    {t(
                      `${viewDictionary}.staffInformation.startDate`,
                      'Fecha de Incorporación:'
                    )}
                  </span>{' '}
                  {userData.startDate}
                </p>
                {userData.endDate && (
                  <p className="mb-2 t16r">
                    <span className="font-bold">
                      {t(
                        `${viewDictionary}.staffInformation.endDate`,
                        'Fecha de Finalización:'
                      )}
                    </span>{' '}
                    {userData.endDate}
                  </p>
                )}
                <p className="mb-2 t16r">
                  <span className="font-bold">
                    {t(
                      `${viewDictionary}.staffInformation.description`,
                      'Descripción:'
                    )}
                  </span>{' '}
                  {userData.description}
                </p>
                {userData.documentUrl && (
                  <div className="mt-4">
                    <p className="mb-2 font-bold t16r">
                      {t(
                        `${viewDictionary}.staffInformation.document`,
                        'Documento:'
                      )}
                    </p>
                    <DynamicButton
                      size="medium"
                      state="normal"
                      type="download"
                      textId={`${viewDictionary}.staffInformation.viewDocument`}
                      onClick={() =>
                        window.open(userData.documentUrl, '_blank')
                      }
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {userData.preferredLanguage && (
            <div className="mt-6">
              <h2 className="mb-4 t24b">
                {t(
                  `${viewDictionary}.preferences.title`,
                  'Preferencias de Usuario'
                )}
              </h2>
              <p className="mb-2 t16r">
                <span className="font-bold">
                  {t(
                    `${viewDictionary}.preferences.language`,
                    'Idioma preferido:'
                  )}
                </span>{' '}
                {userData.preferredLanguage === 'es'
                  ? 'Español'
                  : userData.preferredLanguage === 'cat'
                    ? 'Català'
                    : 'English'}
              </p>
              <p className="mb-2 t16r">
                <span className="font-bold">
                  {t(
                    `${viewDictionary}.preferences.notifications`,
                    'Notificaciones por correo:'
                  )}
                </span>{' '}
                {userData.emailNotifications
                  ? t(`${viewDictionary}.preferences.enabled`, 'Activadas')
                  : t(`${viewDictionary}.preferences.disabled`, 'Desactivadas')}
              </p>
            </div>
          )}

          {userData.createdAt && (
            <p className="mt-6 text-sm text-gray-500">
              <span className="font-bold">
                {t(
                  `${viewDictionary}.accountInformation.registrationDate`,
                  'Fecha de Registro:'
                )}
              </span>{' '}
              {new Date(userData.createdAt.seconds * 1000).toLocaleDateString()}
            </p>
          )}
        </div>
      ) : (
        <p>
          {t(
            `${viewDictionary}.notFound`,
            'No se encontraron datos del usuario.'
          )}
        </p>
      )}
    </div>
  )
}

export default ProfilePage
