import { useState, useEffect } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../firebase/firebase'

const useEvents = () => {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadEvents = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'events'))
      const firebaseEvents = snapshot.docs.map((doc) => ({
        ...doc.data(),
        eventId: doc.id,
      }))

      const formattedEvents = firebaseEvents
        .map((event) => {
          const startDate = event.startDate
          const startTime = event.startTime
          const endDate = event.endDate
          const endTime = event.endTime

          if (!startDate || !startTime || !endDate || !endTime) {
            console.warn(
              `Evento con ID ${event.eventId} tiene fechas o horas inválidas.`
            )
            return null
          }

          try {
            const startDateTime = new Date(`${startDate}T${startTime}`)
            const endDateTime = new Date(`${endDate}T${endTime}`)

            if (isNaN(startDateTime) || isNaN(endDateTime)) {
              console.warn(
                `Fechas inválidas para el evento con ID ${event.eventId}`
              )
              return null
            }

            return {
              title: event.title,
              start: startDateTime.toISOString(),
              end: endDateTime.toISOString(),
              description: event.description,
              location: event.location,
              tags: event.tags || [],
              eventId: event.eventId,
              eventURL: event.eventURL,
              imageURL: event.imageURL,
            }
          } catch (error) {
            console.error(
              `Error al procesar las fechas para el evento con ID ${event.eventId}: `,
              error
            )
            return null
          }
        })
        .filter((event) => event !== null)

      setEvents(formattedEvents)
    } catch (error) {
      console.error('Error cargando los eventos: ', error)
      setError(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadEvents()
  }, [])

  const handleEventClick = (info) => {
    const eventId = info.event.extendedProps.eventId

    console.log('Evento seleccionado:', eventId)
  }

  return { events, loading, error, handleEventClick }
}

export default useEvents
