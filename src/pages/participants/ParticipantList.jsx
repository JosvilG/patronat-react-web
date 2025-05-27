import React, { useEffect, useState } from 'react'
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore'
import { db } from '../../firebase/firebase'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import DynamicInput from '../../components/Inputs'
import DynamicButton from '../../components/Buttons'
import useSlug from '../../hooks/useSlug'
import { showPopup } from '../../services/popupService'

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
    // Encontrar el participante para mostrar su nombre en el mensaje de confirmación
    const participantToDelete = participant.find((part) => part.id === id)

    if (!participantToDelete) return

    showPopup({
      title: t(`${viewDictionary}.popups.delete.title`),
      text: t(`${viewDictionary}.popups.delete.text`, {
        fileName: participantToDelete.name,
      }),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: t(`${viewDictionary}.popups.delete.confirmButton`),
      cancelButtonText: t(`${viewDictionary}.popups.delete.cancelButton`),
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'participants', id))
          const updateParticipants = participant.filter(
            (part) => part.id !== id
          )
          setParticipants(updateParticipants)
          setFilteredParticipants(updateParticipants)

          // Mostrar mensaje de éxito
          showPopup({
            title: t(`${viewDictionary}.popups.success.title`),
            text: t(`${viewDictionary}.popups.success.text`),
            icon: 'success',
          })
        } catch (error) {
          // Mostrar mensaje de error
          showPopup({
            title: t(`${viewDictionary}.popups.error.title`),
            text: t(`${viewDictionary}.popups.error.text`),
            icon: 'error',
          })
        }
      },
    })
  }

  return (
    <div className="h-screen max-h-[75dvh] pb-6 mx-auto max-w-[370px] sm:max-w-full md:max-w-fit flex flex-col items-center sm:flex-none">
      <h1 className="mb-4 text-center sm:t64b t24b sm:text-start">
        {t(`${viewDictionary}.title`)}
      </h1>
      <div className="grid items-center justify-end grid-cols-1 gap-4 mb-4 sm:grid-cols-2 sm:justify-between">
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
                size="x-small"
                state="normal"
                type="edit"
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
