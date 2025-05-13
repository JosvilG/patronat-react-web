import React, { useEffect, useState } from 'react'
import { useParams, useLocation } from 'react-router-dom'
import log from 'loglevel'
import {
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  where,
} from 'firebase/firestore'
import { db } from '../../firebase/firebase'
import Loader from '../../components/Loader'
import { useTranslation } from 'react-i18next'
import useSlug from '../../hooks/useSlug'
import { showPopup } from '../../services/popupService'
import {
  getPartnerPaymentsForSeason,
  getPartnerPaymentHistory,
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

  // Estados adicionales para pagos
  const [activeSeason, setActiveSeason] = useState(null)
  const [loadingSeason, setLoadingSeason] = useState(false)
  const [partnerPayments, setPartnerPayments] = useState(null)
  const [loadingPayments, setLoadingPayments] = useState(false)
  const [paymentHistory, setPaymentHistory] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  useEffect(() => {
    const fetchPartnerData = async () => {
      setLoading(true)
      try {
        // Si tenemos el partnerId del state, lo usamos directamente
        if (partnerId) {
          const partnerDoc = await getDoc(doc(db, 'partners', partnerId))
          if (partnerDoc.exists()) {
            setPartnerData({ id: partnerDoc.id, ...partnerDoc.data() })

            // Si el socio está aprobado, cargar los datos de pagos
            if (partnerDoc.data().status === 'approved') {
              await fetchActiveSeason()
              await fetchPartnerPayments(partnerDoc.id)
              await fetchPaymentHistory(partnerDoc.id)
            }
          } else {
            setError('Socio no encontrado')
          }
        }
        // Si no tenemos partnerId pero sí un slug, buscamos por slug
        else if (slug) {
          const partnersSnapshot = await getDocs(collection(db, 'partners'))
          let found = false

          for (const partnerDoc of partnersSnapshot.docs) {
            const partnerData = partnerDoc.data()
            const fullName =
              `${partnerData.name || ''} ${partnerData.lastName || ''}`.trim()
            const currentSlug = generateSlug(fullName)

            if (currentSlug === slug) {
              setPartnerData({ id: partnerDoc.id, ...partnerData })

              // Si el socio está aprobado, cargar los datos de pagos
              if (partnerData.status === 'approved') {
                await fetchActiveSeason()
                await fetchPartnerPayments(partnerDoc.id)
                await fetchPaymentHistory(partnerDoc.id)
              }

              found = true
              break
            }
          }

          if (!found) {
            setError('Socio no encontrado')
          }
        } else {
          setError('No se proporcionó información del socio')
        }
      } catch (err) {
        log.error('Error al cargar datos del socio:', err)
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
  }, [slug, partnerId, t, generateSlug, viewDictionary])

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

  // Función para obtener pagos de la temporada actual
  const fetchPartnerPayments = async (partnerId) => {
    if (!partnerId) return

    setLoadingPayments(true)
    try {
      if (!activeSeason) {
        await fetchActiveSeason()
      }

      if (!activeSeason) {
        setPartnerPayments(null)
        return
      }

      // Intentar obtener pagos
      const payments = await getPartnerPaymentsForSeason(
        partnerId,
        activeSeason.seasonYear
      )

      setPartnerPayments(payments)
    } catch (error) {
      console.error('Error al cargar pagos:', error)
      setPartnerPayments(null)
    } finally {
      setLoadingPayments(false)
    }
  }

  // Función para obtener historial de pagos
  const fetchPaymentHistory = async (partnerId) => {
    if (!partnerId) return

    setLoadingHistory(true)
    try {
      const activeYear = activeSeason ? activeSeason.seasonYear : null
      const history = await getPartnerPaymentHistory(partnerId, activeYear)
      setPaymentHistory(history || [])
    } catch (error) {
      console.error('Error al cargar historial de pagos:', error)
      setPaymentHistory([])
    } finally {
      setLoadingHistory(false)
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
      console.error('Error al exportar datos del socio:', error)
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
        return 'bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs inline-block'
      case 'rejected':
        return 'bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs inline-block'
      case 'pending':
      default:
        return 'bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs inline-block'
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
        text={t(
          `${viewDictionary}.loading`,
          'Cargando información del socio...'
        )}
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

  return (
    <div className="container pb-6 mx-auto">
      <h1 className="mb-6 text-center t64b">
        {t(`${viewDictionary}.title`, 'Información del Socio')}
      </h1>

      {partnerData ? (
        <div className="p-6 bg-white rounded-lg shadow-md">
          {/* Añadir un botón de exportar en la parte superior */}
          <div className="flex justify-end mb-4">
            <DynamicButton
              onClick={handleExportToExcel}
              size="small"
              state="normal"
              type="download"
              textId={`${viewDictionary}.exportToExcel`}
              defaultText="Exportar datos"
            />
          </div>

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
                  {t(
                    `${viewDictionary}.personalInformation.name`,
                    'Nombre completo:'
                  )}
                </span>{' '}
                {partnerData.name} {partnerData.lastName}
              </p>
              <p className="mb-2 t16r">
                <span className="font-bold">
                  {t(
                    `${viewDictionary}.personalInformation.email`,
                    'Correo Electrónico:'
                  )}
                </span>{' '}
                {partnerData.email}
              </p>
              <p className="mb-2 t16r">
                <span className="font-bold">
                  {t(`${viewDictionary}.personalInformation.dni`, 'DNI:')}
                </span>{' '}
                {partnerData.dni}
              </p>
              <p className="mb-2 t16r">
                <span className="font-bold">
                  {t(
                    `${viewDictionary}.personalInformation.phone`,
                    'Teléfono:'
                  )}
                </span>{' '}
                {partnerData.phone || '-'}
              </p>
              <p className="mb-2 t16r">
                <span className="font-bold">
                  {t(
                    `${viewDictionary}.personalInformation.birthDate`,
                    'Fecha de Nacimiento:'
                  )}
                </span>{' '}
                {formatDate(partnerData.birthDate) || '-'}
              </p>
            </div>

            <div>
              <h2 className="mb-4 t24b">
                {t(
                  `${viewDictionary}.additionalInformation.title`,
                  'Información Adicional'
                )}
              </h2>
              <p className="mb-2 t16r">
                <span className="font-bold">
                  {t(
                    `${viewDictionary}.additionalInformation.address`,
                    'Dirección:'
                  )}
                </span>{' '}
                {partnerData.address || '-'}
              </p>
              <p className="mb-2 t16r">
                <span className="font-bold">
                  {t(
                    `${viewDictionary}.additionalInformation.accountNumber`,
                    'IBAN:'
                  )}
                </span>{' '}
                {partnerData.accountNumber || '-'}
              </p>
              <p className="mb-2 t16r">
                <span className="font-bold">
                  {t(
                    `${viewDictionary}.additionalInformation.status`,
                    'Estado:'
                  )}
                </span>{' '}
                <span className={getStatusBadgeClass(partnerData.status)}>
                  {getStatusText(partnerData.status)}
                </span>
              </p>
            </div>
          </div>

          {partnerData.createdAt && (
            <div className="pt-4 mt-6 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                <span className="font-bold">
                  {t(
                    `${viewDictionary}.registrationInformation.createdAt`,
                    'Fecha de Registro:'
                  )}
                </span>{' '}
                {formatDate(partnerData.createdAt)}
              </p>
              {partnerData.createdBy && (
                <p className="text-sm text-gray-500">
                  <span className="font-bold">
                    {t(
                      `${viewDictionary}.registrationInformation.createdBy`,
                      'Registrado por:'
                    )}
                  </span>{' '}
                  {partnerData.createdBy}
                </p>
              )}
            </div>
          )}

          {/* Sección de información de pagos */}
          {partnerData.status === 'approved' && (
            <div className="pt-4 mt-6 border-t border-gray-200">
              <h2 className="mb-4 t24b">
                {t(`${viewDictionary}.payments.title`, 'Información de Pagos')}
              </h2>

              {/* Temporada activa */}
              <div className="mb-6">
                <h3 className="mb-3 font-medium t18b">
                  {t(
                    `${viewDictionary}.payments.activeSeason`,
                    'Temporada Activa'
                  )}
                </h3>

                {loadingSeason ? (
                  <p className="text-sm text-gray-500">
                    {t(
                      `${viewDictionary}.payments.loadingSeason`,
                      'Cargando información de la temporada...'
                    )}
                  </p>
                ) : activeSeason ? (
                  <div className="p-4 rounded-lg bg-gray-50">
                    <div className="flex justify-between mb-2">
                      <span className="font-medium">
                        {t(`${viewDictionary}.payments.seasonYear`, 'Año:')}
                      </span>
                      <span>{activeSeason.seasonYear}</span>
                    </div>

                    <div className="flex justify-between mb-2">
                      <span className="font-medium">
                        {t(
                          `${viewDictionary}.payments.totalPrice`,
                          'Precio total:'
                        )}
                      </span>
                      <span>{activeSeason.totalPrice}€</span>
                    </div>

                    <div className="flex justify-between mb-2">
                      <span className="font-medium">
                        {t(
                          `${viewDictionary}.payments.numberOfFractions`,
                          'Número de fracciones:'
                        )}
                      </span>
                      <span>{activeSeason.numberOfFractions}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">
                    {t(
                      `${viewDictionary}.payments.noActiveSeason`,
                      'No hay temporada activa configurada.'
                    )}
                  </p>
                )}
              </div>

              {/* Estado de pagos de la temporada actual */}
              <div className="mb-6">
                <h3 className="mb-3 font-medium t18b">
                  {t(
                    `${viewDictionary}.payments.paymentStatus`,
                    'Estado de Pagos'
                  )}
                </h3>

                {loadingPayments ? (
                  <p className="text-sm text-gray-500">
                    {t(
                      `${viewDictionary}.payments.loadingPayments`,
                      'Cargando información de pagos...'
                    )}
                  </p>
                ) : partnerPayments ? (
                  <div className="p-4 rounded-lg bg-gray-50">
                    <h4 className="mb-3 text-sm font-medium">
                      {t(
                        `${viewDictionary}.payments.fractionsStatus`,
                        'Estado de las fracciones'
                      )}
                    </h4>

                    <div className="pb-2 mb-4 border-b border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">
                          {t(
                            `${viewDictionary}.payments.firstFraction`,
                            'Primera fracción'
                          )}
                        </span>
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${
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
                          <span>
                            {t(`${viewDictionary}.payments.amount`, 'Importe')}:
                          </span>
                          <span>{partnerPayments.firstPaymentPrice}€</span>
                        </div>
                      )}

                      {partnerPayments.firstPayment &&
                        partnerPayments.firstPaymentDate && (
                          <div className="flex justify-between text-sm">
                            <span>
                              {t(
                                `${viewDictionary}.payments.paymentDate`,
                                'Fecha de pago'
                              )}
                              :
                            </span>
                            <span>
                              {formatDate(partnerPayments.firstPaymentDate)}
                            </span>
                          </div>
                        )}
                    </div>

                    {activeSeason && activeSeason.numberOfFractions >= 2 && (
                      <div className="pb-2 mb-4 border-b border-gray-200">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">
                            {t(
                              `${viewDictionary}.payments.secondFraction`,
                              'Segunda fracción'
                            )}
                          </span>
                          <span
                            className={`px-2 py-1 rounded-full text-xs ${
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

                    {activeSeason && activeSeason.numberOfFractions >= 3 && (
                      <div className="mb-2">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">
                            {t(
                              `${viewDictionary}.payments.thirdFraction`,
                              'Tercera fracción'
                            )}
                          </span>
                          <span
                            className={`px-2 py-1 rounded-full text-xs ${
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
                  <p className="text-sm text-gray-500">
                    {t(
                      `${viewDictionary}.payments.noPaymentsFound`,
                      'No se encontró información de pagos para este socio.'
                    )}
                  </p>
                )}
              </div>

              {/* Historial de pagos */}
              <div className="mb-4">
                <h3 className="mb-3 font-medium t18b">
                  {t(
                    `${viewDictionary}.payments.history`,
                    'Historial de pagos'
                  )}
                </h3>

                {loadingHistory ? (
                  <p className="text-sm text-gray-500">
                    {t(
                      `${viewDictionary}.payments.loadingHistory`,
                      'Cargando historial de pagos...'
                    )}
                  </p>
                ) : paymentHistory.length > 0 ? (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
                    {paymentHistory.map((payment) => (
                      <div
                        key={payment.id}
                        className="p-3 rounded-lg bg-gray-50"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">
                            Temporada {payment.seasonYear}
                          </span>
                        </div>

                        {(payment.firstPayment ||
                          payment.firstPaymentPrice > 0) && (
                          <div className="pb-1 mb-2 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                              <span className="text-sm">Primera fracción:</span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-xs ${
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
                              <div className="flex justify-between mt-1 text-xs">
                                <span>Importe:</span>
                                <span>{payment.firstPaymentPrice}€</span>
                              </div>
                            )}
                            {payment.firstPayment &&
                              payment.firstPaymentDate && (
                                <div className="flex justify-between mt-1 text-xs">
                                  <span>Fecha:</span>
                                  <span>
                                    {formatDate(payment.firstPaymentDate)}
                                  </span>
                                </div>
                              )}
                          </div>
                        )}

                        {(payment.secondPaymentDone ||
                          payment.secondPaymentPrice > 0) && (
                          <div className="pb-1 mb-2 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                              <span className="text-sm">Segunda fracción:</span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-xs ${
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
                              <div className="flex justify-between mt-1 text-xs">
                                <span>Importe:</span>
                                <span>{payment.secondPaymentPrice}€</span>
                              </div>
                            )}
                            {payment.secondPaymentDone &&
                              payment.secondPaymentDate && (
                                <div className="flex justify-between mt-1 text-xs">
                                  <span>Fecha:</span>
                                  <span>
                                    {formatDate(payment.secondPaymentDate)}
                                  </span>
                                </div>
                              )}
                          </div>
                        )}

                        {(payment.thirdPaymentDone ||
                          payment.thirdPaymentPrice > 0) && (
                          <div className="mb-1">
                            <div className="flex items-center justify-between">
                              <span className="text-sm">Tercera fracción:</span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-xs ${
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
                              <div className="flex justify-between mt-1 text-xs">
                                <span>Importe:</span>
                                <span>{payment.thirdPaymentPrice}€</span>
                              </div>
                            )}
                            {payment.thirdPaymentDone &&
                              payment.thirdPaymentDate && (
                                <div className="flex justify-between mt-1 text-xs">
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
                  <p className="text-sm text-gray-500">
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
