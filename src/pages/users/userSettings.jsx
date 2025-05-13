import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import i18next from 'i18next'
import {
  getAuth,
  deleteUser,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from 'firebase/auth'
import { doc, updateDoc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../../firebase/firebase'
import { useNavigate } from 'react-router-dom'
import DynamicInput from '../../components/Inputs'
import DynamicButton from '../../components/Buttons'
import { showPopup } from '../../services/popupService'
import Loader from '../../components/Loader'
// Importamos el hook de seguimiento de cambios
import useChangeTracker from '../../hooks/useModificationsRegister'

function Settings() {
  const { t } = useTranslation()
  const auth = getAuth()
  const navigate = useNavigate()
  const [selectedLanguage, setSelectedLanguage] = useState(
    localStorage.getItem('language') || 'es'
  )
  const [emailNotifications, setEmailNotifications] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)
  const viewDictionary = 'pages.settings'
  const [initialUserData, setInitialUserData] = useState(null)

  // Inicializar el hook de seguimiento de cambios
  const { trackDeletion, isTracking } = useChangeTracker({
    tag: 'users',
    entityType: 'user',
  })

  // Cargar configuraciones existentes del usuario
  useEffect(() => {
    const loadUserSettings = async () => {
      if (!auth.currentUser) return

      setLoading(true)
      try {
        const userDocRef = doc(db, 'users', auth.currentUser.uid)
        const userDoc = await getDoc(userDocRef)

        if (userDoc.exists()) {
          const userData = userDoc.data()
          setInitialUserData(userData)

          // Cargar configuración de notificaciones
          if ('emailNotifications' in userData) {
            setEmailNotifications(userData.emailNotifications)
          }

          // Cargar preferencia de idioma
          if ('preferredLanguage' in userData) {
            const lang = userData.preferredLanguage
            setSelectedLanguage(lang)
            i18next.changeLanguage(lang)
            localStorage.setItem('language', lang)
          }
        }
      } catch (error) {
        return
      } finally {
        setLoading(false)
      }
    }

    loadUserSettings()
  }, []) // Eliminamos la dependencia auth.currentUser para evitar bucles de renderizado innecesarios

  // Actualizar el manejador de cambio de idioma
  const handleLanguageChange = (event) => {
    const lang = event.target.value
    setSelectedLanguage(lang)
    i18next.changeLanguage(lang)
    localStorage.setItem('language', lang)
  }

  // Guardar configuraciones en Firestore
  const handleSaveSettings = async () => {
    if (!auth.currentUser) {
      showPopup({
        title: t('common.error', 'Error'),
        text: t('common.notAuthenticated', 'No estás autenticado'),
        icon: 'error',
      })
      return
    }

    setSaving(true)
    try {
      const userDocRef = doc(db, 'users', auth.currentUser.uid)

      // Verificar si el documento existe
      const userDoc = await getDoc(userDocRef)
      const userExists = userDoc.exists()
      const userData = userExists ? userDoc.data() : {}

      // Datos a actualizar (preferencias personales)
      const updateData = {
        emailNotifications: emailNotifications,
        preferredLanguage: selectedLanguage,
        modifiedAt: new Date(),
      }

      // Verificar si hay cambios reales antes de guardar
      const hasLanguageChange = userData.preferredLanguage !== selectedLanguage
      const hasEmailNotificationsChange =
        userData.emailNotifications !== emailNotifications

      if (!hasLanguageChange && !hasEmailNotificationsChange) {
        showPopup({
          title: t('common.info', 'Información'),
          text: t('common.noChanges', 'No se detectaron cambios'),
          icon: 'info',
        })
        setSaving(false)
        return
      }

      // Si el documento existe, actualizarlo. Si no, crearlo.
      if (userExists) {
        await updateDoc(userDocRef, updateData)
      } else {
        // Crear documento con campos mínimos si no existe
        await setDoc(userDocRef, {
          ...updateData,
          email: auth.currentUser.email,
          createdAt: new Date(),
        })
      }

      // Solo mostramos mensaje de éxito, sin tracking para estas preferencias personales
      showPopup({
        title: t(
          `${viewDictionary}.successPopup.title`,
          'Actualización exitosa'
        ),
        text: t(
          `${viewDictionary}.successPopup.text`,
          'Las configuraciones han sido actualizadas correctamente'
        ),
        icon: 'success',
      })
    } catch (error) {
      showPopup({
        title: t(`${viewDictionary}.errorPopup.title`, 'Error'),
        text: t(
          `${viewDictionary}.errorPopup.text`,
          'Hubo un error al guardar las configuraciones'
        ),
        icon: 'error',
      })
    } finally {
      setSaving(false)
    }
  }

  // Eliminar cuenta de usuario
  const handleConfirmDelete = async () => {
    if (!auth.currentUser || !confirmPassword) {
      return
    }

    setSaving(true)
    try {
      // Reautenticar al usuario antes de eliminar la cuenta
      const credential = EmailAuthProvider.credential(
        auth.currentUser.email,
        confirmPassword
      )

      await reauthenticateWithCredential(auth.currentUser, credential)

      // Obtener una copia de los datos del usuario antes de eliminarlo
      const userDocRef = doc(db, 'users', auth.currentUser.uid)
      const userDoc = await getDoc(userDocRef)
      const userData = userDoc.exists() ? userDoc.data() : {}
      const userId = auth.currentUser.uid
      const userEmail = auth.currentUser.email

      // Registrar la eliminación antes de borrar la cuenta
      // Usamos un ID temporal para el modificador ya que la cuenta se va a eliminar
      const tempModifierId = userId
      const entityName =
        userData.firstName && userData.lastName
          ? `${userData.firstName} ${userData.lastName}`
          : userEmail

      // Registrar la eliminación
      await trackDeletion({
        entityId: userId,
        entityData: userData,
        modifierId: tempModifierId,
        entityName,
        sensitiveFields: ['password', 'dni'],
        onSuccess: async () => {
          // Una vez registrado el cambio, eliminamos al usuario
          await deleteUser(auth.currentUser)

          showPopup({
            title: t(
              `${viewDictionary}.deleteSuccess.title`,
              'Cuenta eliminada'
            ),
            text: t(
              `${viewDictionary}.deleteSuccess.text`,
              'Tu cuenta ha sido eliminada correctamente'
            ),
            icon: 'success',
          })

          navigate('/')
        },
        onError: async (error) => {
          // Aún así intentamos eliminar al usuario
          await deleteUser(auth.currentUser)

          showPopup({
            title: t(
              `${viewDictionary}.deleteSuccess.title`,
              'Cuenta eliminada'
            ),
            text: t(
              'common.accountDeletedNoLog',
              'Tu cuenta ha sido eliminada, pero hubo un problema al registrar la acción'
            ),
            icon: 'warning',
          })

          navigate('/')
        },
      })
    } catch (error) {
      let errorMessage = t(
        `${viewDictionary}.deleteError.defaultText`,
        'No se pudo eliminar tu cuenta. Por favor, inténtalo de nuevo.'
      )
      if (error.code === 'auth/wrong-password') {
        errorMessage = t(
          `${viewDictionary}.deleteError.wrongPassword`,
          'La contraseña ingresada es incorrecta.'
        )
      } else if (error.code === 'auth/requires-recent-login') {
        errorMessage = t(
          `${viewDictionary}.deleteError.recentLogin`,
          'Por motivos de seguridad, debes iniciar sesión nuevamente antes de eliminar tu cuenta.'
        )
      }

      showPopup({
        title: t(`${viewDictionary}.deleteError.title`, 'Error al eliminar'),
        text: errorMessage,
        icon: 'error',
      })
    } finally {
      setSaving(false)
      setConfirmPassword('')
    }
  }

  // Resto del código sin cambios...

  return (
    <div className="h-auto pb-6 mx-auto text-center max-w-fit">
      <Loader loading={saving || isTracking} />
      <h1 className="mb-4 t64b">
        {t(`${viewDictionary}.title`, 'Configuración de cuenta')}
      </h1>
      <form className="flex flex-col items-center space-y-4">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-4 min-w-max">
          {/* Nueva sección para preferencias de usuario */}
          <div className="flex flex-col items-center col-span-2 mb-4">
            <div className="grid items-center w-full grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-8">
              {/* Preferencia de idioma */}
              <div className="flex flex-col items-center">
                <DynamicInput
                  name="language"
                  type="select"
                  textId={`${viewDictionary}.languageSection.title`}
                  options={[
                    { value: 'en', label: 'English' },
                    { value: 'es', label: 'Español' },
                    { value: 'cat', label: 'Català' },
                  ]}
                  value={selectedLanguage}
                  onChange={(e) => handleLanguageChange(e)}
                  disabled={saving || isTracking}
                />
              </div>

              {/* Notificaciones por correo */}
              <div className="flex flex-col items-center">
                <div className="flex items-center justify-center space-x-2">
                  <DynamicInput
                    name="emailNotifications"
                    type="checkbox"
                    textId={`${viewDictionary}.notificationsSection.emailToggle`}
                    checked={emailNotifications}
                    onChange={(e) => setEmailNotifications(e.target.checked)}
                    disabled={saving || isTracking}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Botón guardar configuraciones */}
        <div className="flex justify-center w-full mt-8">
          <DynamicButton
            size="medium"
            state={saving || isTracking ? 'disabled' : 'normal'}
            type={saving || isTracking ? 'loading' : 'save'}
            textId={`${viewDictionary}.saveButton`}
            onClick={handleSaveSettings}
            disabled={saving || isTracking}
          />
        </div>

        {isTracking && (
          <p className="mt-2 text-sm text-center text-gray-600">
            {t(
              'pages.users.listUsers.trackingChanges',
              'Registrando cambios...'
            )}
          </p>
        )}
      </form>

      {/* Sección para eliminar cuenta */}
      <div className="p-8 mt-12 mb-6 bg-white rounded-lg shadow-md">
        <h2 className="mb-4 text-red-600 t24b">
          {t(`${viewDictionary}.deleteSection.title`, 'Eliminar cuenta')}
        </h2>
        <p className="mb-6 text-gray-600">
          {t(
            `${viewDictionary}.deleteSection.description`,
            'Esta acción eliminará permanentemente tu cuenta y todos tus datos asociados. Esta acción no se puede deshacer.'
          )}
        </p>

        {!showDeleteConfirmation ? (
          <div className="flex justify-center">
            <DynamicButton
              size="medium"
              state="normal"
              type="delete"
              textId={`${viewDictionary}.deleteSection.showConfirmButton`}
              onClick={() => setShowDeleteConfirmation(true)}
              disabled={saving || isTracking}
            />
          </div>
        ) : (
          <div className="p-6 border border-red-300 rounded-md bg-red-50">
            <p className="mb-4 text-red-700">
              {t(
                `${viewDictionary}.deleteSection.confirmationText`,
                'Por favor, introduce tu contraseña para confirmar la eliminación de tu cuenta. Esta acción es permanente y no podrá revertirse.'
              )}
            </p>

            <DynamicInput
              name="confirmPassword"
              type="password"
              textId={`${viewDictionary}.deleteSection.passwordLabel`}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={saving || isTracking}
            />

            <div className="flex flex-wrap justify-center gap-4 mt-4">
              {/* Botón Cancelar */}
              <DynamicButton
                size="small"
                state="normal"
                type="cancel"
                textId={`${viewDictionary}.deleteSection.cancelButton`}
                onClick={() => {
                  setShowDeleteConfirmation(false)
                  setConfirmPassword('')
                }}
                disabled={saving || isTracking}
              />

              {/* Botón Confirmar Eliminación */}
              <DynamicButton
                size="small"
                state={
                  saving || isTracking || !confirmPassword
                    ? 'disabled'
                    : 'normal'
                }
                type="delete"
                textId={`${viewDictionary}.deleteSection.confirmButton`}
                onClick={handleConfirmDelete}
                disabled={saving || isTracking || !confirmPassword}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Settings
