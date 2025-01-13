import { useState, useEffect } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import log from 'loglevel'
import { db } from '../firebase/firebase'

const useFetchUsers = () => {
  const [users, setUsers] = useState([]) // Inicializado como un array vacío
  const [filteredUsers, setFilteredUsers] = useState([]) // Inicializado como un array vacío
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        log.debug('Fetching users...')
        const usersSnap = await getDocs(collection(db, 'users'))
        const usersList = usersSnap.docs.map((docSnap) => {
          const data = docSnap.data()
          // Nos aseguramos de que cada usuario tenga un campo 'name'
          return {
            id: docSnap.id,
            name: `${data.firstName} ${data.lastName}` || 'Sin nombre', // Valor por defecto si no tiene 'name'
            ...data,
          }
        })
        setUsers(usersList)
        setFilteredUsers(usersList)
        log.debug('Users fetched:', usersList)
      } catch (err) {
        log.error('Error fetching users:', err)
        setError(err)
      } finally {
        setLoading(false)
      }
    }

    fetchUsers()
  }, [])

  useEffect(() => {
    // Solo filtrar usuarios si la búsqueda tiene algún valor
    if (search.trim()) {
      setFilteredUsers(
        users.filter((user) =>
          user.name.toLowerCase().includes(search.toLowerCase())
        )
      )
    } else {
      // Si no hay búsqueda, mostrar todos los usuarios
      setFilteredUsers(users)
    }
  }, [search, users])

  return { users, filteredUsers, search, setSearch, loading, error }
}

export default useFetchUsers
