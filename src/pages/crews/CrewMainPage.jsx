import React, { useState, useEffect, useContext } from 'react'
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
} from 'firebase/firestore'
import { useTranslation } from 'react-i18next'
import { db } from '../../firebase/firebase'
import { AuthContext } from '../../contexts/AuthContext'
import DynamicItems from '../../components/Items'
import { useNavigate } from 'react-router-dom'
import DynamicButton from '../../components/Buttons'
import useFetchUsers from '../../hooks/useFetchUsers'
import useSlug from '../../hooks/useSlug'
import Loader from '../../components/Loader'
import DynamicInput from '../../components/Inputs'
import PaginationControl from '../../components/Pagination'

function CrewMainPage() {
  const { t } = useTranslation()
  const viewDictionary = 'pages.crew.mainPage'
  const navigate = useNavigate()
  const { user, userData, loading: authLoading } = useContext(AuthContext)
  const { users, loading: usersLoading } = useFetchUsers()
  const { generateSlug } = useSlug()
  const [userCrews, setUserCrews] = useState([])
  const [loading, setLoading] = useState(true)
  const [responsableNames, setResponsableNames] = useState({})
  const [crewsRanking, setCrewsRanking] = useState([])
  const [rankingLoading, setRankingLoading] = useState(true)
  const [seasons, setSeasons] = useState([])
  const [selectedSeason, setSelectedSeason] = useState('')
  const [upcomingGames, setUpcomingGames] = useState([])
  const [loadingGames, setLoadingGames] = useState(true)
  const [currentGamePage, setCurrentGamePage] = useState(1)
  const gamesPerPage = 3

  const [crewMessages, setCrewMessages] = useState({})

  useEffect(() => {
    const fetchUserCrews = async () => {
      if (!user) {
        setUserCrews([])
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const memberQuery = query(
          collection(db, 'crews'),
          where('membersNames', 'array-contains', user.displayName || '')
        )

        const responsableQuery = query(
          collection(db, 'crews'),
          where('responsable', 'array-contains', user.uid)
        )

        const [memberSnap, responsableSnap] = await Promise.all([
          getDocs(memberQuery),
          getDocs(responsableQuery),
        ])

        const crewMap = new Map()

        memberSnap.docs.forEach((doc) => {
          crewMap.set(doc.id, { id: doc.id, ...doc.data(), role: 'member' })
        })

        responsableSnap.docs.forEach((doc) => {
          if (crewMap.has(doc.id)) {
            crewMap.set(doc.id, { ...crewMap.get(doc.id), role: 'responsable' })
          } else {
            crewMap.set(doc.id, {
              id: doc.id,
              ...doc.data(),
              role: 'responsable',
            })
          }
        })

        setUserCrews(Array.from(crewMap.values()))
      } catch (error) {
        console.error('Error fetching crews:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchUserCrews()
  }, [user])

  useEffect(() => {
    const fetchCrewsRanking = async () => {
      try {
        setRankingLoading(true)

        const gamesQuery = query(collection(db, 'games'))
        const gamesSnapshot = await getDocs(gamesQuery)

        const seasonsList = new Set()
        gamesSnapshot.docs.forEach((doc) => {
          const gameData = doc.data()
          if (gameData.season) {
            seasonsList.add(gameData.season)
          }
        })

        const seasonsArray = Array.from(seasonsList).sort()
        setSeasons(seasonsArray)

        if (seasonsArray.length > 0 && !selectedSeason) {
          setSelectedSeason(seasonsArray[seasonsArray.length - 1])
        }

        const crewsActiveQuery = query(
          collection(db, 'crews'),
          where('status', '==', 'Activo')
        )

        const crewsSnapshot = await getDocs(crewsActiveQuery)

        const crewsWithPoints = []

        for (const crewDoc of crewsSnapshot.docs) {
          const crewId = crewDoc.id
          const crewData = crewDoc.data()

          const gamesSnapshot = await getDocs(
            collection(db, 'crews', crewId, 'games')
          )

          if (!gamesSnapshot.empty) {
            const seasonPoints = {}
            const seasonGames = {}
            const seasonPlayedGames = {}

            gamesSnapshot.docs.forEach((gameDoc) => {
              const gameData = gameDoc.data()
              const season = gameData.gameSeason || 'Sin temporada'

              if (!seasonPoints[season]) {
                seasonPoints[season] = 0
                seasonGames[season] = 0
                seasonPlayedGames[season] = 0
              }

              seasonGames[season]++

              seasonPoints[season] += Number(gameData.points) || 0

              if (gameData.participationStatus === 'Participado') {
                seasonPlayedGames[season]++
              }
            })

            crewsWithPoints.push({
              id: crewId,
              name: crewData.title,
              logoURL: crewData.logoURL,
              status: crewData.status,
              seasonPoints,
              seasonGames,
              seasonPlayedGames,
              membersCount:
                (crewData.membersNames?.length || 0) +
                (crewData.responsable?.length || 0),
            })
          } else {
            crewsWithPoints.push({
              id: crewId,
              name: crewData.title,
              logoURL: crewData.logoURL,
              status: crewData.status,
              seasonPoints: { [selectedSeason]: 0 },
              seasonGames: { [selectedSeason]: 0 },
              seasonPlayedGames: { [selectedSeason]: 0 },
              membersCount:
                (crewData.membersNames?.length || 0) +
                (crewData.responsable?.length || 0),
            })
          }
        }

        setCrewsRanking(crewsWithPoints)
        setRankingLoading(false)
      } catch (error) {
        console.error('Error al obtener ranking de peñas:', error)
        setRankingLoading(false)
      }
    }

    fetchCrewsRanking()
  }, [])

  useEffect(() => {
    if (!users || users.length === 0 || userCrews.length === 0) return

    const responsableMap = {}
    const userMap = users.reduce((acc, user) => {
      acc[user.id] = user.name
      return acc
    }, {})

    userCrews.forEach((crew) => {
      if (crew.responsable && Array.isArray(crew.responsable)) {
        responsableMap[crew.id] = crew.responsable
          .map((id) => userMap[id] || t('common.unknownUser'))
          .filter(Boolean)
      }
    })

    setResponsableNames(responsableMap)
  }, [users, userCrews, t])

  const getFilteredAndSortedCrews = () => {
    if (!selectedSeason) return crewsRanking

    const filteredCrews = crewsRanking.filter(
      (crew) =>
        crew.seasonPoints[selectedSeason] !== undefined ||
        crew.seasonGames[selectedSeason] > 0
    )

    return filteredCrews.sort(
      (a, b) =>
        (b.seasonPoints[selectedSeason] || 0) -
        (a.seasonPoints[selectedSeason] || 0)
    )
  }

  const calculateStats = (crew) => {
    if (!selectedSeason)
      return { totalGames: 0, playedGames: 0, participation: 0 }

    const totalGames = crew.seasonGames[selectedSeason] || 0
    const playedGames = crew.seasonPlayedGames[selectedSeason] || 0
    const participation =
      totalGames > 0 ? Math.round((playedGames / totalGames) * 100) : 0

    return {
      totalGames,
      playedGames,
      participation,
    }
  }

  const sortedCrews = getFilteredAndSortedCrews()

  useEffect(() => {
    const fetchUpcomingGames = async () => {
      try {
        setLoadingGames(true)
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        const todayStr = today.toISOString().split('T')[0]

        const gamesQuery = query(
          collection(db, 'games'),
          where('date', '>=', todayStr),
          orderBy('date', 'asc'),
          limit(10)
        )

        const gamesSnapshot = await getDocs(gamesQuery)

        const gamesList = gamesSnapshot.docs.map((doc) => {
          const gameData = doc.data()
          return {
            id: doc.id,
            name: gameData.name,
            date: gameData.date,
            time: gameData.time || '00:00',
            location: gameData.location,
            description: gameData.description,
            minParticipants: gameData.minParticipants,
            season: gameData.season,
          }
        })

        setUpcomingGames(gamesList)
      } catch (error) {
        console.error('Error al obtener próximos juegos:', error)
      } finally {
        setLoadingGames(false)
      }
    }

    fetchUpcomingGames()
  }, [])

  const formatDate = (dateStr, timeStr) => {
    if (!dateStr) return ''

    const options = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }
    const date = new Date(`${dateStr}T${timeStr || '00:00'}`)

    return date.toLocaleDateString('es-ES', options)
  }

  const handleGamePageChange = (event, newPage) => {
    setCurrentGamePage(newPage)
  }

  const getCurrentPageGames = () => {
    const startIndex = (currentGamePage - 1) * gamesPerPage
    const endIndex = startIndex + gamesPerPage
    return upcomingGames.slice(startIndex, endIndex)
  }

  const totalGamePages = Math.ceil(upcomingGames.length / gamesPerPage)

  useEffect(() => {
    const fetchCrewMessages = async () => {
      if (!user) return

      try {
        const messagesQuery = query(
          collection(db, 'messages'),

          orderBy('createdAt', 'desc')
        )

        const messagesSnapshot = await getDocs(messagesQuery)
        const messages = messagesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))

        const messagesMap = {}
        messages.forEach((message) => {
          if (!messagesMap[message.crewId]) {
            messagesMap[message.crewId] = []
          }
          messagesMap[message.crewId].push(message)
        })

        setCrewMessages(messagesMap)
      } catch (error) {
        console.error('Error al cargar mensajes de las peñas:', error)
      }
    }

    fetchCrewMessages()
  }, [user])

  const formatMessageDate = (timestamp) => {
    if (!timestamp) return ''

    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)

    return new Intl.DateTimeFormat('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
    }).format(date)
  }

  const getMessageTypeStyle = (messageType) => {
    switch (messageType) {
      case 'rechazo':
        return 'border-red-300 bg-red-50 text-red-700'
      case 'aprobacion':
        return 'border-green-300 bg-green-50 text-green-700'
      case 'informacion':
        return 'border-blue-300 bg-blue-50 text-blue-700'
      default:
        return 'border-gray-300 bg-gray-50 text-gray-700'
    }
  }

  const getMessageTypeIcon = (messageType) => {
    switch (messageType) {
      case 'rechazo':
        return (
          <svg
            className="w-5 h-5 mr-2"
            fill="currentColor"
            viewBox="0 0 20 20"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
        )
      case 'aprobacion':
        return (
          <svg
            className="w-5 h-5 mr-2"
            fill="currentColor"
            viewBox="0 0 20 20"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
        )
      default:
        return (
          <svg
            className="w-5 h-5 mr-2"
            fill="currentColor"
            viewBox="0 0 20 20"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
        )
    }
  }

  return (
    <div className="container px-4 pb-12 mx-auto">
      <h1 className="mb-8 text-center sm:t64b t24b">
        {t(`${viewDictionary}.title`)}
      </h1>

      <div className="mb-10">
        <h2 className="mb-6 text-2xl font-bold text-center">
          {t(`${viewDictionary}.upcomingGamesTitle`, 'Próximas Pruebas')}
        </h2>

        {loadingGames ? (
          <div className="flex items-center justify-center h-40">
            <Loader loading={true} />
          </div>
        ) : upcomingGames.length > 0 ? (
          <div className="relative">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {getCurrentPageGames().map((game) => (
                <div
                  key={game.id}
                  className="relative p-6 transition-all duration-300 overflow-hidden bg-white bg-opacity-75 rounded-2xl backdrop-blur-lg backdrop-saturate-[180%] shadow-lg hover:shadow-xl"
                >
                  <div className="absolute top-0 right-0 px-3 py-1 text-sm font-medium text-white bg-green-500 rounded-bl-lg">
                    {game.season ||
                      t(`${viewDictionary}.noSeason`, 'Sin temporada')}
                  </div>

                  <h3 className="mb-3 text-xl font-bold truncate">
                    {game.name}
                  </h3>

                  <div className="mb-3 text-gray-600">
                    <div className="flex items-center mb-2">
                      <svg
                        className="w-5 h-5 mr-2"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          fillRule="evenodd"
                          d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span>{formatDate(game.date, game.time)}</span>
                    </div>

                    {game.time && (
                      <div className="flex items-center mb-2">
                        <svg
                          className="w-5 h-5 mr-2"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <span>{game.time}</span>
                      </div>
                    )}

                    {game.location && (
                      <div className="flex items-center mb-2">
                        <svg
                          className="w-5 h-5 mr-2"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            fillRule="evenodd"
                            d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <span>{game.location}</span>
                      </div>
                    )}

                    {game.minParticipants && (
                      <div className="flex items-center">
                        <svg
                          className="w-5 h-5 mr-2"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                        </svg>
                        <span>
                          {t(
                            `${viewDictionary}.minParticipants`,
                            'Mín. participantes'
                          )}{' '}
                          : {game.minParticipants}
                        </span>
                      </div>
                    )}
                  </div>

                  {game.description && (
                    <p className="mt-3 text-sm text-gray-700 line-clamp-2">
                      {game.description}
                    </p>
                  )}

                  <div className="flex justify-end mt-4">
                    {userData?.role === 'admin' && (
                      <DynamicButton
                        type="view"
                        size="x-small"
                        state="normal"
                        onClick={() => {
                          const gameSlug = generateSlug(game.name)
                          navigate(`/game-details/${gameSlug}`, {
                            state: { gameId: game.id },
                          })
                        }}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>

            {upcomingGames.length > gamesPerPage && (
              <PaginationControl
                page={currentGamePage}
                count={totalGamePages}
                totalItems={upcomingGames.length}
                itemsPerPage={gamesPerPage}
                onChange={handleGamePageChange}
                size="medium"
                className="flex justify-center mt-6"
                scrollToTop={false}
              />
            )}
          </div>
        ) : (
          <div className="p-6 text-center backdrop-blur-lg backdrop-saturate-[180%] bg-[rgba(255,255,255,0.75)] rounded-[40px]">
            <p className="t18r">
              {t(
                `${viewDictionary}.noUpcomingGames`,
                'No hay próximas pruebas programadas'
              )}
            </p>
          </div>
        )}
      </div>

      <div className="mb-12">
        {rankingLoading ? (
          <div className="flex items-center justify-center h-40">
            <Loader loading={true} />
          </div>
        ) : sortedCrews.length > 0 ? (
          <div
            className="overflow-x-auto backdrop-blur-lg backdrop-saturate-[180%] bg-[rgba(255,255,255,0.75)] rounded-[40px] p-6"
            style={{ zIndex: -1 }}
          >
            <div className="flex flex-row justify-between">
              <h3 className="mb-4 t24b">
                {t(`${viewDictionary}.rankingSubtitle`, 'Clasificación')} -{' '}
                {selectedSeason}
              </h3>
              <div className="w-full md:w-auto">
                <DynamicInput
                  name="seasonSelector"
                  textId={`${viewDictionary}.seasonSelector`}
                  type="select"
                  options={seasons.map((season) => ({
                    value: season,
                    label: season,
                  }))}
                  value={selectedSeason}
                  onChange={(e) => setSelectedSeason(e.target.value)}
                  disabled={rankingLoading || seasons.length === 0}
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="text-left border-b-2 border-gray-200">
                    <th className="px-4 py-3 t16b">#</th>
                    <th className="px-4 py-3 t16b">
                      {t(`${viewDictionary}.crew`, 'Peña')}
                    </th>
                    <th className="px-4 py-3 text-center t16b">
                      {t(`${viewDictionary}.points`, 'Puntos')}
                    </th>
                    <th className="px-4 py-3 text-center t16b">
                      {t(`${viewDictionary}.played`, 'Juegos')}
                    </th>
                    <th className="px-4 py-3 text-center t16b">
                      {t(`${viewDictionary}.participation`, 'Participación')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedCrews.map((crew, index) => {
                    const stats = calculateStats(crew)

                    return (
                      <tr
                        key={crew.id}
                        className={`border-b border-gray-200 hover:bg-gray-50 ${
                          index < 3 ? 'bg-yellow-50' : ''
                        }`}
                      >
                        <td className="px-4 py-4 t16b">
                          {index + 1}
                          {index === 0 && (
                            <span className="ml-2 text-yellow-500">🏆</span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center">
                            {crew.logoURL ? (
                              <img
                                src={crew.logoURL}
                                alt={`Logo de ${crew.name}`}
                                className="object-cover w-10 h-10 mr-3 rounded-full"
                              />
                            ) : (
                              <div className="flex items-center justify-center w-10 h-10 mr-3 text-white bg-gray-400 rounded-full">
                                {crew.name.charAt(0)}
                              </div>
                            )}
                            <span className="t16b">{crew.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className="px-4 py-1 font-bold text-green-800 bg-green-100 rounded-full t18b">
                            {crew.seasonPoints[selectedSeason] || 0}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className="t16r">
                            {stats.playedGames} / {stats.totalGames}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <div className="relative flex items-center w-full h-4 bg-gray-200 rounded-full">
                            <div
                              className="h-4 rounded-full bg-gradient-to-r from-green-400 to-green-600"
                              style={{ width: `${stats.participation}%` }}
                            ></div>
                            <span className="absolute inset-0 flex items-center justify-center t14b">
                              {stats.participation}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div
            className="p-6 text-center backdrop-blur-lg backdrop-saturate-[180%] bg-[rgba(255,255,255,0.75)] rounded-[40px]"
            style={{ zIndex: -1 }}
          >
            <p className="t18r">
              {t(
                `${viewDictionary}.noCrewsForSeason`,
                'No hay peñas con puntuación para esta temporada'
              )}
            </p>
          </div>
        )}
      </div>

      {user && (
        <div className="mt-12">
          {authLoading || loading || usersLoading ? (
            <div className="flex items-center justify-center my-8">
              <Loader loading={true} />
            </div>
          ) : userCrews.length === 0 ? (
            <div className="max-w-3xl p-8 mx-auto text-center bg-white bg-opacity-75 rounded-2xl backdrop-blur-lg backdrop-saturate-[180%] shadow-lg flex flex-col items-center sm:flex-none">
              <h2 className="mb-6 text-3xl font-bold text-gray-800">
                {t(`${viewDictionary}.noCrewsTitle`)}
              </h2>
              <p className="mb-8 text-lg">
                {t(`${viewDictionary}.noCrewsMessage`)}
              </p>
              <div className="flex justify-center">
                <DynamicButton
                  type="add"
                  size="medium"
                  state="highlighted"
                  textId={t('common.registerCrew')}
                  onClick={() => navigate('/new-crew')}
                />
              </div>
            </div>
          ) : (
            <>
              <div className="w-auto space-y-6">
                {userCrews.map((crew) => (
                  <div
                    key={crew.id}
                    className="p-6 transition-all duration-300 bg-white bg-opacity-75 rounded-2xl backdrop-blur-lg backdrop-saturate-[180%] shadow-lg hover:shadow-xl"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center">
                        <h2 className="text-2xl font-bold">{crew.title}</h2>

                        <span
                          className={`ml-3 px-3 py-1 text-sm font-medium rounded-full 
                          ${
                            crew.status === 'Activo'
                              ? 'bg-green-100 text-green-800'
                              : crew.status === 'Pendiente'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {crew.status ||
                            t(
                              `${viewDictionary}.statusUnknown`,
                              'Estado desconocido'
                            )}
                        </span>
                      </div>
                      <span
                        className={`px-3 py-1 text-sm font-medium rounded-full ${
                          crew.role === 'responsable'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {crew.role === 'responsable'
                          ? t(`${viewDictionary}.roleResponsable`)
                          : t(`${viewDictionary}.roleMember`)}
                      </span>
                    </div>

                    <div className="mb-4">
                      <h3 className="mb-2 font-semibold t16b">
                        {t(`${viewDictionary}.responsables`)}
                      </h3>
                      {responsableNames[crew.id] &&
                      responsableNames[crew.id].length > 0 ? (
                        <ul className="pl-5 list-disc">
                          {responsableNames[crew.id].map((name, index) => (
                            <li key={index} className="text-gray-700">
                              {name}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-gray-500">
                          {t(`${viewDictionary}.noResponsables`)}
                        </p>
                      )}
                    </div>

                    <div>
                      <h3 className="mb-2 font-semibold t16b">
                        {t(`${viewDictionary}.members`)} (
                        {crew.membersNames?.length || 0})
                      </h3>
                      <div className="p-2 overflow-y-auto text-[#696969] max-h-40 backdrop-blur-lg backdrop-saturate-[180%] bg-[rgba(255,255,255,0.75)] rounded-xl">
                        {crew.membersNames && crew.membersNames.length > 0 ? (
                          <DynamicItems
                            items={crew.membersNames.map((memberName) => ({
                              title: memberName,
                              type: 'userData',
                            }))}
                          />
                        ) : (
                          <p className="p-2 text-gray-500">
                            {t(`${viewDictionary}.noMembers`)}
                          </p>
                        )}
                      </div>
                    </div>

                    {crewMessages[crew.id] &&
                      crewMessages[crew.id].length > 0 && (
                        <div className="mt-6">
                          <h3 className="mb-3 font-semibold t16b">
                            {t(`${viewDictionary}.messages`, 'Mensajes')}
                          </h3>
                          <div className="space-y-3">
                            {crewMessages[crew.id].map((message) => (
                              <div
                                key={message.id}
                                className={`p-3 border rounded-lg ${getMessageTypeStyle(
                                  message.messageType
                                )}`}
                              >
                                <div className="flex items-start">
                                  <div className="flex-shrink-0">
                                    {getMessageTypeIcon(message.messageType)}
                                  </div>
                                  <div className="flex-grow">
                                    <div className="flex items-center justify-between mb-1">
                                      <p className="font-medium">
                                        {message.messageType === 'rechazo'
                                          ? 'Aviso importante'
                                          : 'Notificación'}
                                      </p>
                                      <span className="text-xs">
                                        {formatMessageDate(message.createdAt)}
                                      </span>
                                    </div>
                                    <p className="text-sm">{message.message}</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                    <div className="flex justify-end mt-4 space-x-3">
                      {crew.role === 'responsable' && (
                        <DynamicButton
                          type="edit"
                          size="small"
                          state="normal"
                          textId={t(`${viewDictionary}.editCrew`)}
                          onClick={() => {
                            const slug = generateSlug(crew.title)
                            navigate(`/crews-modify/${slug}`, {
                              state: { crewId: crew.id },
                            })
                          }}
                        />
                      )}
                      {userData?.role === 'admin' && (
                        <DynamicButton
                          type="view"
                          size="small"
                          state="normal"
                          textId={t(`${viewDictionary}.viewDetails`)}
                          onClick={() =>
                            navigate(
                              `/crew-details/${generateSlug(crew.title)}`,
                              {
                                state: { crewId: crew.id },
                              }
                            )
                          }
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {!userCrews.some((crew) => crew.role === 'responsable') && (
                <div className="flex justify-center mt-10">
                  <DynamicButton
                    type="add"
                    size="medium"
                    state="highlighted"
                    textId={t('common.registerCrew')}
                    onClick={() => navigate('/new-crew')}
                  />
                </div>
              )}
            </>
          )}
        </div>
      )}

      {!user && !authLoading && (
        <div className="mt-12">
          <div className="max-w-3xl p-8 mx-auto text-center bg-white bg-opacity-75 rounded-2xl backdrop-blur-lg backdrop-saturate-[180%] shadow-lg flex flex-col items-center sm:flex-none">
            <h2 className="mb-6 text-3xl font-bold text-gray-800">
              {t('common.authRequired.title')}
            </h2>

            <div className="mb-8 text-lg">
              <p className="mb-4">{t('common.authRequired.text')}</p>
              <p>{t('common.authRequired.crewViewInfo')}</p>
            </div>

            <div className="flex flex-col justify-center space-y-4 md:flex-row md:space-y-0 md:space-x-6">
              <DynamicButton
                type="personAdd"
                size="medium"
                state="normal"
                textId={t('common.register')}
                onClick={() => navigate('/register')}
              />

              <DynamicButton
                type="submit"
                size="medium"
                state="highlighted"
                textId={t('common.login')}
                onClick={() => navigate('/login')}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CrewMainPage
