import React, { useState } from 'react'
import { collection, addDoc } from 'firebase/firestore'
import { useTranslation } from 'react-i18next'
import { db } from '../../firebase/firebase'
import { createCrewModel } from '../../models/crewData'
import useFetchUsers from '../../hooks/useFetchUsers'
import { showPopup } from '../../services/popupService'

function RegisterCrew() {
  const { t } = useTranslation()

  const errorPopupContext = {
    title: t('pages.crew.registerCrew.errorPopup.title'),
    text: t('pages.crew.registerCrew.errorPopup.text'),
    icon: 'error',
    confirmButtonText: t('components.popup.closeButtonText'),
    confirmButtonColor: '#3085d6',
  }

  const registerCrewPopupContext = {
    title: t('pages.crew.registerCrew.successPopup.title'),
    text: t('pages.crew.registerCrew.successPopup.text'),
    icon: 'success',
    confirmButtonText: t('components.popup.confirmButtonText'),
    confirmButtonColor: '#3085d6',
  }

  const { users, filteredUsers, search, setSearch, loading } = useFetchUsers()
  const [crewData, setCrewData] = useState(createCrewModel())

  const handleChange = (e) => {
    const { name, value } = e.target
    setCrewData((prev) => ({ ...prev, [name]: value }))
  }

  const addMembersFromSearch = () => {
    const newMembers = search
      .split(',')
      .map((name) => name.trim())
      .filter((name) => name !== '')

    newMembers.forEach((name) => {
      if (!crewData.membersNames.includes(name)) {
        setCrewData((prev) => ({
          ...prev,
          membersNames: [...prev.membersNames, name],
          numberOfMembers: prev.membersNames.length + 1,
        }))
      }
    })

    setSearch('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    try {
      await addDoc(collection(db, 'crews'), {
        ...crewData,
        updateDate: new Date().toISOString().split('T')[0],
      })
      showPopup(registerCrewPopupContext)
      setCrewData(createCrewModel())
    } catch (err) {
      showPopup(errorPopupContext)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen pb-64">
        <div className="loader" />
      </div>
    )
  }

  return (
    <div className="p-6 mx-auto space-y-6 bg-white rounded-lg shadow-lg max-w-7xl">
      <form onSubmit={handleSubmit}>
        <div>
          <label
            htmlFor="title"
            className="block mb-2 text-sm font-semibold text-gray-700"
          >
            {t('pages.crew.registerCrew.groupNameLabel')}
          </label>
          <input
            type="text"
            name="title"
            id="title"
            value={crewData.title}
            onChange={handleChange}
            placeholder={t('pages.crew.registerCrew.groupNameLabel')}
            required
            className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label
            htmlFor="responsable"
            className="block mb-2 text-sm font-semibold text-gray-700"
          >
            {t('pages.crew.registerCrew.responsibleLabel')}
          </label>
          <select
            name="responsable"
            id="responsable"
            value={crewData.responsable}
            onChange={handleChange}
            required
            className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">
              {t('pages.crew.registerCrew.searchPlaceholder')}
            </option>
            {Array.isArray(users) &&
              users.length > 0 &&
              users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
          </select>
        </div>

        <div>
          <h4 className="text-lg font-semibold">
            {t('pages.crew.registerCrew.userListTitle')}
          </h4>
          <div className="flex items-center">
            <div className="border-gray-300">
              <button
                type="button"
                onClick={addMembersFromSearch}
                className="w-10 h-12 px-3 mb-3 mr-0 text-white bg-green-600 rounded-s-xl"
                aria-label={t('pages.crew.registerCrew.addMemberButton')}
              >
                <span className="text-xl">+</span>
              </button>
            </div>
            <div className="flex-1">
              <input
                type="text"
                id="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('pages.crew.registerCrew.searchPlaceholder')}
                className="w-full p-3 mb-5 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <h6 className="text-sm font-semibold">
            {t('pages.crew.registerCrew.selectedMembersTitle')}
          </h6>
          <ul>
            {Array.isArray(filteredUsers) && filteredUsers.length > 0 ? (
              filteredUsers.slice(0, 4).map((user) => (
                <li
                  key={user.id}
                  className="flex items-center justify-between p-2 mb-2 border-b"
                >
                  <span>{user.name}</span>
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
                    className="px-3 py-1 text-white bg-blue-500 rounded"
                  >
                    {t('pages.crew.registerCrew.addMemberButton')}
                  </button>
                </li>
              ))
            ) : (
              <li>{t('pages.crew.registerCrew.noUsersMessage')}</li>
            )}
          </ul>
        </div>

        <div>
          <h4 className="text-lg font-semibold">
            {t('pages.crew.registerCrew.selectedMembersTitle')}
          </h4>
          <ul>
            {crewData.membersNames && crewData.membersNames.length > 0 ? (
              crewData.membersNames.map((memberName) => (
                <li
                  key={memberName}
                  className="flex items-center justify-between p-2 mb-2 border-b"
                >
                  <span>{memberName}</span>
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
                    className="px-3 py-1 text-white bg-red-500 rounded"
                  >
                    {t('pages.crew.registerCrew.removeMemberButton')}
                  </button>
                </li>
              ))
            ) : (
              <li>{t('pages.crew.registerCrew.noMembersMessage')}</li>
            )}
          </ul>
        </div>

        <button
          type="submit"
          className="w-full px-4 py-2 text-white bg-blue-600 rounded-lg"
        >
          {t('pages.crew.registerCrew.submitButton')}
        </button>
      </form>
    </div>
  )
}

export default RegisterCrew
