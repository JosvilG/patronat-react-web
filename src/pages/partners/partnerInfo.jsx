import React, { useEffect, useState, useRef } from 'react'
import { useParams, useLocation } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../../firebase/firebase'
import Loader from '../../components/Loader'
import { useTranslation } from 'react-i18next'
import useSlug from '../../hooks/useSlug'
import { showPopup } from '../../services/popupService'
import {
  listenPartnerPaymentForSeason,
  listenPartnerPaymentHistory,
  getActiveSeason,
} from '../../hooks/paymentService'
import { exportPartnerToExcel } from '../../utils/createExcel'
import DynamicButton from '../../components/Buttons'

function PartnerInfo() {
  const [partnerData, setPartnerData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const { slug } = useParams()
  const location = useLocation()
  const partnerId = location.state?.partnerId
  const { t } = useTranslation()
  const viewDictionary = 'pages.partners.partnerInfo'
  const { generateSlug } = useSlug()

  const [activeSeason, setActiveSeason] = useState(null)
  const [loadingSeason, setLoadingSeason] = useState(false)
  const [partnerPayments, setPartnerPayments] = useState(null)
  const [loadingPayments, setLoadingPayments] = useState(false)
  const [paymentHistory, setPaymentHistory] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  const paymentListenerRef = useRef(null)
  const historyListenerRef = useRef(null)

  useEffect(() => {
    const fetchPartnerData = async () => {
      setLoading(true)
      try {
        let docSnap = null
        if (partnerId) {
          docSnap = await getDoc(doc(db, 'partners', partnerId))
        } else if (slug) {
          const partsSnap = await getDoc(doc(db, 'partners', slug))
          docSnap = partsSnap.exists() ? partsSnap : null
        }

        if (!docSnap || !docSnap.exists()) {
          setError('Socio no encontrado')
        } else {
          const data = { id: docSnap.id, ...docSnap.data() }
          setPartnerData(data)

          // Si el socio está aprobado, cargar la temporada activa
          if (data.status === 'approved') {
            fetchActiveSeason()
          }
        }
      } catch (err) {
        setError('No se pudieron cargar los datos del socio')
        await showPopup({
          title: t(`${viewDictionary}.errorPopup.title`, 'Error'),
          text: t(
            `${viewDictionary}.errorPopup.text`,
            'No se pudieron cargar los datos del socio'
          ),
          icon: 'error',
          confirmButtonText: t('components.popup.confirmButtonText', 'Aceptar'),
        })
      } finally {
        setLoading(false)
      }
    }

    fetchPartnerData()

    // Limpieza de suscripciones al desmontar
    return () => {
      if (paymentListenerRef.current) {
        paymentListenerRef.current()
      }
      if (historyListenerRef.current) {
        historyListenerRef.current()
      }
    }
  }, [slug, partnerId, t, generateSlug, viewDictionary])

  // Efecto para configurar listeners cuando cambia la temporada activa o el socio
  useEffect(() => {
    if (!partnerData || !activeSeason) return

    // Limpia listeners previos si existen
    if (paymentListenerRef.current) {
      paymentListenerRef.current()
    }
    if (historyListenerRef.current) {
      historyListenerRef.current()
    }

    // Configurar listener para pagos actuales
    setLoadingPayments(true)
    paymentListenerRef.current = listenPartnerPaymentForSeason(
      partnerData.id,
      activeSeason.seasonYear,
      (payment) => {
        // Si no hay pagos, crear un objeto de pago predeterminado
        if (!payment) {
          payment = {
            id: 'pending-creation',
            seasonYear: activeSeason.seasonYear,
            firstPayment: false,
            firstPaymentPrice: activeSeason.priceFirstFraction || 0,
            secondPaymentDone: false,
            secondPaymentPrice: activeSeason.priceSeconFraction || 0,
            thirdPaymentDone: false,
            thirdPaymentPrice: activeSeason.priceThirdFraction || 0,
          }
        }
        setPartnerPayments(payment)
        setLoadingPayments(false)
      },
      (error) => {
        setLoadingPayments(false)
      }
    )

    // Configurar listener para historial de pagos
    setLoadingHistory(true)
    historyListenerRef.current = listenPartnerPaymentHistory(
      partnerData.id,
      activeSeason.seasonYear,
      (history) => {
        setPaymentHistory(history || [])
        setLoadingHistory(false)
      },
      (error) => {
        setLoadingHistory(false)
      }
    )
  }, [partnerData, activeSeason])

  const fetchActiveSeason = async () => {
    setLoadingSeason(true)
    try {
      const season = await getActiveSeason()
      setActiveSeason(season)
    } catch (error) {
      setActiveSeason(null)
    } finally {
      setLoadingSeason(false)
    }
  }

  const handleExportToExcel = async () => {
    if (!partnerData) return

    try {
      await exportPartnerToExcel(
        partnerData,
        activeSeason,
        partnerPayments,
        paymentHistory,
        showPopup,
        t,
        viewDictionary
      )
    } catch (error) {
      await showPopup({
        title: t(`${viewDictionary}.errorPopup.title`, 'Error'),
        text: t(
          `${viewDictionary}.errorPopup.exportError`,
          'Ha ocurrido un error al exportar los datos del socio.'
        ),
        icon: 'error',
        confirmButtonText: t('components.popup.confirmButtonText', 'Aceptar'),
      })
    }
  }

  const formatDate = (dateObj) => {
    if (!dateObj) return '-'

    // Si es un timestamp de Firestore
    if (dateObj.toDate) {
      dateObj = dateObj.toDate()
    }

    // Si es una fecha válida
    if (dateObj instanceof Date) {
      return dateObj.toLocaleDateString()
    }

    return dateObj
  }

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 px-[2vw] py-[1vh] rounded-full text-xs inline-block'
      case 'rejected':
        return 'bg-red-100 text-red-800 px-[2vw] py-[1vh] rounded-full text-xs inline-block'
      case 'pending':
      default:
        return 'bg-yellow-100 text-yellow-800 px-[2vw] py-[1vh] rounded-full text-xs inline-block'
    }
  }

  const getStatusText = (status) => {
    switch (status) {
      case 'approved':
        return t(`${viewDictionary}.status.approved`, 'Aprobado')
      case 'rejected':
        return t(`${viewDictionary}.status.rejected`, 'Rechazado')
      case 'pending':
      default:
        return t(`${viewDictionary}.status.pending`, 'Pendiente')
    }
  }

  if (loading) {
    return (
      <Loader
        loading={true}
        size="10vmin"
        text={t(
          `${viewDictionary}.loading`,
          'Cargando información del socio...'
        )}
      />
    )
  }

  if (error) {
    return (
      <div className="p-[4%] text-center text-red-600">
        {t(`${viewDictionary}.${error}`, error)}
      </div>
    )
  }

  return (
    <div className="container pb-[4vh] mx-auto w-[92%] md:w-auto">
      <h1 className="mb-[4vh] text-center sm:t64b t40b">
        {t(`${viewDictionary}.title`, 'Información del Socio')}
      </h1>

      {partnerData ? (
        <div className="p-[4%]">
          {/* Botón de exportar */}
          <div className="flex justify-end mb-[3vh]">
            <DynamicButton
              onClick={handleExportToExcel}
              size="small"
              state="normal"
              type="download"
              textId={`${viewDictionary}.exportToExcel`}
              defaultText="Exportar datos"
            />
          </div>

          {/* Información personal y adicional */}
          <div className="grid grid-cols-1 gap-[4vh] md:grid-cols-2 md:gap-[3vw] backdrop-blur-lg backdrop-saturate-[180%] bg-[rgba(255,255,255,0.75)] rounded-xl">
            <div className="py-[3vh] pl-[4%] pr-[4%] md:pr-0">
              <h2 className="mb-[3vh] t24b">
                {t(
                  `${viewDictionary}.personalInformation.title`,
                  'Información Personal'
                )}
              </h2>
              <p className="mb-[1.5vh] t16r break-words">
                <span className="font-bold">
                  {t(
                    `${viewDictionary}.personalInformation.name`,
                    'Nombre completo:'
                  )}
                </span>{' '}
                {partnerData.name} {partnerData.lastName}
              </p>
              <p className="mb-[1.5vh] t16r break-words">
                <span className="font-bold">
                  {t(
                    `${viewDictionary}.personalInformation.email`,
                    'Correo Electrónico:'
                  )}
                </span>{' '}
                {partnerData.email}
              </p>
              <p className="mb-[1.5vh] t16r break-words">
                <span className="font-bold">
                  {t(`${viewDictionary}.personalInformation.dni`, 'DNI:')}
                </span>{' '}
                {partnerData.dni}
              </p>
              <p className="mb-[1.5vh] t16r break-words">
                <span className="font-bold">
                  {t(
                    `${viewDictionary}.personalInformation.phone`,
                    'Teléfono:'
                  )}
                </span>{' '}
                {partnerData.phone || '-'}
              </p>
              <p className="mb-[1.5vh] t16r break-words">
                <span className="font-bold">
                  {t(
                    `${viewDictionary}.personalInformation.birthDate`,
                    'Fecha de Nacimiento:'
                  )}
                </span>{' '}
                {formatDate(partnerData.birthDate) || '-'}
              </p>
            </div>

            <div className="py-[3vh] pl-[4%] pr-[4%] md:pr-0">
              <h2 className="mb-[3vh] t24b">
                {t(
                  `${viewDictionary}.additionalInformation.title`,
                  'Información Adicional'
                )}
              </h2>
              <p className="mb-[1.5vh] t16r break-words">
                <span className="font-bold">
                  {t(
                    `${viewDictionary}.additionalInformation.address`,
                    'Dirección:'
                  )}
                </span>{' '}
                {partnerData.address || '-'}
              </p>
              <p className="mb-[1.5vh] t16r break-words">
                <span className="font-bold">
                  {t(
                    `${viewDictionary}.additionalInformation.accountNumber`,
                    'IBAN:'
                  )}
                </span>{' '}
                {partnerData.accountNumber || '-'}
              </p>
              <p className="mb-[1.5vh] t16r break-words">
                <span className="font-bold">
                  {t(
                    `${viewDictionary}.additionalInformation.status`,
                    'Estado:'
                  )}
                </span>{' '}
                <span
                  className={`${getStatusBadgeClass(partnerData.status)} break-words`}
                >
                  {getStatusText(partnerData.status)}
                </span>
              </p>
            </div>
          </div>

          {/* Información de registro */}
          {partnerData.createdAt && (
            <div className="py-[3vh] px-[4%] mt-[4vh] border-t backdrop-blur-lg backdrop-saturate-[180%] bg-[rgba(255,255,255,0.75)] rounded-xl">
              <p className="text-sm text-gray-500 break-words">
                <span className="font-bold">
                  {t(
                    `${viewDictionary}.registrationInformation.createdAt`,
                    'Fecha de Registro:'
                  )}
                </span>{' '}
                {formatDate(partnerData.createdAt)}
              </p>
            </div>
          )}

          {/* Información de pagos - Temporada activa */}
          {partnerData.status === 'approved' && (
            <div className="pt-[3vh] mt-[4vh] pb-[3vh] px-[4%] border-t backdrop-blur-lg backdrop-saturate-[180%] bg-[rgba(255,255,255,0.75)] rounded-xl">
              <h2 className="mb-[3vh] t24b">
                {t(`${viewDictionary}.payments.title`, 'Información de Pagos')}
              </h2>

              {activeSeason ? (
                <div className="p-[4%] mb-[4vh]">
                  <h3 className="mb-[2vh] font-medium break-words">
                    {t(
                      `${viewDictionary}.payments.activeSeason`,
                      'Temporada Activa:'
                    )}{' '}
                    {activeSeason.seasonYear}
                  </h3>
                  <div className="grid grid-cols-1 gap-[3vh] md:grid-cols-2 md:gap-[2vw]">
                    <div>
                      <p className="text-sm font-medium text-gray-700 break-words">
                        {t(
                          `${viewDictionary}.payments.adultPrices`,
                          'Precios Adultos (>16 años)'
                        )}
                        :
                      </p>
                      <p className="text-sm text-gray-600 break-words">
                        {t(
                          `${viewDictionary}.payments.totalPrice`,
                          'Precio total:'
                        )}{' '}
                        {activeSeason.totalPrice}€
                      </p>
                      <p className="text-sm text-gray-600 break-words">
                        {t(
                          `${viewDictionary}.payments.firstFraction`,
                          'Primera fracción:'
                        )}{' '}
                        {activeSeason.priceFirstFraction}€
                      </p>
                      <p className="text-sm text-gray-600 break-words">
                        {t(
                          `${viewDictionary}.payments.secondFraction`,
                          'Segunda fracción:'
                        )}{' '}
                        {activeSeason.priceSeconFraction}€
                      </p>
                      <p className="text-sm text-gray-600 break-words">
                        {t(
                          `${viewDictionary}.payments.thirdFraction`,
                          'Tercera fracción:'
                        )}{' '}
                        {activeSeason.priceThirdFraction}€
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700 break-words">
                        {t(
                          `${viewDictionary}.payments.juniorPrices`,
                          'Precios Junior (14-16 años)'
                        )}
                        :
                      </p>
                      <p className="text-sm text-gray-600 break-words">
                        {t(
                          `${viewDictionary}.payments.totalPrice`,
                          'Precio total:'
                        )}{' '}
                        {activeSeason.totalPriceJunior || 0}€
                      </p>
                      <p className="text-sm text-gray-600 break-words">
                        {t(
                          `${viewDictionary}.payments.firstFraction`,
                          'Primera fracción:'
                        )}{' '}
                        {activeSeason.priceFirstFractionJunior || 0}€
                      </p>
                      <p className="text-sm text-gray-600 break-words">
                        {t(
                          `${viewDictionary}.payments.secondFraction`,
                          'Segunda fracción:'
                        )}{' '}
                        {activeSeason.priceSeconFractionJunior || 0}€
                      </p>
                      <p className="text-sm text-gray-600 break-words">
                        {t(
                          `${viewDictionary}.payments.thirdFraction`,
                          'Tercera fracción:'
                        )}{' '}
                        {activeSeason.priceThirdFractionJunior || 0}€
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-[4%] mb-[4vh] bg-gray-100 rounded-lg">
                  <p className="text-sm text-gray-500 break-words">
                    {t(
                      `${viewDictionary}.payments.noActiveSeason`,
                      'No hay temporada activa configurada.'
                    )}
                  </p>
                </div>
              )}

              {/* Estado de pagos */}
              <div className="mb-[4vh]">
                <h3 className="mb-[2vh] font-medium t18b break-words">
                  {t(
                    `${viewDictionary}.payments.paymentStatus`,
                    'Estado de Pagos'
                  )}
                </h3>

                {loadingPayments ? (
                  <p className="text-sm text-gray-500 break-words">
                    {t(
                      `${viewDictionary}.payments.loadingPayments`,
                      'Cargando información de pagos...'
                    )}
                  </p>
                ) : partnerPayments ? (
                  <div className="p-[4%]">
                    <h4 className="mb-[2vh] text-sm font-medium break-words">
                      {t(
                        `${viewDictionary}.payments.fractionsStatus`,
                        'Estado de las fracciones'
                      )}
                    </h4>

                    {/* Primera fracción */}
                    <div className="pb-[1.5vh] mb-[3vh] border-b border-gray-200">
                      <div className="flex flex-wrap items-center justify-between mb-[1.5vh]">
                        <span className="font-medium break-words">
                          {t(
                            `${viewDictionary}.payments.firstFraction`,
                            'Primera fracción'
                          )}
                        </span>
                        <span
                          className={`px-[2vw] py-[1vh] rounded-full text-xs break-words ${
                            partnerPayments.firstPayment
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {partnerPayments.firstPayment
                            ? t(`${viewDictionary}.payments.paid`, 'Pagado')
                            : t(
                                `${viewDictionary}.payments.pending`,
                                'Pendiente'
                              )}
                        </span>
                      </div>

                      {partnerPayments.firstPaymentPrice > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="break-words">
                            {t(`${viewDictionary}.payments.amount`, 'Importe')}:
                          </span>
                          <span className="break-words">
                            {partnerPayments.firstPaymentPrice}€
                          </span>
                        </div>
                      )}

                      {partnerPayments.firstPayment &&
                        partnerPayments.firstPaymentDate && (
                          <div className="flex justify-between text-sm">
                            <span className="break-words">
                              {t(
                                `${viewDictionary}.payments.paymentDate`,
                                'Fecha de pago'
                              )}
                              :
                            </span>
                            <span className="break-words">
                              {formatDate(partnerPayments.firstPaymentDate)}
                            </span>
                          </div>
                        )}
                    </div>

                    {/* Segunda fracción */}
                    {activeSeason && activeSeason.numberOfFractions >= 2 && (
                      <div className="pb-[1.5vh] mb-[3vh] border-b border-gray-200">
                        <div className="flex flex-wrap items-center justify-between mb-[1.5vh]">
                          <span className="font-medium">
                            {t(
                              `${viewDictionary}.payments.secondFraction`,
                              'Segunda fracción'
                            )}
                          </span>
                          <span
                            className={`px-[2vw] py-[1vh] rounded-full text-xs ${
                              partnerPayments.secondPaymentDone
                                ? 'bg-green-100 text-green-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}
                          >
                            {partnerPayments.secondPaymentDone
                              ? t(`${viewDictionary}.payments.paid`, 'Pagado')
                              : t(
                                  `${viewDictionary}.payments.pending`,
                                  'Pendiente'
                                )}
                          </span>
                        </div>

                        {partnerPayments.secondPaymentPrice > 0 && (
                          <div className="flex justify-between text-sm">
                            <span>
                              {t(
                                `${viewDictionary}.payments.amount`,
                                'Importe'
                              )}
                              :
                            </span>
                            <span>{partnerPayments.secondPaymentPrice}€</span>
                          </div>
                        )}

                        {partnerPayments.secondPaymentDone &&
                          partnerPayments.secondPaymentDate && (
                            <div className="flex justify-between text-sm">
                              <span>
                                {t(
                                  `${viewDictionary}.payments.paymentDate`,
                                  'Fecha de pago'
                                )}
                                :
                              </span>
                              <span>
                                {formatDate(partnerPayments.secondPaymentDate)}
                              </span>
                            </div>
                          )}
                      </div>
                    )}

                    {/* Tercera fracción */}
                    {activeSeason && activeSeason.numberOfFractions >= 3 && (
                      <div className="mb-[2vh]">
                        <div className="flex flex-wrap items-center justify-between mb-[1.5vh]">
                          <span className="font-medium">
                            {t(
                              `${viewDictionary}.payments.thirdFraction`,
                              'Tercera fracción'
                            )}
                          </span>
                          <span
                            className={`px-[2vw] py-[1vh] rounded-full text-xs ${
                              partnerPayments.thirdPaymentDone
                                ? 'bg-green-100 text-green-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}
                          >
                            {partnerPayments.thirdPaymentDone
                              ? t(`${viewDictionary}.payments.paid`, 'Pagado')
                              : t(
                                  `${viewDictionary}.payments.pending`,
                                  'Pendiente'
                                )}
                          </span>
                        </div>

                        {partnerPayments.thirdPaymentPrice > 0 && (
                          <div className="flex justify-between text-sm">
                            <span>
                              {t(
                                `${viewDictionary}.payments.amount`,
                                'Importe'
                              )}
                              :
                            </span>
                            <span>{partnerPayments.thirdPaymentPrice}€</span>
                          </div>
                        )}

                        {partnerPayments.thirdPaymentDone &&
                          partnerPayments.thirdPaymentDate && (
                            <div className="flex justify-between text-sm">
                              <span>
                                {t(
                                  `${viewDictionary}.payments.paymentDate`,
                                  'Fecha de pago'
                                )}
                                :
                              </span>
                              <span>
                                {formatDate(partnerPayments.thirdPaymentDate)}
                              </span>
                            </div>
                          )}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 break-words">
                    {t(
                      `${viewDictionary}.payments.noPaymentsFound`,
                      'No se encontró información de pagos para este socio.'
                    )}
                  </p>
                )}
              </div>

              {/* Historial de pagos */}
              <div className="mb-[4vh]">
                <h3 className="mb-[2vh] font-medium t18b break-words">
                  {t(
                    `${viewDictionary}.payments.history`,
                    'Historial de pagos'
                  )}
                </h3>

                {loadingHistory ? (
                  <p className="text-sm text-gray-500 break-words">
                    {t(
                      `${viewDictionary}.payments.loadingHistory`,
                      'Cargando historial de pagos...'
                    )}
                  </p>
                ) : paymentHistory.length > 0 ? (
                  <div className="grid grid-cols-1 gap-[3vh] sm:grid-cols-2 sm:gap-[2vw] md:grid-cols-3">
                    {paymentHistory.map((payment) => (
                      <div key={payment.id} className="p-[4%] rounded-lg">
                        <div className="flex items-center justify-between mb-[1.5vh]">
                          <span className="font-medium break-words">
                            Temporada {payment.seasonYear}
                          </span>
                        </div>

                        {/* Primera fracción histórica */}
                        {(payment.firstPayment ||
                          payment.firstPaymentPrice > 0) && (
                          <div className="pb-[1vh] mb-[1.5vh] border-b border-gray-200">
                            <div className="flex flex-wrap items-center justify-between">
                              <span className="text-sm break-words">
                                Primera fracción:
                              </span>
                              <span
                                className={`px-[2vw] py-[0.5vh] rounded-full text-xs break-words ${
                                  payment.firstPayment
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-yellow-100 text-yellow-800'
                                }`}
                              >
                                {payment.firstPayment
                                  ? t(
                                      `${viewDictionary}.payments.paid`,
                                      'Pagado'
                                    )
                                  : t(
                                      `${viewDictionary}.payments.pending`,
                                      'Pendiente'
                                    )}
                              </span>
                            </div>
                            {payment.firstPaymentPrice > 0 && (
                              <div className="flex justify-between mt-[1vh] text-xs">
                                <span>Importe:</span>
                                <span>{payment.firstPaymentPrice}€</span>
                              </div>
                            )}
                            {payment.firstPayment &&
                              payment.firstPaymentDate && (
                                <div className="flex justify-between mt-[1vh] text-xs">
                                  <span>Fecha:</span>
                                  <span>
                                    {formatDate(payment.firstPaymentDate)}
                                  </span>
                                </div>
                              )}
                          </div>
                        )}

                        {/* Segunda fracción histórica */}
                        {(payment.secondPaymentDone ||
                          payment.secondPaymentPrice > 0) && (
                          <div className="pb-[1vh] mb-[1.5vh] border-b border-gray-200">
                            <div className="flex flex-wrap items-center justify-between">
                              <span className="text-sm break-words">
                                Segunda fracción:
                              </span>
                              <span
                                className={`px-[2vw] py-[0.5vh] rounded-full text-xs break-words ${
                                  payment.secondPaymentDone
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-yellow-100 text-yellow-800'
                                }`}
                              >
                                {payment.secondPaymentDone
                                  ? t(
                                      `${viewDictionary}.payments.paid`,
                                      'Pagado'
                                    )
                                  : t(
                                      `${viewDictionary}.payments.pending`,
                                      'Pendiente'
                                    )}
                              </span>
                            </div>
                            {payment.secondPaymentPrice > 0 && (
                              <div className="flex justify-between mt-[1vh] text-xs">
                                <span>Importe:</span>
                                <span>{payment.secondPaymentPrice}€</span>
                              </div>
                            )}
                            {payment.secondPaymentDone &&
                              payment.secondPaymentDate && (
                                <div className="flex justify-between mt-[1vh] text-xs">
                                  <span>Fecha:</span>
                                  <span>
                                    {formatDate(payment.secondPaymentDate)}
                                  </span>
                                </div>
                              )}
                          </div>
                        )}

                        {/* Tercera fracción histórica */}
                        {(payment.thirdPaymentDone ||
                          payment.thirdPaymentPrice > 0) && (
                          <div className="mb-[1vh]">
                            <div className="flex flex-wrap items-center justify-between">
                              <span className="text-sm break-words">
                                Tercera fracción:
                              </span>
                              <span
                                className={`px-[2vw] py-[0.5vh] rounded-full text-xs break-words ${
                                  payment.thirdPaymentDone
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-yellow-100 text-yellow-800'
                                }`}
                              >
                                {payment.thirdPaymentDone
                                  ? t(
                                      `${viewDictionary}.payments.paid`,
                                      'Pagado'
                                    )
                                  : t(
                                      `${viewDictionary}.payments.pending`,
                                      'Pendiente'
                                    )}
                              </span>
                            </div>
                            {payment.thirdPaymentPrice > 0 && (
                              <div className="flex justify-between mt-[1vh] text-xs">
                                <span>Importe:</span>
                                <span>{payment.thirdPaymentPrice}€</span>
                              </div>
                            )}
                            {payment.thirdPaymentDone &&
                              payment.thirdPaymentDate && (
                                <div className="flex justify-between mt-[1vh] text-xs">
                                  <span>Fecha:</span>
                                  <span>
                                    {formatDate(payment.thirdPaymentDate)}
                                  </span>
                                </div>
                              )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 break-words">
                    {t(
                      `${viewDictionary}.payments.noPaymentHistory`,
                      'No hay pagos de temporadas anteriores.'
                    )}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className="text-center text-gray-500">
          {t(
            `${viewDictionary}.notFound`,
            'No se encontró información del socio.'
          )}
        </p>
      )}
    </div>
  )
}

export default PartnerInfo
