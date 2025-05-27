import React, { useState, useEffect, useRef } from 'react'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  Timestamp,
  addDoc,
  deleteDoc,
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
import { createFormFieldsModel } from '../../models/formData'
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
  const [authDocument, setAuthDocument] = useState(null)
  const [newImageUrl, setNewImageUrl] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [authDocProgress, setAuthDocProgress] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedFormFields, setSelectedFormFields] = useState([])
  const navigate = useNavigate()
  const viewDictionary = 'pages.events.modifyEvent'

  const isSubmitting = useRef(false)

  log.setLevel('debug')

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

          const startDate = data.startDate || ''
          const startTime = data.startTime || ''
          const endDate = data.endDate || ''
          const endTime = data.endTime || ''

          setEventData({
            ...data,
            startDate,
            startTime,
            endDate,
            endTime,
            needForm: data.needForm || false,
            formFieldsIds: data.formFieldsIds || [],
            participants: data.participants || [],
            collaborators: data.collaborators || [],
            tags: data.tags || [],
            authDocumentURL: data.authDocumentURL || '',
          })
          setSelectedFormFields(data.formFieldsIds || [])
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

  const handleAuthDocChange = (e) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setAuthDocument(selectedFile)
    }
  }

  const uploadFile = async (file, progressSetter, isAuthDoc = false) => {
    setUploading(true)
    try {
      const timestamp = Date.now()
      const safeFileName = `${timestamp}_${(eventData.title || 'event').replace(/[^a-zA-Z0-9]/g, '_')}`

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

      let authDocUrl = eventData.authDocumentURL || ''
      if (authDocument) {
        authDocUrl = await uploadFile(authDocument, setAuthDocProgress, true)
      }

      const eventRef = doc(db, 'events', eventId)
      const currentEventDoc = await getDoc(eventRef)
      const currentEventData = currentEventDoc.data()
      const needFormChanged = currentEventData.needForm !== eventData.needForm
      const formFieldsChanged =
        JSON.stringify(currentEventData.formFieldsIds || []) !==
        JSON.stringify(selectedFormFields)

      await updateDoc(eventRef, {
        ...eventData,
        formFieldsIds: eventData.needForm ? selectedFormFields : [],
        title: eventData.title.trim(),
        description: eventData.description?.trim(),
        location: eventData.location?.trim(),
        updatedAt: Timestamp.now(),
        eventURL: fileUrl,
        authDocumentURL: authDocUrl,
      })

      if (eventData.needForm && (needFormChanged || formFieldsChanged)) {
        const allFormFields = createFormFieldsModel()

        const formFields = allFormFields
          .filter((field) => selectedFormFields.includes(field.fieldId))
          .map((field, index) => ({
            ...field,
            order: index + 1,
            createdAt: Timestamp.now(),
          }))

        const formCampsRef = collection(db, 'events', eventId, 'formCamps')
        const formCampsSnapshot = await getDocs(formCampsRef)

        const deletePromises = formCampsSnapshot.docs.map((doc) =>
          deleteDoc(doc.ref)
        )

        if (deletePromises.length > 0) {
          await Promise.all(deletePromises)
        }

        await Promise.all(
          formFields.map((field) => addDoc(formCampsRef, field))
        )
      }

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

  const handleFormFieldToggle = (fieldId) => {
    setSelectedFormFields((prev) => {
      if (prev.includes(fieldId)) {
        return prev.filter((id) => id !== fieldId)
      } else {
        return [...prev, fieldId]
      }
    })
  }

  if (loading) {
    return <Loader loading={true} size="50px" color="rgb(21, 100, 46)" />
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
    <div className="container px-4 pb-6 mx-auto">
      <Loader loading={submitting} />

      <form
        onSubmit={handleSubmit}
        className="flex flex-col items-center mx-auto space-y-6 max-w-7xl sm:flex-none"
      >
        <h1 className="mb-6 text-center sm:t64b t40b">
          {t(`${viewDictionary}.title`)}
        </h1>

        {/* Sección de información básica */}
        <div className="p-4 mb-6 rounded-lg">
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
                    textId={t(`${viewDictionary}.searchOrganizerLabel`)}
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
                    {t(`${viewDictionary}.organizerLabel`)}{' '}
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
                        {t(`${viewDictionary}.anyOrganizerLabel`)}{' '}
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
        <div className="p-4 mb-6 rounded-lg">
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
        <div className="p-4 mb-6 rounded-lg">
          <h3 className="mb-4 text-lg font-semibold text-gray-700">
            {t(`${viewDictionary}.detailsInfoTitle`)}
          </h3>

          <div className="grid items-center justify-center grid-cols-1 gap-6 justify-items-center md:grid-cols-3">
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

            <div className="flex items-center sm:mr-8">
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
            <div className="flex items-center">
              <DynamicInput
                name="needForm"
                textId={t(`${viewDictionary}.needFormLabel`)}
                type="checkbox"
                checked={eventData.needForm}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>

        {eventData.needForm && (
          <div className="p-4 mb-6 rounded-lg">
            <h3 className="mb-4 text-lg font-semibold text-gray-700">
              {t('pages.events.modifyEvent.selectFormFields')}
            </h3>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
              {createFormFieldsModel().map((field) => (
                <div key={field.fieldId}>
                  <DynamicInput
                    name={`field-${field.fieldId}`}
                    textId={`${t(field.label)} ${field.required ? t('pages.events.modifyEvent.required') : t('pages.events.modifyEvent.optional')}`}
                    type="checkbox"
                    checked={selectedFormFields.includes(field.fieldId)}
                    onChange={() => handleFormFieldToggle(field.fieldId)}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sección de imágenes */}
        <div className="p-4 mb-6 rounded-lg">
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
        <div className="p-4 mb-6 rounded-lg">
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
        <div className="p-4 mb-6 rounded-lg">
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
        <div className="p-4 mb-6 rounded-lg">
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
        <div className="p-4 mb-6 rounded-lg">
          <h3 className="mb-4 text-lg font-semibold text-gray-700">
            {t(`${viewDictionary}.participantsTitle`)}
          </h3>

          <div className="grid grid-cols-1 gap-6">
            <div>
              <DynamicInput
                name="searchParticipant"
                textId={t(`${viewDictionary}.searchParticipantsLabel`)}
                type="text"
                value={participantSearch}
                onChange={(e) => setParticipantSearch(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="">
                <h4 className="mb-2 text-gray-700 t16r">
                  {t(`${viewDictionary}.participantsTitleList`)}
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
                  {t(`${viewDictionary}.participantsSelectedTitle`)}{' '}
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

        <div className="flex justify-end sm:mt-8">
          <DynamicButton
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              navigate('/events-control-list')
            }}
            size="small"
            state="normal"
            textId={t(`components.buttons.cancel`)}
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
