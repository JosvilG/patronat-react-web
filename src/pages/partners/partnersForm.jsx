import React, { useState, useContext } from 'react'
import log from 'loglevel'
import { useNavigate } from 'react-router-dom'
import { AuthContext } from '../../contexts/AuthContext'
import { collection, addDoc } from 'firebase/firestore'
import { db } from '../../firebase/firebase'
import Loader from '../../components/Loader'
import DynamicInput from '../../components/Inputs'
import { showPopup } from '../../services/popupService'
import { useTranslation, Trans } from 'react-i18next'
import DynamicButton from '../../components/Buttons'

function PartnersForm() {
  const { t } = useTranslation()
  const { user } = useContext(AuthContext)
  const navigate = useNavigate()
  const viewDictionary = 'pages.partners.registerPartners'

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
        `${viewDictionary}.validation.requiredFields`,
        'Por favor, completa todos los campos requeridos.'
      )
    }
    const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRx.test(formState.email)) {
      return t(
        `${viewDictionary}.validation.invalidEmail`,
        'Por favor, introduce un email válido.'
      )
    }
    const dniRx = /^[0-9]{8}[A-Za-z]$/
    if (!dniRx.test(formState.dni)) {
      return t(
        `${viewDictionary}.validation.invalidDni`,
        'Por favor, introduce un DNI válido (8 números y una letra).'
      )
    }

    if (formState.birthDate) {
      const d = new Date(formState.birthDate)
      if (isNaN(d.getTime())) {
        return t(
          `${viewDictionary}.validation.invalidDate`,
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
        title: t(`${viewDictionary}.errorPopup.title`, 'Error de validación'),
        text: err,
        icon: 'error',
        confirmButtonText: t('components.popup.confirmButtonText', 'Aceptar'),
      })
      setFormState((s) => ({ ...s, submitting: false }))
      return
    }
    if (!user) {
      await showPopup({
        title: t(`${viewDictionary}.errorPopup.title`, 'Error'),
        text: t(
          `${viewDictionary}.authError`,
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
        accountNumber: '',
        status: 'pending',
        createdAt: new Date(),
        createdBy: user.uid,
      }

      await addDoc(partnersRef, partnerData)
      await showPopup({
        title: t(`${viewDictionary}.successPopup.title`, 'Registro exitoso'),
        text: t(
          `${viewDictionary}.successPopup.text`,
          'El socio ha sido registrado correctamente y está pendiente de revisión.'
        ),
        icon: 'success',
        confirmButtonText: t('components.popup.confirmButtonText', 'Aceptar'),
      })

      navigate('/dashboard')
      resetForm()
    } catch (error) {
      log.error('Error al registrar el socio:', error)
      await showPopup({
        title: t(`${viewDictionary}.errorPopup.title`, 'Error'),
        text: t(
          `${viewDictionary}.errorPopup.text`,
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
    <div className="pb-6 bg-transparent min-h-dvh ">
      <section className="flex flex-col items-center max-w-full mx-auto sm:flex-none">
        <h2 className="mb-8 text-center sm:t64b t40b">
          {t(`${viewDictionary}.title`, 'Registro de Socio')}
        </h2>
        <p className="text-center t16r max-w-[340px] sm:max-w-none flex flex-col items-center sm:flex-none">
          <Trans
            i18nKey={`${viewDictionary}.descriptionLabel`}
            components={{ strong: <strong />, br: <br /> }}
            defaults="Por favor, completa el siguiente formulario para registrarte como socio."
          />
        </p>

        <Loader loading={formState.submitting} />

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 justify-items-center">
            <DynamicInput
              name="name"
              textId={`${viewDictionary}.nameLabel`}
              placeholder={t(`${viewDictionary}.namePlaceholder`, 'Nombre')}
              type="text"
              value={formState.name}
              onChange={handleInputChange}
              disabled={formState.submitting}
              required
            />
            <DynamicInput
              name="lastName"
              textId={`${viewDictionary}.lastNameLabel`}
              placeholder={t(
                `${viewDictionary}.lastNamePlaceholder`,
                'Apellidos'
              )}
              type="text"
              value={formState.lastName}
              onChange={handleInputChange}
              disabled={formState.submitting}
              required
            />
            <DynamicInput
              name="address"
              textId={`${viewDictionary}.addressLabel`}
              placeholder={t(
                `${viewDictionary}.addressPlaceholder`,
                'Dirección completa'
              )}
              type="text"
              value={formState.address}
              onChange={handleInputChange}
              disabled={formState.submitting}
              required
            />
            <DynamicInput
              name="email"
              textId={`${viewDictionary}.emailLabel`}
              placeholder={t(
                `${viewDictionary}.emailPlaceholder`,
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
              textId={`${viewDictionary}.phoneLabel`}
              placeholder={t(
                `${viewDictionary}.phonePlaceholder`,
                'Número de teléfono'
              )}
              type="phone"
              value={formState.phone}
              onChange={handleInputChange}
              disabled={formState.submitting}
              required
            />
            <DynamicInput
              name="birthDate"
              textId={`${viewDictionary}.birthDateLabel`}
              type="date"
              value={formState.birthDate}
              onChange={handleInputChange}
              disabled={formState.submitting}
              required
            />
            <DynamicInput
              name="dni"
              textId={`${viewDictionary}.dniLabel`}
              placeholder={t(
                `${viewDictionary}.dniPlaceholder`,
                'DNI (8 dígitos + letra)'
              )}
              type="text"
              value={formState.dni}
              onChange={handleInputChange}
              disabled={formState.submitting}
              required
            />
          </div>
          <div className="flex justify-center pt-4">
            <DynamicButton
              type="submit"
              size="medium"
              state={formState.submitting ? 'disabled' : 'normal'}
              textId={
                formState.submitting
                  ? `${viewDictionary}.submittingText`
                  : `${viewDictionary}.submitButton`
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
