import React, { useState, useEffect, useContext } from 'react'
import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore'
import { useNavigate, useLocation, useParams } from 'react-router-dom'
import log from 'loglevel'
import { db } from '../../firebase/firebase'
import Loader from '../../components/Loader'
import { useTranslation } from 'react-i18next'
import DynamicInput from '../../components/Inputs'
import DynamicItems from '../../components/Items'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import DynamicButton from '../../components/Buttons'
import { AuthContext } from '../../contexts/AuthContext'
import useFetchUsers from '../../hooks/useFetchUsers'
import useSlug from '../../hooks/useSlug'
import { showPopup } from '../../services/popupService'

function CrewModify() {
  const { t } = useTranslation()
  const viewDictionary = 'pages.crew.modifyCrew'
  const navigate = useNavigate()
  const location = useLocation()
  const { slug } = useParams()
  const crewId = location.state?.crewId
  const { user, userData, loading: authLoading } = useContext(AuthContext)
  const { users, loading: usersLoading } = useFetchUsers()
  const { generateSlug, slugToTitle } = useSlug()

  const [crewData, setCrewData] = useState({
    title: '',
    responsable: [],
    membersNames: [],
    createdAt: null,
    updatedAt: null,
    slug: '',
    status: '',
  })

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [userSearch, setUserSearch] = useState('')
  const [filteredUsers, setFilteredUsers] = useState([])
  const [responsableSearch, setResponsableSearch] = useState('')
  const [filteredResponsables, setFilteredResponsables] = useState([])

  log.setLevel('debug')

  useEffect(() => {
    const fetchCrew = async () => {
      if (!crewId) {
        showPopup({
          title: 'Error',
          text: 'No se encontró el ID de la peña',
          icon: 'error',
          onConfirm: () => navigate('/crews'),
        })
        return
      }

      try {
        setLoading(true)
        const crewDoc = await getDoc(doc(db, 'crews', crewId))

        if (crewDoc.exists()) {
          const crewData = crewDoc.data()

          const currentSlug = generateSlug(crewData.title)
          if (slug && currentSlug !== slug) {
            navigate(`/crews-modify/${currentSlug}`, {
              state: { crewId },
              replace: true,
            })
          }

          if (
            crewData.responsable &&
            !crewData.responsable.includes(user.uid) &&
            userData?.role !== 'admin'
          ) {
            showPopup({
              title: 'Acceso denegado',
              text: 'Solo los responsables y administradores pueden editar esta peña',
              icon: 'error',
              confirmButtonText: 'Entendido',
              onConfirm: () => navigate('/crews'),
            })
            return
          }

          setCrewData({
            ...crewData,
            id: crewDoc.id,
          })
        } else {
          navigate('/crews')
        }
      } catch (error) {
        // Error al obtener la crew
        navigate('/crews')
      } finally {
        setLoading(false)
      }
    }

    fetchCrew()
  }, [crewId, user, navigate, slug, generateSlug, userData])

  useEffect(() => {
    if (!users || users.length === 0) return

    setFilteredUsers(
      users.filter((u) =>
        u.name.toLowerCase().includes(userSearch.toLowerCase())
      )
    )
  }, [userSearch, users])

  useEffect(() => {
    if (!users || users.length === 0) return

    setFilteredResponsables(
      users.filter((u) =>
        u.name.toLowerCase().includes(responsableSearch.toLowerCase())
      )
    )
  }, [responsableSearch, users])

  const handleChange = (e) => {
    const { name, value } = e.target
    setCrewData({
      ...crewData,
      [name]: value,
    })
  }

  const addMemberToCrew = (memberName) => {
    if (!crewData.membersNames.includes(memberName)) {
      setCrewData({
        ...crewData,
        membersNames: [...crewData.membersNames, memberName],
      })
    }
  }

  const removeMemberFromCrew = (memberName) => {
    setCrewData({
      ...crewData,
      membersNames: crewData.membersNames.filter((name) => name !== memberName),
    })
  }

  const addResponsableToCrew = (responsableId) => {
    if (!crewData.responsable.includes(responsableId)) {
      setCrewData({
        ...crewData,
        responsable: [...crewData.responsable, responsableId],
      })
    }
  }

  const removeResponsableFromCrew = (responsableId) => {
    setCrewData({
      ...crewData,
      responsable: crewData.responsable.filter((id) => id !== responsableId),
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const crewDataToSave = { ...crewData }

      crewDataToSave.slug = generateSlug(crewData.title)
      crewDataToSave.updatedAt = Timestamp.now()
      crewDataToSave.status = 'Pendiente'

      await updateDoc(doc(db, 'crews', crewId), crewDataToSave)

      showPopup({
        title: t(`${viewDictionary}.successPopup.title`),
        text: t(`${viewDictionary}.successPopup.text`),
        icon: 'success',
        confirmButtonText: 'Aceptar',
        onConfirm: () => {
          userData?.role === 'admin'
            ? navigate('/crews-list')
            : navigate('/crews')
        },
      })
    } catch (error) {
      let errorMessage =
        'Hubo un error al actualizar la crew. Por favor, intenta nuevamente.'
      if (error.code === 'unavailable') {
        errorMessage =
          'No se puede conectar con el servidor. Por favor, revisa tu conexión a internet.'
      } else if (error.code === 'permission-denied') {
        errorMessage =
          'No tienes permisos suficientes para modificar esta crew.'
      }

      showPopup({
        title: t(`${viewDictionary}.errorPopup.title`),
        text: t(`${viewDictionary}.errorPopup.text \n`, { errorMessage }),
        icon: 'error',
        confirmButtonText: 'Cerrar',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancel = (e) => {
    e.preventDefault()
    e.stopPropagation()

    userData?.role === 'admin' ? navigate('/crews-list') : navigate('/crews')
  }

  if (loading || authLoading || usersLoading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <div className="loader" />
      </div>
    )
  }

  if (!user) {
    navigate('/login')
    return null
  }

  return (
    <div className="w-[92%] mx-auto pb-[4vh] sm:pb-[6vh]">
      <Loader loading={submitting} />

      <form
        onSubmit={handleSubmit}
        className="mx-auto space-y-[1.5rem] max-w-7xl"
      >
        <h1 className="mb-[1.5rem] text-center sm:t64b t40b">
          {t(`${viewDictionary}.title`)}
        </h1>

        <div className="p-[5%] mb-[1.5rem] rounded-lg bg-white bg-opacity-75 shadow-sm">
          <h3 className="mb-[1rem] text-lg font-semibold text-gray-700">
            {t(`${viewDictionary}.basicInfoTitle`)}
          </h3>

          <div className="grid grid-cols-1 gap-[1rem]">
            <div>
              <DynamicInput
                name="title"
                textId={t(`${viewDictionary}.nameLabel`)}
                type="text"
                value={crewData.title}
                onChange={handleChange}
                required
              />
            </div>
          </div>
        </div>

        <div className="p-[5%] mb-[1.5rem] rounded-lg bg-white bg-opacity-75 shadow-sm">
          <h3 className="mb-[1rem] text-lg font-semibold text-gray-700">
            {t(`${viewDictionary}.responsablesTitle`)}
          </h3>

          <div className="grid grid-cols-1 gap-[1.5rem] lg:grid-cols-2">
            <div>
              <DynamicInput
                name="searchResponsable"
                textId={t(`${viewDictionary}.searchResponsableLabel`)}
                type="text"
                value={responsableSearch}
                onChange={(e) => setResponsableSearch(e.target.value)}
              />

              <div className="p-[0.5rem] mt-[0.5rem] overflow-y-auto max-h-[40vh] sm:max-h-[30vh] md:max-h-[15rem] text-[#696969] backdrop-blur-lg backdrop-saturate-[180%] bg-[rgba(255,255,255,0.75)] rounded-xl">
                <DynamicItems
                  items={filteredResponsables.map((u) => ({
                    title: u.name,
                    type: 'userData',
                    icon: (
                      <button
                        type="button"
                        className="p-[0.5rem]" // Área de toque ampliada
                        onClick={() => addResponsableToCrew(u.id)}
                      >
                        <AddIcon fontSize="small" />
                      </button>
                    ),
                  }))}
                />
              </div>
            </div>

            <div>
              <h4 className="mb-[0.5rem] text-gray-700 t16r">
                {t(`${viewDictionary}.selectedResponsablesLabel`)}
              </h4>
              <div className="p-[0.5rem] overflow-y-auto max-h-[40vh] sm:max-h-[30vh] md:max-h-[15rem] text-[#696969] backdrop-blur-lg backdrop-saturate-[180%] bg-[rgba(255,255,255,0.75)] rounded-xl">
                <DynamicItems
                  items={crewData.responsable
                    .map((responsableId) => {
                      const responsable = users.find(
                        (u) => u.id === responsableId
                      )
                      return responsable
                        ? {
                            title: responsable.name,
                            type: 'userData',
                            icon: (
                              <button
                                type="button"
                                className="p-[0.5rem]" // Área de toque ampliada
                                onClick={() =>
                                  removeResponsableFromCrew(responsableId)
                                }
                              >
                                <DeleteIcon fontSize="small" />
                              </button>
                            ),
                          }
                        : null
                    })
                    .filter(Boolean)}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="p-[5%] mb-[1.5rem] rounded-lg bg-white bg-opacity-75 shadow-sm">
          <h3 className="mb-[1rem] text-lg font-semibold text-gray-700">
            {t(`${viewDictionary}.membersTitle`)}
          </h3>

          <div className="grid grid-cols-1 gap-[1.5rem] lg:grid-cols-2">
            <div>
              <DynamicInput
                name="searchUser"
                textId={t(`${viewDictionary}.searchMemberLabel`)}
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
              />

              <div className="p-[0.5rem] mt-[0.5rem] overflow-y-auto max-h-[40vh] sm:max-h-[30vh] md:max-h-[15rem] text-[#696969] backdrop-blur-lg backdrop-saturate-[180%] bg-[rgba(255,255,255,0.75)] rounded-xl">
                <DynamicItems
                  items={filteredUsers.map((u) => ({
                    title: u.name,
                    type: 'userData',
                    icon: (
                      <button
                        type="button"
                        className="p-[0.5rem]" // Área de toque ampliada
                        onClick={() => addMemberToCrew(u.name)}
                      >
                        <AddIcon fontSize="small" />
                      </button>
                    ),
                  }))}
                />
              </div>
            </div>

            <div>
              <h4 className="mb-[0.5rem] text-gray-700 t16r">
                {t(`${viewDictionary}.selectedMembersLabel`)}
              </h4>
              <div className="p-[0.5rem] overflow-y-auto max-h-[40vh] sm:max-h-[30vh] md:max-h-[15rem] text-[#696969] backdrop-blur-lg backdrop-saturate-[180%] bg-[rgba(255,255,255,0.75)] rounded-xl">
                {crewData.membersNames && crewData.membersNames.length > 0 ? (
                  <DynamicItems
                    items={crewData.membersNames.map((memberName) => ({
                      title: memberName,
                      type: 'userData',
                      icon: (
                        <button
                          type="button"
                          className="p-[0.5rem]" // Área de toque ampliada
                          onClick={() => removeMemberFromCrew(memberName)}
                        >
                          <DeleteIcon fontSize="small" />
                        </button>
                      ),
                    }))}
                  />
                ) : (
                  <p className="p-[0.5rem] text-gray-500">
                    {t(`${viewDictionary}.noMembers`)}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="items-center flex flex-col sm:flex-row justify-end gap-[1rem] sm:gap-[0.5rem] mt-[2rem]">
          <DynamicButton
            type="button"
            onClick={handleCancel}
            size="small"
            state="normal"
            textId="components.buttons.cancel"
            className="mr-4"
          />

          <DynamicButton
            type="submit"
            size="small"
            state="normal"
            textId={`${viewDictionary}.submitButton`}
          />
        </div>
      </form>
    </div>
  )
}

export default CrewModify
