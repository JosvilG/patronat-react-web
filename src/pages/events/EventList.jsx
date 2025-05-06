import React, { useEffect, useState } from 'react'
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore'
import { db } from '../../firebase/firebase'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import DynamicInput from '../../components/Inputs'
import DynamicButton from '../../components/Buttons'

function EventList() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [events, setEvents] = useState([])
  const [filteredEvents, setFilteredEvents] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const viewDictionary = 'pages.events.fullListEvents'

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
        console.error('Error fetching collaborators:', error)
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
      await deleteDoc(doc(db, 'events', id))
      const updatedEvents = events.filter((event) => event.id !== id)
      setEvents(updatedEvents)
      setFilteredEvents(updatedEvents)
    } catch (error) {
      console.error('Error deleting event:', error)
    }
  }

  const generateSlug = (title) => {
    return title.toLowerCase().replace(/ /g, '-')
  }

  return (
    <div className="max-w-full p-6 mx-auto md:max-w-fit">
      <h1 className="mb-4 text-2xl font-bold">
        {t(`${viewDictionary}.title`)}
      </h1>
      <div className="grid items-center justify-end grid-cols-1 gap-4 mb-4 md:justify-items-end sm:grid-cols-2 sm:justify-between">
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
            size="small"
            state="normal"
            type="add"
            textId={t(`${viewDictionary}.addNewButton`)}
          />
        </div>
      </div>
      <ul className="space-y-4">
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
              <span className="text-lg font-semibold">{event.title}</span>
            </div>

            <div className="flex space-x-2">
              <DynamicButton
                onClick={() => {
                  // Usar el slug del título en lugar del ID
                  const slug = generateSlug(event.title)
                  console.log(
                    'Navegando a editar evento:',
                    slug,
                    'ID:',
                    event.id
                  )
                  navigate(`/edit-event/${slug}`, {
                    state: { eventId: event.id },
                  })
                }}
                size="small"
                state="normal"
                textId={t(`${viewDictionary}.modifyButton`)}
              />
              <DynamicButton
                onClick={() => handleDelete(event.id)}
                size="x-small"
                type="delete"
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default EventList
