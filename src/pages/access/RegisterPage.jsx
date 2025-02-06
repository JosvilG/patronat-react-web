import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth'
import log from 'loglevel'
import { doc, setDoc, Timestamp } from 'firebase/firestore'
import { createUserModel } from '../../models/usersData'
import { db } from '../../firebase/firebase'
import { useTranslation } from 'react-i18next'
import useGallery from '../../hooks/useGallery'
import DynamicInput from '../../components/Inputs'
import DynamicButton from '../../components/Buttons'

function RegisterPage() {
  const navigate = useNavigate()
  const auth = getAuth()
  const [formData, setFormData] = useState(createUserModel())
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [age, setAge] = useState(null) // Estado para la edad
  const { galleryImages } = useGallery()
  const { t } = useTranslation()

  const [backgroundImage, setBackgroundImage] = useState(null)

  useEffect(() => {
    if (galleryImages.length > 0) {
      const loginImages = galleryImages.filter((image) =>
        image.tags.includes('login')
      )

      if (loginImages.length > 0) {
        setBackgroundImage(loginImages[0].url)
      }
    }
  }, [galleryImages])

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

    // Si el campo cambiado es birthDate, calculamos la edad
    if (name === 'birthDate') {
      const calculatedAge = calculateAge(value)
      setAge(calculatedAge)
      setFormData((prevData) => ({
        ...prevData,
        age: calculatedAge, // Guardamos la edad calculada en formData
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

      await setDoc(doc(db, 'users', user.uid), {
        firstName: formData.firstName,
        lastName: formData.lastName,
        phoneNumber: formData.phoneNumber,
        age: formData.age,
        birthDate: formData.birthDate,
        dni: formData.dni,
        email: formData.email,
        createdAt: Timestamp.fromDate(new Date()),
        modificationHistory: [],
        modifiedAt: Timestamp.fromDate(new Date()),
        role: 'user',
      })

      navigate('/')
    } catch (err) {
      log.error('Error al crear cuenta:', err)
      setError('Hubo un error al crear tu cuenta. Por favor, intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="items-center mx-auto bg-center bg-cover sm:grid max-sm:mt-40 md:grid-cols-3 sm:grid-cols-1 h-fit justify-items-center sm:px-6 lg:px-8">
      <div className="relative rounded-lg md:p-8 sm:p-4 grid-col-3 w-fit h-fit bottom-20 max-sm:max-w-[373px]">
        <div className="max-w-lg mx-auto text-center">
          <h1 className="text-black t40b">{t('pages.userRegister.title')}</h1>
          <p className="mt-4 text-black t16r whitespace-break-spaces">
            {t('pages.userRegister.description')}
          </p>
        </div>
        {error && <p className="mb-4 text-center text-red-500">{error}</p>}
        <form
          onSubmit={handleSubmit}
          className="max-sm:flex max-sm:flex-col max-sm:items-center"
        >
          <DynamicInput
            name="firstName"
            textId="firstName"
            type="text"
            placeholder={t('pages.userRegister.name')}
            value={formData.firstName}
            onChange={(e) => handleChange('firstName', e.target.value)}
            required
          />
          <DynamicInput
            name="lastName"
            textId="lastName"
            type="text"
            value={formData.lastName}
            placeholder={t('pages.userRegister.surname')}
            onChange={(e) => handleChange('lastName', e.target.value)}
            required
          />
          <DynamicInput
            name="phoneNumber"
            textId="phoneNumber"
            type="phone"
            value={formData.phoneNumber}
            placeholder={t('pages.userRegister.phone')}
            onChange={(e) => handleChange('phoneNumber', e.target.value)}
            required
          />
          <div className="flex items-center justify-between max-sm:w-[373px]">
            <DynamicInput
              name="birthDate"
              textId="pages.userRegister.birthDate"
              type="date"
              value={formData.birthDate}
              placeholder={t('pages.userRegister.birthDate')}
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
            textId="dni"
            type="dni"
            value={formData.dni}
            placeholder={t('pages.userRegister.dni')}
            onChange={(e) => handleChange('dni', e.target.value)}
            required
          />
          <DynamicInput
            name="email"
            textId="email"
            type="email"
            value={formData.email}
            placeholder={t('pages.userRegister.email')}
            onChange={(e) => handleChange('email', e.target.value)}
            required
          />
          <DynamicInput
            name="password"
            textId="password"
            type="password"
            value={formData.password}
            placeholder={t('pages.userRegister.password')}
            onChange={(e) => handleChange('password', e.target.value)}
            required
          />
          <DynamicButton size="large" state="normal" type="submit">
            {t('components.buttons.register')}
          </DynamicButton>
        </form>
      </div>
      <div className="bottom-0 flex justify-end h-full grid-cols-3 col-span-2 md:relative md:bottom-20">
        <img
          src={backgroundImage}
          alt="login portada"
          className="object-cover max-sm:absolute -z-10 max-sm:top-0 max-sm:right-0 max-sm:opacity-10 lg:w-[80%] mg:w-[90%] sm:w-full h-full"
        />
      </div>
    </div>
  )
}

export default RegisterPage
