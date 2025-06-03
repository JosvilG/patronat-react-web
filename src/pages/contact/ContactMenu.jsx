import React, { useState, useRef, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import DynamicInput from '../../components/Inputs'
import DynamicButton from '../../components/Buttons'
import Loader from '../../components/Loader'
import { getCsrfToken } from '../../utils/security'
import { collection, getDocs, getDoc, doc } from 'firebase/firestore'
import { db } from '../../firebase/firebase'
import { showPopup } from '../../services/popupService'

const ContactMenu = () => {
  const { t } = useTranslation()
  const [formData, setFormData] = useState({
    subject: '',
    message: '',
    website: '',
  })
  const [recipientType, setRecipientType] = useState('partners')
  const [recipients, setRecipients] = useState([])
  const [formStatus, setFormStatus] = useState(null)
  const [csrfToken, setCsrfToken] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [totalEntities, setTotalEntities] = useState(0)
  const [uniqueCrews, setUniqueCrews] = useState([])

  const [allCrews, setAllCrews] = useState([])
  const [selectedCrewIds, setSelectedCrewIds] = useState([])

  const [usersData, setUsersData] = useState({})

  const viewDictionary = 'pages.contact.form'

  useEffect(() => {
    const fetchCsrfToken = async () => {
      const token = await getCsrfToken()
      setCsrfToken(token)
    }

    fetchCsrfToken()
  }, [])

  useEffect(() => {
    fetchRecipients()
  }, [recipientType])

  const fetchRecipients = async () => {
    setIsLoading(true)
    try {
      if (recipientType === 'partners') {
        const partnersSnapshot = await getDocs(collection(db, 'partners'))
        const allPartners = partnersSnapshot.docs.map((doc) => ({
          id: doc.id,
          email: doc.data().email,
          name: doc.data().name || 'Socio',
        }))

        const partnersWithEmail = allPartners.filter((partner) => partner.email)

        setTotalEntities(allPartners.length)
        setRecipients(partnersWithEmail)
      } else {
        const crewSnapshot = await getDocs(collection(db, 'crews'))

        const crews = crewSnapshot.docs.map((doc) => ({
          id: doc.id,
          title: doc.data().title || 'Peña sin nombre',
          responsable: doc.data().responsable || [],
        }))

        setAllCrews(crews)

        if (selectedCrewIds.length === 0 && crews.length > 0) {
          setSelectedCrewIds(crews.map((crew) => crew.id))
        }

        const allUserIds = new Set()
        crews.forEach((crew) => {
          if (crew.responsable && crew.responsable.length > 0) {
            crew.responsable.forEach((userId) => allUserIds.add(userId))
          }
        })

        const userPromises = Array.from(allUserIds).map((userId) =>
          getDoc(doc(db, 'users', userId))
            .then((doc) => {
              if (doc.exists()) {
                return { id: doc.id, ...doc.data() }
              }
              return null
            })
            .catch(() => {
              // Error al cargar usuario
              return null
            })
        )

        const usersResults = await Promise.all(userPromises)

        const usersMap = {}
        usersResults.forEach((user) => {
          if (user) {
            usersMap[user.id] = user
          }
        })

        setUsersData(usersMap)

        updateSelectedCrewRecipients(crews, usersMap, selectedCrewIds)
      }
    } catch (error) {
      // Error fetching recipients
      setFormStatus({
        type: 'error',
        message: t('pages.contact.menu.errorFetchingRecipients'),
      })
    } finally {
      setIsLoading(false)
    }
  }

  const updateSelectedCrewRecipients = (crews, usersData, selectedIds) => {
    const selectedCrews = crews.filter(
      (crew) =>
        selectedIds.includes(crew.id) &&
        crew.responsable &&
        crew.responsable.length > 0
    )

    const crewWithResponsibles = []
    const uniqueCrewsSet = new Set()
    let totalResponsibles = 0

    selectedCrews.forEach((crew) => {
      uniqueCrewsSet.add(crew.id)

      const validResponsibles = crew.responsable.filter((userId) => {
        const userData = usersData[userId]

        return (
          userData && userData.email && userData.emailNotifications !== false
        )
      })

      totalResponsibles += validResponsibles.length

      validResponsibles.forEach((userId) => {
        const userData = usersData[userId]
        crewWithResponsibles.push({
          id: userId,
          email: userData.email,
          name: userData.displayName || crew.title || 'Responsable de peña',
          crewId: crew.id,
          crewName: crew.title || 'Peña sin nombre',
          notificationsEnabled: userData.emailNotifications !== false,
        })
      })
    })

    setTotalEntities(totalResponsibles)
    setUniqueCrews(Array.from(uniqueCrewsSet))
    setRecipients(crewWithResponsibles)
  }

  useEffect(() => {
    if (recipientType === 'crew' && !isLoading && allCrews.length > 0) {
      updateSelectedCrewRecipients(allCrews, usersData, selectedCrewIds)
    }
  }, [selectedCrewIds, usersData, allCrews, recipientType, isLoading])

  const handleCrewCheckboxChange = (crewId) => {
    setSelectedCrewIds((prev) => {
      if (prev.includes(crewId)) {
        return prev.filter((id) => id !== crewId)
      } else {
        return [...prev, crewId]
      }
    })
  }

  const handleSelectAllCrews = (e) => {
    e.preventDefault()

    if (selectedCrewIds.length === allCrews.length) {
      setSelectedCrewIds([])
    } else {
      setSelectedCrewIds(allCrews.map((crew) => crew.id))
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }))
  }

  const handleRecipientTypeChange = (e) => {
    setRecipientType(e.target.value)
  }

  const sendEmails = async () => {
    setFormStatus({
      type: 'loading',
      message: t(`${viewDictionary}.sending`),
    })

    const jsonData = {
      recipientType: recipientType,
      recipients: recipients.map((r) => ({ email: r.email, name: r.name })),
      subject: formData.subject,
      message: formData.message,
    }

    try {
      const response = await fetch(process.env.REACT_APP_CONTACT_BULK_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify(jsonData),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        // Error en envío masivo
        throw new Error(errorData.error || 'Error en el envío de los correos')
      }

      showPopup({
        title: t('pages.contact.menu.successTitle'),
        text: t('pages.contact.menu.successMessage', {
          count: recipients.length,
        }),
        icon: 'success',
        confirmButtonText: t('pages.contact.menu.okButton'),
      })

      setFormData({
        subject: '',
        message: '',
        website: '',
      })

      setFormStatus(null)
    } catch (error) {
      // Error en envío de correos

      showPopup({
        title: t('pages.contact.menu.errorTitle'),
        text: t('pages.contact.menu.errorMessage'),
        icon: 'error',
        confirmButtonText: t('pages.contact.menu.okButton'),
      })
      setFormStatus(null)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (formData.website) {
      setFormStatus({
        type: 'success',
        message: t(`${viewDictionary}.success`),
      })
      return
    }

    if (!formData.subject || !formData.message) {
      setFormStatus({
        type: 'error',
        message: t(`${viewDictionary}.validation.requiredFields`),
      })
      return
    }

    if (recipients.length === 0) {
      setFormStatus({
        type: 'error',
        message: t('pages.contact.menu.noRecipients'),
      })
      return
    }

    showPopup({
      title: t('pages.contact.menu.confirmTitle'),
      text: t('pages.contact.menu.confirmSend', {
        count: recipients.length,
      }),
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: t('pages.contact.menu.confirmButton'),
      confirmButtonColor: '#3085d6',
      cancelButtonText: t('pages.contact.menu.cancelButton'),
      cancelButtonColor: '#d33',
      onConfirm: async () => {
        await sendEmails()
      },
    })
  }

  return (
    <div className="container px-4 py-8 mx-auto">
      <h1 className="mb-10 text-center sm:t64b t40b">
        {t('pages.contact.menu.title')}
      </h1>

      <p className="mb-8 text-center">{t('pages.contact.menu.description')}</p>

      <div className="flex flex-col items-center gap-10">
        <div className="p-6 bg-white bg-opacity-75 shadow-lg backdrop-blur-lg rounded-3xl w-[80%]">
          <form
            onSubmit={handleSubmit}
            className="flex flex-col items-center space-y-4"
          >
            <div className="w-full">
              <label className="block mb-2 text-sm font-medium">
                {t('pages.contact.menu.recipientTypeLabel')}
              </label>
              <div className="flex gap-4">
                {/* Usar DynamicInput para radio buttons */}
                <div
                  onClick={() =>
                    handleRecipientTypeChange({ target: { value: 'partners' } })
                  }
                >
                  <DynamicInput
                    type="radio"
                    name="recipientType"
                    textId="pages.contact.menu.partners"
                    checked={recipientType === 'partners'}
                    onChange={handleRecipientTypeChange}
                  />
                </div>
                <div
                  onClick={() =>
                    handleRecipientTypeChange({ target: { value: 'crew' } })
                  }
                >
                  <DynamicInput
                    type="radio"
                    name="recipientType"
                    textId="pages.contact.menu.crews"
                    checked={recipientType === 'crew'}
                    onChange={handleRecipientTypeChange}
                  />
                </div>
              </div>
            </div>

            {recipientType === 'crew' && (
              <div className="w-full">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold">
                    {t('pages.contact.menu.selectCrews')}
                  </h3>
                  <DynamicButton
                    type="button"
                    size="medium"
                    state="normal"
                    onClick={handleSelectAllCrews}
                    textId={
                      selectedCrewIds.length === allCrews.length
                        ? 'pages.contact.menu.deselectAll'
                        : 'pages.contact.menu.selectAll'
                    }
                  />
                </div>

                {isLoading ? (
                  <p className="py-4 text-center">
                    {t('pages.contact.menu.loadingCrews')}
                  </p>
                ) : (
                  <div className="grid grid-cols-1 gap-3 p-2 overflow-y-auto rounded-md md:grid-cols-2 lg:grid-cols-3 max-h-60">
                    {allCrews.map((crew) => (
                      <div
                        key={crew.id}
                        className={'p-2 rounded cursor-pointer'}
                      >
                        <DynamicInput
                          type="checkbox"
                          name={`crew-${crew.id}`}
                          checked={selectedCrewIds.includes(crew.id)}
                          onChange={() => handleCrewCheckboxChange(crew.id)}
                          textId={crew.title}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <DynamicInput
              type="text"
              name="subject"
              textId="pages.contact.menu.subject"
              value={formData.subject}
              onChange={handleChange}
              required
            />

            <DynamicInput
              type="textarea"
              name="message"
              textId="pages.contact.menu.message"
              value={formData.message}
              onChange={handleChange}
              rows={10}
              required
            />

            <div style={{ display: 'none' }}>
              <DynamicInput
                type="text"
                name="website"
                textId="Website"
                value={formData.website}
                onChange={handleChange}
              />
            </div>

            <div className="flex flex-col items-center w-full">
              {formStatus && formStatus.type !== 'loading' && (
                <div
                  className={`text-sm mb-3 ${
                    formStatus.type === 'error'
                      ? 'text-red-500'
                      : formStatus.type === 'success'
                        ? 'text-green-600'
                        : 'text-blue-500'
                  }`}
                >
                  {formStatus.message}
                </div>
              )}

              {/* Ya está utilizando DynamicButton */}
              <DynamicButton
                type="submit"
                size="medium"
                state={
                  formStatus?.type === 'loading' || isLoading
                    ? 'disabled'
                    : 'normal'
                }
                textId="pages.contact.menu.submitButton"
                disabled={formStatus?.type === 'loading' || isLoading}
              />
            </div>
          </form>
        </div>
      </div>

      <Loader
        loading={formStatus?.type === 'loading'}
        size="40px"
        color="#3A3A3A"
        text={formStatus?.message}
      />
    </div>
  )
}

export default ContactMenu
