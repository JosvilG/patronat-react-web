import React, { useEffect, useState } from 'react'
import {
  collection,
  getDocs,
  getDoc,
  deleteDoc,
  updateDoc,
  doc,
  query,
  where,
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
  getPartnerPaymentsForSeason,
  getPartnerPaymentHistory,
  getActiveSeason,
  createPaymentForPartner,
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
  }, [t, viewDictionary])

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

  const handleDelete = async (id) => {
    try {
      const result = await showPopup({
        title: t(`${viewDictionary}.deletePopup.title`, '¿Eliminar socio?'),
        text: t(
          `${viewDictionary}.deletePopup.text`,
          '¿Estás seguro de que quieres eliminar este socio? Esta acción no se puede deshacer.'
        ),
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: t('components.popup.confirmButtonText', 'Eliminar'),
        cancelButtonText: t('components.popup.cancelButtonText', 'Cancelar'),
      })

      if (result && result.isConfirmed) {
        await deleteDoc(doc(db, 'partners', id))
        const updatedPartners = partners.filter((partner) => partner.id !== id)
        setPartners(updatedPartners)
        setFilteredPartners(updatedPartners)

        await showPopup({
          title: t(`${viewDictionary}.successPopup.title`, 'Éxito'),
          text: t(
            `${viewDictionary}.successPopup.deleteText`,
            'El socio ha sido eliminado correctamente.'
          ),
          icon: 'success',
          confirmButtonText: t('components.popup.confirmButtonText', 'Aceptar'),
        })
      }
    } catch (error) {
      console.error('Error al eliminar el socio:', error)
      await showPopup({
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
          // Obtener pagos de temporada actual
          payments = await getPartnerPaymentsForSeason(
            partnerId,
            currentActiveSeason.seasonYear
          )

          // Obtener historial de pagos explícitamente para la exportación
          history =
            (await getPartnerPaymentHistory(
              partnerId,
              currentActiveSeason.seasonYear
            )) || []

          console.log('Historial recuperado para exportación:', history)
        }
      }

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

      // Mostrar mensaje de éxito
      await showPopup({
        title: t(
          `${viewDictionary}.exportSuccessTitle`,
          'Exportación completada'
        ),
        text: t(
          `${viewDictionary}.exportSuccessText`,
          'Los datos del socio se han exportado correctamente.'
        ),
        icon: 'success',
        confirmButtonText: t('components.popup.confirmButtonText', 'Aceptar'),
      })
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

  // Función de utilidad para esperar un tiempo específico (ms)
  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

  // Actualiza la función openSidebar para añadir retrasos
  const openSidebar = async (partner) => {
    setSelectedPartner(partner)
    setSidebarOpen(true)

    // Restablecer los estados para evitar ver datos de otro socio
    setPartnerPayments(null)
    setPaymentHistory([])

    try {
      // Primero cargar la temporada activa
      await fetchActiveSeason()

      // Si el socio está aprobado, cargar los pagos y el historial en paralelo
      if (partner.status === 'approved') {
        // Usar Promise.all para cargar ambos en paralelo después de un pequeño retraso
        await delay(800)

        Promise.all([
          fetchPartnerPayments(partner.id),
          fetchPaymentHistory(partner.id),
        ]).catch((error) => {
          console.error('Error al cargar datos de pago:', error)
        })
      }
    } catch (error) {
      console.error('Error al abrir el panel lateral:', error)
    }
  }

  const closeSidebar = () => {
    setSidebarOpen(false)
    setSelectedPartner(null)
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

  // Modificar la función fetchPartnerPayments para añadir reintento automático
  const fetchPartnerPayments = async (partnerId) => {
    if (!partnerId) return

    setLoadingPayments(true)
    try {
      if (!activeSeason) {
        await fetchActiveSeason()
        await delay(500)
      }

      if (!activeSeason) {
        setPartnerPayments(null)
        return
      }

      // Intentar obtener pagos
      let payments = await getPartnerPaymentsForSeason(
        partnerId,
        activeSeason.seasonYear
      )

      if (!payments) {
        // Si no se encuentran pagos, esperar un momento y reintentar
        await delay(1500)
        console.log('Reintentando obtener pagos después de espera...')

        payments = await getPartnerPaymentsForSeason(
          partnerId,
          activeSeason.seasonYear
        )

        // Si después del reintento sigue sin haber datos, inicializar un objeto de pago vacío
        // para que la interfaz no muestre el mensaje "no se encontró información"
        if (!payments) {
          payments = {
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
      }

      setPartnerPayments(payments)
    } catch (error) {
      console.error('Error al cargar pagos:', error)
      setPartnerPayments(null)
    } finally {
      setLoadingPayments(false)
    }
  }

  // Modificar la función fetchPaymentHistory para añadir reintento
  const fetchPaymentHistory = async (partnerId) => {
    if (!partnerId) return

    setLoadingHistory(true)
    try {
      const activeYear = activeSeason ? activeSeason.seasonYear : null

      // Intentar obtener historial
      const history = await getPartnerPaymentHistory(partnerId, activeYear)

      if (!history || history.length === 0) {
        // Si no se encuentra historial, esperar un momento y reintentar una vez
        await delay(1500)
        console.log('Reintentando obtener historial después de espera...')

        const retryHistory = await getPartnerPaymentHistory(
          partnerId,
          activeYear
        )
        setPaymentHistory(retryHistory || [])
      } else {
        setPaymentHistory(history)
      }
    } catch (error) {
      console.error('Error al cargar historial de pagos:', error)
      setPaymentHistory([])
    } finally {
      setLoadingHistory(false)
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
            onClick={() => navigate(`/partner-form/`)}
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
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium">
                    {t(
                      `${viewDictionary}.payments.paymentStatus`,
                      'Estado de Pagos'
                    )}
                  </h3>
                  <button
                    onClick={() => fetchPartnerPayments(selectedPartner.id)}
                    className="flex items-center justify-center p-1 text-sm text-gray-600 rounded-md hover:bg-gray-100"
                    disabled={loadingPayments}
                    title={t(
                      `${viewDictionary}.payments.refreshPayments`,
                      'Actualizar pagos'
                    )}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className={`w-5 h-5 ${loadingPayments ? 'animate-spin' : ''}`}
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
                  </button>
                </div>

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
                    <button
                      onClick={() => fetchPartnerPayments(selectedPartner.id)}
                      className="flex items-center px-3 py-1 text-sm bg-gray-200 rounded hover:bg-gray-300"
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

            <div className="pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium">
                  {t(
                    `${viewDictionary}.payments.history`,
                    'Historial de pagos'
                  )}
                </h3>
                <button
                  onClick={() => fetchPaymentHistory(selectedPartner.id)}
                  className="flex items-center justify-center p-1 text-sm text-gray-600 rounded-md hover:bg-gray-100"
                  disabled={loadingHistory}
                  title={t(
                    `${viewDictionary}.payments.refreshHistory`,
                    'Actualizar historial'
                  )}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className={`w-5 h-5 ${loadingHistory ? 'animate-spin' : ''}`}
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
                </button>
              </div>

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
