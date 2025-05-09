import React, { useEffect, useState } from 'react'
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore'
import { db } from '../../firebase/firebase'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import DynamicInput from '../../components/Inputs'
import DynamicButton from '../../components/Buttons'
import Loader from '../../components/Loader'

function CollabList() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [collaborators, setCollaborators] = useState([])
  const [filteredCollaborators, setFilteredCollaborators] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const viewDictionary = 'pages.collaborators.listCollaborators'

  useEffect(() => {
    const fetchCollaborators = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'collaborators'))
        const collabData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        setCollaborators(collabData)
        setFilteredCollaborators(collabData)
      } catch (error) {
        console.error('Error fetching collaborators:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchCollaborators()
  }, [])

  const handleSearchChange = (event) => {
    const query = event.target.value
    setSearchQuery(query)

    const filtered = collaborators.filter(
      (collab) =>
        (collab.name && collab.name.toLowerCase().includes(query)) ||
        (collab.email && collab.email.toLowerCase().includes(query))
    )

    setFilteredCollaborators(filtered)
  }

  const handleDelete = async (id) => {
    try {
      await deleteDoc(doc(db, 'collaborators', id))
      const updatedCollaborators = collaborators.filter(
        (collab) => collab.id !== id
      )
      setCollaborators(updatedCollaborators)
      setFilteredCollaborators(updatedCollaborators)
    } catch (error) {
      console.error('Error deleting collaborator:', error)
    }
  }

  const generateSlug = (name) => {
    return name.toLowerCase().replace(/ /g, '-')
  }

  if (loading)
    return (
      <Loader
        loading={true}
        size="50px"
        color="rgb(21, 100, 46)"
        text={t(`${viewDictionary}.loadingText`)}
      />
    )

  return (
    <div className="h-screen max-h-[75vh] p-6 mx-auto max-w-full md:max-w-fit">
      <h1 className="mb-4 t64b">{t(`${viewDictionary}.title`)}</h1>
      <div className="grid items-center justify-end grid-cols-1 gap-4 mb-4 md:justify-items-end sm:grid-cols-2 sm:justify-between">
        <DynamicInput
          name="search"
          type="text"
          placeholder={t(`${viewDictionary}.searchPlaceholder`)}
          value={searchQuery}
          onChange={handleSearchChange}
        />
        <div className="pl-0 sm:pl-32">
          <DynamicButton
            onClick={() => navigate(`/new-collaborator/`)}
            size="small"
            state="normal"
            type="add"
            textId={t(`${viewDictionary}.addNewButton`)}
          />
        </div>
      </div>
      <ul className="space-y-4">
        {filteredCollaborators.map((collab) => (
          <li
            key={collab.id}
            className="flex items-center justify-between p-4 space-x-4 bg-gray-100 rounded-lg shadow"
          >
            <div className="flex items-center space-x-4">
              <img
                src={collab.url}
                alt={collab.name}
                className="object-cover w-16 h-16 rounded-full"
              />
              <span className="text-lg font-semibold">{collab.name}</span>
            </div>

            <div className="flex space-x-2">
              <DynamicButton
                onClick={() => {
                  const slug = generateSlug(collab.name)
                  console.log(
                    'Navegando a editar colaborador:',
                    slug,
                    'ID:',
                    collab.id
                  )
                  navigate(`/modify-collaborator/${slug}`, {
                    state: { collaboratorId: collab.id },
                  })
                }}
                size="small"
                state="normal"
                textId={t(`${viewDictionary}.modifyButton`)}
              />
              <DynamicButton
                onClick={() => handleDelete(collab.id)}
                size="x-small"
                type="delete"
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default CollabList
