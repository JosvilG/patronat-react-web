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
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      const fetchData = async () => {
        if (firebaseUser) {
          setLoading(true)
          try {
            const docRef = doc(db, 'users', firebaseUser.uid)
            const docSnap = await getDoc(docRef)
            const firestoreData = docSnap.exists() ? docSnap.data() : {}
            const idTokenResult = await firebaseUser.getIdTokenResult(true)
            const role =
              idTokenResult.claims.role || firestoreData.role || 'user'

            setUser(firebaseUser)
            setUserData({ ...firestoreData, role })
          } catch (error) {
            log.error('Error fetching user data or token:', error)
          } finally {
            setLoading(false)
          }
        } else {
          setUser(null)
          setUserData(null)
          setLoading(false)
        }
      }
      fetchData()
    })

    return () => unsubscribe()
  }, [])

  const value = useMemo(
    () => ({ user, userData, loading }),
    [user, userData, loading]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
}
