import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { collection, getDocs, doc, getDoc } from 'firebase/firestore'
import { db } from './../../firebase/firebase'
import { useTranslation } from 'react-i18next'
import DynamicCard from '../../components/Cards'
import DynamicItems from '../../components/Items'
import InstagramIcon from '@mui/icons-material/Instagram'
import FacebookIcon from '@mui/icons-material/Facebook'
import XIcon from '@mui/icons-material/X'
import DynamicButton from '../../components/Buttons'

const EventPage = () => {
  const { eventName } = useParams()
  const [event, setEvent] = useState(null)
  const [collaborators, setCollaborators] = useState({})
  const [participants, setParticipants] = useState({})
  const [organizer, setOrganizer] = useState(null)
  const { t } = useTranslation()
  const navigate = useNavigate()
  const viewDictionary = 'pages.events.details'

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'events'))
        const eventDoc = querySnapshot.docs.find(
          (doc) =>
            doc.data().title.toLowerCase().replace(/ /g, '-') === eventName
        )

        if (eventDoc) {
          const eventData = eventDoc.data()
          setEvent(eventData)

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
          navigate('/404')
        }
      } catch (error) {
        return
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
      }
    } catch (error) {
      return
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
        }
      }

      setCollaborators(collaboratorsData)
    } catch (error) {
      return
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
        }
      }

      setParticipants(participantsData)
    } catch (error) {
      return
    }
  }

  const handleDownloadAuthorization = () => {
    if (event.authDocumentURL) {
      // Descargar el archivo desde la URL de Storage
      fetch(event.authDocumentURL)
        .then((response) => {
          if (!response.ok) {
            throw new Error('No se pudo descargar el documento')
          }
          return response.blob()
        })
        .then((blob) => {
          // Crear un enlace temporal para descargar el archivo
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          // Obtener el nombre del archivo de la URL o usar uno predeterminado
          const fileName =
            event.authDocumentURL.split('/').pop().split('?')[0] ||
            `autorizacion_menores_${event.title.toLowerCase().replace(/\s+/g, '_')}.pdf`
          a.download = fileName
          document.body.appendChild(a)
          a.click()

          // Limpieza
          setTimeout(() => {
            document.body.removeChild(a)
            URL.revokeObjectURL(url)
          }, 100)
        })
        .catch((error) => {
          alert('No se pudo descargar el documento de autorización.')
        })
    }
  }

  if (!event) {
    return <p className="text-center"></p>
  }

  const eventDataDetails = [
    event.startDate && {
      title: t('pages.events.details.startDate'),
      description: new Date(event.startDate).toLocaleDateString(),
      type: 'eventData',
    },
    event.endDate && {
      title: t('pages.events.details.endDate'),
      description: new Date(event.endDate).toLocaleDateString(),
      type: 'eventData',
    },
    event.startTime && {
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
    event.location && {
      title: t('pages.events.details.location'),
      description: event.location,
      type: 'eventData',
    },
    event.capacity && {
      title: t('pages.events.details.capacity'),
      description: event.capacity,
      type: 'eventData',
    },
    event.minAge && {
      title: t('pages.events.details.minAge'),
      description: `${event.minAge} años`,
      type: 'eventData',
      extraContent:
        event.minAge <= 15 && event.authDocumentURL ? (
          <div className="mt-2 ml-2">
            <DynamicButton
              size="medium"
              state="normal"
              type="primary"
              textId={t(`${viewDictionary}.downloadPermission`)}
              onClick={handleDownloadAuthorization}
            ></DynamicButton>
          </div>
        ) : null,
    },
  ].filter(Boolean)

  const eventServicesDetails = [
    {
      title: t('pages.events.details.price'),
      description:
        event.price === 0
          ? t(`${viewDictionary}.freeLabel`)
          : `${event.price} €`,
      type: 'eventData',
    },
    typeof event.allowCars !== 'undefined' && {
      title: t('pages.events.details.allowCars'),
      description: event.allowCars ? 'Sí' : 'No',
      type: 'eventData',
    },
    typeof event.hasBar !== 'undefined' && {
      title: t('pages.events.details.hasBar'),
      description: event.hasBar ? 'Sí' : 'No',
      type: 'eventData',
    },
  ].filter(Boolean)

  // Verificar si hay colaboradores disponibles
  const hasCollaborators =
    event.collaborators?.length > 0 && Object.keys(collaborators).length > 0

  // Verificar si hay participantes disponibles
  const hasParticipants =
    event.participants?.length > 0 && Object.keys(participants).length > 0

  // Verificar si hay datos de fechas disponibles
  const hasDateInfo = eventDataDetails.length > 0

  // Verificar si hay datos de acceso disponibles
  const hasAccessInfo = eventAccessDetails.length > 0

  // Verificar si hay datos de servicios disponibles
  const hasServicesInfo = eventServicesDetails.length > 0

  return (
    <div className="h-auto px-4">
      <h1 className="mb-20 text-center t64b">{event.title}</h1>
      <div className="grid gap-6 md:grid-cols-5">
        <div className="mb-6 md:col-span-3">
          <DynamicCard
            key={event.eventId}
            type="gallery"
            extraClass="h-[53rem] "
            imageUrl={event.eventURL || '/placeholder.png'}
          />
        </div>
        <div>
          {hasDateInfo && (
            <div className="space-y-4 bg-[#D9D9D9] rounded-[60px] h-fit w-[430px] mb-8 text-black backdrop-blur-lg backdrop-saturate-[180%] bg-[rgba(255,255,255,0.75)]">
              <h3 className="pt-4 pl-8 t40b">
                {t(`${viewDictionary}.dateInfoTitle`)}
              </h3>
              <DynamicItems items={eventDataDetails} />
            </div>
          )}

          {hasAccessInfo && (
            <div className="space-y-4 bg-[#D9D9D9] rounded-[60px] h-fit w-[430px] mb-8 text-black backdrop-blur-lg backdrop-saturate-[180%] bg-[rgba(255,255,255,0.75)]">
              <h3 className="pt-4 pl-8 t40b">
                {t(`${viewDictionary}.locationInfoTitle`)}
              </h3>
              <DynamicItems items={eventAccessDetails} />
            </div>
          )}

          {hasServicesInfo && (
            <div className="space-y-4 bg-[#D9D9D9] rounded-[60px] h-fit w-[430px] mb-8 text-black backdrop-blur-lg backdrop-saturate-[180%] bg-[rgba(255,255,255,0.75)]">
              <h3 className="pt-4 pl-8 t40b">
                {t(`${viewDictionary}.pricesInfoTitle`)}
              </h3>
              <DynamicItems items={eventServicesDetails} />
            </div>
          )}
        </div>
      </div>

      {event.description && (
        <div className="flex flex-col items-center mb-4 p-4 justify-center rounded-lg md:flex-row text-black backdrop-blur-lg backdrop-saturate-[180%] bg-[rgba(255,255,255,0.75)]">
          <div className="w-full md:w-auto">
            <p className="t36r">{event.description}</p>
          </div>
        </div>
      )}

      {(organizer || hasCollaborators) && (
        <div className="flex flex-col items-center justify-between p-4 rounded-lg md:flex-row text-black backdrop-blur-lg backdrop-saturate-[180%] bg-[rgba(255,255,255,0.75)]">
          {organizer && (
            <div className="w-full md:w-auto">
              <p className="mb-3 text-xl font-bold">
                {t(`${viewDictionary}.organizer`)}
              </p>
              <div className="flex items-center gap-3">
                <img
                  src={organizer.url || '/placeholder.png'}
                  alt={`Organizador ${organizer.name}`}
                  className="object-contain w-24 h-24 rounded-full"
                />
              </div>
            </div>
          )}

          {hasCollaborators && (
            <div className="mt-6 md:mt-0">
              <p className="mb-3 text-xl font-bold">
                {t(`${viewDictionary}.collaborators`)}
              </p>
              <div className="flex flex-wrap items-center gap-4">
                {event.collaborators?.map((collabId) =>
                  collaborators[collabId] ? (
                    <div
                      key={collabId}
                      className="flex flex-col items-center gap-2"
                    >
                      <img
                        src={collaborators[collabId]?.url || '/placeholder.png'}
                        alt={collaborators[collabId]?.name || 'Colaborador'}
                        className="object-contain w-24 h-24 rounded-full"
                      />
                    </div>
                  ) : null
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {hasParticipants && (
        <div className="flex flex-col items-center justify-between p-4 my-20 rounded-lg md:flex-row">
          <div className="w-full text-center">
            <h2 className="t64bl">
              {t(`${viewDictionary}.withParticipation`)}
            </h2>
            <div className="flex flex-col items-center gap-4 my-20">
              {event.participants?.map((partId) =>
                participants[partId] ? (
                  <div
                    key={partId}
                    className="flex justify-start min-w-full gap-6"
                  >
                    <img
                      src={participants[partId]?.url || '/placeholder.png'}
                      alt={participants[partId]?.name || 'Participante'}
                      className="object-contain w-64 h-64 rounded-full"
                    />
                    <div className="flex flex-col items-start justify-center">
                      <span className="t64b">{participants[partId]?.name}</span>
                      <p className="text-left t24l">
                        {participants[partId]?.desc}
                      </p>
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
                ) : null
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default EventPage
