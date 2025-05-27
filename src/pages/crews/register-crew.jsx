import React, { useState, useEffect, useContext } from 'react'
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore'
import { useTranslation } from 'react-i18next'
import { db } from '../../firebase/firebase'
import { createCrewModel } from '../../models/crewData'
import useFetchUsers from '../../hooks/useFetchUsers'
import { showPopup } from '../../services/popupService'
import DynamicInput from '../../components/Inputs'
import DynamicButton from '../../components/Buttons'
import DynamicItems from '../../components/Items'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import PersonAddIcon from '@mui/icons-material/PersonAdd'
import { useNavigate } from 'react-router-dom'
import { AuthContext } from '../../contexts/AuthContext'

function RegisterCrew() {
  const { t } = useTranslation()
  const viewDictionary = 'pages.crew.registerCrew'
  const navigate = useNavigate()
  const { user, loading: authLoading } = useContext(AuthContext)

  const errorPopupContext = {
    title: t(`${viewDictionary}.errorPopup.title`),
    text: t(`${viewDictionary}.errorPopup.text`),
    icon: 'error',
    confirmButtonText: t('components.popup.closeButtonText'),
    confirmButtonColor: '#3085d6',
  }

  const registerCrewPopupContext = {
    title: t(`${viewDictionary}.successPopup.title`),
    text: t(`${viewDictionary}.successPopup.text`),
    icon: 'success',
    confirmButtonText: t('components.popup.confirmButtonText'),
    confirmButtonColor: '#3085d6',
  }

  const alreadyResponsablePopupContext = {
    title: t(`${viewDictionary}.alreadyResponsablePopup.title`),
    text: t(`${viewDictionary}.alreadyResponsablePopup.text`),
    icon: 'warning',
    confirmButtonText: t('components.popup.closeButtonText'),
    confirmButtonColor: '#3085d6',
  }

  const {
    users,
    filteredUsers: originalFilteredUsers,
    search,
    setSearch,
    loading: usersLoading,
  } = useFetchUsers()
  const [filteredUsers, setFilteredUsers] = useState([])
  const [crewData, setCrewData] = useState(createCrewModel())
  const [responsableSearch, setResponsableSearch] = useState('')
  const [filteredResponsables, setFilteredResponsables] = useState([])
  const [selectedResponsables, setSelectedResponsables] = useState([])
  const [showAddCustomMember, setShowAddCustomMember] = useState(false)
  const [isAlreadyResponsable, setIsAlreadyResponsable] = useState(false)
  const [checkingResponsableStatus, setCheckingResponsableStatus] =
    useState(true)

  useEffect(() => {
    const filtered =
      originalFilteredUsers?.filter(
        (user) => !(user.role === 'admin' && user.isStaff === true)
      ) || []
    setFilteredUsers(filtered)
  }, [originalFilteredUsers])

  useEffect(() => {
    if (responsableSearch.trim() === '') {
      const filteredUsers =
        users?.filter(
          (user) => !(user.role === 'admin' && user.isStaff === true)
        ) || []
      setFilteredResponsables(filteredUsers)
    } else {
      const filtered =
        users?.filter(
          (user) =>
            user.name
              ?.toLowerCase()
              .includes(responsableSearch.toLowerCase()) &&
            !(user.role === 'admin' && user.isStaff === true)
        ) || []
      setFilteredResponsables(filtered)
    }
  }, [responsableSearch, users])

  useEffect(() => {
    const responsableIds = selectedResponsables.map((user) => user.id)
    setCrewData((prev) => ({ ...prev, responsable: responsableIds }))
  }, [selectedResponsables])

  useEffect(() => {
    if (search.trim() !== '') {
      const exactMatch = filteredUsers?.some(
        (user) => user.name.toLowerCase() === search.toLowerCase()
      )
      setShowAddCustomMember(!exactMatch && filteredUsers.length === 0)
    } else {
      setShowAddCustomMember(false)
    }
  }, [search, filteredUsers])

  useEffect(() => {
    if (user) {
      setCrewData((prev) => ({
        ...prev,
        createdBy: user.uid,
      }))
    }
  }, [user])

  useEffect(() => {
    const checkResponsableStatus = async () => {
      if (!user) {
        setCheckingResponsableStatus(false) // Marca como finalizado cuando no hay usuario
        return
      }

      try {
        setCheckingResponsableStatus(true)
        const crewsRef = collection(db, 'crews')
        const q = query(
          crewsRef,
          where('responsable', 'array-contains', user.uid)
        )
        const querySnapshot = await getDocs(q)

        setIsAlreadyResponsable(!querySnapshot.empty)
      } catch (error) {
        console.error('Error checking responsable status:', error)
      } finally {
        setCheckingResponsableStatus(false)
      }
    }

    checkResponsableStatus()
  }, [user])

  const handleChange = (e) => {
    const { name, value } = e.target
    setCrewData((prev) => ({ ...prev, [name]: value }))
  }

  const addResponsable = (user) => {
    if (
      selectedResponsables.length < 2 &&
      !selectedResponsables.find((r) => r.id === user.id)
    ) {
      setSelectedResponsables((prev) => [...prev, user])
    }
  }

  const removeResponsable = (userId) => {
    setSelectedResponsables((prev) => prev.filter((user) => user.id !== userId))
  }

  const addMembersFromSearch = () => {
    if (search.trim() === '') return

    const memberName = search.trim()

    if (!crewData.membersNames.includes(memberName)) {
      setCrewData((prev) => ({
        ...prev,
        membersNames: [...prev.membersNames, memberName],
        numberOfMembers: prev.membersNames.length + 1,
      }))
      setSearch('')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!user) {
      return
    }

    if (isAlreadyResponsable && user.role !== 'admin') {
      showPopup(alreadyResponsablePopupContext)
      return
    }

    try {
      const crewDataToSave = {
        ...crewData,
        responsable: selectedResponsables.map((user) => user.id),
        membersNames: crewData.membersNames,
        numberOfMembers: crewData.membersNames.length,
        updateDate: new Date().toISOString().split('T')[0],
      }

      await addDoc(collection(db, 'crews'), crewDataToSave)
      showPopup(registerCrewPopupContext)
      setCrewData(createCrewModel())
      setSelectedResponsables([])

      navigate('/')
    } catch (err) {
      showPopup(errorPopupContext)
    }
  }

  if (authLoading || usersLoading || checkingResponsableStatus) {
    return (
      <div className="flex items-center justify-center h-screen pb-64">
        <div className="loader" />
      </div>
    )
  }

  if (isAlreadyResponsable) {
    return (
      <div className="container px-4 py-16 mx-auto">
        <div className="max-w-3xl mx-auto text-center bg-white bg-opacity-75 backdrop-blur-lg backdrop-saturate-[180%] rounded-2xl p-8 shadow-lg">
          <h2 className="mb-6 text-3xl font-bold text-gray-800">
            {t(`${viewDictionary}.alreadyResponsable.title`)}
          </h2>

          <div className="mb-8 text-lg">
            <p className="mb-4">
              {t(`${viewDictionary}.alreadyResponsable.text`)}
            </p>
          </div>

          <div className="flex justify-center">
            <DynamicButton
              type="cancel"
              size="medium"
              state="normal"
              textId={t('components.buttons.accept')}
              onClick={() => navigate('/')}
            />
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="container px-4 py-16 mx-auto">
        <div className="max-w-3xl mx-auto text-center bg-white bg-opacity-75 backdrop-blur-lg backdrop-saturate-[180%] rounded-2xl p-8 shadow-lg flex flex-col items-center sm:flex-none">
          <h2 className="mb-6 text-3xl font-bold text-gray-800">
            {t('common.authRequired.title')}
          </h2>

          <div className="mb-8 text-lg ">
            <p className="mb-4">{t('common.authRequired.text')}</p>
          </div>

          <div className="flex flex-col justify-center space-y-4 md:flex-row md:space-y-0 md:space-x-6">
            <DynamicButton
              type="personAdd"
              size="medium"
              state="normal"
              textId={t('common.register')}
              onClick={() => navigate('/register')}
            />

            <DynamicButton
              type="submit"
              size="medium"
              state="highlighted"
              textId={t('common.login')}
              onClick={() => navigate('/login')}
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container px-4 pb-6 mx-auto">
      <form onSubmit={handleSubmit} className="mx-auto space-y-6 max-w-7xl">
        <h1 className="mb-6 text-center sm:t64b t24b">
          {t(`${viewDictionary}.title`)}
        </h1>

        <div className="p-4 mb-6 rounded-lg">
          <h3 className="mb-4 font-semibold t24b">
            {t(`${viewDictionary}.basicInfoTitle`)}
          </h3>

          <div className="grid grid-cols-1 gap-6">
            <div>
              <DynamicInput
                name="title"
                textId={t(`${viewDictionary}.groupNameLabel`)}
                type="text"
                value={crewData.title}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <h4 className="mb-2 t24b">
                {t(`${viewDictionary}.responsibleLabel`)}
              </h4>
              <p className="text-center t16r">
                {t(`${viewDictionary}.responsableDescription`)}
              </p>

              <DynamicInput
                name="responsableSearch"
                placeholder={t(
                  `${viewDictionary}.searchResponsablePlaceholder`
                )}
                type="users"
                value={responsableSearch}
                onChange={(e) => setResponsableSearch(e.target.value)}
              />

              <div className="grid grid-cols-1 gap-6 mt-4 md:grid-cols-2">
                <div>
                  <div className="p-2 overflow-y-auto max-h-60 text-[#696969] backdrop-blur-lg backdrop-saturate-[180%] bg-[rgba(255,255,255,0.75)] rounded-xl">
                    <h4 className="mb-2 t16r">
                      {t(`${viewDictionary}.userListTitle`)}
                    </h4>
                    {Array.isArray(filteredResponsables) &&
                    filteredResponsables.length > 0 ? (
                      <DynamicItems
                        items={filteredResponsables.slice(0, 4).map((user) => ({
                          title: user.name,
                          type: 'userData',
                          icon: (
                            <button
                              type="button"
                              onClick={() => addResponsable(user)}
                              disabled={selectedResponsables.length >= 2}
                            >
                              <AddIcon
                                fontSize="small"
                                className={
                                  selectedResponsables.length >= 2
                                    ? 'opacity-50'
                                    : ''
                                }
                              />
                            </button>
                          ),
                        }))}
                      />
                    ) : (
                      <p className="p-2 text-gray-500">
                        {t(`${viewDictionary}.noUsersMessage`)}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="mb-2 t16b">
                    {t(`${viewDictionary}.selectedResponsablesTitle`)}
                  </h4>
                  <div className="p-2 overflow-y-auto max-h-60 text-[#696969] backdrop-blur-lg backdrop-saturate-[180%] bg-[rgba(255,255,255,0.75)] rounded-xl">
                    {selectedResponsables.length > 0 ? (
                      <DynamicItems
                        items={selectedResponsables.map((user) => ({
                          title: user.name,
                          type: 'userData',
                          icon: (
                            <button
                              type="button"
                              onClick={() => removeResponsable(user.id)}
                            >
                              <DeleteIcon fontSize="small" />
                            </button>
                          ),
                        }))}
                      />
                    ) : (
                      <p className="p-2 text-gray-500">
                        {t(`${viewDictionary}.noResponsablesMessage`)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 mb-6 rounded-lg">
          <h3 className="mb-4 t24b">{t(`${viewDictionary}.userListTitle`)}</h3>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <DynamicInput
                name="search"
                textId={t(`${viewDictionary}.searchPlaceholder`)}
                type="users"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />

              <div className="p-2 mt-4 overflow-y-auto max-h-60 text-[#696969] backdrop-blur-lg backdrop-saturate-[180%] bg-[rgba(255,255,255,0.75)] rounded-xl">
                <h4 className="mb-2 t16r">
                  {t(`${viewDictionary}.userListTitle`)}
                </h4>
                {Array.isArray(filteredUsers) && filteredUsers.length > 0 ? (
                  <DynamicItems
                    items={filteredUsers.slice(0, 4).map((user) => ({
                      title: user.name,
                      type: 'userData',
                      icon: (
                        <button
                          type="button"
                          onClick={() => {
                            if (!crewData.membersNames.includes(user.name)) {
                              setCrewData((prev) => ({
                                ...prev,
                                membersNames: [...prev.membersNames, user.name],
                                numberOfMembers: prev.membersNames.length + 1,
                              }))
                            }
                          }}
                        >
                          <AddIcon fontSize="small" />
                        </button>
                      ),
                    }))}
                  />
                ) : (
                  <div>
                    {search.trim() !== '' && (
                      <div className="flex items-center justify-between p-2 mt-2">
                        <button
                          type="button"
                          className="flex items-center hover:text-gray-900"
                          onClick={addMembersFromSearch}
                        >
                          <PersonAddIcon fontSize="small" className="mr-1" />
                          {t(`${viewDictionary}.addCustomMember`, {
                            name: search.trim(),
                          })}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div>
              <h4 className="mb-2 t16b">
                {t(`${viewDictionary}.selectedMembersTitle`)}
              </h4>
              <div className="p-2 overflow-y-auto max-h-60 text-[#696969] backdrop-blur-lg backdrop-saturate-[180%] bg-[rgba(255,255,255,0.75)] rounded-xl">
                {crewData.membersNames && crewData.membersNames.length > 0 ? (
                  <DynamicItems
                    items={crewData.membersNames.map((memberName) => ({
                      title: memberName,
                      description: '',
                      type: 'userData',
                      icon: (
                        <button
                          type="button"
                          onClick={() => {
                            setCrewData((prev) => ({
                              ...prev,
                              membersNames: prev.membersNames.filter(
                                (name) => name !== memberName
                              ),
                              numberOfMembers: prev.membersNames.length - 1,
                            }))
                          }}
                        >
                          <DeleteIcon fontSize="small" />
                        </button>
                      ),
                    }))}
                  />
                ) : (
                  <p className="p-2 text-gray-500">
                    {t(`${viewDictionary}.noMembersMessage`)}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end mt-8">
          <DynamicButton
            type="submit"
            size="small"
            state="normal"
            textId={t(`${viewDictionary}.submitButton`)}
          />
        </div>
      </form>
    </div>
  )
}

export default RegisterCrew
