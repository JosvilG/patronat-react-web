import React, { useEffect, useState, useRef } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import useEvents from '../hooks/useEvents'
import { useNavigate } from 'react-router-dom'
import { showPopup } from '../services/popupService'
import { useTranslation } from 'react-i18next'
import tagColors from '../models/tagColors'
import useSlug from '../hooks/useSlug'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../firebase/firebase'

const buildPopupText = (eventData, t) => {
  const startDate = new Date(eventData.start).toLocaleString()
  const endDate = eventData.end
    ? `${t('pages.events.details.popupEndDate')} ${new Date(eventData.end).toLocaleString()}`
    : ''
  return `
    ${t('pages.events.details.popupText')}${eventData.description}
    ${t('pages.events.details.popupInitDate')} ${startDate}
    ${endDate}
    ${eventData.location ? t(`pages.events.details.popupUbication`, { location: eventData.location }) : ''}
    ${eventData.type === 'game' ? `Temporada: ${eventData.season || ''}` : ''}
    ${eventData.type === 'game' ? `Mínimo participantes: ${eventData.minParticipants || ''}` : ''}
    ${eventData.type === 'game' ? `Puntuación: ${eventData.score || ''}` : ''}
  `
}

const getEventClassNames = (eventTags = [], eventType = 'event') => {
  return `bg-transparent border-0 shadow-none text-gray-800 p-0.5 text-xs`
}

const Calendar = () => {
  const { events } = useEvents()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { generateSlug } = useSlug()
  const [games, setGames] = useState([])
  const [allCalendarEvents, setAllCalendarEvents] = useState([])
  const [windowWidth, setWindowWidth] = useState(window.innerWidth)
  const calendarRef = useRef(null)

  // Detectar el tamaño de la pantalla
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth)
    }

    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  useEffect(() => {
    const fetchGames = async () => {
      try {
        const gamesCollection = collection(db, 'games')
        const gamesSnapshot = await getDocs(gamesCollection)
        const gamesList = gamesSnapshot.docs.map((doc) => {
          const gameData = doc.data()
          return {
            id: doc.id,
            title: gameData.name,
            start: `${gameData.date}T${gameData.time || '00:00:00'}`,
            description: gameData.description,
            location: gameData.location,
            minParticipants: gameData.minParticipants,
            score: gameData.score,
            season: gameData.season,
            status: gameData.status,
            type: 'game',
            extendedProps: {
              type: 'game',
              gameId: doc.id,
              location: gameData.location,
              minParticipants: gameData.minParticipants,
              score: gameData.score,
              season: gameData.season,
              status: gameData.status,
            },
          }
        })
        setGames(gamesList)
      } catch (error) {
        return
      }
    }

    fetchGames()
  }, [])

  useEffect(() => {
    const combinedEvents = [
      ...events.map((event) => ({
        ...event,
        type: 'event',
        extendedProps: {
          ...event.extendedProps,
          type: 'event',
        },
      })),
      ...games,
    ]
    setAllCalendarEvents(combinedEvents)
  }, [events, games])

  const handleEventClick = (info) => {
    const { title, start, end, extendedProps = {} } = info.event
    const isGame = extendedProps.type === 'game'

    const eventData = {
      title,
      description: extendedProps?.description || 'Sin descripción',
      start,
      end,
      tags: extendedProps?.tags || [],
      eventId: extendedProps?.eventId || extendedProps?.gameId || 'Sin ID',
      type: extendedProps?.type || 'event',
      location: extendedProps?.location,
      season: extendedProps?.season,
      minParticipants: extendedProps?.minParticipants,
      score: extendedProps?.score,
      status: extendedProps?.status,
    }

    showPopup({
      title: `${eventData.title} `,
      text: buildPopupText(eventData, t),
      icon: 'info',
      showCancelButton: false,
      cancelButtonText: t('components.buttons.cancel'),
      customClass: {
        popup: 'bg-white rounded-lg shadow-xl p-3 sm:p-6',
        title: 'text-lg sm:text-xl font-semibold text-gray-800',
        content: 'text-sm sm:text-base text-gray-700',
        confirmButton:
          'bg-blue-500 text-white rounded-lg py-1 px-3 sm:py-2 sm:px-4 hover:bg-blue-600',
        cancelButton:
          'bg-gray-300 text-gray-700 rounded-lg py-1 px-3 sm:py-2 sm:px-4 hover:bg-gray-400',
      },
      onConfirm: () => {
        if (!isGame) {
          const eventSlug = generateSlug(eventData.title)
          navigate(`/event/${eventSlug}`)
        }
      },
    })
  }

  // Configuraciones adaptables según el tamaño de pantalla
  const isMobile = windowWidth < 640

  const headerToolbar = isMobile
    ? {
        left: 'prev,next',
        center: 'title',
        right: 'today',
      }
    : {
        left: 'prev,next today',
        center: 'title',
        right: 'dayGridMonth,dayGridWeek,dayGridDay',
      }

  const initialView = 'dayGridMonth'

  return (
    <div className="w-full max-w-5xl p-2 sm:p-6 mx-auto my-4 sm:my-8 bg-white backdrop-blur-[17px] bg-[rgba(255,255,255,0.4)] rounded-xl shadow-lg overflow-hidden">
      <h2 className="mb-2 text-gray-800 sm:mb-4 t20b sm:t24b">
        {t('components.calendar.title')}
      </h2>
      <div className="calendar-container">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView={initialView}
          events={allCalendarEvents}
          eventClick={handleEventClick}
          headerToolbar={headerToolbar}
          buttonText={{
            today: t('components.calendar.today'),
            month: t('components.calendar.month'),
            week: t('components.calendar.week'),
            day: t('components.calendar.day'),
          }}
          contentHeight="auto"
          dayCellClassNames="border-gray-200"
          dayMaxEvents={isMobile ? 2 : 6}
          moreLinkClick="week"
          eventClassNames={({ event }) => {
            const eventType = event.extendedProps?.type || 'event'
            return getEventClassNames(
              event.extendedProps?.tags || [],
              eventType
            )
          }}
          eventContent={(eventInfo) => {
            const eventType = eventInfo.event.extendedProps?.type || 'event'
            const eventTags = eventInfo.event.extendedProps?.tags || []

            let dotColor = 'bg-[#D9D9D9]'

            if (eventType === 'game') {
              dotColor = 'bg-[#3498db]'
            } else {
              for (const tag of eventTags) {
                if (tagColors?.[tag]) {
                  const tagStyle = tagColors[tag]
                  const bgStyleMatch = tagStyle.match(/bg-[a-z0-9-\[\]#]+/)
                  if (bgStyleMatch) {
                    dotColor = bgStyleMatch[0]
                    break
                  }
                }
              }
            }
            return (
              <div className="flex items-start space-x-1 px-1 py-0.5 max-w-full overflow-hidden">
                <div
                  className={`w-1.5 sm:w-2 h-1.5 sm:h-2 rounded-full mt-1 flex-shrink-0 ${dotColor}`}
                ></div>
                <div className="flex-1 min-w-0 overflow-hidden">
                  <div className="text-xs font-normal leading-tight text-gray-800">
                    <span className="block max-w-full truncate">
                      {eventInfo.event.title}
                    </span>
                  </div>
                </div>
              </div>
            )
          }}
        />
      </div>
      <div className="pt-3 mt-3 border-t sm:pt-4 sm:mt-6">
        <h3 className="mb-1 text-xs font-medium sm:mb-2 sm:text-sm">
          {t('components.calendar.legend')}
        </h3>
        <div className="grid grid-cols-2 gap-1 sm:gap-2 md:grid-cols-4">
          <div className="col-span-2 mt-1 mb-0.5 sm:mb-1 md:col-span-4">
            <h4 className="text-xs font-medium text-gray-700">
              {t('components.calendar.categories')}
            </h4>
          </div>

          {/* Leyenda más compacta para móviles */}
          <div className="flex items-center p-0.5 sm:p-1 transition-colors rounded hover:bg-gray-50">
            <span className="inline-block w-2 h-2 mr-1 bg-red-100 rounded-full sm:w-3 sm:h-3 sm:mr-2"></span>
            <span className="text-xs">{t('components.calendar.FMRLabel')}</span>
          </div>
          <div className="flex items-center p-0.5 sm:p-1 transition-colors rounded hover:bg-gray-50">
            <span className="inline-block w-2 h-2 mr-1 bg-blue-100 rounded-full sm:w-3 sm:h-3 sm:mr-2"></span>
            <span className="text-xs">
              {t('components.calendar.ChristmasLabel')}
            </span>
          </div>
          <div className="flex items-center p-0.5 sm:p-1 transition-colors rounded hover:bg-gray-50">
            <span className="inline-block w-2 h-2 mr-1 bg-yellow-100 rounded-full sm:w-3 sm:h-3 sm:mr-2"></span>
            <span className="text-xs">
              {t('components.calendar.SantosLabel')}
            </span>
          </div>
          <div className="flex items-center p-0.5 sm:p-1 transition-colors rounded hover:bg-gray-50">
            <span className="inline-block w-2 h-2 mr-1 bg-green-100 rounded-full sm:w-3 sm:h-3 sm:mr-2"></span>
            <span className="text-xs">
              {t('components.calendar.RabalLabel')}
            </span>
          </div>
          <div className="flex items-center p-0.5 sm:p-1 transition-colors rounded hover:bg-gray-50">
            <span className="inline-block w-2 h-2 mr-1 bg-orange-100 rounded-full sm:w-3 sm:h-3 sm:mr-2"></span>
            <span className="text-xs">
              {t('components.calendar.FestivalLabel')}
            </span>
          </div>
          <div className="flex items-center p-0.5 sm:p-1 transition-colors rounded hover:bg-gray-50">
            <span className="inline-block w-2 h-2 mr-1 bg-purple-100 rounded-full sm:w-3 sm:h-3 sm:mr-2"></span>
            <span className="text-xs">
              {t('components.calendar.MeetingLabel')}
            </span>
          </div>
          <div className="flex items-center p-0.5 sm:p-1 transition-colors rounded hover:bg-gray-50">
            <span className="inline-block w-2 h-2 mr-1 bg-gray-100 rounded-full sm:w-3 sm:h-3 sm:mr-2"></span>
            <span className="text-xs">
              {t('components.calendar.OtherLabel')}
            </span>
          </div>
          <div className="flex items-center p-0.5 sm:p-1 transition-colors rounded hover:bg-gray-50">
            <span className="inline-block w-2 h-2 sm:w-3 sm:h-3 mr-1 sm:mr-2 bg-[#3498db] rounded-full"></span>
            <span className="text-xs">
              {t('components.calendar.PruebasLabel')}
            </span>
          </div>
        </div>
      </div>{' '}
      {/* Estilos para dispositivos móviles */}
      <style>{`
        @media (max-width: 640px) {
          .fc .fc-toolbar-title {
            font-size: 1.2em;
          }
          .fc .fc-button {
            padding: 0.2em 0.4em;
            font-size: 0.9em;
          }
          .fc .fc-col-header-cell-cushion {
            padding: 4px;
            font-size: 0.8em;
          }
          .fc .fc-daygrid-day-number {
            padding: 2px 4px;
            font-size: 0.8em;
          }
        }
        
        /* Estilos para prevenir desbordamiento de eventos */
        .fc .fc-event {
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          white-space: nowrap !important;
          max-width: 100% !important;
        }
        
        .fc .fc-event-title {
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          white-space: nowrap !important;
        }
        
        .fc .fc-daygrid-event {
          margin: 1px 0 !important;
          overflow: hidden !important;
        }
        
        .fc .fc-daygrid-event-harness {
          overflow: hidden !important;
        }
        
        .fc .fc-event-main {
          overflow: hidden !important;
        }
      `}</style>
    </div>
  )
}

export default Calendar
