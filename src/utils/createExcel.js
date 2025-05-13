import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'

/**
 * Formatea un objeto de fecha para mostrarlo correctamente en Excel
 * @param {Date|Object|string} dateObj - Objeto de fecha, timestamp de Firestore, o cadena de fecha
 * @returns {string} Fecha formateada o cadena vacía si no es válida
 */
const formatDate = (dateObj) => {
  if (!dateObj) return ''

  // Si es un timestamp de Firestore
  if (dateObj && typeof dateObj.toDate === 'function') {
    dateObj = dateObj.toDate()
  }

  // Si es una fecha válida
  if (dateObj instanceof Date) {
    return dateObj.toLocaleDateString()
  }

  return String(dateObj)
}

/**
 * Obtiene el texto de estado de un socio
 * @param {string} status - Estado del socio ('approved', 'rejected', 'pending')
 * @returns {string} Texto del estado en español
 */
const getStatusText = (status) => {
  switch (status) {
    case 'approved':
      return 'Alta'
    case 'rejected':
      return 'Baja'
    case 'pending':
    default:
      return 'Pendiente'
  }
}

/**
 * Exporta los datos de un socio a Excel
 *
 * @param {Object} partner - Datos del socio
 * @param {Object|null} activeSeason - Temporada activa
 * @param {Object|null} payments - Pagos actuales
 * @param {Array} history - Historial de pagos
 * @param {Function} showPopupFn - Función para mostrar popups
 * @param {Function} tFn - Función de traducción
 * @param {string} viewDictionary - Ruta base para las traducciones
 * @returns {Promise<void>}
 */
export const exportPartnerToExcel = async (
  partner,
  activeSeason,
  payments,
  history,
  showPopupFn,
  tFn,
  viewDictionary
) => {
  if (!partner) return

  try {
    // 1. Información personal
    const personalInfo = {
      ID: partner.id,
      Nombre: partner.name || '',
      Apellidos: partner.lastName || '',
      Email: partner.email || '',
      DNI: partner.dni || '',
      Teléfono: partner.phone || '',
      Dirección: partner.address || '',
      IBAN: partner.accountNumber || '',
      'Fecha de nacimiento': formatDate(partner.birthDate) || '',
      Estado: getStatusText(partner.status),
      'Fecha de registro': formatDate(partner.createdAt) || '',
    }

    // 2. Pagos de temporada actual
    let currentPayments = []
    if (payments) {
      currentPayments.push({
        Temporada: payments.seasonYear,
        Fracción: 'Primera',
        Estado: payments.firstPayment ? 'Pagado' : 'Pendiente',
        Importe: payments.firstPaymentPrice || 0,
        'Fecha de pago': formatDate(payments.firstPaymentDate) || '',
      })

      if (payments.secondPaymentPrice > 0) {
        currentPayments.push({
          Temporada: payments.seasonYear,
          Fracción: 'Segunda',
          Estado: payments.secondPaymentDone ? 'Pagado' : 'Pendiente',
          Importe: payments.secondPaymentPrice || 0,
          'Fecha de pago': formatDate(payments.secondPaymentDate) || '',
        })
      }

      if (payments.thirdPaymentPrice > 0) {
        currentPayments.push({
          Temporada: payments.seasonYear,
          Fracción: 'Tercera',
          Estado: payments.thirdPaymentDone ? 'Pagado' : 'Pendiente',
          Importe: payments.thirdPaymentPrice || 0,
          'Fecha de pago': formatDate(payments.thirdPaymentDate) || '',
        })
      }
    }

    // 3. Historial de pagos
    let paymentHistoryData = []
    if (history && history.length > 0) {
      history.forEach((payment) => {
        if (payment.firstPaymentPrice > 0) {
          paymentHistoryData.push({
            Temporada: payment.seasonYear,
            Fracción: 'Primera',
            Estado: payment.firstPayment ? 'Pagado' : 'Pendiente',
            Importe: payment.firstPaymentPrice || 0,
            'Fecha de pago': formatDate(payment.firstPaymentDate) || '',
          })
        }

        if (payment.secondPaymentPrice > 0) {
          paymentHistoryData.push({
            Temporada: payment.seasonYear,
            Fracción: 'Segunda',
            Estado: payment.secondPaymentDone ? 'Pagado' : 'Pendiente',
            Importe: payment.secondPaymentPrice || 0,
            'Fecha de pago': formatDate(payment.secondPaymentDate) || '',
          })
        }

        if (payment.thirdPaymentPrice > 0) {
          paymentHistoryData.push({
            Temporada: payment.seasonYear,
            Fracción: 'Tercera',
            Estado: payment.thirdPaymentDone ? 'Pagado' : 'Pendiente',
            Importe: payment.thirdPaymentPrice || 0,
            'Fecha de pago': formatDate(payment.thirdPaymentDate) || '',
          })
        }
      })
    }

    // Crear un nuevo libro de trabajo
    const workbook = XLSX.utils.book_new()

    // Crear hojas de trabajo para cada tipo de datos
    const personalWorksheet = XLSX.utils.json_to_sheet([personalInfo])
    XLSX.utils.book_append_sheet(
      workbook,
      personalWorksheet,
      'Datos Personales'
    )

    if (currentPayments.length > 0) {
      const paymentsWorksheet = XLSX.utils.json_to_sheet(currentPayments)
      XLSX.utils.book_append_sheet(
        workbook,
        paymentsWorksheet,
        'Pagos Actuales'
      )
    }

    if (paymentHistoryData.length > 0) {
      const historyWorksheet = XLSX.utils.json_to_sheet(paymentHistoryData)
      XLSX.utils.book_append_sheet(
        workbook,
        historyWorksheet,
        'Historial de Pagos'
      )
    }

    // Convertir a array buffer
    const excelBuffer = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array',
    })

    // Crear un blob
    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8',
    })

    // Guardar el archivo
    saveAs(
      blob,
      `socio_${partner.name}_${partner.lastName}_${new Date().toISOString().split('T')[0]}.xlsx`
    )

    // Mostrar mensaje de éxito
    await showPopupFn({
      title: tFn(
        `${viewDictionary}.exportSuccessTitle`,
        'Exportación completada'
      ),
      text: tFn(
        `${viewDictionary}.exportSuccessText`,
        'Los datos del socio se han exportado correctamente.'
      ),
      icon: 'success',
      confirmButtonText: tFn('components.popup.confirmButtonText', 'Aceptar'),
    })
  } catch (error) {
    console.error('Error al exportar datos del socio a Excel:', error)
    await showPopupFn({
      title: tFn(`${viewDictionary}.errorPopup.title`, 'Error'),
      text: tFn(
        `${viewDictionary}.errorPopup.exportError`,
        'Ha ocurrido un error al exportar los datos del socio.'
      ),
      icon: 'error',
      confirmButtonText: tFn('components.popup.confirmButtonText', 'Aceptar'),
    })
  }
}

/**
 * Exporta los datos de todos los socios a Excel
 *
 * @param {Array} partners - Lista de socios
 * @param {Object|null} activeSeason - Temporada activa
 * @param {Function} getPartnerPaymentsForSeason - Función para obtener pagos de un socio
 * @param {Function} getPartnerPaymentHistory - Función para obtener historial de pagos
 * @param {Function} showPopupFn - Función para mostrar popups
 * @param {Function} tFn - Función de traducción
 * @param {string} viewDictionary - Ruta base para las traducciones
 * @returns {Promise<void>}
 */
export const exportAllPartnersToExcel = async (
  partners,
  activeSeason,
  getPartnerPaymentsForSeason,
  getPartnerPaymentHistory,
  showPopupFn,
  tFn,
  viewDictionary
) => {
  if (!partners || partners.length === 0) return

  try {
    // Crear lista de datos básicos de socios
    const partnersData = partners.map((partner) => ({
      ID: partner.id,
      Nombre: partner.name || '',
      Apellidos: partner.lastName || '',
      Email: partner.email || '',
      DNI: partner.dni || '',
      Teléfono: partner.phone || '',
      Dirección: partner.address || '',
      IBAN: partner.accountNumber || '',
      'Fecha de nacimiento': formatDate(partner.birthDate) || '',
      Estado: getStatusText(partner.status),
      'Fecha de registro': formatDate(partner.createdAt) || '',
    }))

    // Crear lista de pagos actuales para socios aprobados
    let allCurrentPayments = []
    let allPaymentHistory = []

    // Solo para socios aprobados, obtenemos sus datos de pago
    const approvedPartners = partners.filter((p) => p.status === 'approved')

    if (activeSeason && approvedPartners.length > 0) {
      // Obtener los pagos de cada socio aprobado
      for (const partner of approvedPartners) {
        // Pagos de temporada actual
        const payments = await getPartnerPaymentsForSeason(
          partner.id,
          activeSeason.seasonYear
        )

        if (payments) {
          // Añadir primera fracción
          allCurrentPayments.push({
            'ID Socio': partner.id,
            Nombre: partner.name,
            Apellidos: partner.lastName,
            Temporada: payments.seasonYear,
            Fracción: 'Primera',
            Estado: payments.firstPayment ? 'Pagado' : 'Pendiente',
            Importe: payments.firstPaymentPrice || 0,
            'Fecha de pago': formatDate(payments.firstPaymentDate) || '',
          })

          // Añadir segunda fracción si existe
          if (payments.secondPaymentPrice > 0) {
            allCurrentPayments.push({
              'ID Socio': partner.id,
              Nombre: partner.name,
              Apellidos: partner.lastName,
              Temporada: payments.seasonYear,
              Fracción: 'Segunda',
              Estado: payments.secondPaymentDone ? 'Pagado' : 'Pendiente',
              Importe: payments.secondPaymentPrice || 0,
              'Fecha de pago': formatDate(payments.secondPaymentDate) || '',
            })
          }

          // Añadir tercera fracción si existe
          if (payments.thirdPaymentPrice > 0) {
            allCurrentPayments.push({
              'ID Socio': partner.id,
              Nombre: partner.name,
              Apellidos: partner.lastName,
              Temporada: payments.seasonYear,
              Fracción: 'Tercera',
              Estado: payments.thirdPaymentDone ? 'Pagado' : 'Pendiente',
              Importe: payments.thirdPaymentPrice || 0,
              'Fecha de pago': formatDate(payments.thirdPaymentDate) || '',
            })
          }
        }

        // Historial de pagos
        const history =
          (await getPartnerPaymentHistory(
            partner.id,
            activeSeason.seasonYear
          )) || []

        if (history.length > 0) {
          for (const payment of history) {
            // Primera fracción
            if (payment.firstPaymentPrice > 0) {
              allPaymentHistory.push({
                'ID Socio': partner.id,
                Nombre: partner.name,
                Apellidos: partner.lastName,
                Temporada: payment.seasonYear,
                Fracción: 'Primera',
                Estado: payment.firstPayment ? 'Pagado' : 'Pendiente',
                Importe: payment.firstPaymentPrice || 0,
                'Fecha de pago': formatDate(payment.firstPaymentDate) || '',
              })
            }

            // Segunda fracción
            if (payment.secondPaymentPrice > 0) {
              allPaymentHistory.push({
                'ID Socio': partner.id,
                Nombre: partner.name,
                Apellidos: partner.lastName,
                Temporada: payment.seasonYear,
                Fracción: 'Segunda',
                Estado: payment.secondPaymentDone ? 'Pagado' : 'Pendiente',
                Importe: payment.secondPaymentPrice || 0,
                'Fecha de pago': formatDate(payment.secondPaymentDate) || '',
              })
            }

            // Tercera fracción
            if (payment.thirdPaymentPrice > 0) {
              allPaymentHistory.push({
                'ID Socio': partner.id,
                Nombre: partner.name,
                Apellidos: partner.lastName,
                Temporada: payment.seasonYear,
                Fracción: 'Tercera',
                Estado: payment.thirdPaymentDone ? 'Pagado' : 'Pendiente',
                Importe: payment.thirdPaymentPrice || 0,
                'Fecha de pago': formatDate(payment.thirdPaymentDate) || '',
              })
            }
          }
        }
      }
    }

    // Crear un nuevo libro de trabajo
    const workbook = XLSX.utils.book_new()

    // Crear hoja con información de todos los socios
    const partnersWorksheet = XLSX.utils.json_to_sheet(partnersData)
    XLSX.utils.book_append_sheet(workbook, partnersWorksheet, 'Socios')

    // Crear hoja con pagos actuales si existen
    if (allCurrentPayments.length > 0) {
      const currentPaymentsWorksheet =
        XLSX.utils.json_to_sheet(allCurrentPayments)
      XLSX.utils.book_append_sheet(
        workbook,
        currentPaymentsWorksheet,
        'Pagos Actuales'
      )
    }

    // Crear hoja con historial de pagos si existe
    if (allPaymentHistory.length > 0) {
      const paymentHistoryWorksheet =
        XLSX.utils.json_to_sheet(allPaymentHistory)
      XLSX.utils.book_append_sheet(
        workbook,
        paymentHistoryWorksheet,
        'Historial de Pagos'
      )
    }

    // Convertir a array buffer
    const excelBuffer = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array',
    })

    // Crear un blob
    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8',
    })

    // Guardar el archivo
    saveAs(
      blob,
      `listado_completo_socios_${new Date().toISOString().split('T')[0]}.xlsx`
    )

    // Mostrar mensaje de éxito
    await showPopupFn({
      title: tFn(
        `${viewDictionary}.exportAllSuccessTitle`,
        'Exportación completada'
      ),
      text: tFn(
        `${viewDictionary}.exportAllSuccessText`,
        'Los datos de todos los socios se han exportado correctamente.'
      ),
      icon: 'success',
      confirmButtonText: tFn('components.popup.confirmButtonText', 'Aceptar'),
    })
  } catch (error) {
    console.error('Error al exportar datos de todos los socios a Excel:', error)
    await showPopupFn({
      title: tFn(`${viewDictionary}.errorPopup.title`, 'Error'),
      text: tFn(
        `${viewDictionary}.errorPopup.exportAllError`,
        'Ha ocurrido un error al exportar los datos de los socios.'
      ),
      icon: 'error',
      confirmButtonText: tFn('components.popup.confirmButtonText', 'Aceptar'),
    })
  }
}

export default exportPartnerToExcel
