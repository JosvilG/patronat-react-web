import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { doc, getDoc, collection, getDocs } from 'firebase/firestore'
import { db } from '../../firebase/firebase'
import { useTranslation } from 'react-i18next'
import DynamicItems from '../../components/Items'
import DynamicButton from '../../components/Buttons'
import useSlug from '../../hooks/useSlug'
import Loader from '../../components/Loader'

const GamesDetails = () => {
  const { slug } = useParams()
  const [game, setGame] = useState(null)
  const [gameId, setGameId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [crews, setCrews] = useState([])
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { generateSlug } = useSlug()
  const viewDictionary = 'pages.games.details'

  // Obtener gameId del state si está disponible, o buscar por slug
  useEffect(() => {
    const fetchGameId = async () => {
      // Si el ID viene en la navegación, usarlo directamente
      if (location.state?.gameId) {
        setGameId(location.state.gameId)
        return
      }

      // De lo contrario, buscar por slug
      try {
        const gamesSnapshot = await getDocs(collection(db, 'games'))
        const gameDoc = gamesSnapshot.docs.find(
          (doc) => generateSlug(doc.data().name) === slug
        )

        if (gameDoc) {
          setGameId(gameDoc.id)
        } else {
          console.error('Juego no encontrado')
          navigate('/games-list')
        }
      } catch (error) {
        console.error('Error al buscar juego por slug:', error)
        navigate('/games-list')
      }
    }

    fetchGameId()
  }, [slug, location.state, navigate, generateSlug])

  // Obtener datos del juego una vez que tenemos el ID
  useEffect(() => {
    const fetchGameData = async () => {
      if (!gameId) return

      try {
        setLoading(true)
        const gameDoc = await getDoc(doc(db, 'games', gameId))

        if (!gameDoc.exists()) {
          console.error('El juego no existe')
          navigate('/games-list')
          return
        }

        const gameData = gameDoc.data()
        setGame({
          id: gameId,
          ...gameData,
        })

        // Buscar todas las peñas que tienen este juego en su subcolección
        const crewsSnapshot = await getDocs(collection(db, 'crews'))

        const crewsWithGameStatus = []
        const crewQueries = []

        // Primero, recopilar todas las peñas
        for (const crewDoc of crewsSnapshot.docs) {
          const crewId = crewDoc.id
          const crewData = crewDoc.data()

          // Crear una promesa para verificar si la peña tiene el juego
          const queryPromise = getDoc(
            doc(db, 'crews', crewId, 'games', gameId)
          ).then((gameInCrewDoc) => {
            if (gameInCrewDoc.exists()) {
              const gameInCrewData = gameInCrewDoc.data()
              crewsWithGameStatus.push({
                id: crewId,
                name: crewData.title || crewData.name, // Usar title si existe, sino name
                season: crewData.season,
                numberOfMembers: crewData.numberOfMembers || 0,
                points: gameInCrewData.points || 0,
              })
            }
          })

          crewQueries.push(queryPromise)
        }

        // Esperar a que todas las consultas se completen
        await Promise.all(crewQueries)

        // Ordenar las peñas: primero las confirmadas, luego pendientes, y al final rechazadas
        crewsWithGameStatus.sort((a, b) => {
          const statusOrder = { Confirmado: 0, Pendiente: 1, Rechazado: 2 }
          return (
            statusOrder[a.participationStatus] -
            statusOrder[b.participationStatus]
          )
        })

        setCrews(crewsWithGameStatus)
      } catch (error) {
        console.error('Error al cargar el juego:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchGameData()
  }, [gameId, navigate])

  const getStatusClass = (status) => {
    switch (status) {
      case 'Activo':
        return 'bg-green-100 text-green-800'
      case 'Inactivo':
        return 'bg-gray-100 text-gray-800'
      case 'Planificado':
        return 'bg-blue-100 text-blue-800'
      case 'Completado':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return <Loader loading={true} />
  }

  if (!game) {
    return (
      <div className="p-4 text-center">
        <p className="t20r">No se encontró información del juego</p>
        <DynamicButton
          onClick={() => navigate('/games-list')}
          size="medium"
          state="normal"
          type="primary"
          textId="Volver a la lista"
          className="mt-4"
        />
      </div>
    )
  }

  // Prepara los elementos para los Items dinámicos
  const gameDetailsItems = [
    {
      title: t(`${viewDictionary}.dateLabel`, 'Fecha'),
      description: game.date,
      type: 'gameData',
    },
    {
      title: t(`${viewDictionary}.timeLabel`, 'Hora'),
      description: game.time,
      type: 'gameData',
    },
    {
      title: t(`${viewDictionary}.locationLabel`, 'Ubicación'),
      description: game.location,
      type: 'gameData',
    },
  ]

  const gameParticipantsItems = [
    {
      title: t(
        `${viewDictionary}.minParticipantsLabel`,
        'Mínimo de participantes'
      ),
      description: game.minParticipants.toString(),
      type: 'gameData',
    },
    {
      title: t(`${viewDictionary}.scoreLabel`, 'Puntuación'),
      description: game.score.toString(),
      type: 'gameData',
    },
    {
      title: t(`${viewDictionary}.seasonLabel`, 'Temporada'),
      description: game.season,
      type: 'gameData',
    },
  ]

  return (
    <div className="h-auto px-4 pb-4">
      <h1 className="mb-20 text-center t24b sm:t64b">{game.name}</h1>

      <div className="grid grid-cols-1 gap-6">
        <div className="col-span-3 mb-6">
          <div className="p-6 backdrop-blur-lg backdrop-saturate-[180%] bg-[rgba(255,255,255,0.75)] rounded-[60px] h-fit">
            <div className="flex mb-4 space-x-4"></div>
            <h2 className="mb-4 sm:t40b t24b">Descripción</h2>
            <p className="sm:t20r t16r">{game.description}</p>
          </div>
        </div>
        <div>
          <div className="space-y-4 max-w-[300px] sm:max-w-none rounded-[60px] h-fit w-[430px] mb-8 text-black backdrop-blur-lg backdrop-saturate-[180%] bg-[rgba(255,255,255,0.75)]">
            <h3 className="pt-4 pl-8 sm:t40b t24b">
              {t(`${viewDictionary}.dateInfoTitle`, 'Información de la fecha')}
            </h3>
            <div className="max-w-[200px] ms:max-w-none pl-6 sm:pl-0">
              <DynamicItems items={gameDetailsItems} />
            </div>
          </div>

          <div className="space-y-4 max-w-[300px] sm:max-w-none rounded-[60px] h-fit w-[430px] mb-8 text-black backdrop-blur-lg backdrop-saturate-[180%] bg-[rgba(255,255,255,0.75)]">
            <h3 className="pt-4 pl-8 sm:t40b t24b">
              {t(`${viewDictionary}.gameInfoTitle`, 'Detalles del juego')}
            </h3>
            <div className="max-w-[200px] ms:max-w-none pl-6 sm:pl-0">
              <DynamicItems items={gameParticipantsItems} />
            </div>
          </div>
        </div>
      </div>

      {/* Sección de peñas participantes - Versión simplificada */}
      {crews.length > 0 && (
        <div className="mt-16">
          <h2 className="mb-8 text-center t40b">Peñas participantes</h2>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {crews.map((crew) => (
              <div
                key={crew.id}
                className="flex flex-col items-center p-6 bg-white shadow rounded-xl"
              >
                <h3 className="mb-2 t20b">{crew.name}</h3>

                <div className="flex flex-wrap justify-center gap-2 mb-2">
                  {crew.points >= 0 && (
                    <span className="px-2 py-1 text-blue-800 bg-blue-100 rounded-full t12r">
                      {crew.points} puntos
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {crews.length === 0 && (
        <div className="p-6 mt-16 text-center bg-gray-50 rounded-xl">
          <h2 className="mb-4 text-gray-700 t24b">
            No hay peñas asociadas a este juego
          </h2>
          <p className="text-gray-600 t16r">
            Este juego aún no tiene peñas asignadas o no se ha encontrado
            información de participación.
          </p>
        </div>
      )}

      <div className="flex justify-center mt-12">
        <DynamicButton
          onClick={() => navigate('/games-list')}
          size="medium"
          state="normal"
          type="primary"
          textId="Volver a la lista"
        />
      </div>
    </div>
  )
}

export default GamesDetails
