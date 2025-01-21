import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { collection, getDocs } from 'firebase/firestore'
import { db } from './../../firebase/firebase'
import tagColors from './../../models/tagColors'
import { useTranslation } from 'react-i18next'

const EventPage = () => {
  const { eventName } = useParams()
  const [event, setEvent] = useState(null)
  const { t } = useTranslation()
  const navigate = useNavigate()

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'events'))
        const eventDoc = querySnapshot.docs.find(
          (doc) =>
            doc.data().title.toLowerCase().replace(/ /g, '-') === eventName
        )

        if (eventDoc) {
          setEvent(eventDoc.data())
        } else {
          console.log('Evento no encontrado')
          navigate('/404')
        }
      } catch (error) {
        console.error('Error obteniendo el evento: ', error)
      }
    }

    fetchEvent()
  }, [eventName, navigate])

  if (!event) return <div>Cargando...</div>

  return (
    <div className="container p-6 mx-auto">
      <h1 className="text-3xl font-semibold text-center text-gray-800">
        {event.title}
      </h1>

      {event.imageURL && (
        <img
          src={event.imageURL}
          alt={event.title}
          className="object-cover w-full h-64 my-6 rounded-lg shadow-md"
        />
      )}

      <p className="mb-6 text-lg text-gray-700">{event.description}</p>

      <div className="mb-4">
        <p>
          <strong>{t('pages.events.details.startDate')}:</strong>{' '}
          {new Date(event.startDate).toLocaleString()}
        </p>
        {event.endDate && (
          <p>
            <strong>{t('pages.events.details.endDate')}:</strong>{' '}
            {new Date(event.endDate).toLocaleString()}
          </p>
        )}
      </div>

      <div className="mb-4">
        <p>
          <strong>{t('pages.events.details.startTime')}:</strong>{' '}
          {event.startTime}
        </p>
        {event.endTime && (
          <p>
            <strong>{t('pages.events.details.endTime')}:</strong>{' '}
            {event.endTime}
          </p>
        )}
      </div>

      <p className="mb-4">
        <strong>{t('pages.events.details.location')}:</strong> {event.location}
      </p>

      <div className="mb-4">
        <p>
          <strong>{t('pages.events.details.capacity')}:</strong>{' '}
          {event.capacity}
        </p>
        <p>
          <strong>{t('pages.events.details.price')}:</strong> {event.price} €{' '}
        </p>
        <p>
          <strong>{t('pages.events.details.minAge')}:</strong> {event.minAge}{' '}
          años
        </p>
      </div>

      {event.collaborators && event.collaborators.length > 0 && (
        <div className="mb-4">
          <strong>{t('pages.events.details.collaborators')}:</strong>
          <ul className="ml-6 list-disc">
            {event.collaborators.map((collaborator, index) => (
              <li key={index} className="text-gray-700">
                {collaborator}
              </li>
            ))}
          </ul>
        </div>
      )}

      {event.tags && event.tags.length > 0 && (
        <div className="mb-4">
          <strong>{t('pages.events.details.tags')}:</strong>
          <ul className="flex space-x-4">
            {event.tags.map((tag, index) => {
              const tagColor = tagColors[tag] || 'bg-gray-600'
              return (
                <li
                  key={index}
                  className={`px-4 py-2 rounded-lg text-white ${tagColor}`}
                >
                  {tag}
                </li>
              )
            })}
          </ul>
        </div>
      )}

      <div className="mb-4">
        <p>
          <strong>{t('pages.events.details.organizer')}:</strong>{' '}
          {event.organizer}
        </p>
        <p>
          <strong>{t('pages.events.details.allowCars')}:</strong>{' '}
          {event.allowCars ? 'Sí' : 'No'}
        </p>
        <p>
          <strong>{t('pages.events.details.hasBar')}:</strong>{' '}
          {event.hasBar ? 'Sí' : 'No'}
        </p>
        <p>
          <strong>{t('pages.events.details.status')}:</strong> {event.status}
        </p>
      </div>
    </div>
  )
}

export default EventPage
