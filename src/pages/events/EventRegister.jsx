import React, { useState, useEffect } from 'react'
import { collection, addDoc, getDocs, Timestamp } from 'firebase/firestore'
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage'
import withReactContent from 'sweetalert2-react-content'
import { useNavigate } from 'react-router-dom'
import Swal from 'sweetalert2'
import log from 'loglevel'
import { db, storage } from '../../firebase/firebase'
import { createEventModel } from '../../models/eventData'
import imageCompression from 'browser-image-compression'
import Loader from '../../components/Loader'

function EventForm() {
  const [eventData, setEventData] = useState(createEventModel())
  const [collaborators, setCollaborators] = useState([])
  const [search, setSearch] = useState('')
  const [filteredCollaborators, setFilteredCollaborators] = useState([])
  const [file, setFile] = useState(null)
  const [uploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const navigate = useNavigate()

  log.setLevel('debug')

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
    const fetchCollaborators = async () => {
      log.debug('Fetching collaborators...')
      const collaboratorsSnap = await getDocs(collection(db, 'collaborators'))
      const collaboratorsList = collaboratorsSnap.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }))
      setCollaborators(collaboratorsList)
      setFilteredCollaborators(collaboratorsList)
      log.debug('Collaborators fetched:', collaboratorsList)
    }
    fetchCollaborators()
  }, [])

  useEffect(() => {
    log.debug('Filtering collaborators with search term:', search)
    setFilteredCollaborators(
      collaborators.filter((collab) =>
        collab.name.toLowerCase().includes(search.toLowerCase())
      )
    )
  }, [search, collaborators])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    log.debug('Handling change for field:', name, 'with value:', value)
    setEventData({
      ...eventData,
      [name]: type === 'checkbox' ? checked : value,
    })
  }

  const addCollaboratorToEvent = (collab) => {
    if (!eventData.collaborators.includes(collab.id)) {
      log.debug('Adding collaborator:', collab.name)
      setEventData({
        ...eventData,
        collaborators: [...eventData.collaborators, collab.id],
      })
    } else {
      log.warn('Collaborator already added:', collab.name)
    }
  }

  const removeCollaboratorFromEvent = (collabId) => {
    log.debug('Removing collaborator with ID:', collabId)
    setEventData({
      ...eventData,
      collaborators: eventData.collaborators.filter((id) => id !== collabId),
    })
  }

  const uploadFile = async (file) => {
    try {
      log.info('Iniciando subida del archivo a Firebase Storage...')
      const storageRef = ref(storage, `uploads/${file.name}`)
      const uploadTask = uploadBytesResumable(storageRef, file)

      return new Promise((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progressPercent =
              (snapshot.bytesTransferred / snapshot.totalBytes) * 100
            setProgress(progressPercent)
          },
          (error) => {
            log.error('Error al subir el archivo:', error)
            reject(error)
          },
          async () => {
            const url = await getDownloadURL(uploadTask.snapshot.ref)
            log.info('Archivo subido con éxito. URL del archivo:', url)
            resolve(url)
          }
        )
      })
    } catch (error) {
      log.error('Error al subir el archivo:', error)
      throw error
    }
  }

  const handleTagChange = (tag) => {
    log.debug('Selecting tag:', tag)
    setEventData({ ...eventData, tags: [tag] })
  }

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0]
    if (selectedFile) {
      log.info('Archivo seleccionado:', selectedFile)

      try {
        const webpFile = await convertToWebP(selectedFile)
        setFile(webpFile)
      } catch (error) {
        log.error('Error al convertir la imagen:', error)
      }
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)

    const startTimestamp = Timestamp.fromDate(
      new Date(`${eventData.startDate}T${eventData.startTime}`)
    )
    const endTimestamp = Timestamp.fromDate(
      new Date(`${eventData.endDate}T${eventData.endTime}`)
    )

    try {
      let fileUrl = ''
      if (file) {
        fileUrl = await uploadFile(file)
      }

      await addDoc(collection(db, 'events'), {
        ...eventData,
        startDateTime: startTimestamp,
        endDateTime: endTimestamp,
        createdAt: Timestamp.now(),
        eventURL: fileUrl,
      })

      const MySwal = withReactContent(Swal)
      MySwal.fire({
        title: 'Evento creado correctamente',
        text: 'El evento se ha creado y guardado con éxito.',
        icon: 'success',
        confirmButtonText: 'Aceptar',
      }).then(() => {
        navigate('/dashboard')
      })
    } catch (error) {
      let errorMessage =
        'Hubo un error al registrar el evento. Por favor, intenta nuevamente.'
      if (error.code === 'unavailable') {
        errorMessage =
          'No se puede conectar con el servidor. Por favor, revisa tu conexión a internet.'
      } else if (error.code === 'permission-denied') {
        errorMessage = 'No tienes permisos suficientes para crear este evento.'
      }

      const MySwal = withReactContent(Swal)
      MySwal.fire({
        title: 'Error al registrar el evento',
        text: errorMessage,
        icon: 'error',
        confirmButtonText: 'Cerrar',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <Loader loading={submitting} />

      <form
        onSubmit={handleSubmit}
        className="p-6 mx-auto space-y-6 bg-white rounded-lg shadow-lg max-w-7xl"
      >
        <div>
          <label
            htmlFor="title"
            className="block mb-2 text-sm font-semibold text-gray-700"
          >
            Título del Evento
          </label>
          <input
            required
            type="text"
            name="title"
            id="title"
            placeholder="Título del evento"
            value={eventData.title}
            onChange={handleChange}
            className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label
            htmlFor="description"
            className="block mb-2 text-sm font-semibold text-gray-700"
          >
            Descripción
          </label>
          <textarea
            required
            name="description"
            id="description"
            placeholder="Descripción"
            value={eventData.description}
            onChange={handleChange}
            className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows="4"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label
              htmlFor="startDate"
              className="block mb-2 text-sm font-semibold text-gray-700"
            >
              Fecha de Inicio
            </label>
            <input
              required
              type="date"
              name="startDate"
              id="startDate"
              value={eventData.startDate}
              onChange={handleChange}
              className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label
              htmlFor="startTime"
              className="block mb-2 text-sm font-semibold text-gray-700"
            >
              Hora de Inicio
            </label>
            <input
              required
              type="time"
              name="startTime"
              id="startTime"
              value={eventData.startTime}
              onChange={handleChange}
              className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label
              htmlFor="endDate"
              className="block mb-2 text-sm font-semibold text-gray-700"
            >
              Fecha de Fin
            </label>
            <input
              type="date"
              name="endDate"
              id="endDate"
              value={eventData.endDate}
              onChange={handleChange}
              className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label
              htmlFor="endTime"
              className="block mb-2 text-sm font-semibold text-gray-700"
            >
              Hora de Fin
            </label>
            <input
              type="time"
              name="endTime"
              id="endTime"
              value={eventData.endTime}
              onChange={handleChange}
              className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="location"
            className="block mb-2 text-sm font-semibold text-gray-700"
          >
            Ubicación
          </label>
          <input
            type="text"
            name="location"
            id="location"
            placeholder="Ubicación"
            value={eventData.location}
            onChange={handleChange}
            className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label
            htmlFor="imageURL"
            className="block mb-2 text-sm font-semibold text-gray-700"
          >
            URL de la imagen
          </label>
          <input
            type="text"
            name="imageURL"
            id="imageURL"
            placeholder="URL de la imagen"
            value={eventData.imageURL}
            onChange={handleChange}
            className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="mt-4">
          <h4 className="text-lg font-semibold">Subir Imagen</h4>
          <input type="file" onChange={handleFileChange} className="mt-2" />
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

        <div>
          <label
            htmlFor="organizer"
            className="block mb-2 text-sm font-semibold text-gray-700"
          >
            Organizador
          </label>
          <input
            type="text"
            name="organizer"
            id="organizer"
            placeholder="Nombre del organizador"
            value={eventData.organizer}
            onChange={handleChange}
            className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label
            htmlFor="capacity"
            className="block mb-2 text-sm font-semibold text-gray-700"
          >
            Capacidad
          </label>
          <input
            type="number"
            name="capacity"
            id="capacity"
            placeholder="Capacidad del evento"
            value={eventData.capacity}
            onChange={handleChange}
            className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label
            htmlFor="price"
            className="block mb-2 text-sm font-semibold text-gray-700"
          >
            Precio
          </label>
          <input
            type="number"
            name="price"
            id="price"
            placeholder="Precio del evento"
            value={eventData.price}
            onChange={handleChange}
            className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label
            htmlFor="minAge"
            className="block mb-2 text-sm font-semibold text-gray-700"
          >
            Edad mínima
          </label>
          <input
            type="number"
            name="minAge"
            id="minAge"
            placeholder="Edad mínima para asistir"
            value={eventData.minAge}
            onChange={handleChange}
            className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="inline-flex items-center">
            <input
              type="checkbox"
              name="allowCars"
              checked={eventData.allowCars}
              onChange={handleChange}
              className="form-checkbox"
            />
            <span className="ml-2 text-sm font-semibold text-gray-700">
              Permitir entrada con carros
            </span>
          </label>
        </div>

        <div>
          <label className="inline-flex items-center">
            <input
              type="checkbox"
              name="hasBar"
              checked={eventData.hasBar}
              onChange={handleChange}
              className="form-checkbox"
            />
            <span className="ml-2 text-sm font-semibold text-gray-700">
              Barra de alcohol disponible
            </span>
          </label>
        </div>

        <div>
          <label
            htmlFor="category"
            className="block mb-2 text-sm font-semibold text-gray-700"
          >
            Categoría
          </label>
          <select
            name="category"
            id="category"
            value={eventData.category}
            onChange={handleChange}
            className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Selecciona una categoría</option>
            <option value="technology">Tecnología</option>
            <option value="music">Música</option>
            <option value="sports">Deportes</option>
            <option value="business">Negocios</option>
          </select>
        </div>

        {/* Etiquetas (tags) con radio buttons */}
        <div>
          <h4 className="mb-2 text-sm font-semibold text-gray-700">
            Selecciona una etiqueta
          </h4>
          <div className="space-y-2">
            {predefinedTags.map((tag) => (
              <label key={tag} className="inline-flex items-center">
                <input
                  type="radio"
                  name="tag"
                  value={tag}
                  checked={eventData.tags.includes(tag)}
                  onChange={() => handleTagChange(tag)}
                  className="form-radio"
                />
                <span className="ml-2 text-sm text-gray-700">{tag}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <h4 className="text-lg font-semibold">Colaboradores</h4>
          <div className="mb-5">
            <input
              type="text"
              id="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar colaborador..."
              className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <ul>
            {filteredCollaborators.map((collab) => (
              <li
                key={collab.id}
                className="flex items-center justify-between p-2 mb-2 border-b"
              >
                <span>
                  {collab.name} - {collab.role}
                </span>
                <button
                  type="button"
                  onClick={() => addCollaboratorToEvent(collab)}
                  className="px-3 py-1 text-white bg-blue-500 rounded"
                >
                  Añadir
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-4">
          <h4 className="text-lg font-semibold">Colaboradores Seleccionados</h4>
          <ul>
            {eventData.collaborators.map((collabId) => {
              const collaborator = collaborators.find(
                (collab) => collab.id === collabId
              )
              return collaborator ? (
                <li
                  key={collabId}
                  className="flex items-center justify-between p-2 mb-2 border-b"
                >
                  <span>
                    {collaborator.name} - {collaborator.role}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeCollaboratorFromEvent(collabId)}
                    className="px-3 py-1 text-white bg-red-500 rounded"
                  >
                    Eliminar
                  </button>
                </li>
              ) : null
            })}
          </ul>
        </div>

        <button
          type="submit"
          className="w-full px-4 py-2 text-white bg-blue-600 rounded-lg"
        >
          Crear Evento
        </button>
      </form>
    </div>
  )
}

export default EventForm
