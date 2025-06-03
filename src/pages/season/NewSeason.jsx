import React, { useState, useEffect, useContext } from 'react'
import log from 'loglevel'
import { useNavigate } from 'react-router-dom'
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
} from 'firebase/firestore'
import { db } from '../../firebase/firebase'
import { AuthContext } from '../../contexts/AuthContext'
import Loader from '../../components/Loader'
import DynamicInput from '../../components/Inputs'
import { showPopup } from '../../services/popupService'
import { useTranslation } from 'react-i18next'
import DynamicButton from '../../components/Buttons'
import { createPaymentForPartner } from '../../hooks/paymentService'

export const formatDate = (dateValue) => {
  if (!dateValue) return ''

  try {
    if (dateValue?.toDate) {
      dateValue = dateValue.toDate()
    }

    if (dateValue instanceof Date) {
      return dateValue.toLocaleDateString()
    }

    if (typeof dateValue === 'string' && dateValue.match(/\d{4}-\d{2}-\d{2}/)) {
      return new Date(dateValue).toLocaleDateString()
    }
  } catch (error) {
    // Manejo silencioso para producción
  }

  return ''
}

const calculateAge = (birthDate) => {
  if (!birthDate) return null

  try {
    let birthDateObj = birthDate
    if (birthDate?.toDate) {
      birthDateObj = birthDate.toDate()
    } else if (typeof birthDate === 'string') {
      birthDateObj = new Date(birthDate)
    }

    const today = new Date()
    let age = today.getFullYear() - birthDateObj.getFullYear()
    const monthDiff = today.getMonth() - birthDateObj.getMonth()

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDateObj.getDate())
    ) {
      age--
    }

    return age
  } catch (error) {
    // Manejo silencioso para producción
    return null
  }
}

function NewSeason() {
  const { t } = useTranslation()
  const { user } = useContext(AuthContext)
  const navigate = useNavigate()
  const viewDictionary = 'pages.seasons.newSeason'

  const [formState, setFormState] = useState({
    seasonYear: new Date().getFullYear() + 1,
    totalPrice: 0,
    priceFirstFraction: 0,
    priceSeconFraction: 0,
    priceThirdFraction: 0,
    totalPriceJunior: 0,
    priceFirstFractionJunior: 0,
    priceSeconFractionJunior: 0,
    priceThirdFractionJunior: 0,
    active: false,
    submitting: false,
  })

  const [existingActiveSeason, setExistingActiveSeason] = useState(null)
  const [loading, setLoading] = useState(true)
  const [creatingPayments, setCreatingPayments] = useState(false)
  const [yearValidationMessage, setYearValidationMessage] = useState(null)
  const [checkingYear, setCheckingYear] = useState(false)
  const [activationMessage, setActivationMessage] = useState(null)

  log.setLevel('info')

  useEffect(() => {
    const checkExistingSeasons = async () => {
      try {
        const activeSeasonQuery = query(
          collection(db, 'seasons'),
          where('active', '==', true)
        )
        const activeSnapshot = await getDocs(activeSeasonQuery)

        if (!activeSnapshot.empty) {
          const activeSeason = {
            id: activeSnapshot.docs[0].id,
            ...activeSnapshot.docs[0].data(),
          }
          setExistingActiveSeason(activeSeason)
        }
      } catch (error) {
        log.error('Error al comprobar temporadas activas:', error)
        await showPopup({
          title: t(`${viewDictionary}.errorPopup.title`, 'Error'),
          text: t(
            `${viewDictionary}.errorPopup.checkSeasonError`,
            'Error al comprobar las temporadas activas.'
          ),
          icon: 'error',
          confirmButtonText: t('components.popup.confirmButtonText', 'Aceptar'),
        })
      } finally {
        setLoading(false)
      }
    }

    checkExistingSeasons()
  }, [t, viewDictionary])

  const checkExistingSeasonYear = async (year) => {
    try {
      const seasonYearQuery = query(
        collection(db, 'seasons'),
        where('seasonYear', '==', year)
      )
      const querySnapshot = await getDocs(seasonYearQuery)
      return !querySnapshot.empty
    } catch (error) {
      // Manejo silencioso para producción
      return false
    }
  }

  const resetForm = () => {
    setFormState({
      seasonYear: new Date().getFullYear() + 1,
      totalPrice: 0,
      priceFirstFraction: 0,
      priceSeconFraction: 0,
      priceThirdFraction: 0,
      totalPriceJunior: 0,
      priceFirstFractionJunior: 0,
      priceSeconFractionJunior: 0,
      priceThirdFractionJunior: 0,
      active: false,
      submitting: false,
    })
  }

  const handleToggleActivation = (e) => {
    const isActive = e.target.checked

    setFormState((prev) => ({ ...prev, active: isActive }))
  }

  const handleInputChange = async (e) => {
    const { name, value } = e.target
    let parsedValue = value

    if (
      [
        'seasonYear',
        'totalPrice',
        'priceFirstFraction',
        'priceSeconFraction',
        'priceThirdFraction',
        'totalPriceJunior',
        'priceFirstFractionJunior',
        'priceSeconFractionJunior',
        'priceThirdFractionJunior',
      ].includes(name)
    ) {
      parsedValue = value === '' ? '' : Number(value)
    }

    setFormState((prev) => ({ ...prev, [name]: parsedValue }))

    if (name === 'seasonYear' && parsedValue) {
      setCheckingYear(true)
      setYearValidationMessage(null)

      try {
        const exists = await checkExistingSeasonYear(parsedValue)
        if (exists) {
          setYearValidationMessage(
            t(
              `${viewDictionary}.validation.seasonYearDuplicate`,
              'Ya existe una temporada para el año {{year}}. No se permiten temporadas duplicadas.',
              { year: parsedValue }
            )
          )
        }
      } catch (error) {
        // Manejo silencioso para producción
      } finally {
        setCheckingYear(false)
      }
    }
  }

  const validateForm = async () => {
    const errors = []

    if (!formState.seasonYear) {
      errors.push(
        t(
          `${viewDictionary}.validation.seasonYearRequired`,
          'El año de la temporada es obligatorio'
        )
      )
    }

    if (formState.seasonYear < new Date().getFullYear()) {
      errors.push(
        t(
          `${viewDictionary}.validation.seasonYearInvalid`,
          'El año de la temporada debe ser igual o posterior al año actual'
        )
      )
    }

    const seasonYearExists = await checkExistingSeasonYear(formState.seasonYear)
    if (seasonYearExists) {
      errors.push(
        t(
          `${viewDictionary}.validation.seasonYearDuplicate`,
          'Ya existe una temporada para el año {{year}}. No se permiten temporadas duplicadas.',
          { year: formState.seasonYear }
        )
      )
    }

    if (formState.totalPrice < 0) {
      errors.push(
        t(
          `${viewDictionary}.validation.totalPricePositive`,
          'El precio total para mayores de 16 años no puede ser negativo'
        )
      )
    }

    const fractionSum =
      formState.priceFirstFraction +
      formState.priceSeconFraction +
      formState.priceThirdFraction

    if (fractionSum !== formState.totalPrice) {
      errors.push(
        t(
          `${viewDictionary}.validation.fractionSumMismatch`,
          'La suma de los precios de las fracciones para mayores de 16 años debe ser igual al precio total'
        )
      )
    }

    if (formState.totalPriceJunior < 0) {
      errors.push(
        t(
          `${viewDictionary}.validation.totalPriceJuniorPositive`,
          'El precio total para 14-16 años no puede ser negativo'
        )
      )
    }

    const fractionSumJunior =
      formState.priceFirstFractionJunior +
      formState.priceSeconFractionJunior +
      formState.priceThirdFractionJunior

    if (fractionSumJunior !== formState.totalPriceJunior) {
      errors.push(
        t(
          `${viewDictionary}.validation.fractionSumJuniorMismatch`,
          'La suma de los precios de las fracciones para 14-16 años debe ser igual al precio total'
        )
      )
    }

    return errors
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    log.info('Iniciando envío del formulario de nueva temporada')
    setFormState((prev) => ({ ...prev, submitting: true }))

    try {
      if (!user) {
        log.warn('Intento de crear temporada sin usuario autenticado')
        await showPopup({
          title: t(`${viewDictionary}.errorPopup.title`, 'Error'),
          text: t(
            `${viewDictionary}.authError`,
            'Debe iniciar sesión para realizar esta acción.'
          ),
          icon: 'error',
          confirmButtonText: t('components.popup.confirmButtonText', 'Aceptar'),
        })
        return
      }
      log.info('Usuario autenticado:', user.uid)

      const errors = await validateForm()
      if (errors.length > 0) {
        log.warn('Errores de validación en el formulario:', errors)
        await showPopup({
          title: t(`${viewDictionary}.errorPopup.title`, 'Error'),
          text: errors.join('\n\n'),
          icon: 'error',
          confirmButtonText: t('components.popup.confirmButtonText', 'Aceptar'),
        })
        setFormState((prev) => ({ ...prev, submitting: false }))
        return
      }
      log.info('Formulario validado correctamente')

      if (formState.active && existingActiveSeason) {
        log.info('Desactivando temporada actual:', existingActiveSeason.id)
        try {
          await updateDoc(doc(db, 'seasons', existingActiveSeason.id), {
            active: false,
            lastUpdateDate: serverTimestamp(),
          })
          log.info('Temporada existente desactivada con éxito')
        } catch (updateError) {
          log.error('Error al desactivar temporada existente:', updateError)
          throw new Error(
            t(
              `${viewDictionary}.errorPopup.deactivateSeasonError`,
              'Error al desactivar la temporada existente.'
            )
          )
        }
      }

      log.info('Creando nueva temporada con datos:', { ...formState })
      let newSeasonDocRef
      try {
        newSeasonDocRef = await addDoc(collection(db, 'seasons'), {
          seasonYear: formState.seasonYear,
          totalPrice: formState.totalPrice,
          numberOfFractions: 3,
          priceFirstFraction: formState.priceFirstFraction,
          priceSeconFraction: formState.priceSeconFraction,
          priceThirdFraction: formState.priceThirdFraction,
          totalPriceJunior: formState.totalPriceJunior,
          priceFirstFractionJunior: formState.priceFirstFractionJunior,
          priceSeconFractionJunior: formState.priceSeconFractionJunior,
          priceThirdFractionJunior: formState.priceThirdFractionJunior,
          active: formState.active,
          createdAt: serverTimestamp(),
          userId: user.uid,
        })
        log.info('Nueva temporada creada con ID:', newSeasonDocRef.id)
      } catch (addError) {
        // Manejo silencioso para producción
        throw new Error(
          t(
            `${viewDictionary}.errorPopup.createSeasonError`,
            'Error al crear la temporada.'
          )
        )
      }

      log.info('Consultando socios aprobados')
      let approvedPartnersSnapshot
      try {
        const approvedPartnersQuery = query(
          collection(db, 'partners'),
          where('status', '==', 'approved')
        )
        approvedPartnersSnapshot = await getDocs(approvedPartnersQuery)
        log.info('Socios aprobados encontrados:', approvedPartnersSnapshot.size)
      } catch (queryError) {
        // Manejo silencioso para producción
        throw new Error(
          'Error al consultar socios aprobados: ' + queryError.message
        )
      }

      if (!approvedPartnersSnapshot.empty) {
        setCreatingPayments(true)

        try {
          let createdCount = 0
          let skippedCount = 0
          let juniorPricesCount = 0
          let adultPricesCount = 0

          for (const partnerDoc of approvedPartnersSnapshot.docs) {
            const partnerId = partnerDoc.id
            const partnerData = partnerDoc.data()

            try {
              const age = calculateAge(partnerData.birthDate)
              log.info(`Socio ${partnerId}: edad calculada ${age} años`)

              let firstPaymentPrice, secondPaymentPrice, thirdPaymentPrice

              if (age !== null && age >= 14 && age <= 16) {
                firstPaymentPrice = formState.priceFirstFractionJunior
                secondPaymentPrice = formState.priceSeconFractionJunior
                thirdPaymentPrice = formState.priceThirdFractionJunior
                juniorPricesCount++
                log.info(
                  `Aplicando tarifa junior para socio ${partnerId} (${age} años)`
                )
              } else {
                firstPaymentPrice = formState.priceFirstFraction
                secondPaymentPrice = formState.priceSeconFraction
                thirdPaymentPrice = formState.priceThirdFraction
                adultPricesCount++
                log.info(
                  `Aplicando tarifa estándar para socio ${partnerId} (${age} años)`
                )
              }

              const paymentData = {
                seasonYear: formState.seasonYear,
                firstPayment: false,
                firstPaymentDone: false,
                firstPaymentPrice: firstPaymentPrice,
                firstPaymentDate: null,
                secondPayment: false,
                secondPaymentDone: false,
                secondPaymentPrice: secondPaymentPrice,
                secondPaymentDate: null,
                thirdPayment: false,
                thirdPaymentDone: false,
                thirdPaymentPrice: thirdPaymentPrice,
                thirdPaymentDate: null,
                priceCategory:
                  age !== null && age >= 14 && age <= 16 ? 'junior' : 'adult',
                partnerAge: age || 'unknown',
              }

              const result = await createPaymentForPartner(
                partnerId,
                paymentData,
                user.uid
              )

              if (result.created) {
                createdCount++
              } else if (result.existing) {
                skippedCount++
              }
            } catch (error) {
              // Manejo silencioso para producción
              throw error
            }
          }

          // Mostrar resumen
          if (createdCount > 0) {
            await showPopup({
              title: t(
                `${viewDictionary}.paymentsCreatedTitle`,
                'Documentos de pagos creados'
              ),
              text: t(
                `${viewDictionary}.paymentsCreatedDetailedText`,
                'Se han creado {{createdCount}} documentos de pagos para la nueva temporada ({{adultCount}} adultos, {{juniorCount}} junior). Se omitieron {{skippedCount}} socios que ya tenían pagos configurados.',
                {
                  createdCount,
                  skippedCount,
                  adultCount: adultPricesCount,
                  juniorCount: juniorPricesCount,
                }
              ),
              icon: 'success',
              confirmButtonText: t(
                'components.popup.confirmButtonText',
                'Aceptar'
              ),
            })
          }
        } catch (error) {
          throw error
        } finally {
          setCreatingPayments(false)
        }
      }

      log.info('Proceso completado con éxito, mostrando mensaje final')
      await showPopup({
        title: t(`${viewDictionary}.successPopup.title`, 'Éxito'),
        text: t(
          `${viewDictionary}.successPopup.text`,
          'La temporada ha sido registrada correctamente.'
        ),
        icon: 'success',
        confirmButtonText: t('components.popup.confirmButtonText', 'Aceptar'),
      })

      log.info('Redirigiendo a dashboard')
      navigate('/dashboard')
      resetForm()
    } catch (error) {
      await showPopup({
        title: t(`${viewDictionary}.errorPopup.title`, 'Error'),
        text:
          error.message ||
          t(
            `${viewDictionary}.errorPopup.text`,
            'Ha ocurrido un error al registrar la temporada.'
          ),
        icon: 'error',
        confirmButtonText: t('components.popup.confirmButtonText', 'Aceptar'),
      })
    } finally {
      setFormState((prev) => ({ ...prev, submitting: false }))
      setCreatingPayments(false)
      log.info('Proceso de registro finalizado')
    }
  }

  if (loading) {
    return (
      <Loader
        loading={true}
        size="10vmin"
        color="rgb(21, 100, 46)"
        text={t(`${viewDictionary}.loadingText`, 'Cargando...')}
      />
    )
  }

  return (
    <div className="flex flex-col items-center w-[92%] md:w-auto pb-[4vh] mx-auto max-w-4xl">
      <Loader loading={formState.submitting || creatingPayments} />
      <h1 className="mb-[4vh] text-center sm:t64b t40b">
        {t(`${viewDictionary}.title`, 'Registrar Nueva Temporada')}
      </h1>

      {existingActiveSeason && (
        <div className="p-[4%] mb-[4vh] text-sm text-blue-700 bg-blue-100 rounded-lg w-full">
          <p>
            {t(
              `${viewDictionary}.activeSeasonNotice`,
              'Ya existe una temporada activa para el año {{seasonYear}}. Si activa esta nueva temporada, la actual se desactivará automáticamente.',
              { seasonYear: existingActiveSeason.seasonYear }
            )}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="w-full">
        <div className="flex flex-col items-center mb-[4vh]">
          <DynamicInput
            name="seasonYear"
            textId={`${viewDictionary}.seasonYearLabel`}
            defaultText="Año de temporada"
            type="text"
            value={formState.seasonYear}
            onChange={handleInputChange}
            disabled={formState.submitting}
            required
          />

          {checkingYear && (
            <p className="mt-[2vh] text-sm text-gray-500">
              {t(
                `${viewDictionary}.checkingYear`,
                'Verificando disponibilidad del año...'
              )}
            </p>
          )}

          {yearValidationMessage && (
            <p className="mt-[2vh] text-sm text-red-600">
              {yearValidationMessage}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-[4vh] md:grid-cols-2 md:gap-[3vw]">
          <div className="p-[5%] space-y-[3vh] rounded-[30px] h-fit mb-[4vh] text-black">
            <h2 className="mb-[3vh] text-center t24b">
              {t(`${viewDictionary}.adultPrices`, 'Mayores de 16 años')}
            </h2>
            <div className="flex flex-col items-center">
              <DynamicInput
                name="totalPrice"
                textId={`${viewDictionary}.totalPriceLabel`}
                defaultText="Precio total"
                type="text"
                value={formState.totalPrice}
                onChange={handleInputChange}
                disabled={formState.submitting}
                required
              />
            </div>
            <div className="flex flex-col items-center">
              <DynamicInput
                name="priceFirstFraction"
                textId={`${viewDictionary}.priceFirstFractionLabel`}
                defaultText="Precio primera fracción"
                type="text"
                value={formState.priceFirstFraction}
                onChange={handleInputChange}
                disabled={formState.submitting}
                required
              />
            </div>
            <div className="flex flex-col items-center">
              <DynamicInput
                name="priceSeconFraction"
                textId={`${viewDictionary}.priceSeconFractionLabel`}
                defaultText="Precio segunda fracción"
                type="text"
                value={formState.priceSeconFraction}
                onChange={handleInputChange}
                disabled={formState.submitting}
                required
              />
            </div>
            <div className="flex flex-col items-center">
              <DynamicInput
                name="priceThirdFraction"
                textId={`${viewDictionary}.priceThirdFractionLabel`}
                defaultText="Precio tercera fracción"
                type="text"
                value={formState.priceThirdFraction}
                onChange={handleInputChange}
                disabled={formState.submitting}
                required
              />
            </div>
          </div>

          <div className="p-[5%] space-y-[3vh] rounded-[30px] h-fit mb-[4vh] text-black">
            <h2 className="mb-[3vh] text-center t24b">
              {t(`${viewDictionary}.juniorPrices`, 'Precios para 14-16 años')}
            </h2>
            <div className="flex flex-col items-center">
              <DynamicInput
                name="totalPriceJunior"
                textId={`${viewDictionary}.totalPriceLabel`}
                defaultText="Precio total"
                type="text"
                value={formState.totalPriceJunior}
                onChange={handleInputChange}
                disabled={formState.submitting}
                required
              />
            </div>
            <div className="flex flex-col items-center">
              <DynamicInput
                name="priceFirstFractionJunior"
                textId={`${viewDictionary}.priceFirstFractionLabel`}
                defaultText="Precio primera fracción"
                type="text"
                value={formState.priceFirstFractionJunior}
                onChange={handleInputChange}
                disabled={formState.submitting}
                required
              />
            </div>
            <div className="flex flex-col items-center">
              <DynamicInput
                name="priceSeconFractionJunior"
                textId={`${viewDictionary}.priceSeconFractionLabel`}
                defaultText="Precio segunda fracción"
                type="text"
                value={formState.priceSeconFractionJunior}
                onChange={handleInputChange}
                disabled={formState.submitting}
                required
              />
            </div>
            <div className="flex flex-col items-center">
              <DynamicInput
                name="priceThirdFractionJunior"
                textId={`${viewDictionary}.priceThirdFractionLabel`}
                defaultText="Precio tercera fracción"
                type="text"
                value={formState.priceThirdFractionJunior}
                onChange={handleInputChange}
                disabled={formState.submitting}
                required
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center mt-[3vh] space-x-0 sm:space-x-[1vw]">
          <DynamicInput
            name="active"
            type="checkbox"
            textId={`${viewDictionary}.activeLabel`}
            defaultText="Activar temporada"
            checked={formState.active}
            onChange={handleToggleActivation}
            disabled={formState.submitting}
          />

          {activationMessage && (
            <p className="mt-[2vh] text-sm text-amber-600">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="inline w-4 h-4 mr-[0.5vw]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              {activationMessage}
            </p>
          )}
        </div>

        <div className="flex justify-center mt-[4vh]">
          <DynamicButton
            type="submit"
            size="medium"
            state={formState.submitting ? 'disabled' : 'normal'}
            textId={
              formState.submitting
                ? `${viewDictionary}.submittingText`
                : `${viewDictionary}.submitButton`
            }
            defaultText={
              formState.submitting ? 'Guardando...' : 'Guardar temporada'
            }
            disabled={formState.submitting}
          />
        </div>
      </form>
    </div>
  )
}

export default NewSeason
