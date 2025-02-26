import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { collection, getDocs } from 'firebase/firestore'
import { db } from './../../firebase/firebase'
import { useTranslation } from 'react-i18next'
import Loader from '../../components/Loader'
import DynamicCard from '../../components/Cards'
import DynamicItems from '../../components/Items'

const EventPage = () => {
  const { eventName } = useParams()
  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)
  const { t } = useTranslation()
  const navigate = useNavigate()

  useEffect(() => {
    const fetchEvent = async () => {
      setLoading(true)
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
      } finally {
        setLoading(false)
      }
    }

    fetchEvent()
  }, [eventName, navigate])

  if (loading) {
    return <Loader loading={loading} />
  }

  if (!event) {
    return (
      <p className="text-center text-red-500">{t('pages.events.notFound')}</p>
    )
  }

  const eventDataDetails = [
    {
      title: t('pages.events.details.startDate'),
      description: new Date(event.startDate).toLocaleString(),
      type: 'eventData',
    },
    event.endDate && {
      title: t('pages.events.details.endDate'),
      description: new Date(event.endDate).toLocaleString(),
      type: 'eventData',
    },
    {
      title: t('pages.events.details.startTime'),
      type: 'eventData',
      description: event.startTime,
    },
    event.endTime && {
      title: t('pages.events.details.endTime'),
      type: 'eventData',
      description: event.endTime,
    },
  ].filter(Boolean)

  const eventAccessDetails = [
    {
      title: t('pages.events.details.location'),
      description: event.location,
      type: 'eventData',
    },

    {
      title: t('pages.events.details.capacity'),
      description: event.capacity,
      type: 'eventData',
    },
    {
      title: t('pages.events.details.minAge'),
      description: `${event.minAge} años`,
      type: 'eventData',
    },
  ].filter(Boolean)

  const eventServicesDetails = [
    {
      title: t('pages.events.details.price'),
      description: `${event.price} €`,
      type: 'eventData',
    },
    {
      title: t('pages.events.details.allowCars'),
      description: event.allowCars ? 'Sí' : 'No',
      type: 'eventData',
    },
    {
      title: t('pages.events.details.hasBar'),
      description: event.hasBar ? 'Sí' : 'No',
      type: 'eventData',
    },
  ].filter(Boolean)

  const eventOtherDetails = [].filter(Boolean)

  if (event.collaborators?.length) {
    eventOtherDetails.push({
      title: t('pages.events.details.collaborators'),
      description: event.collaborators.join(', '),
    })
  }

  return (
    <div className="px-4">
      <h1 className="text-center t40s mb-28">{event.title}</h1>

      <div className="grid gap-6 md:grid-cols-5">
        <div className="md:col-span-3">
          <DynamicCard
            key={event.eventId}
            type="gallery"
            imageUrl={
              event.imageURL
                ? event.imageURL
                : event.eventURL
                  ? event.eventURL
                  : '/placeholder.png'
            }
          />
        </div>
        <div>
          <div className="space-y-4 bg-[#D9D9D9] rounded-[60px] h-fit w-[430px] mb-8">
            <h3 className="pt-4 pl-8 t40b">Horas y fechas</h3>
            <DynamicItems items={eventDataDetails || []} />
          </div>
          <div className="space-y-4 bg-[#D9D9D9] rounded-[60px] h-fit w-[430px] mb-8">
            <h3 className="pt-4 pl-8 t40b">Localización y acceso </h3>
            <DynamicItems items={eventAccessDetails || []} />
          </div>
          <div className="space-y-4 bg-[#D9D9D9] rounded-[60px] h-fit w-[430px] mb-8">
            <h3 className="pt-4 pl-8 t40b">Precios y servicios</h3>
            <DynamicItems items={eventServicesDetails || []} />
          </div>
          <button className="w-full p-3 text-white bg-black rounded-lg">
            Get a ticket
          </button>
        </div>
      </div>

      <div className="flex flex-col items-center justify-between p-4 bg-gray-200 rounded-lg md:flex-row">
        <div>
          <p className="font-bold">Organized by:</p>
          <p>{event.organizer}</p>
        </div>
        <div>
          <p className="font-bold">With the collaboration of:</p>
          <p>{event.collaborators?.join(', ') || 'N/A'}</p>
        </div>
      </div>

      <h2 className="text-2xl font-bold text-center">
        With the performance of:
      </h2>
      <div className="space-y-6">
        {event.performers?.map((performer, index) => (
          <div
            key={index}
            className="flex flex-col items-center gap-6 md:flex-row"
          >
            <div className="flex items-center justify-center w-full h-48 bg-gray-300 rounded-lg md:w-1/3">
              <span className="text-gray-500">Image Placeholder</span>
            </div>
            <div className="flex-1 text-center md:text-left">
              <h3 className="text-xl font-bold">{performer.name}</h3>
              <p className="text-gray-600">{performer.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default EventPage
