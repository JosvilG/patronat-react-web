import React, { useState, useEffect } from 'react'
import useEvents from '../../hooks/useEvents'
import DynamicCard from '../../components/Cards'
import DynamicInput from '../../components/Inputs'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

const FullEventsPage = () => {
  const { events, error } = useEvents()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [searchQuery, setSearchQuery] = useState('')
  const [filteredEvents, setFilteredEvents] = useState([])
  const viewDictionary = 'pages.events.fullListEvents'

  useEffect(() => {
    setFilteredEvents(events)
  }, [events])

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        Error al cargar los eventos: {error.message}
      </div>
    )
  }

  const handleEventClick = (event) => {
    navigate(`/event/${event.title.toLowerCase().replace(/ /g, '-')}`)
  }

  const handleSearchChange = (event) => {
    const query = event.target.value.toLowerCase()
    setSearchQuery(query)

    const filtered = events.filter(
      (event) =>
        (event.title && event.title.toLowerCase().includes(query)) ||
        (event.description &&
          event.description.toLowerCase().includes(query)) ||
        (event.location && event.location.toLowerCase().includes(query))
    )

    setFilteredEvents(filtered)
  }

  return (
    <div className="container pb-6 mx-auto min-h-dvh">
      <h1 className="mb-4 text-center t64b">{t(`${viewDictionary}.title`)}</h1>

      <div className="max-w-md mx-auto mb-8">
        <DynamicInput
          name="search"
          type="text"
          placeholder={t(`${viewDictionary}.searchPlaceholder`)}
          value={searchQuery}
          onChange={handleSearchChange}
        />
      </div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filteredEvents.map((event) => {
          return (
            <div
              key={event.eventId}
              onClick={() => handleEventClick(event)}
              className="cursor-pointer"
            >
              <DynamicCard
                type="event"
                title={event.title}
                description={event.description}
                date={new Date(event.start).toLocaleDateString('es-ES', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
                imageUrl={event.eventURL ? event.eventURL : '/placeholder.png'}
                link={`/event/${event.title.toLowerCase().replace(/ /g, '-')}`}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default FullEventsPage
