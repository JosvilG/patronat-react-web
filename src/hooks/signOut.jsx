import { useNavigate } from 'react-router-dom'
import { getAuth, signOut } from 'firebase/auth'
import log from 'loglevel'

export const useSignOut = () => {
  const navigate = useNavigate()
  const auth = getAuth()

  const handleSignOut = async () => {
    try {
      log.info('Intentando cerrar sesión...')
      await signOut(auth)
      log.info('Cierre de sesión exitoso, redirigiendo a la página principal.')
      navigate('/')
    } catch (err) {
      log.error('Error al cerrar sesión:', err)
    }
  }

  return handleSignOut
}
