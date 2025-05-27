import React, { useEffect, useState } from 'react'
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  query,
  where,
} from 'firebase/firestore'
import { db } from '../../firebase/firebase'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import DynamicInput from '../../components/Inputs'
import DynamicButton from '../../components/Buttons'
import useSlug from '../../hooks/useSlug'
import { showPopup } from '../../services/popupService'

function EventList() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [events, setEvents] = useState([])
  const [filteredEvents, setFilteredEvents] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const viewDictionary = 'pages.events.fullListEvents'
  const { generateSlug } = useSlug()

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'events'))
        const eventData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        setEvents(eventData)
        setFilteredEvents(eventData)
      } catch (error) {
        return
      }
    }

    fetchEvents()
  }, [])

  const handleSearchChange = (event) => {
    const query = event.target.value
    setSearchQuery(query)

    const filtered = events.filter(
      (event) => event.title && event.title.toLowerCase().includes(query)
    )

    setFilteredEvents(filtered)
  }

  const handleDelete = async (id) => {
    try {
      showPopup({
        title: '¿Estás seguro?',
        text: 'Se eliminarán el evento y todas sus inscripciones. Esta acción no se puede deshacer.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar',
        onConfirm: async () => {
          try {
            const inscriptionsQuery = query(
              collection(db, 'inscriptions'),
              where('eventId', '==', id)
            )

            const inscriptionsSnapshot = await getDocs(inscriptionsQuery)

            const deletePromises = inscriptionsSnapshot.docs.map(
              (inscriptionDoc) =>
                deleteDoc(doc(db, 'inscriptions', inscriptionDoc.id))
            )

            await Promise.all(deletePromises)

            await deleteDoc(doc(db, 'events', id))

            const updatedEvents = events.filter((event) => event.id !== id)
            setEvents(updatedEvents)
            setFilteredEvents(updatedEvents)

            showPopup({
              title: '¡Eliminado!',
              text: 'El evento y sus inscripciones han sido eliminados.',
              icon: 'success',
            })
          } catch (error) {
            console.error('Error al eliminar el evento:', error)
            showPopup({
              title: 'Error',
              text: 'No se pudo eliminar el evento. Por favor, inténtalo de nuevo.',
              icon: 'error',
            })
          }
        },
      })
    } catch (error) {
      console.error('Error al mostrar el diálogo de confirmación:', error)
    }
  }

  return (
    <div className="flex flex-col items-center max-w-[300px] sm:max-w-full pb-6 mx-auto md:max-w-fit sm:flex-none">
      <h1 className="mb-4 text-center sm:t64b t24b">
        {t(`${viewDictionary}.title`)}
      </h1>
      <div className="grid items-center justify-start grid-cols-1 gap-4 mb-4 md:justify-items-end sm:grid-cols-2 sm:justify-between">
        <DynamicInput
          name="search"
          type="text"
          textId={t(`${viewDictionary}.searchPlaceholder`)}
          placeholder={t(`${viewDictionary}.searchPlaceholder`)}
          value={searchQuery}
          onChange={handleSearchChange}
        />
        <div className="pl-0 sm:pl-32">
          <DynamicButton
            onClick={() => navigate(`/new-event/`)}
            size="x-small"
            state="normal"
            type="add"
          />
        </div>
      </div>
      <ul className="w-full space-y-4">
        {filteredEvents.map((event) => (
          <li
            key={event.id}
            className="flex items-center justify-between p-4 space-x-4 bg-gray-100 rounded-lg shadow"
          >
            <div className="flex items-center space-x-4">
              <img
                src={event.eventURL}
                alt={event.title}
                className="object-cover w-16 h-16 rounded-full"
              />
              <span className="text-lg font-semibold max-w-[130px] overflow-hidden text-ellipsis sm:max-w-none">
                {event.title}
              </span>
            </div>

            <div className="flex space-x-2">
              <DynamicButton
                onClick={() => {
                  const slug = generateSlug(event.title)

                  navigate(`/edit-event/${slug}`, {
                    state: { eventId: event.id },
                  })
                }}
                size="x-small"
                state="normal"
                type="edit"
              />

              {/* Mostrar el botón solo si needForm es true */}
              {event.needForm === true && (
                <DynamicButton
                  onClick={() => {
                    const slug = generateSlug(event.title)
                    navigate(`/event-participants/${slug}`, {
                      state: { eventId: event.id, eventTitle: event.title },
                    })
                  }}
                  size="x-small"
                  type="view"
                  title="Ver participantes"
                />
              )}

              <DynamicButton
                onClick={() => handleDelete(event.id)}
                size="x-small"
                type="delete"
                title="Eliminar evento"
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default EventList
