import React, { useState, useEffect } from 'react'
import {
  Timestamp,
  doc,
  getDoc,
  updateDoc,
  collection,
  addDoc,
  query,
  where,
  getDocs,
  setDoc,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore'
import withReactContent from 'sweetalert2-react-content'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import Swal from 'sweetalert2'
import log from 'loglevel'
import { db } from '../../firebase/firebase'
import Loader from '../../components/Loader'
import { useTranslation } from 'react-i18next'
import DynamicInput from '../../components/Inputs'
import DynamicButton from '../../components/Buttons'
import useSlug from '../../hooks/useSlug'

function GamesModify() {
  const { t } = useTranslation()
  const [gameData, setGameData] = useState({
    name: '',
    description: '',
    date: '',
    time: '',
    location: '',
    minParticipants: 0,
    score: 0,
    season: '',
    status: 'Inactivo',
  })
  const [originalGameData, setOriginalGameData] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [seasons, setSeasons] = useState([])
  const navigate = useNavigate()
  const { slug } = useParams()
  const location = useLocation()
  const { gameId } = location.state || {}
  const viewDictionary = 'pages.games.modifyGame'
  const { generateSlug } = useSlug()

  // Opciones para el select de estado
  const statusOptions = [
    { label: `${viewDictionary}.statusOptions.active`, value: 'Activo' },
    { label: `${viewDictionary}.statusOptions.inactive`, value: 'Inactivo' },
    { label: `${viewDictionary}.statusOptions.planned`, value: 'Planificado' },
    { label: `${viewDictionary}.statusOptions.completed`, value: 'Completado' },
  ]

  log.setLevel('debug')

  useEffect(() => {
    const fetchSeasons = async () => {
      try {
        const seasonsSnapshot = await getDocs(collection(db, 'seasons'))
        const seasonsData = seasonsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        setSeasons(seasonsData)
      } catch (error) {
        console.error('Error al obtener las temporadas:', error)
      }
    }

    fetchSeasons()
  }, [])

  useEffect(() => {
    const fetchGameData = async () => {
      try {
        if (!gameId) {
          throw new Error('No se proporcionó un ID de juego válido')
        }

        const gameDoc = await getDoc(doc(db, 'games', gameId))

        if (!gameDoc.exists()) {
          throw new Error('El juego no existe')
        }

        const data = gameDoc.data()
        const gameDataWithDefaults = {
          ...data,
          minParticipants: data.minParticipants || 0,
          score: data.score || 0,
        }

        setGameData(gameDataWithDefaults)
        setOriginalGameData(gameDataWithDefaults) // Guardar los datos originales
      } catch (error) {
        console.error('Error al cargar los datos del juego:', error)
        const MySwal = withReactContent(Swal)
        MySwal.fire({
          title: t(`${viewDictionary}.errorPopup.title`, 'Error'),
          text: t(
            `${viewDictionary}.errorPopup.loadingFailed`,
            'No se pudo cargar la información del juego.'
          ),
          icon: 'error',
          confirmButtonText: 'Volver',
        }).then(() => {
          navigate('/dashboard')
        })
      } finally {
        setLoading(false)
      }
    }

    fetchGameData()
  }, [gameId, navigate, t])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setGameData({
      ...gameData,
      [name]: type === 'checkbox' ? checked : value,
    })
  }

  // Modificación de handleSubmit para actualizar la subcolección en crews

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      // Comprobar si ha cambiado la temporada
      if (originalGameData && gameData.season !== originalGameData.season) {
        // Mostrar confirmación para crear un nuevo juego
        const { isConfirmed } = await Swal.fire({
          title: t(`${viewDictionary}.confirmSeasonChange.title`),
          text: t(`${viewDictionary}.confirmSeasonChange.text`, {
            oldSeason: originalGameData.season,
            newSeason: gameData.season,
          }),
          icon: 'question',
          showDenyButton: true,
          confirmButtonText: t(
            `${viewDictionary}.confirmSeasonChange.createNew`
          ),
          denyButtonText: t(
            `${viewDictionary}.confirmSeasonChange.updateExisting`
          ),
        })

        if (isConfirmed) {
          // Crear un nuevo juego con la nueva temporada
          await createNewGameForSeason(gameData.season)
          return
        }
      }

      // Si no hay cambio de temporada o el usuario eligió actualizar el existente
      const gameRef = doc(db, 'games', gameId)

      // Actualizar el juego principal
      await updateDoc(gameRef, {
        ...gameData,
        updatedAt: serverTimestamp(),
        minParticipants: Number(gameData.minParticipants),
        score: Number(gameData.score),
      })

      // Verificar qué campos relevantes cambiaron
      const relevantFieldsChanged =
        originalGameData.name !== gameData.name ||
        originalGameData.season !== gameData.season ||
        originalGameData.date !== gameData.date ||
        originalGameData.status !== gameData.status

      // Si hay campos relevantes cambiados, actualizarlos en las subcolecciones
      if (relevantFieldsChanged) {
        await updateGameInCrews(gameId, {
          gameName: gameData.name,
          gameSeason: gameData.season,
          gameDate: gameData.date,
          gameStatus: gameData.status,
          updatedAt: serverTimestamp(),
        })
      }
      // Si solo cambió el estado, actualizar solo ese campo
      else if (originalGameData.status !== gameData.status) {
        await updateGameStatusInCrews(gameId, gameData.status)
      }

      const MySwal = withReactContent(Swal)
      MySwal.fire({
        title: t(
          `${viewDictionary}.successPopup.title`,
          'Juego actualizado con éxito'
        ),
        text: t(
          `${viewDictionary}.successPopup.text`,
          'El juego ha sido actualizado correctamente'
        ),
        icon: 'success',
        confirmButtonText: 'Aceptar',
      }).then(() => {
        navigate('/games-list')
      })
    } catch (error) {
      console.error('Error al actualizar el juego:', error)
      let errorMessage = t(`${viewDictionary}.errorMessages.default`)
      if (error.code === 'unavailable') {
        errorMessage = t(`${viewDictionary}.errorMessages.unavailable`)
      } else if (error.code === 'permission-denied') {
        errorMessage = t(`${viewDictionary}.errorMessages.permission-denied`)
      }

      const MySwal = withReactContent(Swal)
      MySwal.fire({
        title: t(`${viewDictionary}.errorPopup.title`, 'Error'),
        text:
          t(
            `${viewDictionary}.errorPopup.text`,
            'Error al actualizar el juego: '
          ) + errorMessage,
        icon: 'error',
        confirmButtonText: 'Cerrar',
      })
    } finally {
      setSubmitting(false)
    }
  }

  // Función para actualizar el estado del juego en todas las crews
  const updateGameStatusInCrews = async (gameId, newStatus) => {
    try {
      // Obtener todas las crews que tienen este juego
      const crewsQuery = query(collection(db, 'crews'))
      const crewsSnapshot = await getDocs(crewsQuery)

      // Usar batch para optimizar escrituras
      const batch = writeBatch(db)

      for (const crewDoc of crewsSnapshot.docs) {
        const crewId = crewDoc.id

        // Verificar si existe el documento del juego en la subcolección
        const gameSubcolRef = doc(db, 'crews', crewId, 'games', gameId)
        const gameSubcolDoc = await getDoc(gameSubcolRef)

        if (gameSubcolDoc.exists()) {
          batch.update(gameSubcolRef, {
            gameStatus: newStatus,
            updatedAt: serverTimestamp(),
          })
        }
      }

      await batch.commit()
      console.log(
        `Estado del juego actualizado en todas las crews a: ${newStatus}`
      )
    } catch (error) {
      console.error(
        'Error al actualizar el estado del juego en las crews:',
        error
      )
      throw error
    }
  }

  // Nueva función para actualizar múltiples campos del juego en las crews

  // Función para actualizar múltiples campos del juego en todas las crews
  const updateGameInCrews = async (gameId, updatedFields) => {
    try {
      // Obtener todas las crews que tienen este juego
      const crewsQuery = query(collection(db, 'crews'))
      const crewsSnapshot = await getDocs(crewsQuery)

      // Usar batch para optimizar escrituras
      const batch = writeBatch(db)
      let updatesCount = 0

      for (const crewDoc of crewsSnapshot.docs) {
        const crewId = crewDoc.id

        // Verificar si existe el documento del juego en la subcolección
        const gameSubcolRef = doc(db, 'crews', crewId, 'games', gameId)
        const gameSubcolDoc = await getDoc(gameSubcolRef)

        if (gameSubcolDoc.exists()) {
          batch.update(gameSubcolRef, updatedFields)
          updatesCount++

          // Firebase tiene un límite de 500 operaciones por batch
          if (updatesCount >= 450) {
            await batch.commit()
            console.log(`Procesadas ${updatesCount} actualizaciones de crews`)
            // Crear un nuevo batch para las siguientes operaciones
            const newBatch = writeBatch(db)
            batch = newBatch
            updatesCount = 0
          }
        }
      }

      // Commit del último batch si tiene operaciones pendientes
      if (updatesCount > 0) {
        await batch.commit()
        console.log(
          `Procesadas ${updatesCount} actualizaciones finales de crews`
        )
      }

      console.log(
        `Juego actualizado en todas las crews con campos: ${Object.keys(
          updatedFields
        ).join(', ')}`
      )
    } catch (error) {
      console.error('Error al actualizar el juego en las crews:', error)
      throw error
    }
  }

  // Función para crear un nuevo juego con la temporada actualizada
  const createNewGameForSeason = async (newSeason) => {
    try {
      // Crear nuevo juego con información actualizada
      const newGameData = {
        ...gameData,
        name: gameData.name.includes(`(${originalGameData.season})`)
          ? gameData.name.replace(
              `(${originalGameData.season})`,
              `(${newSeason})`
            )
          : gameData.name,
        season: newSeason,
        status: 'Planificado', // Por defecto, el nuevo juego estará en estado planificado
        createdAt: serverTimestamp(),
        isClonedFrom: gameId,
      }

      // Añadir el juego a la colección games
      const newGameRef = await addDoc(collection(db, 'games'), {
        ...newGameData,
        // Convertir valores numéricos
        minParticipants: Number(newGameData.minParticipants),
        score: Number(newGameData.score),
      })

      const newGameId = newGameRef.id

      // Obtener todas las crews con estado "Activo" que pertenezcan a la nueva temporada
      const crewsQuery = query(
        collection(db, 'crews'),
        where('status', '==', 'Activo'),
        where('season', '==', newSeason)
      )

      const crewsSnapshot = await getDocs(crewsQuery)

      // Si no hay crews de la temporada, obtener todas las crews activas
      let crewsToUpdate = crewsSnapshot.docs
      if (crewsToUpdate.length === 0) {
        const allCrewsQuery = query(
          collection(db, 'crews'),
          where('status', '==', 'Activo')
        )
        const allCrewsSnapshot = await getDocs(allCrewsQuery)
        crewsToUpdate = allCrewsSnapshot.docs
      }

      // Usar batch para mejorar rendimiento con múltiples escrituras
      const batch = writeBatch(db)

      // Para cada crew, crear una entrada en la subcolección games
      crewsToUpdate.forEach((crewDoc) => {
        const crewId = crewDoc.id

        // Referencia al documento en la subcolección games
        const gameSubcolRef = doc(db, 'crews', crewId, 'games', newGameId)

        // Datos para la subcolección
        const gameSubcolData = {
          gameId: newGameId,
          gameName: newGameData.name,
          gameSeason: newSeason,
          gameDate: newGameData.date,
          gameStatus: newGameData.status,
          participationStatus: 'Pendiente', // Estado inicial para todas las crews
          points: 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }

        // Añadir al batch
        batch.set(gameSubcolRef, gameSubcolData)
      })

      // Ejecutar todas las operaciones de batch
      await batch.commit()

      Swal.fire({
        title: 'Juego creado con éxito',
        text: `Se ha creado un nuevo juego para la temporada "${newSeason}"`,
        icon: 'success',
        confirmButtonText: 'Aceptar',
      }).then(() => {
        const slug = generateSlug(newGameData.name)
        navigate(`/edit-game/${slug}`, {
          state: { gameId: newGameId },
        })
      })
    } catch (error) {
      console.error('Error al crear nuevo juego:', error)
      Swal.fire({
        title: 'Error',
        text: `No se pudo crear el juego para la temporada ${newSeason}: ${error.message}`,
        icon: 'error',
        confirmButtonText: 'Cerrar',
      })
      setSubmitting(false)
    }
  }

  const handleCloneForNewSeason = async () => {
    setSubmitting(true)

    // Pedir al usuario que seleccione la temporada para el juego clonado
    const { value: selectedSeason } = await Swal.fire({
      title: 'Selecciona una temporada',
      input: 'select',
      inputOptions: Object.fromEntries(
        seasons.map((season) => [season.id, season.name])
      ),
      inputPlaceholder: 'Selecciona una temporada',
      showCancelButton: true,
      inputValidator: (value) => {
        return new Promise((resolve) => {
          if (!value) {
            resolve('Necesitas seleccionar una temporada')
          } else {
            resolve()
          }
        })
      },
    })

    if (!selectedSeason) {
      setSubmitting(false)
      return
    }

    const selectedSeasonObj = seasons.find((s) => s.id === selectedSeason)

    // Utilizamos la función de crear nuevo juego con la temporada seleccionada
    await createNewGameForSeason(selectedSeasonObj.name)
  }

  if (loading) {
    return <Loader loading={true} />
  }

  return (
    <div className="container px-4 pb-6 mx-auto">
      <Loader loading={submitting} />

      <form
        onSubmit={handleSubmit}
        className="flex flex-col items-center mx-auto space-y-6 max-w-7xl sm:flex-none"
      >
        <h1 className="mb-6 text-center sm:t64b t40b">
          {t(`${viewDictionary}.title`, 'Modificar Juego')}
        </h1>

        <div className="p-4 mb-6 rounded-lg">
          <h3 className="mb-4 text-lg font-semibold text-gray-700">
            {t(`${viewDictionary}.basicInfoTitle`, 'Información Básica')}
          </h3>

          <div className="grid grid-cols-1 gap-6 justify-items-center">
            <div className="col-span-2">
              <DynamicInput
                name="name"
                textId={t(`${viewDictionary}.nameLabel`, 'Nombre del Juego')}
                type="text"
                value={gameData.name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="col-span-2">
              <DynamicInput
                name="description"
                textId={t(`${viewDictionary}.descriptionLabel`, 'Descripción')}
                type="textarea"
                value={gameData.description}
                onChange={handleChange}
                required
              />
            </div>

            <div className="col-span-2">
              <DynamicInput
                name="date"
                textId={t(`${viewDictionary}.dateLabel`, 'Fecha')}
                type="date"
                value={gameData.date}
                onChange={handleChange}
                required
              />
            </div>

            <div className="col-span-2">
              <DynamicInput
                name="time"
                textId={t(`${viewDictionary}.timeLabel`, 'Hora')}
                type="time"
                value={gameData.time}
                onChange={handleChange}
                required
              />
            </div>

            <div className="col-span-2">
              <DynamicInput
                name="location"
                textId={t(`${viewDictionary}.locationLabel`, 'Ubicación')}
                type="text"
                value={gameData.location}
                onChange={handleChange}
                required
              />
            </div>
          </div>
        </div>

        <div className="p-4 mb-6 rounded-lg">
          <h3 className="mb-4 text-lg font-semibold text-gray-700">
            {t(`${viewDictionary}.gameDetailsTitle`, 'Detalles del Juego')}
          </h3>

          <div className="grid grid-cols-1 gap-6">
            <div className="col-span-2">
              <DynamicInput
                name="minParticipants"
                textId={t(
                  `${viewDictionary}.minParticipantsLabel`,
                  'Mínimo de Participantes'
                )}
                type="number"
                value={gameData.minParticipants}
                onChange={handleChange}
                required
              />
            </div>

            <div className="col-span-2">
              <DynamicInput
                name="score"
                textId={t(`${viewDictionary}.scoreLabel`, 'Puntuación')}
                type="number"
                value={gameData.score}
                onChange={handleChange}
                required
              />
            </div>

            <div className="col-span-2">
              <DynamicInput
                name="season"
                textId={t(`${viewDictionary}.seasonLabel`, 'Temporada')}
                type="text"
                value={gameData.season}
                onChange={handleChange}
                required
              />
            </div>

            <div className="col-span-3">
              <DynamicInput
                name="status"
                textId={t(`${viewDictionary}.statusLabel`, 'Estado')}
                type="select"
                options={statusOptions}
                value={gameData.status}
                onChange={handleChange}
                required
              />
            </div>
          </div>
        </div>
        <div className="flex justify-end mt-8">
          <DynamicButton
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              navigate('/games-list')
            }}
            size="small"
            state="normal"
            textId="components.buttons.cancel"
            className="mr-4"
          />

          <DynamicButton
            type="submit"
            size="small"
            state="normal"
            textId={`${viewDictionary}.submitButton`}
          />
        </div>
      </form>
    </div>
  )
}

export default GamesModify
