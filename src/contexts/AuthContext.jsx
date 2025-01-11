import React, { createContext, useState, useEffect, useMemo } from 'react'
import log from 'loglevel'
import PropTypes from 'prop-types'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase/firebase'

export const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [userData, setUserData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const auth = getAuth()
    log.info('Esperando cambios en el estado de autenticación...')

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        log.info('Usuario autenticado, obteniendo datos del usuario...')

        const fetchUserData = async () => {
          try {
            const docRef = doc(db, 'users', firebaseUser.uid)
            const docSnap = await getDoc(docRef)

            if (docSnap.exists()) {
              setUserData(docSnap.data())
              setUser(firebaseUser)
              log.info('Datos del usuario obtenidos correctamente.')
            } else {
              log.info('No se encontró el documento del usuario.')
            }
          } catch (error) {
            log.error('Error al obtener los datos del usuario:', error)
          } finally {
            setLoading(false)
          }
        }

        fetchUserData()
      } else {
        log.info('No hay usuario autenticado, limpiando estado...')
        setUser(null)
        setUserData(null)
        setLoading(false)
      }
    })

    return () => {
      unsubscribe()
      log.info('Desuscrito de cambios en el estado de autenticación.')
    }
  }, [])

  // Memoriza el valor del contexto
  const value = useMemo(
    () => ({ user, userData, loading }),
    [user, userData, loading]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
}
