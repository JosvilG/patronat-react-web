import React, { useState, useEffect } from 'react'
import { collection, addDoc } from 'firebase/firestore'
import Swal from 'sweetalert2'
import withReactContent from 'sweetalert2-react-content'
import { db } from '../../firebase/firebase'
import { createCrewModel } from '../../models/crewData'
import useFetchUsers from '../../hooks/useFetchUsers'

function RegisterCrew() {
  const { users, filteredUsers, search, setSearch, loading, error } =
    useFetchUsers()
  const [crewData, setCrewData] = useState(createCrewModel())

  const handleChange = (e) => {
    const { name, value } = e.target
    setCrewData((prev) => ({ ...prev, [name]: value }))
  }

  const addMembersFromSearch = () => {
    // Dividimos los nombres por comas y eliminamos espacios extra
    const newMembers = search
      .split(',')
      .map((name) => name.trim()) // Limpiamos espacios en blanco extra
      .filter((name) => name !== '') // Filtramos cualquier nombre vacío

    newMembers.forEach((name) => {
      if (!crewData.membersNames.includes(name)) {
        setCrewData((prev) => ({
          ...prev,
          membersNames: [...prev.membersNames, name],
          numberOfMembers: prev.membersNames.length + 1,
        }))
      }
    })

    setSearch('') // Limpiamos el campo de búsqueda después de añadir los miembros
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    try {
      await addDoc(collection(db, 'crews'), {
        ...crewData,
        updateDate: new Date().toISOString().split('T')[0],
      })

      const MySwal = withReactContent(Swal)
      MySwal.fire({
        title: 'Grupo creado correctamente',
        text: 'El grupo se ha creado y guardado con éxito.',
        icon: 'success',
        confirmButtonText: 'Aceptar',
        confirmButtonColor: '#3085d6',
      })

      setCrewData(createCrewModel()) // Restablecemos el estado del grupo
    } catch (err) {
      console.error('Error al guardar el grupo:', err)
      const MySwal = withReactContent(Swal)
      MySwal.fire({
        title: 'Error',
        text: 'No se pudo guardar el grupo. Intenta nuevamente.',
        icon: 'error',
        confirmButtonText: 'Cerrar',
        confirmButtonColor: '#3085d6',
      })
    }
  }

  // Verificar si los datos de users y filteredUsers están disponibles
  if (loading) return <p>Cargando usuarios...</p>
  if (error) return <p>Error al cargar usuarios: {error.message}</p>

  return (
    <div className="p-6 mx-auto space-y-6 bg-white rounded-lg shadow-lg max-w-7xl">
      <form onSubmit={handleSubmit}>
        <div>
          <label
            htmlFor="title"
            className="block mb-2 text-sm font-semibold text-gray-700"
          >
            Nombre del Grupo
          </label>
          <input
            type="text"
            name="title"
            id="title"
            value={crewData.title}
            onChange={handleChange}
            placeholder="Nombre del grupo"
            required
            className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label
            htmlFor="responsable"
            className="block mb-2 text-sm font-semibold text-gray-700"
          >
            Responsable
          </label>
          <select
            name="responsable"
            id="responsable"
            value={crewData.responsable}
            onChange={handleChange}
            required
            className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Selecciona un responsable</option>
            {Array.isArray(users) &&
              users.length > 0 &&
              users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
          </select>
        </div>

        <div>
          <h4 className="text-lg font-semibold">Usuarios</h4>
          <div className="flex items-center">
            <div className="border-gray-300">
              <button
                type="button"
                onClick={addMembersFromSearch}
                className="w-10 h-12 px-3 mb-3 mr-0 text-white bg-green-600 rounded-s-xl"
                aria-label="Añadir miembros"
              >
                <span className="text-xl">+</span> {/* Icono "+" */}
              </button>
            </div>
            <div className="flex-1">
              <label
                htmlFor="search"
                className="block mb-2 text-sm font-semibold text-gray-700"
              />
              <input
                type="text"
                id="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Ej: Nombre Uno, Nombre Dos, Nombre Tres"
                className="w-full p-3 mb-5 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <h6 className="text-sm font-semibold">Listado de usuarios</h6>
          <ul>
            {Array.isArray(filteredUsers) && filteredUsers.length > 0 ? (
              filteredUsers.slice(0, 4).map((user) => (
                <li
                  key={user.id}
                  className="flex items-center justify-between p-2 mb-2 border-b"
                >
                  <span>{user.name}</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (!crewData.membersNames.includes(user.name)) {
                        setCrewData((prev) => ({
                          ...prev,
                          membersNames: [...prev.membersNames, user.name],
                          numberOfMembers: prev.membersNames.length + 1,
                        }))
                      }
                    }}
                    className="px-3 py-1 text-white bg-blue-500 rounded"
                  >
                    Añadir
                  </button>
                </li>
              ))
            ) : (
              <li>No hay usuarios disponibles para añadir</li>
            )}
          </ul>
        </div>

        <div>
          <h4 className="text-lg font-semibold">Miembros Seleccionados</h4>
          <ul>
            {crewData.membersNames && crewData.membersNames.length > 0 ? (
              crewData.membersNames.map((memberName, index) => (
                <li
                  key={memberName}
                  className="flex items-center justify-between p-2 mb-2 border-b"
                >
                  <span>{memberName}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setCrewData((prev) => ({
                        ...prev,
                        membersNames: prev.membersNames.filter(
                          (name) => name !== memberName
                        ),
                        numberOfMembers: prev.membersNames.length - 1,
                      }))
                    }}
                    className="px-3 py-1 text-white bg-red-500 rounded"
                  >
                    Eliminar
                  </button>
                </li>
              ))
            ) : (
              <li>No hay miembros seleccionados</li>
            )}
          </ul>
        </div>

        <button
          type="submit"
          className="w-full px-4 py-2 text-white bg-blue-600 rounded-lg"
        >
          Crear Peña
        </button>
      </form>
    </div>
  )
}

export default RegisterCrew
