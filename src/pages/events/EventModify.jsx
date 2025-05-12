import React, { useState, useEffect, useRef } from 'react'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  Timestamp,
} from 'firebase/firestore'
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage'
import withReactContent from 'sweetalert2-react-content'
import { useNavigate, useLocation, useParams } from 'react-router-dom'
import Swal from 'sweetalert2'
import log from 'loglevel'
import { db, storage } from '../../firebase/firebase'
import { createEventModel } from '../../models/eventData'
import imageCompression from 'browser-image-compression'
import Loader from '../../components/Loader'
import { useTranslation } from 'react-i18next'
import DynamicInput from '../../components/Inputs'
import DynamicItems from '../../components/Items'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import DynamicButton from '../../components/Buttons'
import DynamicCard from '../../components/Cards'
import { validateFile } from '../../utils/fileValidator'
import useSlug from '../../hooks/useSlug'

const createEventModelWithParticipants = () => {
  const baseModel = createEventModel()
  return {
    ...baseModel,
  }
}

function EventModify() {
  const { t } = useTranslation()
  const location = useLocation()
  const params = useParams()
  const { slug } = params
  const { generateSlug } = useSlug()

  const eventId = location.state?.eventId
  const [eventData, setEventData] = useState(createEventModelWithParticipants())
  const [collaborators, setCollaborators] = useState([])
  const [participants, setParticipants] = useState([])
  const [collaboratorSearch, setCollaboratorSearch] = useState('')
  const [participantSearch, setParticipantSearch] = useState('')
  const [filteredCollaborators, setFilteredCollaborators] = useState([])
  const [filteredParticipants, setFilteredParticipants] = useState([])
  const [organizerSearch, setOrganizerSearch] = useState('')
  const [filteredOrganizers, setFilteredOrganizers] = useState([])
  const [file, setFile] = useState(null)
  const [authDocument, setAuthDocument] = useState(null) // Añadir estado para documento de autorización
  const [newImageUrl, setNewImageUrl] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [authDocProgress, setAuthDocProgress] = useState(0) // Añadir estado para progreso de documento de autorización
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const navigate = useNavigate()
  const viewDictionary = 'pages.events.modifyEvent'

  const isSubmitting = useRef(false)

  log.setLevel('debug')
  // Utilizamos el hook useSlug en lugar de la función local

  const getStoragePathFromUrl = (url) => {
    try {
      if (!url) return null
      const path = url.split('/o/')[1]?.split('?')[0]
      return path ? decodeURIComponent(path) : null
    } catch (e) {
      return null
    }
  }

  const convertToWebP = async (imageFile) => {
    try {
      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 800,
        useWebWorker: true,
        fileType: 'image/webp',
      }
      const compressedFile = await imageCompression(imageFile, options)
      return compressedFile
    } catch (error) {
      log.error('Error al convertir la imagen:', error)
      throw error
    }
  }

  const predefinedTags = [
    'fmr',
    'nadal',
    'sants',
    'raval',
    'festival',
    'reuniones',
    'otros',
  ]

  useEffect(() => {
    return () => {
      if (newImageUrl) {
        URL.revokeObjectURL(newImageUrl)
      }
    }
  }, [newImageUrl])

  useEffect(() => {
    const fetchEventDataBySlug = async () => {
      try {
        if (!slug) {
          setError('No se proporcionó un identificador de evento')
          setLoading(false)
          return
        }

        if (eventId) {
          await fetchEventById(eventId)
          return
        }
        const eventsCollection = collection(db, 'events')
        const querySnapshot = await getDocs(eventsCollection)

        let found = false
        for (const docSnapshot of querySnapshot.docs) {
          const data = docSnapshot.data()
          const currentSlug = generateSlug(data.title)

          if (currentSlug === slug) {
            await fetchEventById(docSnapshot.id)
            found = true
            break
          }
        }

        if (!found) {
          setError(
            'No se encontró el evento con el identificador proporcionado'
          )
          setLoading(false)
        }
      } catch (error) {
        setError('Error al cargar el evento')
        setLoading(false)
      }
    }

    const fetchEventById = async (id) => {
      try {
        const eventRef = doc(db, 'events', id)
        const eventDoc = await getDoc(eventRef)

        if (eventDoc.exists()) {
          const data = eventDoc.data()
          let startDate = ''
          let startTime = ''
          let endDate = ''
          let endTime = ''

          setEventData({
            ...data,
            startDate,
            startTime,
            endDate,
            endTime,
            participants: data.participants || [],
            collaborators: data.collaborators || [],
            tags: data.tags || [],
            authDocumentURL: data.authDocumentURL || '',
          })
          setLoading(false)
        } else {
          setError('No se encontró el evento')
          setLoading(false)
        }
      } catch (error) {
        setError('Error al cargar el evento')
        setLoading(false)
      }
    }

    const fetchCollaborators = async () => {
      try {
        log.debug('Fetching collaborators...')
        const collaboratorsSnap = await getDocs(collection(db, 'collaborators'))
        const collaboratorsList = collaboratorsSnap.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }))
        setCollaborators(collaboratorsList)
        setFilteredCollaborators(collaboratorsList)
      } catch (error) {
        return
      }
    }

    const fetchParticipants = async () => {
      try {
        log.debug('Fetching participants...')
        const participantsSnap = await getDocs(collection(db, 'participants'))
        const participantsList = participantsSnap.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }))
        setParticipants(participantsList)
        setFilteredParticipants(participantsList)
      } catch (error) {
        return
      }
    }

    fetchEventDataBySlug()
    fetchCollaborators()
    fetchParticipants()
  }, [eventId, slug])

  useEffect(() => {
    setFilteredCollaborators(
      collaborators.filter((collab) =>
        collab.name.toLowerCase().includes(collaboratorSearch.toLowerCase())
      )
    )
  }, [collaboratorSearch, collaborators])

  useEffect(() => {
    setFilteredParticipants(
      participants.filter((participant) =>
        participant.name.toLowerCase().includes(participantSearch.toLowerCase())
      )
    )
  }, [participantSearch, participants])

  useEffect(() => {
    setFilteredOrganizers(
      collaborators.filter((collab) =>
        collab.name.toLowerCase().includes(organizerSearch.toLowerCase())
      )
    )
  }, [organizerSearch, collaborators])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setEventData({
      ...eventData,
      [name]: type === 'checkbox' ? checked : value,
    })
  }

  const addCollaboratorToEvent = (collab) => {
    if (!eventData.collaborators.includes(collab.id)) {
      setEventData({
        ...eventData,
        collaborators: [...eventData.collaborators, collab.id],
      })
    }
  }

  const removeCollaboratorFromEvent = (collabId) => {
    setEventData({
      ...eventData,
      collaborators: eventData.collaborators.filter((id) => id !== collabId),
    })
  }

  const addParticipantToEvent = (participant) => {
    if (!eventData.participants.includes(participant.id)) {
      setEventData({
        ...eventData,
        participants: [...eventData.participants, participant.id],
      })
    }
  }

  const removeParticipantFromEvent = (participantId) => {
    setEventData({
      ...eventData,
      participants: eventData.participants.filter((id) => id !== participantId),
    })
  }

  const setOrganizer = (collab) => {
    setEventData({
      ...eventData,
      organizer: collab.id,
    })
  }

  const removeOrganizer = () => {
    setEventData({
      ...eventData,
      organizer: '',
    })
  }

  // ...existing code...
  const handleAuthDocChange = (e) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setAuthDocument(selectedFile)
    }
  }

  // Modificar la función uploadFile para usar diferentes carpetas según el tipo de archivo
  const uploadFile = async (file, progressSetter, isAuthDoc = false) => {
    setUploading(true)
    try {
      const timestamp = Date.now()
      const safeFileName = `${timestamp}_${(eventData.title || 'event').replace(/[^a-zA-Z0-9]/g, '_')}`

      // Determinar la carpeta de destino según el tipo de archivo
      const folderPath = isAuthDoc ? 'authorizations' : 'uploads'
      const storageRef = ref(storage, `${folderPath}/${safeFileName}`)
      const uploadTask = uploadBytesResumable(storageRef, file)

      return new Promise((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progressPercent =
              (snapshot.bytesTransferred / snapshot.totalBytes) * 100
            progressSetter(progressPercent)
          },
          (error) => {
            log.error('Error al subir el archivo:', error)
            reject(error)
          },
          async () => {
            const url = await getDownloadURL(uploadTask.snapshot.ref)

            if (!isAuthDoc && eventData.eventURL) {
              try {
                const storagePath = getStoragePathFromUrl(eventData.eventURL)
                if (storagePath) {
                  const oldImageRef = ref(storage, storagePath)
                  await deleteObject(oldImageRef)
                }
              } catch (error) {
                return
              }
            } else if (isAuthDoc && eventData.authDocumentURL) {
              try {
                const storagePath = getStoragePathFromUrl(
                  eventData.authDocumentURL
                )
                if (storagePath) {
                  const oldDocRef = ref(storage, storagePath)
                  await deleteObject(oldDocRef)
                }
              } catch (error) {
                return
              }
            }

            resolve(url)
          }
        )
      })
    } catch (error) {
      log.error('Error al subir el archivo:', error)
      throw error
    } finally {
      setUploading(false)
    }
  }
  // ...existing code...

  const handleTagChange = (tag) => {
    setEventData({ ...eventData, tags: [tag] })
  }

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    const validationError = validateFile(selectedFile, t)
    if (validationError) {
      const MySwal = withReactContent(Swal)
      MySwal.fire({
        title: t(`${viewDictionary}.errorPopup.title`),
        text: validationError,
        icon: 'error',
      })
      return
    }

    try {
      if (newImageUrl) {
        URL.revokeObjectURL(newImageUrl)
      }

      const webpFile = await convertToWebP(selectedFile)
      setFile(webpFile)
      setNewImageUrl(URL.createObjectURL(webpFile))
    } catch (error) {
      log.error('Error al convertir la imagen:', error)
      const MySwal = withReactContent(Swal)
      MySwal.fire({
        title: t(`${viewDictionary}.errorPopup.title`),
        text: 'Error al procesar la imagen',
        icon: 'error',
      })
    }
  }

  const validateDates = () => {
    if (!eventData.startDate || !eventData.startTime) {
      return 'La fecha y hora de inicio son obligatorias'
    }

    return null
  }

  // ...existing code...
  const handleSubmit = async (e) => {
    e.preventDefault()

    if (isSubmitting.current) return
    isSubmitting.current = true

    setSubmitting(true)

    if (!eventData.title?.trim()) {
      const MySwal = withReactContent(Swal)
      MySwal.fire({
        title: t(`${viewDictionary}.errorPopup.title`),
        text: 'El título del evento es obligatorio',
        icon: 'error',
      })
      setSubmitting(false)
      isSubmitting.current = false
      return
    }

    const dateError = validateDates()
    if (dateError) {
      const MySwal = withReactContent(Swal)
      MySwal.fire({
        title: t(`${viewDictionary}.errorPopup.title`),
        text: dateError,
        icon: 'error',
      })
      setSubmitting(false)
      isSubmitting.current = false
      return
    }

    if (!eventId) {
      const MySwal = withReactContent(Swal)
      MySwal.fire({
        title: t(`${viewDictionary}.errorPopup.title`),
        text: 'No se pudo identificar el evento a actualizar',
        icon: 'error',
      })
      setSubmitting(false)
      isSubmitting.current = false
      return
    }

    try {
      let fileUrl = eventData.eventURL || ''
      if (file) {
        fileUrl = await uploadFile(file, setProgress, false)
      }

      // Manejar el documento de autorización
      let authDocUrl = eventData.authDocumentURL || ''
      if (authDocument) {
        authDocUrl = await uploadFile(authDocument, setAuthDocProgress, true)
      }

      const eventRef = doc(db, 'events', eventId)
      await updateDoc(eventRef, {
        ...eventData,
        title: eventData.title.trim(),
        description: eventData.description?.trim(),
        location: eventData.location?.trim(),
        updatedAt: Timestamp.now(),
        eventURL: fileUrl,
        authDocumentURL: authDocUrl, // Añadir URL del documento de autorización
      })

      const MySwal = withReactContent(Swal)
      await MySwal.fire({
        title: t(`${viewDictionary}.successPopup.title`),
        text: t(`${viewDictionary}.successPopup.text`),
        icon: 'success',
        confirmButtonText: 'Aceptar',
      })

      navigate('/events-control-list')
    } catch (error) {
      let errorMessage =
        'Hubo un error al actualizar el evento. Por favor, intenta nuevamente.'
      if (error.code === 'unavailable') {
        errorMessage =
          'No se puede conectar con el servidor. Por favor, revisa tu conexión a internet.'
      } else if (error.code === 'permission-denied') {
        errorMessage =
          'No tienes permisos suficientes para modificar este evento.'
      }

      const MySwal = withReactContent(Swal)
      MySwal.fire({
        title: t(`${viewDictionary}.errorPopup.title`),
        text: `${t(`${viewDictionary}.errorPopup.text`)} ${errorMessage}`,
        icon: 'error',
        confirmButtonText: 'Cerrar',
      })
    } finally {
      setSubmitting(false)
      isSubmitting.current = false
    }
  }
  // ...existing code...

  if (loading) {
    return (
      <Loader
        loading={true}
        size="50px"
        color="rgb(21, 100, 46)"
        text="Cargando evento..."
      />
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <h1 className="mb-4 text-2xl font-bold text-red-500">Error</h1>
        <p className="mb-6 text-lg text-gray-700">{error}</p>
        <DynamicButton
          onClick={() => navigate('/events-control-list')}
          size="medium"
          state="normal"
          textId="Volver a la lista de eventos"
        />
      </div>
    )
  }

  return (
    <div className="container px-4 py-8 mx-auto">
      <Loader loading={submitting} />

      <form onSubmit={handleSubmit} className="p-6 mx-auto space-y-6 max-w-7xl">
        <h2 className="mb-6 text-2xl font-bold text-gray-800">
          {t(`${viewDictionary}.title`)}
        </h2>

        {/* Sección de información básica */}
        <div className="p-4 mb-6 rounded-lg ">
          <h3 className="mb-4 text-lg font-semibold text-gray-700">
            {t(`${viewDictionary}.basicInfoTitle`)}
          </h3>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="col-span-2">
              <DynamicInput
                name="title"
                textId={t(`${viewDictionary}.nameLabel`)}
                type="text"
                value={eventData.title}
                onChange={handleChange}
                required
              />
            </div>

            <div className="col-span-2">
              <DynamicInput
                name="description"
                textId={t(`${viewDictionary}.descriptionLabel`)}
                type="textarea"
                value={eventData.description}
                onChange={handleChange}
                required
              />
            </div>

            <div className="col-span-2">
              <h3 className="mb-4 text-lg font-semibold text-gray-700">
                {t(`${viewDictionary}.organizerLabel`)}
              </h3>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <DynamicInput
                    name="searchOrganizer"
                    textId="Buscar organizador"
                    type="text"
                    value={organizerSearch}
                    onChange={(e) => setOrganizerSearch(e.target.value)}
                  />

                  <div className="p-2 mt-2 overflow-y-auto max-h-60 text-[#696969] backdrop-blur-lg backdrop-saturate-[180%] bg-[rgba(255,255,255,0.75)] rounded-xl">
                    <DynamicItems
                      items={filteredOrganizers.map((collab) => ({
                        title: collab.name,
                        description: collab.role,
                        type: 'eventData',
                        icon: (
                          <button
                            type="button"
                            onClick={() => setOrganizer(collab)}
                          >
                            <AddIcon fontSize="small" />
                          </button>
                        ),
                      }))}
                    />
                  </div>
                </div>

                <div>
                  <h4 className="mb-2 text-gray-700 t16r">
                    Organizador Seleccionado
                  </h4>
                  <div className="p-2 overflow-y-auto max-h-60 text-[#696969] backdrop-blur-lg backdrop-saturate-[180%] bg-[rgba(255,255,255,0.75)] rounded-xl">
                    {eventData.organizer ? (
                      <DynamicItems
                        items={(() => {
                          const organizer = collaborators.find(
                            (collab) => collab.id === eventData.organizer
                          )
                          return organizer
                            ? [
                                {
                                  title: organizer.name,
                                  description: organizer.role,
                                  type: 'eventData',
                                  icon: (
                                    <button
                                      type="button"
                                      onClick={removeOrganizer}
                                    >
                                      <DeleteIcon fontSize="small" />
                                    </button>
                                  ),
                                },
                              ]
                            : []
                        })()}
                      />
                    ) : (
                      <p className="p-2 text-gray-500">
                        Ningún organizador seleccionado
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="col-span-2">
              <DynamicInput
                name="location"
                textId={t(`${viewDictionary}.locationLabel`)}
                type="text"
                value={eventData.location}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>

        {/* Sección de fechas y horarios */}
        <div className="p-4 mb-6 rounded-lg ">
          <h3 className="mb-4 text-lg font-semibold text-gray-700">
            {t(`${viewDictionary}.dateInfoTitle`)}
          </h3>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
            <div>
              <DynamicInput
                name="startDate"
                textId={t(`${viewDictionary}.initDateLabel`)}
                type="date"
                value={eventData.startDate}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <DynamicInput
                name="startTime"
                textId={t(`${viewDictionary}.startTimeLabel`)}
                type="time"
                value={eventData.startTime}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <DynamicInput
                name="endDate"
                textId={t(`${viewDictionary}.endDateLabel`)}
                type="date"
                value={eventData.endDate}
                onChange={handleChange}
              />
            </div>

            <div>
              <DynamicInput
                name="endTime"
                textId={t(`${viewDictionary}.endTimeLabel`)}
                type="time"
                value={eventData.endTime}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>

        {/* Sección de detalles del evento */}
        <div className="p-4 mb-6 rounded-lg ">
          <h3 className="mb-4 text-lg font-semibold text-gray-700">
            {t(`${viewDictionary}.detailsInfoTitle`)}
          </h3>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div>
              <DynamicInput
                name="capacity"
                textId={t(`${viewDictionary}.capacityLabel`)}
                type="number"
                value={eventData.capacity}
                onChange={handleChange}
              />
            </div>

            <div>
              <DynamicInput
                name="price"
                textId={t(`${viewDictionary}.priceLabel`)}
                type="number"
                value={eventData.price}
                onChange={handleChange}
              />
            </div>

            <div>
              <DynamicInput
                name="minAge"
                textId={t(`${viewDictionary}.minAgeLabel`)}
                type="number"
                value={eventData.minAge}
                onChange={handleChange}
              />
            </div>

            <div className="flex items-center mr-8">
              <DynamicInput
                name="allowCars"
                textId={t(`${viewDictionary}.allowCarsLabel`)}
                type="checkbox"
                checked={eventData.allowCars}
                onChange={handleChange}
              />
            </div>

            <div className="flex items-center">
              <DynamicInput
                name="hasBar"
                textId={t(`${viewDictionary}.hasBarLabel`)}
                type="checkbox"
                checked={eventData.hasBar}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>

        {/* Sección de imágenes */}
        <div className="p-4 mb-6 rounded-lg ">
          <h3 className="mb-4 text-lg font-semibold text-gray-700">
            {t(`${viewDictionary}.galleryInfoTitle`)}
          </h3>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <DynamicInput
                name="imageURL"
                textId={t(`${viewDictionary}.imageURL`)}
                type="text"
                value={eventData.imageURL}
                onChange={handleChange}
              />
            </div>

            <div>
              <h4 className="t16r">{t(`${viewDictionary}.addImage`)}</h4>
              <DynamicInput
                name="eventImage"
                type="document"
                onChange={handleFileChange}
                disabled={uploading}
              />
              {uploading && <p>Subiendo archivo: {progress}%</p>}
              {progress > 0 && progress < 100 && (
                <div className="mt-2">
                  <div className="w-full h-2 bg-gray-200 rounded-md">
                    <div
                      className="h-2 bg-blue-600 rounded-md"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Visualización de imágenes actuales y nuevas */}
          <div className="grid grid-cols-1 gap-6 mt-4 sm:grid-cols-2 sm:gap-4">
            {eventData.eventURL && (
              <div>
                <h4 className="mb-4 t16r">Imagen actual</h4>
                <DynamicCard
                  type="gallery"
                  title="Imagen actual"
                  imageUrl={eventData.eventURL}
                />
              </div>
            )}

            {newImageUrl && (
              <div>
                <h4 className="mb-4 t16r">Nueva imagen</h4>
                <DynamicCard
                  type="gallery"
                  title="Nueva imagen"
                  imageUrl={newImageUrl}
                />
              </div>
            )}
          </div>
        </div>

        {/* Nueva sección para documento de autorización */}
        <div className="p-4 mb-6 rounded-lg ">
          <h3 className="mb-4 text-lg font-semibold text-gray-700">
            Documento de Autorización
          </h3>

          <div className="grid grid-cols-1 gap-6">
            <div>
              <h4 className="t16r">Subir documento de autorización</h4>
              <DynamicInput
                name="authDocument"
                type="document"
                onChange={handleAuthDocChange}
              />
              {authDocument && (
                <p className="mt-2 text-sm text-gray-600">
                  Documento seleccionado: {authDocument.name}
                </p>
              )}
              {eventData.authDocumentURL && !authDocument && (
                <p className="mt-2 text-sm text-gray-600">
                  Documento actual:
                  <a
                    href={eventData.authDocumentURL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-1 text-blue-600 hover:text-blue-800"
                  >
                    Ver documento
                  </a>
                </p>
              )}
              {authDocProgress > 0 && authDocProgress < 100 && (
                <div className="mt-2">
                  <div className="w-full h-2 bg-gray-200 rounded-md">
                    <div
                      className="h-2 bg-blue-600 rounded-md"
                      style={{ width: `${authDocProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sección de etiquetas */}
        <div className="p-4 mb-6 rounded-lg ">
          <h3 className="mb-4 text-lg font-semibold text-gray-700">
            {t(`${viewDictionary}.tagsInfoTitle`)}
          </h3>

          <div>
            <h4 className="mb-2 text-gray-700 t16r">
              {t(`${viewDictionary}.tagsLabel`)}
            </h4>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {predefinedTags.map((tag) => (
                <DynamicInput
                  key={tag}
                  name={`tag-${tag}`}
                  textId={`${tag}`}
                  type="radio"
                  checked={eventData.tags.includes(tag)}
                  onChange={() => handleTagChange(tag)}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Sección de colaboradores */}
        <div className="p-4 mb-6 rounded-lg ">
          <h3 className="mb-4 text-lg font-semibold text-gray-700">
            {t(`${viewDictionary}.collaboratorsInfoTitle`)}
          </h3>

          <div className="grid grid-cols-1 gap-6">
            <div>
              <DynamicInput
                name="searchCollaborator"
                textId={t(`${viewDictionary}.collaboratorsSearchLabel`)}
                type="text"
                value={collaboratorSearch}
                onChange={(e) => setCollaboratorSearch(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="">
                <h4 className="mb-2 text-gray-700 t16r">
                  {t(`${viewDictionary}.collaboratorsLabel`)}
                </h4>
                <div className="p-2 overflow-y-auto max-h-60 text-[#696969] backdrop-blur-lg backdrop-saturate-[180%] bg-[rgba(255,255,255,0.75)] rounded-xl">
                  <DynamicItems
                    items={filteredCollaborators.map((collab) => ({
                      title: collab.name,
                      description: collab.role,
                      type: 'eventData',
                      icon: (
                        <button
                          type="button"
                          onClick={() => addCollaboratorToEvent(collab)}
                        >
                          <AddIcon fontSize="small" />
                        </button>
                      ),
                    }))}
                  />
                </div>
              </div>

              <div>
                <h4 className="mb-2 text-gray-700 t16r">
                  {t(`${viewDictionary}.collaboratorsSelectedLabel`)}
                </h4>
                <div className="p-2 overflow-y-auto max-h-60 text-[#696969] backdrop-blur-lg backdrop-saturate-[180%] bg-[rgba(255,255,255,0.75)] rounded-xl">
                  <DynamicItems
                    items={eventData.collaborators
                      .map((collabId) => {
                        const collaborator = collaborators.find(
                          (collab) => collab.id === collabId
                        )
                        return collaborator
                          ? {
                              title: collaborator.name,
                              description: collaborator.role,
                              type: 'eventData',
                              icon: (
                                <button
                                  type="button"
                                  onClick={() =>
                                    removeCollaboratorFromEvent(collabId)
                                  }
                                >
                                  <DeleteIcon fontSize="small" />
                                </button>
                              ),
                            }
                          : null
                      })
                      .filter(Boolean)}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Nueva sección de participantes */}
        <div className="p-4 mb-6 rounded-lg ">
          <h3 className="mb-4 text-lg font-semibold text-gray-700">
            Participantes
          </h3>

          <div className="grid grid-cols-1 gap-6">
            <div>
              <DynamicInput
                name="searchParticipant"
                textId="Buscar participante"
                type="text"
                value={participantSearch}
                onChange={(e) => setParticipantSearch(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="">
                <h4 className="mb-2 text-gray-700 t16r">
                  Lista de Participantes
                </h4>
                <div className="p-2 overflow-y-auto max-h-60 text-[#696969] backdrop-blur-lg backdrop-saturate-[180%] bg-[rgba(255,255,255,0.75)] rounded-xl">
                  <DynamicItems
                    items={filteredParticipants.map((participant) => ({
                      title: participant.name,
                      description: participant.email,
                      type: 'eventData',
                      icon: (
                        <button
                          type="button"
                          onClick={() => addParticipantToEvent(participant)}
                        >
                          <AddIcon fontSize="small" />
                        </button>
                      ),
                    }))}
                  />
                </div>
              </div>

              <div>
                <h4 className="mb-2 text-gray-700 t16r">
                  Participantes Seleccionados
                </h4>
                <div className="p-2 overflow-y-auto max-h-60 text-[#696969] backdrop-blur-lg backdrop-saturate-[180%] bg-[rgba(255,255,255,0.75)] rounded-xl">
                  <DynamicItems
                    items={eventData.participants
                      .map((participantId) => {
                        const participant = participants.find(
                          (p) => p.id === participantId
                        )
                        return participant
                          ? {
                              title: participant.name,
                              description: participant.email,
                              type: 'eventData',
                              icon: (
                                <button
                                  type="button"
                                  onClick={() =>
                                    removeParticipantFromEvent(participantId)
                                  }
                                >
                                  <DeleteIcon fontSize="small" />
                                </button>
                              ),
                            }
                          : null
                      })
                      .filter(Boolean)}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end mt-8">
          <DynamicButton
            type="button"
            onClick={() => navigate('/events-control-list')}
            size="small"
            state="normal"
            textId="components.buttons.cancel"
            className="mr-4"
          />

          <DynamicButton
            type="submit"
            size="small"
            state={uploading ? 'disabled' : 'normal'}
            textId={
              uploading
                ? `${viewDictionary}.uploadingText`
                : `${viewDictionary}.submitButton`
            }
            disabled={uploading}
          />
        </div>
      </form>
    </div>
  )
}

export default EventModify
