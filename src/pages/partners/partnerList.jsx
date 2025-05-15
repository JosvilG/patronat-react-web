import React, { useEffect, useState, useRef } from 'react'
import {
  collection,
  getDocs,
  deleteDoc,
  updateDoc,
  doc,
} from 'firebase/firestore'
import { db } from '../../firebase/firebase'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import DynamicInput from '../../components/Inputs'
import DynamicButton from '../../components/Buttons'
import Loader from '../../components/Loader'
import { showPopup } from '../../services/popupService'
import useSlug from '../../hooks/useSlug'
import {
  listenPartnerPaymentForSeason,
  listenPartnerPaymentHistory,
  getActiveSeason,
  createPaymentForPartner,
  getPartnerPaymentHistory,
  getPartnerPaymentsForSeason,
} from '../../hooks/paymentService'
import { getAuth } from 'firebase/auth'
import {
  exportPartnerToExcel,
  exportAllPartnersToExcel,
} from '../../utils/createExcel'

function PartnerList() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { generateSlug } = useSlug()
  const [partners, setPartners] = useState([])
  const [filteredPartners, setFilteredPartners] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const viewDictionary = 'pages.partners.listPartners'

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [selectedPartner, setSelectedPartner] = useState(null)

  const [activeSeason, setActiveSeason] = useState(null)
  const [loadingSeason, setLoadingSeason] = useState(false)

  const [partnerPayments, setPartnerPayments] = useState(null)
  const [loadingPayments, setLoadingPayments] = useState(false)

  const [paymentHistory, setPaymentHistory] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  const [exportingToExcel, setExportingToExcel] = useState(false)
  const [exportingAllToExcel, setExportingAllToExcel] = useState(false)

  // Referencias para los unsubscribe de listeners
  const paymentListenerRef = useRef(null)
  const historyListenerRef = useRef(null)

  // Utilidad para retrasos

  useEffect(() => {
    const fetchPartners = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'partners'))
        const partnerData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        setPartners(partnerData)
        setFilteredPartners(partnerData)
      } catch (error) {
        console.error('Error al obtener los socios:', error)
        await showPopup({
          title: t(`${viewDictionary}.errorPopup.title`, 'Error'),
          text: t(
            `${viewDictionary}.errorPopup.fetchError`,
            'Ha ocurrido un error al obtener los datos de los socios.'
          ),
          icon: 'error',
          confirmButtonText: t('components.popup.confirmButtonText', 'Aceptar'),
        })
      } finally {
        setLoading(false)
      }
    }

    fetchPartners()

    // Limpieza de las suscripciones al desmontar el componente
    return () => {
      if (paymentListenerRef.current) {
        paymentListenerRef.current()
      }
      if (historyListenerRef.current) {
        historyListenerRef.current()
      }
    }
  }, [t, viewDictionary])

  // Efecto para configurar listeners cuando cambia la temporada activa o el socio seleccionado
  useEffect(() => {
    if (!sidebarOpen || !selectedPartner || !activeSeason) return

    // Limpiar listeners previos si existen
    if (paymentListenerRef.current) {
      paymentListenerRef.current()
    }
    if (historyListenerRef.current) {
      historyListenerRef.current()
    }

    // Solo configurar listeners si el socio está aprobado
    if (selectedPartner.status === 'approved') {
      // Configurar listener para pagos actuales
      setLoadingPayments(true)
      paymentListenerRef.current = listenPartnerPaymentForSeason(
        selectedPartner.id,
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
          console.error('Error en listener de pagos:', error)
          setLoadingPayments(false)
        }
      )

      // Configurar listener para historial de pagos
      setLoadingHistory(true)
      historyListenerRef.current = listenPartnerPaymentHistory(
        selectedPartner.id,
        activeSeason.seasonYear,
        (history) => {
          setPaymentHistory(history || [])
          setLoadingHistory(false)
        },
        (error) => {
          console.error('Error en listener de historial:', error)
          setLoadingHistory(false)
        }
      )
    }
  }, [selectedPartner, activeSeason, sidebarOpen])

  const handleSearchChange = (event) => {
    const query = event.target.value.toLowerCase()
    setSearchQuery(query)

    const filtered = partners.filter(
      (partner) =>
        (partner.name && partner.name.toLowerCase().includes(query)) ||
        (partner.lastName && partner.lastName.toLowerCase().includes(query)) ||
        (partner.email && partner.email.toLowerCase().includes(query)) ||
        (partner.dni && partner.dni.toLowerCase().includes(query))
    )

    setFilteredPartners(filtered)
  }

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs'
      case 'rejected':
        return 'bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs'
      case 'pending':
      default:
        return 'bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs'
    }
  }

  const getStatusText = (status) => {
    switch (status) {
      case 'approved':
        return t(`${viewDictionary}.status.approved`, 'Alta')
      case 'rejected':
        return t(`${viewDictionary}.status.rejected`, 'Baja')
      case 'pending':
      default:
        return t(`${viewDictionary}.status.pending`, 'Pendiente')
    }
  }

  const formatDate = (dateObj) => {
    if (!dateObj) return ''

    if (dateObj.toDate) {
      dateObj = dateObj.toDate()
    }

    if (dateObj instanceof Date) {
      return dateObj.toLocaleDateString()
    }

    return ''
  }

  const approvePartner = async (id) => {
    try {
      // Verificar que hay una temporada activa
      setLoadingSeason(true)
      const currentActiveSeason = await getActiveSeason()
      setLoadingSeason(false)

      if (!currentActiveSeason) {
        await showPopup({
          title: t(`${viewDictionary}.warningPopup.title`, 'Advertencia'),
          text: t(
            `${viewDictionary}.warningPopup.noActiveSeason`,
            'No hay una temporada activa configurada. El socio será aprobado pero no se crearán registros de pago automáticamente.'
          ),
          icon: 'warning',
          confirmButtonText: t('components.popup.confirmButtonText', 'Aceptar'),
        })
      }

      // Obtener información del usuario actual (para userId)
      let userId = 'sistema'
      try {
        const auth = getAuth()
        const currentUser = auth.currentUser
        if (currentUser) {
          userId = currentUser.uid
        }
      } catch (authError) {
        console.log('No se pudo obtener el usuario actual:', authError)
      }

      // Actualizar el socio a estado aprobado
      const partnerRef = doc(db, 'partners', id)
      await updateDoc(partnerRef, {
        status: 'approved',
        lastUpdateDate: new Date(),
      })

      // Si hay temporada activa, crear documento de pago
      if (currentActiveSeason) {
        // Crear estructura completa de pago basada en la temporada activa
        const now = new Date()
        const newPaymentData = {
          createdAt: now,
          lastUpdateDate: now,
          seasonYear: currentActiveSeason.seasonYear,
          userId: userId,

          // Primera fracción
          firstPayment: false,
          firstPaymentDate: null,
          firstPaymentDone: false,
          firstPaymentPrice: currentActiveSeason.priceFirstFraction || 0,

          // Segunda fracción
          secondPayment: false,
          secondPaymentDate: null,
          secondPaymentDone: false,
          secondPaymentPrice: currentActiveSeason.priceSeconFraction || 0,

          // Tercera fracción
          thirdPayment: false,
          thirdPaymentDate: null,
          thirdPaymentDone: false,
          thirdPaymentPrice: currentActiveSeason.priceThirdFraction || 0,
        }

        // Intentar crear el registro de pago
        try {
          console.log(
            `Creando registro de pago para socio ${id} en temporada ${currentActiveSeason.seasonYear}`
          )
          await createPaymentForPartner(id, newPaymentData, userId)
          console.log('Registro de pago creado con éxito')
        } catch (paymentError) {
          console.error('Error al crear registro de pago:', paymentError)
          // No interrumpir el flujo si falla la creación del pago
        }
      }

      // Actualizar la UI
      const updatedPartners = partners.map((partner) =>
        partner.id === id ? { ...partner, status: 'approved' } : partner
      )
      setPartners(updatedPartners)
      setFilteredPartners(
        filteredPartners.map((partner) =>
          partner.id === id ? { ...partner, status: 'approved' } : partner
        )
      )

      await showPopup({
        title: t(`${viewDictionary}.successPopup.title`, 'Éxito'),
        text: currentActiveSeason
          ? t(
              `${viewDictionary}.successPopup.approvedWithPayment`,
              'El socio ha sido aprobado y se ha creado su registro de pago para la temporada actual.'
            )
          : t(
              `${viewDictionary}.successPopup.statusUpdateText`,
              'El socio ha sido aprobado correctamente.'
            ),
        icon: 'success',
        confirmButtonText: t('components.popup.confirmButtonText', 'Aceptar'),
      })
    } catch (error) {
      console.error('Error al aprobar el socio:', error)
      await showPopup({
        title: t(`${viewDictionary}.errorPopup.title`, 'Error'),
        text: t(
          `${viewDictionary}.errorPopup.statusUpdateError`,
          'Ha ocurrido un error al aprobar al socio.'
        ),
        icon: 'error',
        confirmButtonText: t('components.popup.confirmButtonText', 'Aceptar'),
      })
    }
  }

  const rejectPartner = async (id) => {
    try {
      const partnerRef = doc(db, 'partners', id)
      await updateDoc(partnerRef, {
        status: 'rejected',
        lastUpdateDate: new Date(),
      })

      const updatedPartners = partners.map((partner) =>
        partner.id === id ? { ...partner, status: 'rejected' } : partner
      )
      setPartners(updatedPartners)
      setFilteredPartners(
        filteredPartners.map((partner) =>
          partner.id === id ? { ...partner, status: 'rejected' } : partner
        )
      )

      showPopup({
        title: t(`${viewDictionary}.successPopup.title`, 'Éxito'),
        text: t(
          `${viewDictionary}.successPopup.statusUpdateText`,
          'El socio ha sido rechazado correctamente.'
        ),
        icon: 'success',
        confirmButtonText: t('components.popup.confirmButtonText', 'Aceptar'),
      })
    } catch (error) {
      console.error('Error al rechazar el socio:', error)
      showPopup({
        title: t(`${viewDictionary}.errorPopup.title`, 'Error'),
        text: t(
          `${viewDictionary}.errorPopup.statusUpdateError`,
          'Ha ocurrido un error al rechazar al socio.'
        ),
        icon: 'error',
        confirmButtonText: t('components.popup.confirmButtonText', 'Aceptar'),
      })
    }
  }

  const deletePartner = async (id) => {
    try {
      await deleteDoc(doc(db, 'partners', id))
      const updatedPartners = partners.filter((partner) => partner.id !== id)
      setPartners(updatedPartners)
      setFilteredPartners(updatedPartners)

      showPopup({
        title: t(`${viewDictionary}.successPopup.title`, 'Éxito'),
        text: t(
          `${viewDictionary}.successPopup.deleteText`,
          'El socio ha sido eliminado correctamente.'
        ),
        icon: 'success',
        confirmButtonText: t('components.popup.confirmButtonText', 'Aceptar'),
      })
    } catch (error) {
      console.error('Error al eliminar el socio:', error)
      showPopup({
        title: t(`${viewDictionary}.errorPopup.title`, 'Error'),
        text: t(
          `${viewDictionary}.errorPopup.deleteError`,
          'Ha ocurrido un error al eliminar el socio.'
        ),
        icon: 'error',
        confirmButtonText: t('components.popup.confirmButtonText', 'Aceptar'),
      })
    }
  }

  const handleExportToExcel = async (partnerId) => {
    try {
      // Encuentra el socio en la lista
      const partner = partners.find((p) => p.id === partnerId)
      if (!partner) {
        throw new Error('Socio no encontrado')
      }

      // Activar el estado de carga
      setExportingToExcel(true)

      // Si el socio está aprobado, obtenemos su información de pagos
      let payments = null
      let history = []
      let currentActiveSeason = null

      if (partner.status === 'approved') {
        // Cargar temporada activa
        currentActiveSeason = await getActiveSeason()

        if (currentActiveSeason) {
          try {
            // Si estamos viendo este socio actualmente, usar los datos ya cargados
            if (selectedPartner && selectedPartner.id === partnerId) {
              payments = partnerPayments
              history = paymentHistory
            } else {
              // Si no es el socio actualmente seleccionado, obtener los datos
              payments = await getPartnerPaymentsForSeason(
                partnerId,
                currentActiveSeason.seasonYear
              )

              const historyData = await getPartnerPaymentHistory(
                partnerId,
                currentActiveSeason.seasonYear
              )
              history = historyData || []
            }
            console.log('Datos para exportación:', {
              partner,
              payments,
              history,
            })
          } catch (error) {
            console.error('Error obteniendo datos de pago:', error)
          }
        }
      }

      // Añadir un log para verificar los datos antes de exportar
      console.log('Iniciando exportación con:', {
        partner,
        season: currentActiveSeason,
        payments,
        history,
      })

      // Llamar a la función de utilidad para exportar
      await exportPartnerToExcel(
        partner,
        currentActiveSeason,
        payments,
        history,
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
    } finally {
      // Desactivar el estado de carga al finalizar
      setExportingToExcel(false)
    }
  }

  const handleExportAllToExcel = async () => {
    try {
      // Activar el estado de carga
      setExportingAllToExcel(true)

      // Cargar temporada activa si no está cargada
      let currentActiveSeason = activeSeason
      if (!currentActiveSeason) {
        currentActiveSeason = await getActiveSeason()
      }

      // Llamar a la función de utilidad para exportar todos los socios
      // Añadimos los parámetros faltantes: getPartnerPaymentsForSeason y getPartnerPaymentHistory
      await exportAllPartnersToExcel(
        partners,
        currentActiveSeason,
        getPartnerPaymentsForSeason,
        getPartnerPaymentHistory,
        showPopup,
        t,
        viewDictionary
      )
    } catch (error) {
      console.error('Error al exportar datos de todos los socios:', error)
      await showPopup({
        title: t(`${viewDictionary}.errorPopup.title`, 'Error'),
        text: t(
          `${viewDictionary}.errorPopup.exportAllError`,
          'Ha ocurrido un error al exportar los datos de todos los socios.'
        ),
        icon: 'error',
        confirmButtonText: t('components.popup.confirmButtonText', 'Aceptar'),
      })
    } finally {
      // Desactivar el estado de carga al finalizar
      setExportingAllToExcel(false)
    }
  }

  // Función actualizada para abrir el panel lateral
  const openSidebar = async (partner) => {
    setSelectedPartner(partner)
    setSidebarOpen(true)

    // Restablecer los estados para evitar ver datos de otro socio
    setPartnerPayments(null)
    setPaymentHistory([])

    try {
      // Primero cargar la temporada activa
      await fetchActiveSeason()

      // Los listeners se configurarán automáticamente gracias al efecto
      // que está observando cambios en selectedPartner, activeSeason y sidebarOpen
    } catch (error) {
      console.error('Error al abrir el panel lateral:', error)
    }
  }

  const closeSidebar = () => {
    // Limpiar los listeners al cerrar el sidebar
    if (paymentListenerRef.current) {
      paymentListenerRef.current()
      paymentListenerRef.current = null
    }
    if (historyListenerRef.current) {
      historyListenerRef.current()
      historyListenerRef.current = null
    }

    setSidebarOpen(false)
    setSelectedPartner(null)
  }

  const fetchActiveSeason = async () => {
    setLoadingSeason(true)
    try {
      const season = await getActiveSeason()
      setActiveSeason(season)
      return season
    } catch (error) {
      console.error('Error al obtener la temporada activa:', error)
      setActiveSeason(null)
      return null
    } finally {
      setLoadingSeason(false)
    }
  }

  if (loading)
    return (
      <Loader
        loading={true}
        size="50px"
        color="rgb(21, 100, 46)"
        text={t(`${viewDictionary}.loadingText`, 'Cargando socios...')}
      />
    )

  return (
    <div className="h-screen max-h-[75dvh] pb-6 mx-auto max-w-full overflow-y-auto relative">
      {/* Loader para exportación de todos los socios a Excel */}
      <Loader
        loading={exportingAllToExcel}
        size="50px"
        color="rgb(21, 100, 46)"
        text={t(
          `${viewDictionary}.exportingAllDataText`,
          'Exportando datos de todos los socios...'
        )}
      />

      {/* Loader para exportación de un solo socio */}
      <Loader
        loading={exportingToExcel}
        size="50px"
        color="rgb(21, 100, 46)"
        text={t(
          `${viewDictionary}.exportingDataText`,
          'Exportando datos del socio...'
        )}
      />

      <h1 className="mb-4 text-center t64b">
        {t(`${viewDictionary}.title`, 'Listado de Socios')}
      </h1>
      <div className="grid items-center justify-end grid-cols-1 gap-4 mb-4 md:justify-items-end sm:grid-cols-2 sm:justify-between">
        <DynamicInput
          name="search"
          type="text"
          placeholder={t(
            `${viewDictionary}.searchPlaceholder`,
            'Buscar por nombre, apellidos, email o DNI'
          )}
          value={searchQuery}
          onChange={handleSearchChange}
        />
        <div className="flex pl-0 space-x-2 sm:pl-32">
          {/* Nuevo botón para exportar todos los socios */}
          <DynamicButton
            onClick={handleExportAllToExcel}
            size="small"
            state="normal"
            type="download"
            textId={t(`${viewDictionary}.exportAllToExcel`, 'Exportar Todos')}
          />

          {/* Botón existente para añadir socio */}
          <DynamicButton
            onClick={() => navigate(`/admin-partner-form/`)}
            size="small"
            state="normal"
            type="add"
            textId={t(`${viewDictionary}.partners`, 'Añadir Socio')}
          />
        </div>
      </div>

      {sidebarOpen && selectedPartner && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black bg-opacity-50">
          <div className="w-full h-full max-w-md p-6 overflow-y-auto transition-transform duration-300 ease-in-out transform bg-white shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-center t24b">
                {t(`${viewDictionary}.payments.title`, 'Gestión de pagos')}
              </h2>
              <button
                onClick={closeSidebar}
                className="text-gray-500 hover:text-gray-700 focus:outline-none"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  ></path>
                </svg>
              </button>
            </div>

            <div className="mb-4">
              <div className="font-medium">
                {selectedPartner.name} {selectedPartner.lastName}
              </div>
              <div className="text-sm text-gray-600">
                {selectedPartner.email}
              </div>
              <div className="mt-1 text-sm text-gray-600">
                {t(`${viewDictionary}.payments.status`, 'Estado:')}
                <span
                  className={`ml-1 ${getStatusBadgeClass(selectedPartner.status)}`}
                >
                  {getStatusText(selectedPartner.status)}
                </span>
              </div>
            </div>

            <div className="pt-4 mb-4 border-t border-gray-200">
              <h3 className="mb-2 font-medium">
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

                  {activeSeason.priceFirstFraction > 0 && (
                    <div className="flex justify-between mb-2">
                      <span className="font-medium">
                        {t(
                          `${viewDictionary}.payments.priceFirstFraction`,
                          'Primera fracción:'
                        )}
                      </span>
                      <span>{activeSeason.priceFirstFraction}€</span>
                    </div>
                  )}

                  {activeSeason.priceSeconFraction > 0 && (
                    <div className="flex justify-between mb-2">
                      <span className="font-medium">
                        {t(
                          `${viewDictionary}.payments.priceSecondFraction`,
                          'Segunda fracción:'
                        )}
                      </span>
                      <span>{activeSeason.priceSeconFraction}€</span>
                    </div>
                  )}

                  {activeSeason.priceThirdFraction > 0 && (
                    <div className="flex justify-between mb-2">
                      <span className="font-medium">
                        {t(
                          `${viewDictionary}.payments.priceThirdFraction`,
                          'Tercera fracción:'
                        )}
                      </span>
                      <span>{activeSeason.priceThirdFraction}€</span>
                    </div>
                  )}
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

            {selectedPartner.status === 'approved' && (
              <div className="pt-4 mb-4 border-t border-gray-200">
                <h3 className="mb-2 font-medium">
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
                  <div className="p-4 rounded-lg bg-gray-50">
                    <p className="mb-3 text-sm text-gray-500">
                      {t(
                        `${viewDictionary}.payments.noPaymentsFound`,
                        'No se encontró información de pagos para este socio.'
                      )}
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="pt-4 border-t border-gray-200">
              <h3 className="mb-2 font-medium">
                {t(`${viewDictionary}.payments.history`, 'Historial de pagos')}
              </h3>

              {loadingHistory ? (
                <p className="text-sm text-gray-500">
                  {t(
                    `${viewDictionary}.payments.loadingHistory`,
                    'Cargando historial de pagos...'
                  )}
                </p>
              ) : paymentHistory.length > 0 ? (
                <div className="space-y-4">
                  {paymentHistory.map((payment) => (
                    <div key={payment.id} className="p-3 rounded-lg bg-gray-50">
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
                                ? t(`${viewDictionary}.payments.paid`, 'Pagado')
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
                          {payment.firstPayment && payment.firstPaymentDate && (
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
                                ? t(`${viewDictionary}.payments.paid`, 'Pagado')
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
                                ? t(`${viewDictionary}.payments.paid`, 'Pagado')
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
        </div>
      )}

      {filteredPartners.length === 0 ? (
        <p className="text-center text-gray-500">
          {t(
            `${viewDictionary}.noPartnersFound`,
            'No se encontraron socios que coincidan con la búsqueda.'
          )}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase"
                >
                  {t(`${viewDictionary}.table.name`, 'Nombre')}
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase"
                >
                  {t(`${viewDictionary}.table.email`, 'Email')}
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase"
                >
                  {t(`${viewDictionary}.table.phone`, 'Teléfono')}
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase"
                >
                  {t(`${viewDictionary}.table.createdAt`, 'Fecha de registro')}
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase"
                >
                  {t(`${viewDictionary}.table.status`, 'Estado')}
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase"
                >
                  {t(`${viewDictionary}.table.actions`, 'Acciones')}
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase"
                >
                  {t(`${viewDictionary}.table.actions`, 'Pagos')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPartners.map((partner) => (
                <tr key={partner.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {partner.name} {partner.lastName}
                    </div>
                    <div className="text-sm text-gray-500">
                      {partner.dni || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{partner.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{partner.phone}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {formatDate(partner.createdAt)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={getStatusBadgeClass(partner.status)}>
                      {getStatusText(partner.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-right whitespace-nowrap">
                    <div className="flex space-x-2">
                      <DynamicButton
                        onClick={() => {
                          const slug = generateSlug(
                            `${partner.name}-${partner.lastName}`
                          )
                          navigate(`/partners-info/${slug}`, {
                            state: { partnerId: partner.id },
                          })
                        }}
                        size="x-small"
                        state="normal"
                        type="view"
                      />
                      <DynamicButton
                        onClick={() => {
                          const slug = generateSlug(
                            `${partner.name}-${partner.lastName}`
                          )
                          navigate(`/partners-modify/${slug}`, {
                            state: { partnerId: partner.id },
                          })
                        }}
                        size="x-small"
                        state="normal"
                        type="edit"
                      />
                      <DynamicButton
                        onClick={() => approvePartner(partner.id)}
                        size="x-small"
                        state="normal"
                        type="personAdd"
                      />
                      <DynamicButton
                        onClick={() => rejectPartner(partner.id)}
                        size="x-small"
                        state="normal"
                        type="personDown"
                      />
                      <DynamicButton
                        onClick={() => deletePartner(partner.id)}
                        size="x-small"
                        type="delete"
                      />
                      <DynamicButton
                        onClick={() => handleExportToExcel(partner.id)}
                        size="x-small"
                        state="normal"
                        type="download"
                        title={t(
                          `${viewDictionary}.exportToExcel`,
                          'Exportar a Excel'
                        )}
                      />
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <DynamicButton
                      name="openModal"
                      onClick={() => openSidebar(partner)}
                      size="x-small"
                      state="normal"
                      type="payment"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default PartnerList
