import React, { useEffect, useState } from 'react'
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
    ${eventData.location ? `Ubicación: ${eventData.location}` : ''}
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
        console.error('Error al obtener juegos:', error)
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
      title: `${eventData.title} ${isGame ? '(Juego)' : ''}`,
      text: buildPopupText(eventData, t),
      icon: 'info',
      showCancelButton: false,
      cancelButtonText: t('components.popup.closeButtonText'),
      customClass: {
        popup: 'bg-white rounded-lg shadow-xl p-6',
        title: 'text-xl font-semibold text-gray-800',
        content: 'text-gray-700',
        confirmButton:
          'bg-blue-500 text-white rounded-lg py-2 px-4 hover:bg-blue-600',
        cancelButton:
          'bg-gray-300 text-gray-700 rounded-lg py-2 px-4 hover:bg-gray-400',
      },
      onConfirm: () => {
        if (!isGame) {
          const eventSlug = generateSlug(eventData.title)
          navigate(`/event/${eventSlug}`)
        }
      },
    })
  }

  return (
    <div className="max-w-5xl p-6 mx-auto my-8 bg-white backdrop-blur-[17px] bg-[rgba(255,255,255,0.4)]  rounded-xl -webkit-backdrop-filter: blur(17px) saturate(180%); shadow-lg">
      <h2 className="mb-4 text-2xl font-semibold text-gray-800">
        {t('components.calendar.title')}
      </h2>
      <FullCalendar
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        events={allCalendarEvents}
        eventClick={handleEventClick}
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,dayGridWeek,dayGridDay',
        }}
        buttonText={{
          today: t('components.calendar.today'),
          month: t('components.calendar.month'),
          week: t('components.calendar.week'),
          day: t('components.calendar.day'),
        }}
        contentHeight="auto"
        dayCellClassNames="border-gray-200"
        eventClassNames={({ event }) => {
          const eventType = event.extendedProps?.type || 'event'
          return getEventClassNames(event.extendedProps?.tags || [], eventType)
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
            <div className="flex items-start space-x-1 px-1 py-0.5">
              <div
                className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${dotColor}`}
              ></div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-normal text-gray-800">
                  <span className="truncate">{eventInfo.event.title}</span>
                </div>
              </div>
            </div>
          )
        }}
      />

      <div className="pt-4 mt-6 border-t">
        <h3 className="mb-2 text-sm font-medium">
          {t('components.calendar.legend')}
        </h3>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
          <div className="col-span-2 mt-2 mb-1 md:col-span-3">
            <h4 className="text-xs font-medium text-gray-700">
              {t('components.calendar.categories')}
            </h4>
          </div>
          <div className="flex items-center p-1 transition-colors rounded cursor-pointer hover:bg-gray-50">
            <span className="inline-block w-3 h-3 mr-2 bg-red-100 rounded-full"></span>
            <span className="text-xs">{t('components.calendar.FMRLabel')}</span>
          </div>
          <div className="flex items-center p-1 transition-colors rounded cursor-pointer hover:bg-gray-50">
            <span className="inline-block w-3 h-3 mr-2 bg-blue-100 rounded-full"></span>
            <span className="text-xs">
              {t('components.calendar.ChristmasLabel')}
            </span>
          </div>
          <div className="flex items-center p-1 transition-colors rounded cursor-pointer hover:bg-gray-50">
            <span className="inline-block w-3 h-3 mr-2 bg-yellow-100 rounded-full"></span>
            <span className="text-xs">
              {t('components.calendar.SantosLabel')}
            </span>
          </div>
          <div className="flex items-center p-1 transition-colors rounded cursor-pointer hover:bg-gray-50">
            <span className="inline-block w-3 h-3 mr-2 bg-green-100 rounded-full"></span>
            <span className="text-xs">
              {t('components.calendar.RabalLabel')}
            </span>
          </div>
          <div className="flex items-center p-1 transition-colors rounded cursor-pointer hover:bg-gray-50">
            <span className="inline-block w-3 h-3 mr-2 bg-orange-100 rounded-full"></span>
            <span className="text-xs">
              {t('components.calendar.FestivalLabel')}
            </span>
          </div>
          <div className="flex items-center p-1 transition-colors rounded cursor-pointer hover:bg-gray-50">
            <span className="inline-block w-3 h-3 mr-2 bg-purple-100 rounded-full"></span>
            <span className="text-xs">
              {t('components.calendar.MeetingLabel')}
            </span>
          </div>
          <div className="flex items-center p-1 transition-colors rounded cursor-pointer hover:bg-gray-50">
            <span className="inline-block w-3 h-3 mr-2 bg-gray-100 rounded-full"></span>
            <span className="text-xs">
              {t('components.calendar.OtherLabel')}
            </span>
          </div>
          <div className="flex items-center p-1 transition-colors rounded cursor-pointer hover:bg-gray-50">
            <span className="inline-block w-3 h-3 mr-2 bg-[#3498db] rounded-full"></span>
            <span className="text-xs">
              {t('components.calendar.PruebasLabel')}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Calendar
