import React from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import useEvents from '../hooks/useEvents'
import { useNavigate } from 'react-router-dom'
import { showPopup } from '../services/popupService'
import { useTranslation } from 'react-i18next'
import tagColors from '../models/tagColors'
import useSlug from '../hooks/useSlug'

const buildPopupText = (eventData, t) => {
  const startDate = new Date(eventData.start).toLocaleString()
  const endDate = eventData.end
    ? `${t('pages.events.details.popupEndDate')} ${new Date(eventData.end).toLocaleString()}`
    : ''
  return `
    ${t('pages.events.details.popupText')}${eventData.description}
    ${t('pages.events.details.popupInitDate')} ${startDate}
    ${endDate}
  `
}

const getEventClassNames = (eventTags = []) => {
  let appliedClass = 'bg-[#D9D9D9] text-gray-800'
  for (const tag of eventTags) {
    if (tagColors?.[tag]) {
      appliedClass = tagColors[tag]
      break
    }
  }
  return `${appliedClass} rounded-lg p-2 shadow-md`
}

const Calendar = () => {
  const { events } = useEvents()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { generateSlug } = useSlug()

  const handleEventClick = (info) => {
    const { title, start, end, extendedProps = {} } = info.event

    const eventData = {
      title,
      description: extendedProps?.description || 'Sin descripción',
      start,
      end,
      tags: extendedProps?.tags || [],
      eventId: extendedProps?.eventId || 'Sin ID',
    }

    showPopup({
      title: `${eventData.title}`,
      text: buildPopupText(eventData, t),
      icon: 'info',
      showCancelButton: true,
      confirmButtonText: t('components.popup.goToEventButton'),
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
        const eventSlug = generateSlug(eventData.title)
        navigate(`/event/${eventSlug}`)
      },
    })
  }

  return (
    <div className="max-w-5xl p-6 mx-auto my-8 bg-white backdrop-blur-[17px] bg-[rgba(255,255,255,0.4)]  rounded-xl -webkit-backdrop-filter: blur(17px) saturate(180%); shadow-lg">
      <FullCalendar
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        events={events}
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
        eventClassNames={({ event }) =>
          getEventClassNames(event.extendedProps?.tags || [])
        }
        eventContent={(eventInfo) => {
          // Obtener las etiquetas del evento
          const eventTags = eventInfo.event.extendedProps?.tags || []

          // Determinar las clases de estilo basadas en las etiquetas
          let textClass = 'text-black' // Valor predeterminado

          // Buscar la primera etiqueta que coincida con tagColors para aplicar su estilo
          for (const tag of eventTags) {
            if (tagColors?.[tag]) {
              // Extraer solo la parte del texto (text-color) de la clase de la etiqueta
              const tagStyle = tagColors[tag]
              const textStyleMatch = tagStyle.match(/text-[a-z0-9-]+/)
              if (textStyleMatch) {
                textClass = textStyleMatch[0]
                break
              }
            }
          }

          return (
            <div className={`p-2 ${textClass}`}>
              <strong className={`block text-lg font-semibold ${textClass}`}>
                {eventInfo.event.title}
              </strong>
              <p className={`text-sm ${textClass}`}>
                {eventInfo.event.extendedProps?.description}
              </p>
            </div>
          )
        }}
      />
    </div>
  )
}

export default Calendar
