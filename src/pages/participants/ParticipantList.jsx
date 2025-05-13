import React, { useEffect, useState } from 'react'
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore'
import { db } from '../../firebase/firebase'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import DynamicInput from '../../components/Inputs'
import DynamicButton from '../../components/Buttons'
import useSlug from '../../hooks/useSlug'

function ParticipantList() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [participant, setParticipants] = useState([])
  const [filteredParticipants, setFilteredParticipants] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const viewDictionary = 'pages.participants.listParticipants'
  const { generateSlug } = useSlug()

  useEffect(() => {
    const fetchParticipant = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'participants'))
        const participantData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        setParticipants(participantData)
        setFilteredParticipants(participantData)
      } catch (error) {
        return
      }
    }

    fetchParticipant()
  }, [])

  const handleSearchChange = (event) => {
    const query = event.target.value
    setSearchQuery(query)

    const filtered = participant.filter(
      (part) =>
        (part.name && part.name.toLowerCase().includes(query)) ||
        (part.email && part.email.toLowerCase().includes(query))
    )

    setFilteredParticipants(filtered)
  }

  const handleDelete = async (id) => {
    try {
      await deleteDoc(doc(db, 'participants', id))
      const updateParticipants = participant.filter((part) => part.id !== id)
      setParticipants(updateParticipants)
      setFilteredParticipants(updateParticipants)
    } catch (error) {
      return
    }
  }

  return (
    <div className="h-screen max-h-[75dvh] pb-6 mx-auto max-w-full md:max-w-fit">
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
            onClick={() => navigate(`/new-participant/`)}
            size="small"
            state="normal"
            type="add"
            textId={t(`${viewDictionary}.addNewButton`)}
          />
        </div>
      </div>
      <ul className="space-y-4">
        {filteredParticipants.map((part) => (
          <li
            key={part.id}
            className="flex items-center justify-between p-4 space-x-4 bg-gray-100 rounded-lg shadow"
          >
            <div className="flex items-center space-x-4">
              <img
                src={part.url}
                alt={part.name}
                className="object-cover w-16 h-16 rounded-full"
              />
              <span className="text-lg font-semibold">{part.name}</span>
            </div>

            <div className="flex space-x-2">
              <DynamicButton
                onClick={() => {
                  const slug = generateSlug(part.name)

                  navigate(`/modify-participant/${slug}`, {
                    state: { participantId: part.id },
                  })
                }}
                size="small"
                state="normal"
                textId={t(`${viewDictionary}.modifyButton`)}
              />
              <DynamicButton
                onClick={() => handleDelete(part.id)}
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

export default ParticipantList
