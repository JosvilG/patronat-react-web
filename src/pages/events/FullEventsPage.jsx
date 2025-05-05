import React, { useContext } from 'react'
import useEvents from '../../hooks/useEvents'
import DynamicItems from '../../components/Items'
import DynamicCard from '../../components/Cards'
import Loader from '../../components/Loader'
import { AuthContext } from '../../contexts/AuthContext'

const FullEventsPage = () => {
  const { events, loading, error } = useEvents()
  const { userData } = useContext(AuthContext)

  if (loading) {
    return <Loader loading={loading} />
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        Error al cargar los eventos: {error.message}
      </div>
    )
  }

  const isAdmin = userData?.role === 'admin'

  return (
    <div className="container min-h-screen p-4 mx-auto">
      <h1 className="mb-4 text-2xl font-bold text-center">Lista de Eventos</h1>

      {isAdmin ? (
        <DynamicItems
          extraClass={'mb-4'}
          items={events.map((event) => {
            return {
              title: event.title,
              description: event.description,
              badge: new Date(event.start).toLocaleDateString('es-ES', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              }),
              haveChevron: true,
              link: `/event/${event.title.toLowerCase().replace(/ /g, '-')}`,
              action: () => {
                alert(`Evento seleccionado: ${event.title}`)
              },
            }
          })}
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => {
            return (
              <DynamicCard
                key={event.eventId}
                type="event"
                title={event.title}
                description={event.description}
                date={new Date(event.start).toLocaleDateString('es-ES', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
                imageUrl={
                  event.imageURL
                    ? event.imageURL
                    : event.eventURL
                      ? event.eventURL
                      : '/placeholder.png'
                }
                link={`/event/${event.title.toLowerCase().replace(/ /g, '-')}`}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

export default FullEventsPage
