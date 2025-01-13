import React, { useState, useEffect } from 'react'
import { collection, addDoc, getDocs, Timestamp } from 'firebase/firestore'
import withReactContent from 'sweetalert2-react-content'
import { useNavigate } from 'react-router-dom'
import Swal from 'sweetalert2'
import { db } from '../../firebase/firebase'
import { createEventModel } from '../../models/eventData'

function EventForm() {
  const [eventData, setEventData] = useState(createEventModel())
  const [collaborators, setCollaborators] = useState([])
  const [search, setSearch] = useState('')
  const [filteredCollaborators, setFilteredCollaborators] = useState([])
  const navigate = useNavigate()

  useEffect(() => {
    const fetchCollaborators = async () => {
      const collaboratorsSnap = await getDocs(collection(db, 'collaborators'))
      const collaboratorsList = collaboratorsSnap.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }))
      setCollaborators(collaboratorsList)
      setFilteredCollaborators(collaboratorsList)
    }
    fetchCollaborators()
  }, [])

  useEffect(() => {
    setFilteredCollaborators(
      collaborators.filter((collab) =>
        collab.name.toLowerCase().includes(search.toLowerCase())
      )
    )
  }, [search, collaborators])

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

  const handleTagsChange = (value) => {
    setEventData({
      ...eventData,
      tags: value.split(',').map((tag) => tag.trim()),
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    const startTimestamp = Timestamp.fromDate(
      new Date(`${eventData.startDate}T${eventData.startTime}`)
    )
    const endTimestamp = Timestamp.fromDate(
      new Date(`${eventData.endDate}T${eventData.endTime}`)
    )

    try {
      await addDoc(collection(db, 'events'), {
        ...eventData,
        startDateTime: startTimestamp,
        endDateTime: endTimestamp,
        createdAt: Timestamp.now(),
      })

      // Mostrar popup de éxito
      const MySwal = withReactContent(Swal)
      MySwal.fire({
        title: 'Evento creado correctamente',
        text: 'El evento se ha creado y guardado con éxito.',
        icon: 'success',
        confirmButtonText: 'Aceptar',
        confirmButtonColor: '#3085d6',
      }).then(() => {
        navigate('/dashboard')
      })
    } catch (error) {
      console.error('Error al guardar el evento:', error)

      // Definir el mensaje de error
      let errorMessage =
        'Hubo un error al registrar el evento. Por favor, intenta nuevamente.'

      // Verificar tipo de error y personalizar el mensaje
      if (error.code === 'unavailable') {
        errorMessage =
          'No se puede conectar con el servidor. Por favor, revisa tu conexión a internet.'
      } else if (error.code === 'permission-denied') {
        errorMessage = 'No tienes permisos suficientes para crear este evento.'
      } else if (error.message.includes('validation')) {
        errorMessage =
          'Faltan algunos campos obligatorios o hay un error en los datos proporcionados.'
      }

      // Mostrar popup de error con mensaje personalizado
      const MySwal = withReactContent(Swal)
      MySwal.fire({
        title: 'Error al registrar el evento',
        text: errorMessage,
        icon: 'error',
        confirmButtonText: 'Cerrar',
        confirmButtonColor: '#3085d6',
      })
    }
  }

  return (
    <div>
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

        <div>
          <label
            htmlFor="tags"
            className="block mb-2 text-sm font-semibold text-gray-700"
          >
            Etiquetas
          </label>
          <input
            type="text"
            name="tags"
            id="tags"
            placeholder="Etiquetas separadas por comas"
            value={eventData.tags.join(', ')}
            onChange={(e) => handleTagsChange(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
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
