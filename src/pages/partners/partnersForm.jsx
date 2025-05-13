import React, { useState, useContext } from 'react'
import log from 'loglevel'
import { useNavigate } from 'react-router-dom'
import { AuthContext } from '../../contexts/AuthContext'
import { collection, addDoc } from 'firebase/firestore'
import { db } from '../../firebase/firebase'
import Loader from '../../components/Loader'
import DynamicInput from '../../components/Inputs'
import { showPopup } from '../../services/popupService'
import { useTranslation } from 'react-i18next'
import DynamicButton from '../../components/Buttons'

function PartnersForm() {
  const { t } = useTranslation()
  const { user } = useContext(AuthContext)
  const navigate = useNavigate()
  const viewDict = 'pages.partners.registerPartners'

  const [formState, setFormState] = useState({
    name: '',
    lastName: '',
    address: '',
    email: '',
    phone: '',
    birthDate: '',
    accountNumber: '',
    dni: '',
    submitting: false,
  })

  log.setLevel('info')

  const resetForm = () => {
    setFormState({
      name: '',
      lastName: '',
      address: '',
      email: '',
      phone: '',
      birthDate: '',
      accountNumber: '',
      dni: '',
      submitting: false,
    })
  }

  const validateForm = () => {
    if (
      !formState.name ||
      !formState.lastName ||
      !formState.email ||
      !formState.dni
    ) {
      return t(
        `${viewDict}.validation.requiredFields`,
        'Por favor, completa todos los campos requeridos.'
      )
    }
    const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRx.test(formState.email)) {
      return t(
        `${viewDict}.validation.invalidEmail`,
        'Por favor, introduce un email válido.'
      )
    }
    const dniRx = /^[0-9]{8}[A-Za-z]$/
    if (!dniRx.test(formState.dni)) {
      return t(
        `${viewDict}.validation.invalidDni`,
        'Por favor, introduce un DNI válido (8 números y una letra).'
      )
    }
    if (formState.accountNumber) {
      const ibanRx = /^ES[0-9]{22}$/
      if (!ibanRx.test(formState.accountNumber)) {
        return t(
          `${viewDict}.validation.invalidIban`,
          'Por favor, introduce un IBAN válido (formato ES + 22 dígitos).'
        )
      }
    }
    if (formState.birthDate) {
      const d = new Date(formState.birthDate)
      if (isNaN(d.getTime())) {
        return t(
          `${viewDict}.validation.invalidDate`,
          'Por favor, introduce una fecha de nacimiento válida.'
        )
      }
    }
    return null
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormState((s) => ({ ...s, submitting: true }))

    const err = validateForm()
    if (err) {
      await showPopup({
        title: t(`${viewDict}.errorPopup.title`, 'Error de validación'),
        text: err,
        icon: 'error',
        confirmButtonText: t('components.popup.confirmButtonText', 'Aceptar'),
      })
      setFormState((s) => ({ ...s, submitting: false }))
      return
    }
    if (!user) {
      await showPopup({
        title: t(`${viewDict}.errorPopup.title`, 'Error'),
        text: t(
          `${viewDict}.authError`,
          'Debes iniciar sesión para registrar un socio.'
        ),
        icon: 'error',
        confirmButtonText: t('components.popup.confirmButtonText', 'Aceptar'),
      })
      setFormState((s) => ({ ...s, submitting: false }))
      return
    }

    try {
      // Crear un nuevo documento en la colección "partners"
      const partnersRef = collection(db, 'partners')
      const partnerData = {
        name: formState.name,
        lastName: formState.lastName,
        address: formState.address || '',
        email: formState.email,
        phone: formState.phone || '',
        birthDate: formState.birthDate || '',
        dni: formState.dni,
        accountNumber: formState.accountNumber || '',
        status: 'pending', // Estado inicial pendiente de revisión
        createdAt: new Date(),
        createdBy: user.uid,
      }

      const docRef = await addDoc(partnersRef, partnerData)

      await showPopup({
        title: t(`${viewDict}.successPopup.title`, 'Registro exitoso'),
        text: t(
          `${viewDict}.successPopup.text`,
          'El socio ha sido registrado correctamente y está pendiente de revisión.'
        ),
        icon: 'success',
        confirmButtonText: t('components.popup.confirmButtonText', 'Aceptar'),
      })

      console.log('Socio registrado con ID:', docRef.id)
      navigate('/dashboard')
      resetForm()
    } catch (error) {
      log.error('Error al registrar el socio:', error)
      await showPopup({
        title: t(`${viewDict}.errorPopup.title`, 'Error'),
        text: t(
          `${viewDict}.errorPopup.text`,
          'Ha ocurrido un error al registrar el socio. Por favor, inténtalo de nuevo.'
        ),
        icon: 'error',
        confirmButtonText: t('components.popup.confirmButtonText', 'Aceptar'),
      })
    } finally {
      setFormState((s) => ({ ...s, submitting: false }))
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormState((s) => ({ ...s, [name]: value }))
  }

  return (
    <div className="pb-6 bg-transparent min-h-dvh">
      <section className="max-w-full mx-auto">
        <h2 className="mb-8 text-center t64b">
          {t(`${viewDict}.title`, 'Registro de Socio')}
        </h2>

        <Loader loading={formState.submitting} />

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 justify-items-center">
            <DynamicInput
              name="name"
              textId={`${viewDict}.nameLabel`}
              placeholder={t(`${viewDict}.namePlaceholder`, 'Nombre')}
              type="text"
              value={formState.name}
              onChange={handleInputChange}
              disabled={formState.submitting}
              required
            />
            <DynamicInput
              name="lastName"
              textId={`${viewDict}.lastNameLabel`}
              placeholder={t(`${viewDict}.lastNamePlaceholder`, 'Apellidos')}
              type="text"
              value={formState.lastName}
              onChange={handleInputChange}
              disabled={formState.submitting}
              required
            />
            <DynamicInput
              name="address"
              textId={`${viewDict}.addressLabel`}
              placeholder={t(
                `${viewDict}.addressPlaceholder`,
                'Dirección completa'
              )}
              type="text"
              value={formState.address}
              onChange={handleInputChange}
              disabled={formState.submitting}
            />
            <DynamicInput
              name="email"
              textId={`${viewDict}.emailLabel`}
              placeholder={t(
                `${viewDict}.emailPlaceholder`,
                'Correo electrónico'
              )}
              type="email"
              value={formState.email}
              onChange={handleInputChange}
              disabled={formState.submitting}
              required
            />
            <DynamicInput
              name="phone"
              textId={`${viewDict}.phoneLabel`}
              placeholder={t(
                `${viewDict}.phonePlaceholder`,
                'Número de teléfono'
              )}
              type="phone"
              value={formState.phone}
              onChange={handleInputChange}
              disabled={formState.submitting}
            />
            <DynamicInput
              name="birthDate"
              textId={`${viewDict}.birthDateLabel`}
              type="date"
              value={formState.birthDate}
              onChange={handleInputChange}
              disabled={formState.submitting}
            />
            <DynamicInput
              name="dni"
              textId={`${viewDict}.dniLabel`}
              placeholder={t(
                `${viewDict}.dniPlaceholder`,
                'DNI (8 dígitos + letra)'
              )}
              type="text"
              value={formState.dni}
              onChange={handleInputChange}
              disabled={formState.submitting}
              required
            />
            <DynamicInput
              name="accountNumber"
              textId={`${viewDict}.accountNumberLabel`}
              placeholder={t(
                `${viewDict}.accountNumberPlaceholder`,
                'IBAN (ES + 22 dígitos)'
              )}
              type="text"
              value={formState.accountNumber}
              onChange={handleInputChange}
              disabled={formState.submitting}
            />
          </div>
          <div className="flex justify-center pt-4">
            <DynamicButton
              type="submit"
              size="large"
              state={formState.submitting ? 'disabled' : 'normal'}
              textId={
                formState.submitting
                  ? `${viewDict}.submittingText`
                  : `${viewDict}.submitButton`
              }
              disabled={formState.submitting}
            />
          </div>
        </form>
      </section>
    </div>
  )
}

export default PartnersForm
