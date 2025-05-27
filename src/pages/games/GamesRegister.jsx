import React, { useState } from 'react'
import {
  Timestamp,
  doc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore'
import withReactContent from 'sweetalert2-react-content'
import { useNavigate } from 'react-router-dom'
import Swal from 'sweetalert2'
import log from 'loglevel'
import { db } from '../../firebase/firebase'
import Loader from '../../components/Loader'
import { useTranslation } from 'react-i18next'
import DynamicInput from '../../components/Inputs'
import DynamicButton from '../../components/Buttons'

const createGameModel = () => {
  return {
    name: '',
    description: '',
    date: '',
    time: '',
    location: '',
    minParticipants: 0,
    score: 0,
    season: '',
    status: 'Inactivo',
  }
}

function GamesRegister() {
  const { t } = useTranslation()
  const [gameData, setGameData] = useState(createGameModel())
  const [submitting, setSubmitting] = useState(false)
  const navigate = useNavigate()
  const viewDictionary = 'pages.games.registerGame'

  log.setLevel('debug')

  // Opciones para el select de estado
  const statusOptions = [
    { label: `${viewDictionary}.statusOptions.active`, value: 'Activo' },
    { label: `${viewDictionary}.statusOptions.inactive`, value: 'Inactivo' },
    { label: `${viewDictionary}.statusOptions.planned`, value: 'Planificado' },
    { label: `${viewDictionary}.statusOptions.completed`, value: 'Completado' },
  ]

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setGameData({
      ...gameData,
      [name]: type === 'checkbox' ? checked : value,
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      // Añadir el juego a la colección games
      const gameRef = doc(collection(db, 'games'))
      const gameId = gameRef.id

      await setDoc(gameRef, {
        ...gameData,
        createdAt: Timestamp.now(),
        // Convertir valores numéricos
        minParticipants: Number(gameData.minParticipants),
        score: Number(gameData.score),
      })

      // Obtener todas las crews con estado "Activo"
      const crewsQuery = query(
        collection(db, 'crews'),
        where('status', '==', 'Activo')
      )

      const crewsSnapshot = await getDocs(crewsQuery)

      // Para cada crew activa, crear una entrada en la subcolección games
      const crewUpdates = []
      crewsSnapshot.forEach((crewDoc) => {
        const crewId = crewDoc.id
        const gameSubcolRef = doc(
          collection(db, 'crews', crewId, 'games'),
          gameId
        )

        const gameSubcolData = {
          gameId: gameId,
          gameName: gameData.name,
          gameSeason: gameData.season,
          gameDate: gameData.date,
          gameStatus: gameData.status,
          participationStatus: 'Pendiente', // Estado inicial para todas las crews
          points: 0,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        }

        crewUpdates.push(setDoc(gameSubcolRef, gameSubcolData))
      })

      // Ejecutar todas las actualizaciones de crews
      await Promise.all(crewUpdates)

      const MySwal = withReactContent(Swal)
      MySwal.fire({
        title: t(`${viewDictionary}.successPopup.title`),
        text: t(`${viewDictionary}.successPopup.text`),
        icon: 'success',
        confirmButtonText: t('common.accept', 'Aceptar'),
      }).then(() => {
        navigate('/dashboard')
      })
    } catch (error) {
      let errorMessage = t(`${viewDictionary}.errorMessages.default`)
      if (error.code === 'unavailable') {
        errorMessage = t(`${viewDictionary}.errorMessages.unavailable`)
      } else if (error.code === 'permission-denied') {
        errorMessage = t(`${viewDictionary}.errorMessages.permission-denied`)
      }

      const MySwal = withReactContent(Swal)
      MySwal.fire({
        title: t(`${viewDictionary}.errorPopup.title`),
        text: t(`${viewDictionary}.errorPopup.text`, { errorMessage }),
        icon: 'error',
        confirmButtonText: t('common.close', 'Cerrar'),
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="container px-4 pb-6 mx-auto">
      <Loader loading={submitting} />

      <form
        onSubmit={handleSubmit}
        className="flex flex-col items-center mx-auto space-y-6 max-w-7xl sm:flex-none"
      >
        <h1 className="mb-6 text-center sm:t64b t24b">
          {t(`${viewDictionary}.title`, 'Registro de Juego')}
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
            {t(`${viewDictionary}.gameDetailsTitle`)}
          </h3>

          <div className="grid grid-cols-1 gap-6 justify-items-center">
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
            onClick={() => navigate('/dashboard')}
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

export default GamesRegister
