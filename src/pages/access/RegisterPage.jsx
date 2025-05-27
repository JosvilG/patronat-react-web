import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth'
import log from 'loglevel'
import { doc, setDoc, Timestamp } from 'firebase/firestore'
import { motion } from 'framer-motion'
import { createUserModel } from '../../models/usersData'
import { db } from '../../firebase/firebase'
import { useTranslation } from 'react-i18next'
import DynamicInput from '../../components/Inputs'
import DynamicButton from '../../components/Buttons'
import useTaggedImage from '../../hooks/useTaggedImage'
import usePointerAnimation from '../../hooks/usePointerAnimation'

import useChangeTracker from '../../hooks/useModificationsRegister'

function RegisterPage() {
  const navigate = useNavigate()
  const auth = getAuth()
  const [formData, setFormData] = useState(createUserModel())
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [age, setAge] = useState(null)
  const { t } = useTranslation()
  const viewDictionary = 'pages.userRegister'

  const { trackCreation, isTracking } = useChangeTracker({
    tag: 'users',
    entityType: 'user',
  })

  const { moveX, moveY, handleMouseMove } = usePointerAnimation()
  const { backgroundImage, imageLoaded, handleImageLoad, handleImageError } =
    useTaggedImage('login', '/images/default-login.jpg')

  const calculateAge = (birthDate) => {
    if (!birthDate) return null
    const birth = new Date(birthDate)
    const today = new Date()
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birth.getDate())
    ) {
      age--
    }
    return age
  }

  const handleChange = (name, value) => {
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }))

    if (name === 'birthDate') {
      const calculatedAge = calculateAge(value)
      setAge(calculatedAge)
      setFormData((prevData) => ({
        ...prevData,
        age: calculatedAge,
      }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      )
      const { user } = userCredential

      const userData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        phoneNumber: formData.phoneNumber,
        age: formData.age,
        birthDate: formData.birthDate,
        dni: formData.dni,
        email: formData.email,
        createdAt: Timestamp.fromDate(new Date()),
        modifiedAt: Timestamp.fromDate(new Date()),
        role: 'user',
      }

      await setDoc(doc(db, 'users', user.uid), userData)

      await trackCreation({
        entityId: user.uid,
        entityData: userData,
        modifierId: user.uid,
        entityName: `${userData.firstName} ${userData.lastName}`,
        sensitiveFields: ['password', 'dni'],
        onSuccess: () => {
          navigate('/')
        },
        onError: (error) => {
          log.warn('Usuario creado pero error al registrar cambios:', error)
          navigate('/')
        },
      })
    } catch (err) {
      log.error('Error al crear cuenta:', err)
      setError(
        err.code === 'auth/email-already-in-use'
          ? t(
              'common.errorMessages.emailInUse',
              'Este correo electrónico ya está registrado'
            )
          : t(
              'common.errorMessages.genericRegistration',
              'Hubo un error al crear tu cuenta. Por favor, intenta de nuevo.'
            )
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="items-center mx-auto bg-center bg-cover sm:h-screen sm:grid max-sm:mt-40 min-h-fit sm:grid-cols-1 justify-items-center sm:px-6 lg:px-8">
      <div className="relative rounded-lg md:p-8 sm:p-4 grid-col-3 w-fit h-fit bottom-20 max-sm:max-w-[373px] z-10">
        <div className="flex flex-col items-center max-w-lg pb-4 mx-auto text-center sm:pb-0 sm:flex-none">
          <h1 className="text-black t24b sm:t40b">
            {t(`${viewDictionary}.title`)}
          </h1>
          <p className="mt-4 text-black t16r whitespace-break-spaces max-w-[300px] sm:max-w-none">
            {t(`${viewDictionary}.description`)}
          </p>
        </div>
        {error && <p className="mb-4 text-center text-red-500">{error}</p>}
        <form
          onSubmit={handleSubmit}
          className="max-sm:flex max-sm:flex-col max-sm:items-center"
        >
          <DynamicInput
            name="firstName"
            type="text"
            textId={`${viewDictionary}.name`}
            value={formData.firstName}
            onChange={(e) => handleChange('firstName', e.target.value)}
            required
          />
          <DynamicInput
            name="lastName"
            type="text"
            value={formData.lastName}
            textId={`${viewDictionary}.surname`}
            onChange={(e) => handleChange('lastName', e.target.value)}
            required
          />
          <DynamicInput
            name="phoneNumber"
            type="phone"
            value={formData.phoneNumber}
            textId={`${viewDictionary}.phone`}
            onChange={(e) => handleChange('phoneNumber', e.target.value)}
            required
          />
          <div className="flex flex-col items-center sm:justify-between max-sm:w-[373px]">
            <DynamicInput
              name="birthDate"
              type="date"
              value={formData.birthDate}
              textId={`${viewDictionary}.birthDate`}
              onChange={(e) => handleChange('birthDate', e.target.value)}
              required
            />
            {age !== null && (
              <span className="relative text-black t24b right-12 top-3 max-sm:right-4">
                {age} años
              </span>
            )}
          </div>
          <DynamicInput
            name="dni"
            type="dni"
            value={formData.dni}
            textId={`${viewDictionary}.dni`}
            onChange={(e) => handleChange('dni', e.target.value)}
            required
          />
          <DynamicInput
            name="email"
            type="email"
            value={formData.email}
            textId={`${viewDictionary}.email`}
            onChange={(e) => handleChange('email', e.target.value)}
            required
          />
          <DynamicInput
            name="password"
            type="password"
            value={formData.password}
            textId={`${viewDictionary}.password`}
            onChange={(e) => handleChange('password', e.target.value)}
            required
          />
          <DynamicButton
            size="medium"
            state={loading || isTracking ? 'disabled' : 'normal'}
            type="submit"
            textId="components.buttons.register"
            disabled={loading || isTracking}
          />

          {isTracking && (
            <p className="mt-2 text-sm text-center text-gray-600">
              {t(
                'pages.users.listUsers.trackingChanges',
                'Registrando cambios...'
              )}
            </p>
          )}
        </form>
      </div>

      {/* Sección de imagen con animación */}
      <motion.div
        className="bottom-0 flex justify-end h-full grid-cols-3 col-span-2 overflow-hidden md:absolute md:bottom-4 md:right-2 bg-blend-multiply mix-blend-multiply"
        onMouseMove={handleMouseMove}
      >
        {backgroundImage && (
          <motion.div
            className="relative w-full h-full overflow-hidden"
            style={{
              x: moveX,
              y: moveY,
            }}
          >
            <motion.img
              src={backgroundImage}
              alt="register portada"
              className={`
                object-cover max-sm:absolute -z-10 max-sm:top-0 max-sm:right-0 max-sm:opacity-10 
                lg:w-[80%] mg:w-[90%] sm:w-full h-full
                transition-opacity duration-1000 ease-in-out
                ${imageLoaded ? 'opacity-100' : 'opacity-0'}
              `}
              onLoad={handleImageLoad}
              onError={handleImageError}
              style={{
                width: '105%',
                height: '105%',
                objectFit: 'cover',
                objectPosition: 'center',
              }}
              initial={{ scale: 1.02 }}
              animate={{
                scale: 1.02,
                opacity: imageLoaded ? 1 : 0,
              }}
              transition={{
                opacity: { duration: 0.8, ease: 'easeInOut' },
                scale: { duration: 1.2, ease: 'easeOut' },
              }}
            />
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}

export default RegisterPage
