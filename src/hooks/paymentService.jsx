import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  limit,
  orderBy,
  getDoc,
} from 'firebase/firestore'
import { db } from '../firebase/firebase'

// Constantes para configuración
const MAX_RETRY_ATTEMPTS = 20
const RETRY_DELAY_MS = 1500

/**
 * Función de utilidad para esperar un tiempo determinado
 */
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Función para reintentar operaciones asíncronas
 */
const withRetry = async (
  operation,
  maxRetries = MAX_RETRY_ATTEMPTS,
  delayMs = RETRY_DELAY_MS
) => {
  let lastError

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`Reintento ${attempt} de ${maxRetries}...`)
        await wait(delayMs)
      }
      return await operation()
    } catch (error) {
      console.error(`Error en intento ${attempt}:`, error)
      lastError = error
    }
  }

  throw lastError
}

/**
 * Obtiene los pagos de un socio para una temporada específica
 * @param {string} partnerId - ID del socio
 * @param {number} seasonYear - Año de la temporada
 * @param {boolean} fallbackToAll - Si debe recuperar todos los pagos como alternativa
 * @returns {Promise<Object|null>} - Documento de pago o null si no existe
 */
export const getPartnerPaymentsForSeason = async (
  partnerId,
  seasonYear,
  fallbackToAll = true
) => {
  if (!partnerId) {
    console.warn('getPartnerPaymentsForSeason: Se requiere ID de socio')
    return null
  }

  if (!seasonYear) {
    console.warn('getPartnerPaymentsForSeason: Se requiere año de temporada')

    if (!fallbackToAll) return null

    // Si no hay año de temporada pero se permite fallback, buscar el pago más reciente
    console.log('Intentando recuperar el pago más reciente del socio...')
    return await getMostRecentPayment(partnerId)
  }

  try {
    return await withRetry(async () => {
      const paymentsRef = collection(db, 'partners', partnerId, 'payments')
      let payment = null

      // Primer intento con 'seasonYear'
      console.log(
        `Buscando pagos para socio ${partnerId} y temporada ${seasonYear} (campo: seasonYear)`
      )
      let paymentsSnapshot = await getDocs(
        query(paymentsRef, where('seasonYear', '==', seasonYear))
      )

      if (!paymentsSnapshot.empty) {
        const paymentDoc = paymentsSnapshot.docs[0]
        payment = { id: paymentDoc.id, ...paymentDoc.data() }
        console.log('Pago encontrado:', payment)
        return payment
      }

      // Si se permite fallback y no se encontró ningún pago, intentar recuperar todos
      if (fallbackToAll) {
        console.log(
          'No se encontraron pagos para la temporada específica. Buscando el pago más reciente...'
        )
        payment = await getMostRecentPayment(partnerId)
        if (payment) {
          console.log('Se encontró un pago alternativo:', payment)
          return payment
        }
      }

      console.log('No se encontró ningún pago para el socio')
      return null
    })
  } catch (error) {
    console.error('Error al obtener pagos del socio:', error)

    // Último recurso: intentar obtener cualquier pago si fallbackToAll es true
    if (fallbackToAll) {
      try {
        console.log(
          'Intentando recuperar cualquier pago como último recurso...'
        )
        const allPayments = await getAllPartnerPayments(partnerId)
        return allPayments.length > 0 ? allPayments[0] : null
      } catch (fallbackError) {
        console.error(
          'Error en la recuperación de último recurso:',
          fallbackError
        )
      }
    }

    return null
  }
}

/**
 * Obtiene el pago más reciente para un socio
 */
export const getMostRecentPayment = async (partnerId) => {
  if (!partnerId) return null

  try {
    const paymentsRef = collection(db, 'partners', partnerId, 'payments')

    // Intentar ordenar por fecha de creación (más reciente primero)
    const paymentsSnapshot = await getDocs(
      query(paymentsRef, orderBy('createdAt', 'desc'), limit(1))
    )

    if (!paymentsSnapshot.empty) {
      const paymentDoc = paymentsSnapshot.docs[0]
      return { id: paymentDoc.id, ...paymentDoc.data() }
    }

    // Si no hay documentos o no tienen el campo createdAt, obtener todos y elegir uno
    const allPaymentsSnapshot = await getDocs(paymentsRef)

    if (!allPaymentsSnapshot.empty) {
      const paymentDoc = allPaymentsSnapshot.docs[0]
      return { id: paymentDoc.id, ...paymentDoc.data() }
    }

    return null
  } catch (error) {
    console.error('Error al obtener el pago más reciente:', error)
    return null
  }
}

/**
 * Obtiene todos los pagos de un socio
 */
export const getAllPartnerPayments = async (partnerId) => {
  if (!partnerId) return []

  try {
    const paymentsRef = collection(db, 'partners', partnerId, 'payments')
    const paymentsSnapshot = await getDocs(paymentsRef)

    if (paymentsSnapshot.empty) return []

    return paymentsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))
  } catch (error) {
    console.error('Error al obtener todos los pagos:', error)
    return []
  }
}

/**
 * Obtiene todos los pagos históricos de un socio
 * @param {string} partnerId - ID del socio
 * @param {number} currentSeasonYear - Año de la temporada actual para excluirlo
 * @returns {Promise<Array>} - Lista de pagos históricos
 */
export const getPartnerPaymentHistory = async (
  partnerId,
  currentSeasonYear
) => {
  if (!partnerId) {
    console.warn('getPartnerPaymentHistory: Se requiere ID de socio')
    return []
  }

  try {
    return await withRetry(async () => {
      console.log(`Buscando historial de pagos para socio ${partnerId}...`)
      // Primero obtenemos todas las temporadas
      const seasonsRef = collection(db, 'seasons')
      const seasonsSnapshot = await getDocs(seasonsRef)

      // Año actual para comparar con años de temporadas
      const currentYear = new Date().getFullYear()

      // Mapa para identificar qué temporadas están activas y su año
      const seasonActiveStatus = {}
      seasonsSnapshot.forEach((doc) => {
        const seasonData = doc.data()
        seasonActiveStatus[seasonData.seasonYear] = {
          active: seasonData.active || false,
          year: seasonData.seasonYear,
        }
      })

      console.log('Estado de temporadas:', seasonActiveStatus)

      // Ahora obtenemos todos los pagos del socio
      const paymentsRef = collection(db, 'partners', partnerId, 'payments')
      const paymentsSnapshot = await getDocs(paymentsRef)

      if (paymentsSnapshot.empty) {
        console.log('No se encontraron pagos históricos')
        return []
      }

      const allPayments = paymentsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))

      console.log(`Se encontraron ${allPayments.length} pagos totales`)

      // Filtramos para obtener solo pagos históricos (temporadas no activas y no futuras)
      const historicalPayments = allPayments.filter((payment) => {
        const paymentYear = payment.seasonYear
        if (!paymentYear) {
          console.log(`Pago sin año definido: ${payment.id}`)
          return false
        }

        // Excluir la temporada actual si se proporciona
        if (currentSeasonYear && paymentYear === currentSeasonYear) {
          console.log(
            `Excluyendo pago de temporada actual (${currentSeasonYear}): ${payment.id}`
          )
          return false
        }

        // Verificar si la temporada está activa según el mapa que creamos
        const seasonInfo = seasonActiveStatus[paymentYear] || {
          active: false,
          year: paymentYear,
        }
        const isActiveTemporada = seasonInfo.active || false

        // Verificar si es una temporada futura (año mayor al actual)
        const isFutureTemporada = paymentYear > currentYear

        if (isActiveTemporada) {
          console.log(
            `Excluyendo pago de temporada activa ${paymentYear}: ${payment.id}`
          )
          return false
        } else if (isFutureTemporada) {
          console.log(
            `Excluyendo pago de temporada futura ${paymentYear}: ${payment.id}`
          )
          return false
        } else {
          console.log(
            `Incluyendo pago histórico del año ${paymentYear}: ${payment.id}`
          )
          return true
        }
      })

      console.log(
        `Se encontraron ${historicalPayments.length} pagos históricos`
      )

      // Ordenar pagos históricos por año (más reciente primero)
      historicalPayments.sort((a, b) => b.seasonYear - a.seasonYear)

      return historicalPayments
    })
  } catch (error) {
    console.error('Error al obtener historial de pagos:', error)
    return []
  }
}

/**
 * Crea un nuevo documento de pago para un socio
 */
export const createPaymentForPartner = async (
  partnerId,
  paymentData,
  userId
) => {
  if (!partnerId || !paymentData) throw new Error('Datos de pago incompletos')

  try {
    console.log(`Creando pago para socio ${partnerId}...`)
    // Verificar si ya existe un pago para esta temporada
    const existingPayment = await getPartnerPaymentsForSeason(
      partnerId,
      paymentData.seasonYear,
      false // No usar fallback aquí para evitar falsos positivos
    )

    if (existingPayment) {
      console.log('Ya existe un pago para esta temporada:', existingPayment)
      return { created: false, existing: true, payment: existingPayment }
    }

    // Preparar datos para guardar en Firestore
    const now = serverTimestamp()

    // Normalizar datos antes de crear
    const normalizedData = {
      // Metadatos temporales
      createdAt: now,
      lastUpdateDate: now,
      userId: userId || 'sistema',

      // Año de temporada
      seasonYear: paymentData.seasonYear,

      // Primera fracción
      firstPayment: Boolean(paymentData.firstPayment || false),
      firstPaymentDate: paymentData.firstPaymentDate || null,
      firstPaymentDone: Boolean(paymentData.firstPaymentDone || false),
      firstPaymentPrice: Number(paymentData.firstPaymentPrice || 0),

      // Segunda fracción
      secondPayment: Boolean(paymentData.secondPayment || false),
      secondPaymentDate: paymentData.secondPaymentDate || null,
      secondPaymentDone: Boolean(paymentData.secondPaymentDone || false),
      secondPaymentPrice: Number(paymentData.secondPaymentPrice || 0),

      // Tercera fracción
      thirdPayment: Boolean(paymentData.thirdPayment || false),
      thirdPaymentDate: paymentData.thirdPaymentDate || null,
      thirdPaymentDone: Boolean(paymentData.thirdPaymentDone || false),
      thirdPaymentPrice: Number(paymentData.thirdPaymentPrice || 0),
    }

    // Crear nuevo documento en la subcolección payments
    const paymentsRef = collection(db, 'partners', partnerId, 'payments')
    const docRef = await addDoc(paymentsRef, normalizedData)

    console.log(`Pago creado con ID: ${docRef.id}`)

    // Obtener el documento recién creado
    const createdDoc = await getDoc(docRef)
    return {
      created: true,
      existing: false,
      payment: { id: createdDoc.id, ...createdDoc.data() },
    }
  } catch (error) {
    console.error('Error al crear pago:', error)
    throw error
  }
}

/**
 * Actualiza un documento de pago existente
 */
export const updatePartnerPayment = async (
  partnerId,
  paymentId,
  paymentData,
  userId
) => {
  if (!partnerId || !paymentId) throw new Error('ID de pago no proporcionado')

  try {
    console.log(`Actualizando pago ${paymentId} del socio ${partnerId}...`)

    // Normalizar los datos antes de actualizar
    const normalizedData = normalizePaymentDates(paymentData)

    // Datos adicionales a actualizar
    const updateData = {
      ...normalizedData,
      lastUpdateDate: serverTimestamp(),
      userId,
    }

    console.log('Datos de actualización:', updateData)
    await updateDoc(
      doc(db, 'partners', partnerId, 'payments', paymentId),
      updateData
    )

    console.log('Pago actualizado exitosamente')
    return true
  } catch (error) {
    console.error('Error al actualizar pago:', error)
    throw error
  }
}

/**
 * Normaliza el formato de las fechas para guardar en Firestore
 */
export const normalizePaymentDates = (paymentData) => {
  if (!paymentData) return {}

  const normalizedData = { ...paymentData }

  // Convertir campos de fecha a timestamp o null
  ;['firstPaymentDate', 'secondPaymentDate', 'thirdPaymentDate'].forEach(
    (field) => {
      if (normalizedData[field]) {
        // Si es string, convertir a Date
        if (typeof normalizedData[field] === 'string') {
          // Asegurarse de que el string sea válido
          if (normalizedData[field].trim() === '') {
            normalizedData[field] = null
          } else {
            try {
              const date = new Date(normalizedData[field])
              // Verificar que sea una fecha válida
              if (!isNaN(date.getTime())) {
                normalizedData[field] = date
              } else {
                console.warn(
                  `Fecha inválida para ${field}: "${normalizedData[field]}"`
                )
                normalizedData[field] = null
              }
            } catch (error) {
              console.warn(
                `Error al convertir fecha ${field}: ${error.message}`
              )
              normalizedData[field] = null
            }
          }
        }
      } else {
        normalizedData[field] = null
      }
    }
  )

  // Normalizar valores booleanos
  ;[
    'firstPayment',
    'firstPaymentDone',
    'secondPayment',
    'secondPaymentDone',
    'thirdPayment',
    'thirdPaymentDone',
  ].forEach((field) => {
    if (field in normalizedData) {
      normalizedData[field] = Boolean(normalizedData[field])
    }
  })

  // Normalizar valores numéricos
  ;['firstPaymentPrice', 'secondPaymentPrice', 'thirdPaymentPrice'].forEach(
    (field) => {
      if (field in normalizedData) {
        normalizedData[field] = Number(normalizedData[field] || 0)
      }
    }
  )

  return normalizedData
}

/**
 * Formato de fecha para UI o campos de entrada
 * @param {any} dateValue - Valor de fecha (puede ser Date, timestamp o string)
 * @param {string} format - 'display' (visual) o 'input' (campo de formulario)
 */
export const formatDateForUI = (dateValue, format = 'display') => {
  if (!dateValue) return ''

  try {
    // Convertir de timestamp de Firestore si es necesario
    if (dateValue?.toDate) {
      dateValue = dateValue.toDate()
    }

    // Si es string, intentar convertir
    if (typeof dateValue === 'string') {
      if (dateValue.trim() === '') return ''

      try {
        dateValue = new Date(dateValue)
      } catch (e) {
        return ''
      }
    }

    // Para este punto dateValue debería ser un objeto Date válido
    if (dateValue instanceof Date && !isNaN(dateValue.getTime())) {
      if (format === 'input') {
        // YYYY-MM-DD para inputs de tipo date
        const year = dateValue.getFullYear()
        const month = String(dateValue.getMonth() + 1).padStart(2, '0')
        const day = String(dateValue.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
      } else {
        // Formato localizado para mostrar
        return dateValue.toLocaleDateString('es-ES')
      }
    }
  } catch (error) {
    console.error('Error al formatear fecha:', error)
  }

  return ''
}

export const diagnoseSeasonYearIssue = async (partnerId) => {
  if (!partnerId) return null

  try {
    const allPayments = await getAllPartnerPayments(partnerId)

    const diagnosisResults = allPayments.map((payment) => {
      const hasSeasonYear = 'seasonYear' in payment

      return {
        id: payment.id,
        hasSeasonYear,
        seasonYearValue: payment.seasonYear,
        hasBothFields: hasSeasonYear,
        hasNeitherField: !hasSeasonYear,
      }
    })

    return diagnosisResults
  } catch (error) {
    console.error('Error en diagnóstico:', error)
    return null
  }
}

/**
 * Obtiene la temporada activa actual
 * @returns {Promise<Object|null>} Datos de la temporada activa o null
 */
export const getActiveSeason = async () => {
  try {
    return await withRetry(async () => {
      console.log('Buscando temporada activa...')
      const seasonsRef = collection(db, 'seasons')
      const activeSeasonQuery = query(seasonsRef, where('active', '==', true))
      const snapshot = await getDocs(activeSeasonQuery)

      if (snapshot.empty) {
        console.log('No hay temporadas activas')
        return null
      }

      // Si hay más de una temporada activa, tomar la primera
      // En un sistema ideal, solo debería haber una temporada activa
      const seasonData = snapshot.docs[0].data()
      console.log('Temporada activa encontrada:', seasonData)
      return {
        id: snapshot.docs[0].id,
        ...seasonData,
      }
    })
  } catch (error) {
    console.error('Error al obtener temporada activa:', error)
    return null
  }
}

/**
 * Obtiene todas las temporadas categorizadas
 * @returns {Promise<Object>} Objeto con temporadas clasificadas
 */
export const getAllSeasons = async () => {
  try {
    return await withRetry(async () => {
      const seasonsRef = collection(db, 'seasons')
      const snapshot = await getDocs(seasonsRef)

      if (snapshot.empty) {
        return { active: null, historical: [], future: [] }
      }

      const currentYear = new Date().getFullYear()
      let active = null
      const historical = []
      const future = []

      snapshot.docs.forEach((doc) => {
        const season = { id: doc.id, ...doc.data() }

        // Temporada activa (tiene prioridad independientemente del año)
        if (season.active === true) {
          active = season
        }
        // Temporada histórica (no activa y año anterior al actual)
        else if (season.seasonYear < currentYear) {
          historical.push(season)
        }
        // Temporada futura (no activa y año posterior al actual)
        else if (season.seasonYear > currentYear) {
          future.push(season)
        }
        // Temporada del año actual pero no activa
        else {
          historical.push(season)
        }
      })

      // Ordenar temporadas históricas de más reciente a más antigua
      historical.sort((a, b) => b.seasonYear - a.seasonYear)

      // Ordenar temporadas futuras de más próxima a más lejana
      future.sort((a, b) => a.seasonYear - b.seasonYear)

      return { active, historical, future }
    })
  } catch (error) {
    console.error('Error al obtener todas las temporadas:', error)
    return { active: null, historical: [], future: [] }
  }
}

/**
 * Obtiene todos los socios aprobados
 * @returns {Promise<Array>} Lista de socios aprobados
 */
export const getApprovedPartners = async () => {
  try {
    return await withRetry(async () => {
      console.log('Obteniendo socios aprobados...')
      const partnersRef = collection(db, 'partners')
      const approvedPartnersQuery = query(
        partnersRef,
        where('status', '==', 'approved')
      )
      const snapshot = await getDocs(approvedPartnersQuery)

      if (snapshot.empty) {
        console.log('No se encontraron socios aprobados')
        return []
      }

      const partners = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))

      console.log(`Se encontraron ${partners.length} socios aprobados`)
      return partners
    })
  } catch (error) {
    console.error('Error al obtener socios aprobados:', error)
    return []
  }
}

/**
 * Obtiene los pagos de un socio categorizados según la temporada
 * @param {string} partnerId - ID del socio
 * @returns {Promise<Object>} Objeto con pagos clasificados
 */
export const getPartnerPaymentsByStatus = async (partnerId) => {
  if (!partnerId) {
    console.warn('getPartnerPaymentsByStatus: Se requiere ID de socio')
    return { current: null, historical: [] }
  }

  try {
    return await withRetry(async () => {
      // 1. Obtener todas las temporadas clasificadas
      const { active: activeSeason, historical: historicalSeasons } =
        await getAllSeasons()

      if (!activeSeason) {
        console.log('No hay temporada activa definida')
        return { current: null, historical: [] }
      }

      console.log(`Temporada activa: ${activeSeason.seasonYear}`)

      // 2. Obtener todos los pagos del socio
      const paymentsRef = collection(db, 'partners', partnerId, 'payments')
      const paymentsSnapshot = await getDocs(paymentsRef)

      if (paymentsSnapshot.empty) {
        console.log(`No se encontraron pagos para el socio ${partnerId}`)
        return { current: null, historical: [] }
      }

      const allPayments = paymentsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))

      console.log(
        `Se encontraron ${allPayments.length} pagos totales para el socio ${partnerId}`
      )

      // 3. Clasificar pagos
      let currentPayment = null
      const historicalPayments = []

      // Crear mapa de temporadas históricas para búsqueda rápida
      const historicalSeasonsMap = {}
      historicalSeasons.forEach((season) => {
        historicalSeasonsMap[season.seasonYear] = true
      })

      // Clasificar cada pago
      allPayments.forEach((payment) => {
        const paymentYear = payment.seasonYear

        if (!paymentYear) {
          console.log(`Pago sin año definido: ${payment.id}`)
          return
        }

        // Si coincide con la temporada activa, es el pago actual
        if (paymentYear === activeSeason.seasonYear) {
          console.log(
            `Pago actual encontrado para temporada ${activeSeason.seasonYear}: ${payment.id}`
          )
          currentPayment = payment
        }
        // Si está en la lista de temporadas históricas, es un pago histórico
        else if (historicalSeasonsMap[paymentYear]) {
          console.log(
            `Pago histórico encontrado para temporada ${paymentYear}: ${payment.id}`
          )
          historicalPayments.push(payment)
        } else {
          console.log(
            `Pago ignorado para temporada ${paymentYear} (ni actual ni histórica): ${payment.id}`
          )
        }
      })

      // Ordenar pagos históricos por año (descendente)
      historicalPayments.sort((a, b) => b.seasonYear - a.seasonYear)

      console.log(`Clasificación final: 
        - Pago actual: ${currentPayment ? 'Sí' : 'No'}
        - Pagos históricos: ${historicalPayments.length}`)

      return {
        current: currentPayment,
        historical: historicalPayments,
      }
    })
  } catch (error) {
    console.error('Error al obtener pagos clasificados del socio:', error)
    return { current: null, historical: [] }
  }
}

/**
 * Obtiene información completa de pagos para todos los socios aprobados
 * @returns {Promise<Array>} Socios con su información de pagos
 */
export const getAllApprovedPartnersWithPayments = async () => {
  try {
    // 1. Obtener la temporada activa
    const activeSeason = await getActiveSeason()
    if (!activeSeason) {
      console.log(
        'No hay temporada activa definida, no se pueden procesar pagos'
      )
      return []
    }

    // 2. Obtener todos los socios aprobados
    const approvedPartners = await getApprovedPartners()
    if (approvedPartners.length === 0) {
      console.log('No hay socios aprobados')
      return []
    }

    // 3. Para cada socio, obtener su información de pagos
    const partnersWithPayments = await Promise.all(
      approvedPartners.map(async (partner) => {
        const paymentInfo = await getPartnerPaymentsByStatus(partner.id)

        return {
          ...partner,
          payments: paymentInfo,
        }
      })
    )

    console.log(
      `Procesados ${partnersWithPayments.length} socios con sus pagos`
    )
    return partnersWithPayments
  } catch (error) {
    console.error('Error al obtener todos los socios con pagos:', error)
    return []
  }
}
