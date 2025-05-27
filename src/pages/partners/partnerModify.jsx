import React, { useEffect, useState, useContext } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '../../firebase/firebase'
import { AuthContext } from '../../contexts/AuthContext'
import Loader from '../../components/Loader'
import DynamicInput from '../../components/Inputs'
import DynamicButton from '../../components/Buttons'
import { showPopup } from '../../services/popupService'
import { useTranslation } from 'react-i18next'
import {
  getPartnerPaymentsByStatus,
  updatePartnerPayment,
  normalizePaymentDates,
} from '../../hooks/paymentService'

const calculateAge = (birthDate) => {
  if (!birthDate) return null

  try {
    // Convertir de timestamp de Firestore si es necesario
    let birthDateObj = birthDate
    if (birthDate?.toDate) {
      birthDateObj = birthDate.toDate()
    } else if (typeof birthDate === 'string') {
      birthDateObj = new Date(birthDate)
    }

    const today = new Date()
    let age = today.getFullYear() - birthDateObj.getFullYear()
    const monthDiff = today.getMonth() - birthDateObj.getMonth()

    // Si aún no ha cumplido años este año
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDateObj.getDate())
    ) {
      age--
    }

    return age
  } catch (error) {
    console.error('Error calculando edad:', error)
    return null
  }
}

function PartnerModifyForm() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useContext(AuthContext)
  const partnerId = location.state?.partnerId
  const viewDictionary = 'pages.partners.modifyPartners'

  const [formData, setFormData] = useState({
    name: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    dni: '',
    birthDate: '',
    accountNumber: '',
    status: 'pending',
    priceCategory: 'adult',
    createdAt: null,
    lastUpdateDate: null,
    submitting: false,
  })

  const [activeSeason, setActiveSeason] = useState(null)
  const [loadingSeason, setLoadingSeason] = useState(false)
  const [paymentData, setPaymentData] = useState(null)
  const [paymentId, setPaymentId] = useState(null)
  const [loadingPayments, setLoadingPayments] = useState(false)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const formatDate = (dateObj) => {
    if (!dateObj) return ''

    if (dateObj.toDate) {
      dateObj = dateObj.toDate()
    }

    if (dateObj instanceof Date) {
      const year = dateObj.getFullYear()
      const month = String(dateObj.getMonth() + 1).padStart(2, '0')
      const day = String(dateObj.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }

    return ''
  }

  const fetchActiveSeason = async () => {
    setLoadingSeason(true)
    try {
      const seasonsQuery = query(
        collection(db, 'seasons'),
        where('active', '==', true)
      )

      const querySnapshot = await getDocs(seasonsQuery)

      if (!querySnapshot.empty) {
        const seasonDoc = querySnapshot.docs[0]
        setActiveSeason({ id: seasonDoc.id, ...seasonDoc.data() })
      } else {
        setActiveSeason(null)
      }
    } catch (error) {
      console.error('Error al obtener la temporada activa:', error)
      setActiveSeason(null)
    } finally {
      setLoadingSeason(false)
    }
  }

  const fetchPartnerPayments = async (id) => {
    if (!id) return

    setLoadingPayments(true)
    try {
      console.log(`Cargando pagos para el socio ${id}...`)

      const paymentInfo = await getPartnerPaymentsByStatus(id)

      if (paymentInfo && paymentInfo.current) {
        console.log('Pago de temporada actual encontrado:', paymentInfo.current)
        setPaymentId(paymentInfo.current.id)
        setPaymentData({
          ...paymentInfo.current,
          priceCategory:
            paymentInfo.current.priceCategory ||
            formData.priceCategory ||
            'adult',
        })
      } else {
        console.log('No se encontraron pagos para la temporada actual')
        setPaymentData(null)
        setPaymentId(null)
      }

      if (!activeSeason) {
        await fetchActiveSeason()
      }
    } catch (error) {
      console.error('Error al cargar pagos:', error)
      setPaymentData(null)
      setPaymentId(null)
    } finally {
      setLoadingPayments(false)
    }
  }

  const updatePricesBasedOnCategory = (category) => {
    if (!paymentData || !activeSeason) return

    let firstPrice, secondPrice, thirdPrice

    if (category === 'junior') {
      firstPrice = activeSeason.priceFirstFractionJunior || 0
      secondPrice = activeSeason.priceSeconFractionJunior || 0
      thirdPrice = activeSeason.priceThirdFractionJunior || 0
    } else {
      firstPrice = activeSeason.priceFirstFraction || 0
      secondPrice = activeSeason.priceSeconFraction || 0
      thirdPrice = activeSeason.priceThirdFraction || 0
    }

    setPaymentData((prev) => ({
      ...prev,
      firstPaymentPrice: prev.firstPaymentDone
        ? prev.firstPaymentPrice
        : firstPrice,
      secondPaymentPrice: prev.secondPaymentDone
        ? prev.secondPaymentPrice
        : secondPrice,
      thirdPaymentPrice: prev.thirdPaymentDone
        ? prev.thirdPaymentPrice
        : thirdPrice,
      priceCategory: category,
    }))
  }

  useEffect(() => {
    const fetchPartner = async () => {
      if (!partnerId) {
        setError('No se pudo cargar la información del socio.')
        setLoading(false)
        return
      }

      try {
        const docRef = doc(db, 'partners', partnerId)
        const docSnap = await getDoc(docRef)

        if (docSnap.exists()) {
          const partnerData = docSnap.data()

          const age = calculateAge(partnerData.birthDate)
          const suggestedCategory =
            age !== null && age >= 14 && age <= 16 ? 'junior' : 'adult'

          setFormData({
            id: docSnap.id,
            name: partnerData.name || '',
            lastName: partnerData.lastName || '',
            email: partnerData.email || '',
            phone: partnerData.phone || '',
            address: partnerData.address || '',
            dni: partnerData.dni || '',
            birthDate: formatDate(partnerData.birthDate) || '',
            accountNumber: partnerData.accountNumber || '',
            status: partnerData.status || 'pending',
            priceCategory: partnerData.priceCategory || suggestedCategory,
            createdAt: partnerData.createdAt || null,
            lastUpdateDate: partnerData.lastUpdateDate || null,
            submitting: false,
          })

          if (partnerData.status === 'approved') {
            await fetchActiveSeason()
            await fetchPartnerPayments(docSnap.id)
          }
        } else {
          setError('No se encontró el socio especificado.')
        }
      } catch (error) {
        console.error('Error al cargar datos del socio:', error)
        setError('Ocurrió un error al cargar los datos del socio.')
      } finally {
        setLoading(false)
      }
    }

    fetchPartner()
  }, [partnerId])

  const validateForm = () => {
    if (
      !formData.name ||
      !formData.lastName ||
      !formData.email ||
      !formData.dni
    ) {
      return t(
        `${viewDictionary}.validation.requiredFields`,
        'Por favor, completa todos los campos requeridos.'
      )
    }
    const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRx.test(formData.email)) {
      return t(
        `${viewDictionary}.validation.invalidEmail`,
        'Por favor, introduce un email válido.'
      )
    }
    const dniRx = /^[0-9]{8}[A-Za-z]$/
    if (!dniRx.test(formData.dni)) {
      return t(
        `${viewDictionary}.validation.invalidDni`,
        'Por favor, introduce un DNI válido (8 números y una letra).'
      )
    }
    if (formData.accountNumber) {
      const ibanRx = /^ES[0-9]{22}$/
      if (!ibanRx.test(formData.accountNumber)) {
        return t(
          `${viewDictionary}.validation.invalidIban`,
          'Por favor, introduce un IBAN válido (formato ES + 22 dígitos).'
        )
      }
    }
    return null
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormData((prev) => ({ ...prev, submitting: true }))

    const validationError = validateForm()
    if (validationError) {
      await showPopup({
        title: t(`${viewDictionary}.errorPopup.title`, 'Error de validación'),
        text: validationError,
        icon: 'error',
        confirmButtonText: t('components.popup.confirmButtonText', 'Aceptar'),
      })
      setFormData((prev) => ({ ...prev, submitting: false }))
      return
    }

    try {
      const updatedFields = {
        name: formData.name,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        dni: formData.dni,
        birthDate: formData.birthDate,
        accountNumber: formData.accountNumber,
        status: formData.status,
        priceCategory: formData.priceCategory,
        lastUpdateDate: serverTimestamp(),
      }

      await updateDoc(doc(db, 'partners', partnerId), updatedFields)

      if (paymentId && paymentData && formData.status === 'approved') {
        const normalizedPaymentData = normalizePaymentDates({
          ...paymentData,
          priceCategory: formData.priceCategory,
        })

        await updatePartnerPayment(
          partnerId,
          paymentId,
          normalizedPaymentData,
          user?.uid || ''
        )
      }

      await showPopup({
        title: t(
          `${viewDictionary}.successPopup.title`,
          'Actualización exitosa'
        ),
        text: t(
          `${viewDictionary}.successPopup.text`,
          'Los datos del socio han sido actualizados correctamente.'
        ),
        icon: 'success',
        confirmButtonText: t('components.popup.confirmButtonText', 'Aceptar'),
      })

      navigate('/partners-list')
    } catch (error) {
      console.error('Error al actualizar socio:', error)
      await showPopup({
        title: t(`${viewDictionary}.errorPopup.title`, 'Error'),
        text: t(
          `${viewDictionary}.errorPopup.updateError`,
          'Ha ocurrido un error al actualizar los datos del socio.'
        ),
        icon: 'error',
        confirmButtonText: t('components.popup.confirmButtonText', 'Aceptar'),
      })
    } finally {
      setFormData((prev) => ({ ...prev, submitting: false }))
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleStatusChange = (e) => {
    setFormData((prev) => ({ ...prev, status: e.target.value }))
  }

  const handleCategoryChange = (e) => {
    const newCategory = e.target.value
    setFormData((prev) => ({ ...prev, priceCategory: newCategory }))

    // Si hay datos de pago, actualizar precios
    if (paymentData && activeSeason) {
      updatePricesBasedOnCategory(newCategory)
    }
  }

  const handlePaymentChange = (e) => {
    const { name, value, type, checked } = e.target

    const newValue = type === 'checkbox' ? checked : value

    const parsedValue = [
      'firstPaymentPrice',
      'secondPaymentPrice',
      'thirdPaymentPrice',
    ].includes(name)
      ? newValue === ''
        ? 0
        : Number(newValue)
      : newValue

    setPaymentData((prev) => ({
      ...prev,
      [name]: parsedValue,
    }))
  }

  const handleDateChange = (e) => {
    const { name, value } = e.target

    let dateValue = value ? new Date(value) : null

    setPaymentData((prev) => ({
      ...prev,
      [name]: dateValue,
    }))
  }

  const refreshPaymentData = async () => {
    if (!partnerId) return

    setLoadingPayments(true)
    try {
      await fetchPartnerPayments(partnerId)
    } finally {
      setLoadingPayments(false)
    }
  }

  if (loading) {
    return <Loader loading={loading} />
  }

  if (error) {
    return <div className="p-4 text-center text-red-600">{error}</div>
  }

  return (
    <div className="pb-6 bg-transparent min-h-dvh">
      <section className="max-w-full mx-auto">
        <h2 className="mb-8 text-center sm:t64b t40b">
          {t(`${viewDictionary}.title`, 'Modificar Socio')}
        </h2>
        <Loader loading={formData.submitting} />

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <h2 className="mb-4 text-center t24b">
            {t(`${viewDictionary}.personalInfoSection`, 'Datos Personales')}
          </h2>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 justify-items-center">
            <DynamicInput
              name="name"
              textId={`${viewDictionary}.nameLabel`}
              placeholder={t(`${viewDictionary}.namePlaceholder`, 'Nombre')}
              type="text"
              value={formData.name}
              onChange={handleInputChange}
              disabled={formData.submitting}
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
              value={formData.lastName}
              onChange={handleInputChange}
              disabled={formData.submitting}
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
              value={formData.email}
              onChange={handleInputChange}
              disabled={formData.submitting}
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
              value={formData.phone}
              onChange={handleInputChange}
              disabled={formData.submitting}
            />

            <DynamicInput
              name="dni"
              textId={`${viewDictionary}.dniLabel`}
              placeholder={t(
                `${viewDictionary}.dniPlaceholder`,
                'DNI (8 dígitos + letra)'
              )}
              type="text"
              value={formData.dni}
              onChange={handleInputChange}
              disabled={formData.submitting}
              required
            />

            <DynamicInput
              name="birthDate"
              textId={`${viewDictionary}.birthDateLabel`}
              placeholder={t(
                `${viewDictionary}.birthDatePlaceholder`,
                'Fecha de nacimiento'
              )}
              type="date"
              value={formData.birthDate}
              onChange={handleInputChange}
              disabled={formData.submitting}
            />

            <DynamicInput
              name="address"
              textId={`${viewDictionary}.addressLabel`}
              placeholder={t(
                `${viewDictionary}.addressPlaceholder`,
                'Dirección completa'
              )}
              type="text"
              value={formData.address}
              onChange={handleInputChange}
              disabled={formData.submitting}
            />

            <DynamicInput
              name="accountNumber"
              textId={`${viewDictionary}.accountNumberLabel`}
              placeholder={t(
                `${viewDictionary}.accountNumberPlaceholder`,
                'IBAN (ES + 22 dígitos)'
              )}
              type="text"
              value={formData.accountNumber}
              onChange={handleInputChange}
              disabled={formData.submitting}
            />

            <DynamicInput
              name="status"
              type="select"
              textId={`${viewDictionary}.statusLabel`}
              defaultText="Estado del socio"
              value={formData.status}
              onChange={handleStatusChange}
              disabled={formData.submitting}
              options={[
                {
                  value: 'pending',
                  label: `${viewDictionary}.statusOptions.review`,
                },
                {
                  value: 'approved',
                  label: `${viewDictionary}.statusOptions.active`,
                },
                {
                  value: 'rejected',
                  label: `${viewDictionary}.statusOptions.inactive`,
                },
              ]}
            />
          </div>

          {formData.status === 'approved' && (
            <div className="pt-8 mt-8 border-t border-gray-200">
              <h2 className="mb-4 text-center t24b">
                {t(`${viewDictionary}.paymentsSection`, 'Gestión de Pagos')}
              </h2>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 justify-items-center">
                <DynamicInput
                  name="priceCategory"
                  type="select"
                  textId={`${viewDictionary}.priceCategoryLabel`}
                  defaultText="Categoría de precios"
                  value={formData.priceCategory}
                  onChange={handleCategoryChange}
                  disabled={formData.submitting}
                  options={[
                    {
                      value: 'adult',
                      label: `${viewDictionary}.priceCategoryAdult`,
                    },
                    {
                      value: 'junior',
                      label: `${viewDictionary}.priceCategoryJunior`,
                    },
                  ]}
                />
              </div>

              {/* Mantener la sección de temporada activa y pagos con los mismos estilos */}
              {loadingSeason ? (
                <p className="mt-4 mb-4 text-sm text-center text-gray-500">
                  {t(
                    `${viewDictionary}.payments.loadingSeason`,
                    'Cargando información de la temporada...'
                  )}
                </p>
              ) : activeSeason ? (
                <div className="p-4 mt-4 mb-6 bg-gray-100 rounded-lg">
                  {/* Información de temporada - mantener igual */}
                </div>
              ) : (
                <div className="p-4 mt-4 mb-6 text-center bg-gray-100 rounded-lg">
                  <p className="text-sm text-gray-500">
                    {t(
                      `${viewDictionary}.payments.noActiveSeason`,
                      'No hay temporada activa configurada.'
                    )}
                  </p>
                </div>
              )}

              {/* Sección de pagos */}
              {loadingPayments ? (
                <div className="p-4 text-center">
                  <p className="text-sm text-gray-500">
                    {t(
                      `${viewDictionary}.payments.loadingPayments`,
                      'Cargando información de pagos...'
                    )}
                  </p>
                </div>
              ) : paymentData && activeSeason ? (
                <div className="grid grid-cols-1 gap-6 mt-4 md:grid-cols-3 justify-items-center">
                  {/* Mantener las tres fracciones de pago */}
                </div>
              ) : (
                <div className="p-4 mt-4 text-center rounded-lg bg-gray-50">
                  <p className="mb-3 text-sm text-gray-500">
                    {t(
                      `${viewDictionary}.payments.noPaymentsFound`,
                      'No se encontró información de pagos para este socio en la temporada activa.'
                    )}
                  </p>
                  <button
                    onClick={refreshPaymentData}
                    className="flex items-center px-3 py-1 mx-auto text-sm bg-gray-200 rounded hover:bg-gray-300"
                    type="button"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-4 h-4 mr-1"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    {t(
                      `${viewDictionary}.payments.retryLoad`,
                      'Intentar cargar de nuevo'
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-center pt-4">
            <DynamicButton
              type="submit"
              size="medium"
              state={formData.submitting ? 'disabled' : 'normal'}
              textId={
                formData.submitting
                  ? `${viewDictionary}.submittingText`
                  : `${viewDictionary}.submitButton`
              }
              defaultText={
                formData.submitting ? 'Guardando...' : 'Guardar cambios'
              }
              disabled={formData.submitting}
            />
          </div>
        </form>
      </section>
    </div>
  )
}

export default PartnerModifyForm
