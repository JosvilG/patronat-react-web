/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const { onRequest } = require('firebase-functions/v2/https')
const { onSchedule } = require('firebase-functions/v2/scheduler')
const logger = require('firebase-functions/logger')
const { initializeApp } = require('firebase-admin/app')
const { getFirestore } = require('firebase-admin/firestore')

// Inicializar la aplicación de Firebase Admin
initializeApp()

// Función programada para ejecutarse periódicamente (cada hora)
exports.checkCompletedEvents = onSchedule(
  {
    schedule: 'every 1 hours',
    timeZone: 'Europe/Madrid', // Ajusta a tu zona horaria
    retryConfig: {
      maxRetryAttempts: 3,
      minBackoffSeconds: 60,
    },
  },
  async (event) => {
    try {
      const db = getFirestore()
      const now = new Date()

      logger.info('Ejecutando verificación de eventos completados')

      // Obtener eventos que no estén completados (status != "Completado")
      const eventsRef = db.collection('events')
      const snapshot = await eventsRef.where('status', '==', 'Activo').get()

      if (snapshot.empty) {
        logger.info('No hay eventos pendientes para revisar')
        return null
      }

      const batch = db.batch()
      let updatedCount = 0

      snapshot.forEach((doc) => {
        const event = doc.data()

        // Verificar que el evento tenga fecha y hora de finalización
        if (event.endDate && event.endTime) {
          // Convertir la fecha de fin a un objeto Date
          // El formato de endDate es "YYYY-MM-DD" y endTime es "HH:MM"
          const [year, month, day] = event.endDate.split('-')
          const [hours, minutes] = event.endTime.split(':')

          // Crear fecha con el ajuste de mes (los meses en JavaScript son 0-indexed)
          const endDateTime = new Date(
            parseInt(year),
            parseInt(month) - 1,
            parseInt(day),
            parseInt(hours),
            parseInt(minutes)
          )

          // Comprobar si la fecha de finalización ha pasado
          if (endDateTime < now) {
            logger.info(
              `Evento ${doc.id} (${event.title}) ha terminado. Actualizando estado de "${event.status}" a "Completado"`
            )
            batch.update(doc.ref, { status: 'Completado' })
            updatedCount++
          }
        }
      })

      if (updatedCount > 0) {
        await batch.commit()
        logger.info(
          `Se actualizaron ${updatedCount} eventos a estado 'Completado'`
        )
      } else {
        logger.info('Ningún evento necesita actualización de estado')
      }

      return null
    } catch (error) {
      logger.error('Error al procesar los eventos:', error)
      return null
    }
  }
)

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// exports.helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });
