import React, { useState, useEffect, useContext } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  setDoc,
  addDoc,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '../../firebase/firebase'
import Loader from '../../components/Loader'
import { useTranslation } from 'react-i18next'
import useSlug from '../../hooks/useSlug'
import DynamicButton from '../../components/Buttons'
import { showPopup } from '../../services/popupService'
import { STATUS, getStatusClass } from '../../models/statusData'
import { AuthContext } from '../../contexts/AuthContext'
import DOMPurify from 'dompurify'

const AUTHORIZED_ROLES = ['admin']

const sanitizeHTML = (html) => {
  if (!html) return ''
  return DOMPurify.sanitize(html, {
    FORBID_TAGS: ['script', 'iframe', 'style', 'object'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
  })
}

const logAction = async (userId, action, details) => {
  try {
    await addDoc(collection(db, 'actionLogs'), {
      userId,
      action,
      details,
      timestamp: serverTimestamp(),
    })
  } catch (error) {
    console.error('Error logging action:', error)
  }
}

const CrewDetails = () => {
  const { slug } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { generateSlug } = useSlug()
  const viewDictionary = 'pages.crew.details'

  const { user, userData, loading: authLoading } = useContext(AuthContext)

  const [crew, setCrew] = useState(null)
  const [crewGames, setCrewGames] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [responsables, setResponsables] = useState([])
  const [actionLoading, setActionLoading] = useState(false)
  const [isAuthorized, setIsAuthorized] = useState(false)

  useEffect(() => {
    if (authLoading) return

    if (!user) {
      navigate('/login', { state: { returnUrl: location.pathname } })
      return
    }

    const hasPermission =
      userData &&
      (AUTHORIZED_ROLES.includes(userData.role) ||
        (crew?.responsable && crew.responsable.includes(user.uid)))

    setIsAuthorized(hasPermission || false)
  }, [user, userData, authLoading, crew, navigate, location.pathname])

  useEffect(() => {
    const fetchCrewData = async () => {
      if (authLoading) return

      if (!user) {
        setError('Debes iniciar sesión para ver esta información.')
        setLoading(false)
        return
      }

      setLoading(true)
      try {
        let crewId = location.state?.crewId

        if (!crewId && slug) {
          const crewsSnapshot = await getDocs(
            query(collection(db, 'crews'), where('status', '!=', 'deleted'))
          )

          for (const crewDoc of crewsSnapshot.docs) {
            const crewData = crewDoc.data()
            if (crewData.title) {
              const currentSlug = generateSlug(crewData.title)
              if (currentSlug === slug) {
                crewId = crewDoc.id
                break
              }
            }
          }
        }

        if (!crewId) {
          setError('No se encontró la peña')
          setLoading(false)
          return
        }

        const crewRef = doc(db, 'crews', crewId)
        const crewDoc = await getDoc(crewRef)

        if (!crewDoc.exists()) {
          setError('No se encontró la peña')
          setLoading(false)
          return
        }

        const crewData = { id: crewDoc.id, ...crewDoc.data() }

        if (
          crewData.status === STATUS.DELETED &&
          !AUTHORIZED_ROLES.includes(userData?.role)
        ) {
          setError('Esta peña ya no está disponible')
          setLoading(false)
          return
        }

        setCrew(crewData)

        if (
          !crewData.responsable?.includes(user.uid) &&
          userData?.role !== 'admin'
        ) {
          await updateDoc(crewRef, {
            viewCount: (crewData.viewCount || 0) + 1,
            lastViewed: serverTimestamp(),
          })
        }

        if (crewData.responsable && crewData.responsable.length > 0) {
          const responsablesLimit = Math.min(crewData.responsable.length, 10)
          const responsablesData = []

          for (let i = 0; i < responsablesLimit; i++) {
            const userId = crewData.responsable[i]
            try {
              if (!userId) continue

              const userDoc = await getDoc(doc(db, 'users', userId))
              if (userDoc.exists()) {
                const userData = userDoc.data()
                responsablesData.push({
                  id: userDoc.id,
                  firstName: userData.firstName || '',
                  lastName: userData.lastName || '',
                  email: userData.email || '',
                })
              }
            } catch (error) {
              console.error('Error al obtener responsable:', error)
            }
          }

          setResponsables(responsablesData)
        }

        try {
          const gamesQuery = query(
            collection(db, 'crews', crewId, 'games'),
            where('gameStatus', '!=', STATUS.DELETED)
          )

          const gamesSnapshot = await getDocs(gamesQuery)

          if (!gamesSnapshot.empty) {
            const gamesData = []
            const gameDocsLimit = Math.min(gamesSnapshot.docs.length, 50)

            for (let i = 0; i < gameDocsLimit; i++) {
              const gameDoc = gamesSnapshot.docs[i]
              const gameData = { id: gameDoc.id, ...gameDoc.data() }

              try {
                const mainGameDoc = await getDoc(doc(db, 'games', gameDoc.id))
                if (mainGameDoc.exists()) {
                  const mainGameData = mainGameDoc.data()
                  Object.assign(gameData, {
                    name: mainGameData.name,
                    description: mainGameData.description,
                    date: mainGameData.date,
                    location: mainGameData.location,
                    status: mainGameData.status,
                  })
                }
              } catch (error) {
                console.error(
                  `Error al obtener detalles del juego ${gameDoc.id}:`,
                  error
                )
              }

              gamesData.push(gameData)
            }

            const sortedGames = gamesData.sort((a, b) => {
              let dateA, dateB

              try {
                dateA = a.date
                  ? new Date(a.date.split('/').reverse().join('-'))
                  : new Date(0)
              } catch (e) {
                dateA = new Date(0)
              }

              try {
                dateB = b.date
                  ? new Date(b.date.split('/').reverse().join('-'))
                  : new Date(0)
              } catch (e) {
                dateB = new Date(0)
              }

              return dateB - dateA
            })

            setCrewGames(sortedGames)
          }
        } catch (gameError) {
          console.error('Error al cargar juegos:', gameError)
        }

        setLoading(false)
      } catch (error) {
        console.error('Error al cargar datos de la peña:', error)
        setError('No se pudieron cargar los datos de la peña')
        setLoading(false)
        logAction(user?.uid || 'anonymous', 'error_loading_crew', {
          slug,
          error: error.message,
          stackTrace: error.stack?.substring(0, 500),
        })
      }
    }

    fetchCrewData()
  }, [slug, location.state, generateSlug, user, authLoading, userData?.role])

  const handleApprove = async () => {
    if (!isAuthorized || !AUTHORIZED_ROLES.includes(userData?.role)) {
      showPopup({
        title: 'Acceso denegado',
        text: 'No tienes permisos para realizar esta acción.',
        icon: 'error',
      })
      return
    }

    try {
      setActionLoading(true)

      await runTransaction(db, async (transaction) => {
        const crewRef = doc(db, 'crews', crew.id)
        const crewSnap = await transaction.get(crewRef)

        if (!crewSnap.exists()) {
          throw new Error('La peña ya no existe')
        }

        const currentData = crewSnap.data()
        if (currentData.status !== STATUS.PENDING) {
          throw new Error(
            `La peña ya no está pendiente (estado actual: ${currentData.status})`
          )
        }

        transaction.update(crewRef, {
          status: STATUS.ACTIVE,
          updatedAt: serverTimestamp(),
          approvedBy: user.uid,
          approvedAt: serverTimestamp(),
        })

        const logRef = doc(collection(db, 'actionLogs'))
        transaction.set(logRef, {
          userId: user.uid,
          action: 'approve_crew',
          targetId: crew.id,
          timestamp: serverTimestamp(),
          details: {
            crewName: crew.title,
            previousStatus: currentData.status,
          },
        })
      })

      try {
        const messagesQuery = query(
          collection(db, 'messages'),
          where('crewId', '==', crew.id),
          where('messageType', '==', 'rechazo')
        )

        const messagesSnapshot = await getDocs(messagesQuery)
        let deletedMessagesCount = 0

        if (!messagesSnapshot.empty) {
          const batch = []
          let currentBatch = []

          messagesSnapshot.forEach((messageDoc) => {
            currentBatch.push(doc(db, 'messages', messageDoc.id))

            if (currentBatch.length >= 500) {
              batch.push([...currentBatch])
              currentBatch = []
            }
          })

          if (currentBatch.length > 0) {
            batch.push(currentBatch)
          }

          for (const batchItems of batch) {
            await runTransaction(db, async (transaction) => {
              batchItems.forEach((docRef) => {
                transaction.delete(docRef)
              })
            })
            deletedMessagesCount += batchItems.length
          }
        }

        const gamesQuery = query(
          collection(db, 'games'),
          where('status', '==', STATUS.ACTIVE)
        )

        const gamesSnapshot = await getDocs(gamesQuery)
        let gameCount = 0

        if (!gamesSnapshot.empty) {
          const gameLimit = Math.min(gamesSnapshot.size, 100)

          for (let i = 0; i < gameLimit; i++) {
            const gameDoc = gamesSnapshot.docs[i]
            const gameId = gameDoc.id
            const gameData = gameDoc.data()

            if (!gameId || !gameData.name) continue

            const gameSubcolRef = doc(
              collection(db, 'crews', crew.id, 'games'),
              gameId
            )

            await setDoc(gameSubcolRef, {
              gameId: gameId,
              gameName: gameData.name || '',
              gameSeason: gameData.season || '',
              gameDate: gameData.date || '',
              gameStatus: gameData.status || STATUS.PENDING,
              participationStatus: STATUS.PENDING,
              points: 0,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
              addedBy: user.uid,
            })

            gameCount++
          }
        }

        setCrew({
          ...crew,
          status: STATUS.ACTIVE,
        })

        let successMessage =
          gameCount > 0
            ? t(
                `${viewDictionary}.approvalWithGames`,
                { count: gameCount },
                `La peña ha sido aprobada y se le han asignado ${gameCount} juegos activos.`
              )
            : t(
                `${viewDictionary}.approvalSuccess`,
                'La peña ha sido aprobada correctamente.'
              )

        if (deletedMessagesCount > 0) {
          successMessage +=
            ' ' +
            t(
              `${viewDictionary}.messagesDeleted`,
              { count: deletedMessagesCount },
              `Se han eliminado ${deletedMessagesCount} ${deletedMessagesCount === 1 ? 'mensaje' : 'mensajes'} de rechazo anteriores.`
            )
        }

        await logAction(user.uid, 'crew_approval_success', {
          crewId: crew.id,
          crewName: crew.title,
          gamesAdded: gameCount,
          messagesDeleted: deletedMessagesCount,
        })

        showPopup({
          title: t(`${viewDictionary}.approvalTitle`, '¡Aprobada!'),
          text: sanitizeHTML(successMessage),
          icon: 'success',
          onConfirm: () => window.location.reload(),
        })
      } catch (innerError) {
        console.error('Error en proceso post-aprobación:', innerError)

        await logAction(user.uid, 'crew_post_approval_error', {
          crewId: crew.id,
          error: innerError.message,
        })
      }
    } catch (error) {
      console.error('Error al aprobar la peña:', error)

      await logAction(user.uid, 'crew_approval_failed', {
        crewId: crew.id,
        error: error.message,
      })

      showPopup({
        title: 'Error',
        text: 'No se pudo aprobar la peña. Por favor, inténtalo de nuevo.',
        icon: 'error',
      })
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async () => {
    if (!isAuthorized || !AUTHORIZED_ROLES.includes(userData?.role)) {
      showPopup({
        title: 'Acceso denegado',
        text: 'No tienes permisos para realizar esta acción.',
        icon: 'error',
      })
      return
    }

    try {
      const rejectOptions = {
        title: t(`${viewDictionary}.rejectTitle`, 'Rechazar peña'),
        text: sanitizeHTML(`<p>${t(`${viewDictionary}.rejectConfirmation`, '¿Estás seguro de que quieres rechazar esta peña?')}</p>
               <label class="swal2-input-label">${t(`${viewDictionary}.rejectReason`, 'Motivo de rechazo')}</label>
               <textarea class="swal2-textarea" placeholder="${t(`${viewDictionary}.rejectReasonPlaceholder`, 'Escribe el motivo por el que se rechaza esta peña...')}" aria-label="${t(`${viewDictionary}.rejectReason`, 'Motivo de rechazo')}" required maxlength="500"></textarea>`),
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: t(
          `${viewDictionary}.rejectConfirmButton`,
          'Sí, rechazar'
        ),
        cancelButtonText: t(`${viewDictionary}.rejectCancelButton`, 'Cancelar'),
        preConfirm: () => {
          const textarea = document.querySelector('.swal2-textarea')
          if (!textarea || !textarea.value.trim()) {
            return false
          }
          return textarea.value.trim().substring(0, 500)
        },
      }

      showPopup({
        ...rejectOptions,
        onConfirm: async () => {
          const textarea = document.querySelector('.swal2-textarea')
          if (!textarea || !textarea.value.trim()) {
            return
          }

          const rejectReason = textarea.value.trim().substring(0, 500)
          setActionLoading(true)

          try {
            await runTransaction(db, async (transaction) => {
              const crewRef = doc(db, 'crews', crew.id)
              const crewSnap = await transaction.get(crewRef)

              if (!crewSnap.exists()) {
                throw new Error('La peña ya no existe')
              }

              const currentData = crewSnap.data()
              if (currentData.status !== STATUS.PENDING) {
                throw new Error(
                  `La peña ya no está pendiente (estado actual: ${currentData.status})`
                )
              }

              transaction.update(crewRef, {
                status: STATUS.REJECTED,
                updatedAt: serverTimestamp(),
                rejectedBy: user.uid,
                rejectedAt: serverTimestamp(),
                rejectionReason: rejectReason,
              })

              const messageRef = doc(collection(db, 'messages'))
              transaction.set(messageRef, {
                crewId: crew.id,
                crewName: crew.title,
                messageType: 'rechazo',
                message: rejectReason,
                createdAt: serverTimestamp(),
                createdBy: user.uid,
              })

              const logRef = doc(collection(db, 'actionLogs'))
              transaction.set(logRef, {
                userId: user.uid,
                action: 'reject_crew',
                targetId: crew.id,
                timestamp: serverTimestamp(),
                details: {
                  crewName: crew.title,
                  previousStatus: currentData.status,
                  reason: rejectReason,
                },
              })
            })

            setCrew({
              ...crew,
              status: STATUS.REJECTED,
            })

            await logAction(user.uid, 'crew_rejection_success', {
              crewId: crew.id,
              crewName: crew.title,
            })

            showPopup({
              title: t(`${viewDictionary}.rejectSuccessTitle`, 'Rechazada'),
              text: t(
                `${viewDictionary}.rejectSuccess`,
                'La peña ha sido rechazada y se ha registrado el motivo.'
              ),
              icon: 'info',
            })
          } catch (error) {
            console.error('Error al rechazar la peña:', error)

            await logAction(user.uid, 'crew_rejection_failed', {
              crewId: crew.id,
              error: error.message,
            })

            showPopup({
              title: t(`${viewDictionary}.errorTitle`, 'Error'),
              text: t(
                `${viewDictionary}.rejectError`,
                'No se pudo rechazar la peña. Por favor, inténtalo de nuevo.'
              ),
              icon: 'error',
            })
          } finally {
            setActionLoading(false)
          }
        },
      })
    } catch (error) {
      console.error('Error al preparar rechazo:', error)
      showPopup({
        title: t(`${viewDictionary}.errorTitle`, 'Error'),
        text: t(
          `${viewDictionary}.rejectError`,
          'No se pudo rechazar la peña. Por favor, inténtalo de nuevo.'
        ),
        icon: 'error',
      })
    }
  }

  if (authLoading || loading) {
    return (
      <div className="container pb-6 mx-auto">
        <Loader
          loading={true}
          text={t(
            `${viewDictionary}.loading`,
            'Cargando detalles de la peña...'
          )}
        />
      </div>
    )
  }

  if (error) {
    return (
      <div className="container pb-6 mx-auto">
        <div className="p-4 text-center text-red-600">
          {t(`${viewDictionary}.error`, error)}
        </div>
        <div className="flex justify-center mt-4">
          <DynamicButton
            onClick={() => navigate('/crews')}
            size="medium"
            type="view"
            textId={t(`${viewDictionary}.backToCrews`, 'Volver a Peñas')}
          />
        </div>
      </div>
    )
  }

  if (!isAuthorized && crew) {
    return (
      <div className="container pb-6 mx-auto">
        <div className="p-4 text-center text-red-600">
          {t(
            `${viewDictionary}.unauthorized`,
            'No tienes permiso para ver los detalles de esta peña'
          )}
        </div>
        <div className="flex justify-center mt-4">
          <DynamicButton
            onClick={() => navigate('/crews')}
            size="medium"
            type="view"
            textId={t(`${viewDictionary}.backToCrews`, 'Volver a Peñas')}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="container pb-6 mx-auto">
      <h1 className="mb-4 text-center t64b">
        {t(`${viewDictionary}.title`, 'Detalles de la Peña')}
      </h1>

      {crew && (
        <div className="space-y-6">
          {crew.status === STATUS.PENDING &&
            isAuthorized &&
            AUTHORIZED_ROLES.includes(userData?.role) && (
              <div className="p-4 mb-4 text-center text-red-700 bg-red-100 border border-red-200 rounded-xl">
                <p className="mb-2 t18b">
                  {t(
                    `${viewDictionary}.pendingApproval`,
                    'Esta peña está pendiente de aprobación'
                  )}
                </p>
                <div className="flex flex-wrap justify-center gap-4 mt-3">
                  <DynamicButton
                    onClick={handleApprove}
                    size="small"
                    type="confirm"
                    textId={t(
                      `${viewDictionary}.approveButton`,
                      'Aprobar peña'
                    )}
                    disabled={actionLoading}
                  />
                  <DynamicButton
                    onClick={handleReject}
                    size="small"
                    type="cancel"
                    textId={t(
                      `${viewDictionary}.rejectButton`,
                      'Rechazar peña'
                    )}
                    disabled={actionLoading}
                  />
                </div>
                {actionLoading && (
                  <div className="mt-2">
                    <Loader
                      loading={true}
                      text={t(
                        `${viewDictionary}.processingAction`,
                        'Procesando acción...'
                      )}
                    />
                  </div>
                )}
              </div>
            )}

          <div className="p-6 bg-[#D9D9D9] rounded-[60px] h-fit mb-8 text-black backdrop-blur-lg backdrop-saturate-[180%] bg-[rgba(255,255,255,0.75)]">
            <div className="flex flex-col gap-6 lg:flex-row">
              <div className="flex-1">
                <h2 className="mb-4 t24b">
                  {t(`${viewDictionary}.basicInfo`, 'Información Básica')}
                </h2>

                <div className="flex items-center mb-4">
                  <h3 className="t32b">{crew.title}</h3>
                  {crew.status && (
                    <span
                      className={`ml-3 px-3 py-1 rounded-full t14r ${getStatusClass(crew.status)}`}
                    >
                      {crew.status}
                    </span>
                  )}
                </div>

                {crew.logoURL && (
                  <div className="mb-4">
                    <img
                      src={crew.logoURL}
                      alt={t(
                        `${viewDictionary}.logoAlt`,
                        { name: crew.title },
                        `Logo de ${crew.title}`
                      )}
                      className="object-cover w-32 h-32 border-4 border-white rounded-full shadow-md"
                    />
                  </div>
                )}

                <p className="mb-2 t16r">
                  <span className="font-bold">
                    {t(`${viewDictionary}.members`, 'Miembros:')}
                  </span>{' '}
                  {((crew.membersNames && crew.membersNames.length) || 0) +
                    ((crew.responsable && crew.responsable.length) || 0)}
                </p>

                {crew.season && (
                  <p className="mb-2 t16r">
                    <span className="font-bold">
                      {t(`${viewDictionary}.season`, 'Temporada:')}
                    </span>{' '}
                    {crew.season}
                  </p>
                )}

                {crew.createdAt && (
                  <p className="mb-2 t16r">
                    <span className="font-bold">
                      {t(
                        `${viewDictionary}.creationDate`,
                        'Fecha de Creación:'
                      )}
                    </span>{' '}
                    {crew.createdAt instanceof Date
                      ? crew.createdAt.toLocaleDateString()
                      : crew.createdAt.seconds
                        ? new Date(
                            crew.createdAt.seconds * 1000
                          ).toLocaleDateString()
                        : t(
                            `${viewDictionary}.dateNotAvailable`,
                            'Fecha no disponible'
                          )}
                  </p>
                )}

                {crew.updatedAt && (
                  <p className="mb-2 t16r">
                    <span className="font-bold">
                      {t(
                        `${viewDictionary}.lastUpdate`,
                        'Última Actualización:'
                      )}
                    </span>{' '}
                    {crew.updatedAt instanceof Date
                      ? crew.updatedAt.toLocaleDateString()
                      : crew.updatedAt.seconds
                        ? new Date(
                            crew.updatedAt.seconds * 1000
                          ).toLocaleDateString()
                        : t(
                            `${viewDictionary}.dateNotAvailable`,
                            'Fecha no disponible'
                          )}
                  </p>
                )}
              </div>

              <div className="flex-1">
                <h2 className="mb-4 t24b">
                  {t(`${viewDictionary}.membersSection`, 'Miembros de la Peña')}
                </h2>

                {crew.membersNames && crew.membersNames.length > 0 ? (
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    {crew.membersNames.map((memberName, index) => (
                      <div key={index} className="p-2 bg-opacity-50 rounded-lg">
                        <p className="t16r">{memberName}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 t16r">
                    {t(
                      `${viewDictionary}.noMembers`,
                      'No hay miembros registrados'
                    )}
                  </p>
                )}

                <h2 className="mt-6 mb-4 t24b">
                  {t(`${viewDictionary}.responsables`, 'Responsables')}
                </h2>

                {responsables.length > 0 ? (
                  <div className="space-y-2">
                    {responsables.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center p-3 bg-opacity-50 rounded-lg"
                        onClick={() =>
                          isAuthorized &&
                          navigate(
                            `/profile/${generateSlug(`${user.firstName} ${user.lastName}`)}`,
                            { state: { userId: user.id } }
                          )
                        }
                        style={{ cursor: isAuthorized ? 'pointer' : 'default' }}
                      >
                        <div>
                          <p className="t16b">
                            {user.firstName} {user.lastName}
                          </p>
                          {isAuthorized && (
                            <p className="text-gray-600 t14r">{user.email}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 t16r">
                    {t(
                      `${viewDictionary}.noResponsables`,
                      'No hay responsables asignados'
                    )}
                  </p>
                )}
              </div>
            </div>
          </div>

          {crewGames.length > 0 && (
            <div className="p-6 bg-[#D9D9D9] rounded-[60px] h-fit mb-8 text-black backdrop-blur-lg backdrop-saturate-[180%] bg-[rgba(255,255,255,0.75)]">
              <h2 className="mb-4 t24b">
                {t(`${viewDictionary}.gamesSection`, 'Juegos de la Peña')}
              </h2>

              <div className="space-y-4">
                {crewGames.map((game) => (
                  <div
                    key={game.id}
                    className="p-4 transition-shadow bg-white shadow-sm bg-opacity-70 rounded-xl hover:shadow-md"
                    onClick={() =>
                      isAuthorized &&
                      navigate(
                        `/game-details/${generateSlug(game.name || 'juego')}`,
                        {
                          state: { gameId: game.id },
                        }
                      )
                    }
                    style={{ cursor: isAuthorized ? 'pointer' : 'default' }}
                  >
                    <div className="flex flex-col justify-between md:flex-row md:items-center">
                      <div className="flex-1 overflow-hidden">
                        <h3 className="truncate t18b">
                          {game.name || 'Sin nombre'}
                        </h3>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {game.date && (
                            <span className="px-2 py-1 text-purple-800 bg-purple-100 rounded-full t12r">
                              {game.date}
                            </span>
                          )}
                          {game.location && (
                            <span className="px-2 py-1 text-blue-800 bg-blue-100 rounded-full t12r max-w-[200px] truncate">
                              {game.location}
                            </span>
                          )}
                          {game.gameStatus && (
                            <span
                              className={`px-2 py-1 rounded-full t12r ${getStatusClass(game.gameStatus)}`}
                            >
                              {game.gameStatus}
                            </span>
                          )}
                        </div>

                        {game.description && (
                          <p className="mt-2 text-gray-700 t14r line-clamp-2 max-w-prose">
                            {sanitizeHTML(game.description)}
                          </p>
                        )}
                      </div>

                      <div className="flex-shrink-0 mt-3 md:mt-0 md:ml-4">
                        <div className="flex flex-col items-center">
                          <span className="t14b">
                            {t(`${viewDictionary}.points`, 'Puntos')}
                          </span>
                          <span
                            className={`t24b ${game.points > 0 ? 'text-green-600' : 'text-gray-500'}`}
                          >
                            {game.points || 0}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap justify-center gap-4">
            <DynamicButton
              onClick={() => navigate(`/crews-list`)}
              size="medium"
              type="view"
              textId={t(`${viewDictionary}.backToCrews`, 'Volver a Peñas')}
            />

            {isAuthorized && (
              <DynamicButton
                onClick={() =>
                  navigate(`/edit-crew/${slug}`, { state: { crewId: crew.id } })
                }
                size="medium"
                type="edit"
                textId={t(`${viewDictionary}.editCrew`, 'Editar Peña')}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default CrewDetails
