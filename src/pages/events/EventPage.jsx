import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { collection, getDocs, doc, getDoc } from 'firebase/firestore'
import { db } from './../../firebase/firebase'
import { useTranslation } from 'react-i18next'
import Loader from '../../components/Loader'
import DynamicCard from '../../components/Cards'
import DynamicItems from '../../components/Items'
import InstagramIcon from '@mui/icons-material/Instagram'
import FacebookIcon from '@mui/icons-material/Facebook'
import XIcon from '@mui/icons-material/X'

const EventPage = () => {
  const { eventName } = useParams()
  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [collaborators, setCollaborators] = useState({})
  const [participants, setParticipants] = useState({})
  const [organizer, setOrganizer] = useState(null) // Estado para almacenar los datos del organizador
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
          const eventData = eventDoc.data()
          setEvent(eventData)

          console.log('Evento encontrado:', eventData)
          console.log('IDs de los colaboradores:', eventData.collaborators)

          if (eventData.collaborators?.length) {
            fetchCollaborators(eventData.collaborators)
          }

          if (eventData.participants?.length) {
            fetchParticipants(eventData.participants)
          }

          if (eventData.organizer) {
            fetchOrganizer(eventData.organizer)
          }
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

  const fetchOrganizer = async (organizerId) => {
    try {
      const docRef = doc(db, 'collaborators', organizerId)
      const docSnap = await getDoc(docRef)

      if (docSnap.exists()) {
        const data = docSnap.data()
        setOrganizer({
          id: organizerId,
          url: data.url,
          name: data.name,
          role: data.role || '',
        })
      } else {
        console.log(`No se encontró el organizador con ID: ${organizerId}`)
      }
    } catch (error) {
      console.error('Error obteniendo el organizador:', error)
    }
  }

  const fetchCollaborators = async (collaboratorIds) => {
    try {
      const collaboratorsData = {}

      for (const collabId of collaboratorIds) {
        const docRef = doc(db, 'collaborators', collabId)
        const docSnap = await getDoc(docRef)

        if (docSnap.exists()) {
          const data = docSnap.data()
          collaboratorsData[collabId] = { url: data.url, name: data.name }
        } else {
          console.log(`No se encontró el colaborador con ID: ${collabId}`)
        }
      }

      setCollaborators(collaboratorsData)
    } catch (error) {
      console.error('Error obteniendo los colaboradores:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchParticipants = async (participantsIds) => {
    try {
      const participantsData = {}

      for (const partId of participantsIds) {
        const docRef = doc(db, 'participants', partId)
        const docSnap = await getDoc(docRef)

        if (docSnap.exists()) {
          const data = docSnap.data()
          participantsData[partId] = {
            url: data.url,
            name: data.name,
            desc: data.description,
            twitter: data.twitter,
            instagram: data.instagram,
            facebook: data.facebook,
          }
        } else {
          console.log(`No se encontró el participante con ID: ${partId}`)
        }
      }

      setParticipants(participantsData)
    } catch (error) {
      console.error('Error obteniendo los participantes:', error)
    } finally {
      setLoading(false)
    }
  }

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
      description: event.startTime,
      type: 'eventData',
    },
    event.endTime && {
      title: t('pages.events.details.endTime'),
      description: event.endTime,
      type: 'eventData',
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

  console.log('Colaboradores:', collaborators)

  return (
    <div className="h-auto px-4">
      <h1 className="mb-20 text-center t64b">{event.title}</h1>
      <div className="grid gap-6 md:grid-cols-5">
        <div className="md:col-span-3">
          <DynamicCard
            key={event.eventId}
            type="gallery"
            extraClass="h-[53rem] "
            imageUrl={event.imageURL || event.eventURL || '/placeholder.png'}
          />
        </div>
        <div>
          <div className="space-y-4 bg-[#D9D9D9] rounded-[60px] h-fit w-[430px] mb-8  text-black backdrop-blur-lg backdrop-saturate-[180%] bg-[rgba(255,255,255,0.75)]">
            <h3 className="pt-4 pl-8 t40b">Horas y fechas</h3>
            <DynamicItems items={eventDataDetails || []} />
          </div>
          <div className="space-y-4 bg-[#D9D9D9] rounded-[60px]  h-fit w-[430px] mb-8  text-black backdrop-blur-lg backdrop-saturate-[180%] bg-[rgba(255,255,255,0.75)]">
            <h3 className="pt-4 pl-8 t40b">Localización y acceso</h3>
            <DynamicItems items={eventAccessDetails || []} />
          </div>
          <div className="space-y-4 bg-[#D9D9D9] rounded-[60px]  h-fit w-[430px] mb-8  text-black backdrop-blur-lg backdrop-saturate-[180%] bg-[rgba(255,255,255,0.75)]">
            <h3 className="pt-4 pl-8 t40b">Precios y servicios</h3>
            <DynamicItems items={eventServicesDetails || []} />
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center justify-between p-4 bg-gray-200 rounded-lg md:flex-row text-black backdrop-blur-lg backdrop-saturate-[180%] bg-[rgba(255,255,255,0.75)]">
        <div className="w-full md:w-auto">
          <p className="mb-3 text-xl font-bold">Organizado por:</p>
          {organizer ? (
            <div className="flex items-center gap-3">
              <img
                src={organizer.url || '/placeholder.png'}
                alt={`Organizador ${organizer.name}`}
                className="object-cover w-24 h-24 rounded-full"
              />
            </div>
          ) : (
            <p>{event.organizer || 'Organizador no definido'}</p>
          )}
        </div>

        <div className="mt-6 md:mt-0">
          <p className="mb-3 text-xl font-bold">Con la colaboración de:</p>
          <div className="flex flex-wrap items-center gap-4">
            {event.collaborators?.map((collabId) => (
              <div key={collabId} className="flex flex-col items-center gap-2">
                <img
                  src={collaborators[collabId]?.url || '/placeholder.png'}
                  alt={`Collaborator ${collaborators[collabId]?.name || collabId}`}
                  className="object-contain w-24 h-24 rounded-full"
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center justify-between p-4 my-20 rounded-lg md:flex-row">
        <div className="w-full text-center">
          <h2 className="t64bl">Con la participación de:</h2>
          <div className="flex flex-col items-center gap-4 my-20">
            {event.participants?.map((partId) => (
              <div key={partId} className="flex justify-start min-w-full gap-6">
                <img
                  src={participants[partId]?.url || '/placeholder.png'}
                  alt={`Collaborator ${participants[partId]?.name || partId}`}
                  className="object-cover w-64 h-64 rounded-full"
                />
                <div className="flex flex-col items-start justify-center">
                  <span className="t64b">{participants[partId]?.name}</span>
                  <p className="t24l">{participants[partId]?.desc}</p>
                  <div className="flex items-center gap-4 mt-2">
                    {participants[partId]?.twitter && (
                      <a
                        href={
                          participants[partId]?.twitter.startsWith('http')
                            ? participants[partId]?.twitter
                            : `https://twitter.com/${participants[partId]?.twitter.replace('@', '')}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-black transition-colors hover:text-blue-500"
                      >
                        <XIcon fontSize="large" />
                      </a>
                    )}
                    {participants[partId]?.instagram && (
                      <a
                        href={
                          participants[partId]?.instagram.startsWith('http')
                            ? participants[partId]?.instagram
                            : `https://instagram.com/${participants[partId]?.instagram.replace('@', '')}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-black transition-colors hover:text-pink-600"
                      >
                        <InstagramIcon fontSize="large" />
                      </a>
                    )}
                    {participants[partId]?.facebook && (
                      <a
                        href={
                          participants[partId]?.facebook.startsWith('http')
                            ? participants[partId]?.facebook
                            : `https://facebook.com/${participants[partId]?.facebook}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-black transition-colors hover:text-blue-700"
                      >
                        <FacebookIcon fontSize="large" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default EventPage
