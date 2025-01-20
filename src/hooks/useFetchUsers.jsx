import { useState, useEffect } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import log from 'loglevel'
import { db } from '../firebase/firebase'

const useFetchUsers = () => {
  const [users, setUsers] = useState([])
  const [filteredUsers, setFilteredUsers] = useState([])
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
          return {
            id: docSnap.id,
            name: `${data.firstName} ${data.lastName}` || 'Sin nombre',
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
    if (search.trim()) {
      setFilteredUsers(
        users.filter((user) =>
          user.name.toLowerCase().includes(search.toLowerCase())
        )
      )
    } else {
      setFilteredUsers(users)
    }
  }, [search, users])

  return { users, filteredUsers, search, setSearch, loading, error }
}

export default useFetchUsers
