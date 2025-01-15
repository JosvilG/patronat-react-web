import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth'
import log from 'loglevel'
import { doc, setDoc, Timestamp } from 'firebase/firestore'
import { createUserModel } from '../models/usersData'
import { db } from '../firebase/firebase'

function RegisterPage() {
  const navigate = useNavigate()
  const auth = getAuth()

  const [formData, setFormData] = useState(createUserModel())

  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleChange = ({ target: { name, value } }) => {
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }))
  }
  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      )

      const { user } = userCredential

      await setDoc(doc(db, 'users', user.uid), {
        firstName: formData.firstName,
        lastName: formData.lastName,
        username: formData.username,
        phoneNumber: formData.phoneNumber,
        age: formData.age,
        birthDate: formData.birthDate,
        dni: formData.dni,
        email: formData.email,
        createdAt: Timestamp.fromDate(new Date()),
        modificationHistory: [],
        modifiedAt: Timestamp.fromDate(new Date()),
        role: 'user',
      })

      navigate('/')
    } catch (err) {
      log.error('Error al crear cuenta:', err)
      setError('Hubo un error al crear tu cuenta. Por favor, intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md p-5 mx-auto mt-10 border rounded-md shadow-lg">
      <h2 className="mb-4 text-2xl font-bold text-center">Registro</h2>
      {error && <p className="mb-4 text-center text-red-500">{error}</p>}
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="firstName" className="block mb-2">
            Nombre
            <input
              type="text"
              name="firstName"
              id="firstName"
              value={formData.firstName}
              onChange={handleChange}
              className="w-full p-2 border rounded-md"
              placeholder="Ingresa tu nombre"
              required
            />{' '}
          </label>
        </div>

        <div className="mb-4">
          <label htmlFor="lastName" className="block mb-2">
            Apellido
            <input
              type="text"
              name="lastName"
              id="lastName"
              value={formData.lastName}
              onChange={handleChange}
              className="w-full p-2 border rounded-md"
              placeholder="Ingresa tu apellido"
              required
            />{' '}
          </label>
        </div>

        <div className="mb-4">
          <label htmlFor="username" className="block mb-2">
            Nombre de Usuario
            <input
              type="text"
              name="username"
              id="username"
              value={formData.username}
              onChange={handleChange}
              className="w-full p-2 border rounded-md"
              placeholder="Ingresa tu nombre de usuario"
              required
            />{' '}
          </label>
        </div>

        <div className="mb-4">
          <label htmlFor="phoneNumber" className="block mb-2">
            Número de Teléfono
            <input
              type="tel"
              name="phoneNumber"
              id="phoneNumber"
              value={formData.phoneNumber}
              onChange={handleChange}
              className="w-full p-2 border rounded-md"
              placeholder="Ingresa tu número de teléfono"
              required
            />{' '}
          </label>
        </div>

        <div className="mb-4">
          <label htmlFor="age" className="block mb-2">
            Edad
            <input
              type="number"
              name="age"
              id="age"
              value={formData.age}
              onChange={handleChange}
              className="w-full p-2 border rounded-md"
              placeholder="Ingresa tu edad"
              required
            />{' '}
          </label>
        </div>

        <div className="mb-4">
          <label htmlFor="birthDate" className="block mb-2">
            Fecha de Nacimiento
            <input
              type="date"
              name="birthDate"
              id="birthDate"
              value={formData.birthDate}
              onChange={handleChange}
              className="w-full p-2 border rounded-md"
              placeholder="Ingresa tu fecha de nacimiento"
              required
            />{' '}
          </label>
        </div>

        <div className="mb-4">
          <label htmlFor="dni" className="block mb-2">
            DNI
            <input
              type="text"
              name="dni"
              id="dni"
              value={formData.dni}
              onChange={handleChange}
              className="w-full p-2 border rounded-md"
              placeholder="Ingresa tu DNI"
              required
            />{' '}
          </label>
        </div>

        <div className="mb-4">
          <label id="email" htmlFor="email" className="block mb-2">
            Correo Electrónico
            <input
              type="email"
              name="email"
              id="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full p-2 border rounded-md"
              placeholder="Ingresa tu correo electrónico"
              required
            />{' '}
          </label>
        </div>

        <div className="mb-4">
          <label id="password" htmlFor="password" className="block mb-2">
            Contraseña
            <input
              type="password"
              name="password"
              id="password"
              value={formData.password}
              onChange={handleChange}
              className="w-full p-2 border rounded-md"
              placeholder="Ingresa tu contraseña"
              required
            />{' '}
          </label>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full p-2 text-white bg-blue-600 rounded-md disabled:bg-gray-400"
        >
          {loading ? 'Registrando...' : 'Registrarse'}
        </button>
      </form>
    </div>
  )
}

export default RegisterPage
