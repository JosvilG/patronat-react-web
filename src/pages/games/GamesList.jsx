import React, { useEffect, useState } from 'react'
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  writeBatch,
  getDoc,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '../../firebase/firebase'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import DynamicInput from '../../components/Inputs'
import DynamicButton from '../../components/Buttons'
import useSlug from '../../hooks/useSlug'
import useSearchFilter from '../../hooks/useSearchFilter'
import Swal from 'sweetalert2'

function GamesList() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [games, setGames] = useState([])
  const viewDictionary = 'pages.games.fullListGames'
  const { generateSlug } = useSlug()

  const {
    searchQuery,
    filteredItems: filteredGames,
    handleSearchChange,
    updateItems,
  } = useSearchFilter([], {
    searchFields: ['name', 'description', 'season', 'location', 'status'],
    debounceTime: 300,
    caseSensitive: false,
  })

  useEffect(() => {
    const fetchGames = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'games'))
        const gameData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))

        const sortedGameData = gameData.sort((a, b) => {
          const dateA = a.date
            ? new Date(a.date.split('/').reverse().join('-'))
            : new Date(0)
          const dateB = b.date
            ? new Date(b.date.split('/').reverse().join('-'))
            : new Date(0)

          return dateB - dateA
        })

        updateItems(sortedGameData)
        setGames(sortedGameData)
      } catch (error) {
        // Error al obtener los juegos, manejo silencioso
      }
    }

    fetchGames()
  }, [updateItems])

  const handleDelete = async (id) => {
    try {
      const confirmResult = await Swal.fire({
        title: t(`${viewDictionary}.confirmDelete.title`),
        text: t(`${viewDictionary}.confirmDelete.text`),
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: t(`${viewDictionary}.confirmDelete.confirmButton`),
        cancelButtonText: t(`${viewDictionary}.confirmDelete.cancelButton`),
      })

      if (!confirmResult.isConfirmed) {
        return
      }

      const crewsSnapshot = await getDocs(collection(db, 'crews'))

      const deletePromises = []
      crewsSnapshot.docs.forEach((crewDoc) => {
        const crewId = crewDoc.id
        const gameDocRef = doc(db, 'crews', crewId, 'games', id)
        deletePromises.push(deleteDoc(gameDocRef))
      })

      await Promise.all(deletePromises)

      await deleteDoc(doc(db, 'games', id))

      const updatedGames = games.filter((game) => game.id !== id)
      setGames(updatedGames)
      updateItems(updatedGames)

      Swal.fire(
        '¡Eliminado!',
        'El juego ha sido eliminado correctamente.',
        'success'
      )
    } catch (error) {
      Swal.fire(
        'Error',
        'No se pudo eliminar el juego. Por favor, inténtalo de nuevo.',
        'error'
      )
    }
  }

  const handleToggleStatus = async (game) => {
    try {
      const newStatus = game.status === 'Activo' ? 'Inactivo' : 'Activo'

      const confirmResult = await Swal.fire({
        title: t(`${viewDictionary}.statusToggle.title`),
        text: t(`${viewDictionary}.statusToggle.text`, {
          currentStatus: game.status,
          newStatus: newStatus,
        }),
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: t(`${viewDictionary}.statusToggle.confirmButton`),
        cancelButtonText: t(`${viewDictionary}.statusToggle.cancelButton`),
      })

      if (!confirmResult.isConfirmed) {
        return
      }

      // Actualizar en la colección games
      const gameRef = doc(db, 'games', game.id)
      await updateDoc(gameRef, {
        status: newStatus,
        updatedAt: serverTimestamp(),
      })

      // Actualizar en la subcolección games de cada crew
      await updateGameStatusInCrews(game.id, newStatus)

      // Actualizar el estado local
      const updatedGames = games.map((g) =>
        g.id === game.id ? { ...g, status: newStatus } : g
      )

      setGames(updatedGames)
      updateItems(updatedGames)

      Swal.fire(
        '¡Estado actualizado!',
        `El juego ahora está ${newStatus.toLowerCase()}.`,
        'success'
      )
    } catch (error) {
      Swal.fire(
        'Error',
        'No se pudo cambiar el estado del juego. Por favor, inténtalo de nuevo.',
        'error'
      )
    }
  }

  // Función para actualizar el estado del juego en todas las crews
  const updateGameStatusInCrews = async (gameId, newStatus) => {
    try {
      // Obtener todas las crews
      const crewsSnapshot = await getDocs(collection(db, 'crews'))

      // Usar batch para optimizar escrituras
      const batch = writeBatch(db)
      let updatesCount = 0

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
          updatesCount++

          // Firebase tiene un límite de 500 operaciones por batch
          if (updatesCount >= 450) {
            await batch.commit()
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
      }
    } catch (error) {
      throw error
    }
  }

  // Añadimos una función específica para marcar juegos como completados
  const handleMarkAsCompleted = async (game) => {
    try {
      // Si ya está completado, no hacer nada
      if (game.status === 'Completado') {
        Swal.fire(
          'Información',
          'Este juego ya está marcado como completado.',
          'info'
        )
        return
      }

      // Mostrar confirmación
      const confirmResult = await Swal.fire({
        title: 'Marcar como completado',
        text: `¿Estás seguro de que quieres marcar el juego "${game.name}" como completado?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Sí, completar',
        cancelButtonText: 'Cancelar',
      })

      if (!confirmResult.isConfirmed) {
        return
      }

      // Actualizar en la colección games
      const gameRef = doc(db, 'games', game.id)
      await updateDoc(gameRef, {
        status: 'Completado',
        updatedAt: serverTimestamp(),
      })

      // Actualizar en la subcolección games de cada crew
      await updateGameStatusInCrews(game.id, 'Completado')

      // Actualizar el estado local
      const updatedGames = games.map((g) =>
        g.id === game.id ? { ...g, status: 'Completado' } : g
      )

      setGames(updatedGames)
      updateItems(updatedGames)

      Swal.fire(
        '¡Completado!',
        'El juego ha sido marcado como completado.',
        'success'
      )
    } catch (error) {
      Swal.fire(
        'Error',
        'No se pudo marcar el juego como completado. Por favor, inténtalo de nuevo.',
        'error'
      )
    }
  }

  return (
    <div className="w-[92%] sm:w-full md:w-auto pb-[4vh] mx-auto">
      <h1 className="mb-[4vh] text-center sm:t64b t40b">
        {t(`${viewDictionary}.title`, 'Listado de Juegos')}
      </h1>

      <div className="grid grid-cols-1 gap-[3vh] mb-[4vh] md:grid-cols-2">
        <div className="md:col-span-1">
          <DynamicInput
            name="search"
            type="text"
            textId={t(`${viewDictionary}.searchPlaceholder`, 'Buscar juego')}
            placeholder={t(
              `${viewDictionary}.searchPlaceholder`,
              'Buscar juego'
            )}
            value={searchQuery}
            onChange={handleSearchChange}
          />
        </div>

        <div className="flex items-end justify-end md:col-span-1">
          <DynamicButton
            onClick={() => navigate(`/games-register/`)}
            size="small"
            state="normal"
            type="add"
            textId={t(`${viewDictionary}.addNewButton`, 'Añadir nuevo juego')}
          />
        </div>
      </div>

      <ul className="space-y-[3vh]">
        {filteredGames.map((game) => (
          <li
            key={game.id}
            className="flex flex-col p-[4%] space-y-[2vh] bg-gray-100 rounded-lg shadow sm:flex-row sm:items-center sm:justify-between sm:space-y-0 sm:space-x-[3%]"
          >
            <div className="flex flex-col space-y-[1vh] sm:max-w-[65%]">
              <span className="t16b">{game.name}</span>
              <div className="flex flex-wrap gap-[1vh]">
                <span className="t16l line-clamp-2 w-auto max-w-full sm:max-w-[80%]">
                  {game.description}
                </span>
              </div>
              <div className="flex flex-wrap gap-[1vh] mt-[1vh]">
                {game.season && (
                  <span className="px-[3%] py-[0.5vh] text-yellow-800 bg-yellow-100 rounded-full t12r">
                    Temporada: {game.season}
                  </span>
                )}
                {game.location && (
                  <span className="px-[3%] py-[0.5vh] text-blue-800 bg-blue-100 rounded-full t12r">
                    {game.location}
                  </span>
                )}
                {game.date && (
                  <span className="px-[3%] py-[0.5vh] text-purple-800 bg-purple-100 rounded-full t12r">
                    {game.date}
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-[2vw] justify-end">
              {/* Botón Activar/Desactivar */}
              <DynamicButton
                onClick={() => handleToggleStatus(game)}
                size="x-small"
                state="normal"
                type={game.status === 'Activo' ? 'pause' : 'play'}
                title={
                  game.status === 'Activo'
                    ? t(`${viewDictionary}.buttons.deactivate`)
                    : t(`${viewDictionary}.buttons.activate`)
                }
              />

              {/* Nuevo botón para marcar como completado */}
              {game.status !== 'Completado' && (
                <DynamicButton
                  onClick={() => handleMarkAsCompleted(game)}
                  size="x-small"
                  state="normal"
                  type="done"
                  title="Marcar como completado"
                />
              )}

              {/* Botón Editar */}
              <DynamicButton
                onClick={() => {
                  const slug = generateSlug(game.name)
                  navigate(`/edit-game/${slug}`, {
                    state: { gameId: game.id },
                  })
                }}
                size="x-small"
                state="normal"
                type="edit"
              />

              {/* Botón Ver Participantes */}
              <DynamicButton
                onClick={() => {
                  const slug = generateSlug(game.name)
                  navigate(`/game-details/${slug}`, {
                    state: { gameId: game.id },
                  })
                }}
                size="x-small"
                type="view"
                title="Ver detalles del juego"
              />

              {/* Botón Eliminar */}
              <DynamicButton
                onClick={() => handleDelete(game.id)}
                size="x-small"
                type="delete"
                title="Eliminar juego"
              />
            </div>
          </li>
        ))}
        {filteredGames.length === 0 && (
          <li className="p-[4%] text-center bg-gray-100 rounded-lg shadow">
            <span className="text-gray-600">
              {t(`${viewDictionary}.noGamesFound`, 'No se encontraron juegos')}
            </span>
          </li>
        )}
      </ul>
    </div>
  )
}

export default GamesList
