import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'
import log from 'loglevel'

function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    const auth = getAuth()

    try {
      log.info(`Intentando iniciar sesión con el correo: ${email}`)
      await signInWithEmailAndPassword(auth, email, password)
      log.info('Inicio de sesión exitoso')
      navigate('/')
    } catch (err) {
      log.error('Error al intentar iniciar sesión:', err.message)
      setLoginError(
        'Error al iniciar sesión. Por favor verifica tus credenciales.'
      )
    }
  }

  return (
    <div className="max-w-screen-xl px-4 py-16 mx-auto sm:px-6 lg:px-8">
      <div className="max-w-lg mx-auto text-center">
        <h1 className="text-2xl font-bold sm:text-3xl">Inicia sesión</h1>

        <p className="mt-4 text-gray-500">
          Ingresa tu correo electrónico y contraseña para acceder a tu cuenta.
        </p>
      </div>

      <form
        onSubmit={handleLogin}
        className="max-w-md mx-auto mt-8 mb-0 space-y-4"
      >
        {loginError && (
          <p className="mb-4 text-center text-red-500">{loginError}</p>
        )}{' '}
        <div>
          <label htmlFor="email" className="sr-only">
            {' '}
          </label>
          Correo Electrónico
          <div className="relative">
            <input
              type="email"
              id="email"
              className="w-full p-4 text-sm border-gray-200 rounded-lg shadow-sm pe-12"
              placeholder="Ingresa tu correo"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <span className="absolute inset-y-0 grid px-4 end-0 place-content-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="text-gray-400 size-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"
                />
              </svg>
            </span>
          </div>
        </div>
        <div>
          <label htmlFor="password" className="sr-only">
            {' '}
          </label>
          Contraseña
          <div className="relative">
            <input
              type="password"
              id="password"
              className="w-full p-4 text-sm border-gray-200 rounded-lg shadow-sm pe-12"
              placeholder="Ingresa tu contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <span className="absolute inset-y-0 grid px-4 end-0 place-content-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="text-gray-400 size-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
            </span>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            ¿No tienes una cuenta?
            <a className="text-blue-600 underline" href="/register">
              Regístrate
            </a>
          </p>

          <button
            type="submit"
            className="inline-block px-5 py-3 text-sm font-medium text-white bg-blue-500 rounded-lg"
          >
            Iniciar sesión
          </button>
        </div>
      </form>
    </div>
  )
}

export default LoginPage
