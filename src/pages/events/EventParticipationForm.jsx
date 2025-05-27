import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import {
  collection,
  getDocs,
  doc,
  getDoc,
  addDoc,
  Timestamp,
} from 'firebase/firestore'
import { useTranslation } from 'react-i18next'
import { db } from '../../firebase/firebase'
import DynamicInput from '../../components/Inputs'
import DynamicButton from '../../components/Buttons'
import Loader from '../../components/Loader'
import log from 'loglevel'
import useSlug from '../../hooks/useSlug'
import { showPopup } from '../../services/popupService'

function EventParticipationForm() {
  const { t } = useTranslation()
  const { eventSlug } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { generateSlug } = useSlug()
  const eventIdFromState = location.state?.eventId
  const [eventId, setEventId] = useState(eventIdFromState || null)
  const [eventData, setEventData] = useState(null)
  const [formFields, setFormFields] = useState([])
  const [formValues, setFormValues] = useState({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const viewDictionary = 'pages.events.eventParticipationForm'

  useEffect(() => {
    const fetchEventAndForm = async () => {
      try {
        let currentEventId = eventId

        if (!currentEventId) {
          const eventsSnapshot = await getDocs(collection(db, 'events'))
          const eventDoc = eventsSnapshot.docs.find(
            (doc) => generateSlug(doc.data().title) === eventSlug
          )

          if (!eventDoc) {
            setError(t(`${viewDictionary}.notFoundError`))
            setLoading(false)
            return
          }

          currentEventId = eventDoc.id
          setEventId(currentEventId)
        }

        const eventRef = doc(db, 'events', currentEventId)
        const eventDoc = await getDoc(eventRef)

        if (!eventDoc.exists()) {
          setError(t(`${viewDictionary}.notFoundError`))
          setLoading(false)
          return
        }

        const event = eventDoc.data()
        setEventData(event)

        if (!event.needForm) {
          setError(t(`${viewDictionary}.noFormError`))
          setLoading(false)
          return
        }

        const formCampsRef = collection(
          db,
          'events',
          currentEventId,
          'formCamps'
        )
        const formCampsSnapshot = await getDocs(formCampsRef)

        if (formCampsSnapshot.empty) {
          setError(t(`${viewDictionary}.noFormFieldsError`))
          setLoading(false)
          return
        }
        const fieldsArray = formCampsSnapshot.docs
          .map((doc) => {
            const fieldData = doc.data()

            if (
              fieldData.fieldId === 'telefono1' ||
              fieldData.fieldId === 'telefono2' ||
              fieldData.type === 'tel'
            ) {
              return {
                id: doc.id,
                ...fieldData,
                type: 'phone',
              }
            }

            return {
              id: doc.id,
              ...fieldData,
            }
          })
          .sort((a, b) => a.order - b.order)

        setFormFields(fieldsArray)

        const initialValues = {}
        fieldsArray.forEach((field) => {
          initialValues[field.fieldId] = ''
        })
        setFormValues(initialValues)

        setLoading(false)
      } catch (error) {
        log.error('Error al cargar el formulario:', error)
        setError(t(`${viewDictionary}.loadingError`))
        setLoading(false)
      }
    }

    fetchEventAndForm()
  }, [eventSlug, eventId, generateSlug, t])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormValues((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const requiredFields = formFields.filter((field) => field.required)
      const missingFields = requiredFields.filter(
        (field) => !formValues[field.fieldId]
      )

      if (missingFields.length > 0) {
        await showPopup({
          title: t(`${viewDictionary}.incompleteFieldsTitle`),
          text: `<div>${t(`${viewDictionary}.incompleteFieldsText`)}<br/>
          ${missingFields.map((field) => `- ${field.label}`).join('<br/>')}</div>`,
          icon: 'warning',
          confirmButtonText: t(`${viewDictionary}.confirmButtonText`),
        })
        setSubmitting(false)
        return
      }

      const inscriptionData = {
        eventId,
        eventTitle: eventData.title,
        eventSlug,
        responses: { ...formValues },
        createdAt: Timestamp.now(),
        status: 'pendiente',
        submitBy: null,
      }

      await addDoc(collection(db, 'inscriptions'), inscriptionData)

      await showPopup({
        title: t(`${viewDictionary}.successTitle`),
        text: t(`${viewDictionary}.successText`),
        icon: 'success',
        confirmButtonText: t(`${viewDictionary}.confirmButtonText`),
        onConfirm: () => {
          navigate(`/event/${eventSlug}`)
        },
      })
    } catch (error) {
      log.error('Error al enviar el formulario:', error)

      await showPopup({
        title: t(`${viewDictionary}.errorTitle`),
        text: t(`${viewDictionary}.errorText`),
        icon: 'error',
        confirmButtonText: t(`${viewDictionary}.closeButtonText`),
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (error) {
    return (
      <div className="container px-4 py-8 mx-auto text-center">
        <h2 className="text-2xl font-bold text-red-600">{error}</h2>
        <div className="mt-4">
          <DynamicButton
            type="button"
            onClick={() => navigate(-1)}
            size="small"
            state="normal"
            textId="components.buttons.back"
          />
        </div>
      </div>
    )
  }

  return (
    <div className="container px-4 pb-6 mx-auto">
      <Loader loading={submitting} />

      <form onSubmit={handleSubmit} className="mx-auto space-y-6">
        <h1 className="mb-6 text-center sm:t64b t24b">
          {t(`${viewDictionary}.title`, { eventTitle: eventData?.title })}
        </h1>
        <div className="p-6 mb-6 rounded-lg">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {formFields.map((field) => (
              <div
                key={field.id}
                className={field.type === 'textarea' ? 'md:col-span-2' : ''}
              >
                <DynamicInput
                  name={field.fieldId}
                  textId={field.label}
                  type={field.type}
                  value={formValues[field.fieldId]}
                  onChange={handleChange}
                  required={field.required}
                  placeholder={t(`${viewDictionary}.fieldPlaceholder`, {
                    fieldName: field.label.toLowerCase(),
                  })}
                />
                {field.description && (
                  <p className="mt-1 text-sm text-gray-500">
                    {field.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end mt-8 space-x-4">
          <DynamicButton
            type="button"
            onClick={() => navigate(-1)}
            size="small"
            state="normal"
            textId="components.buttons.cancel"
          />

          <DynamicButton
            type="submit"
            size="small"
            state={submitting ? 'disabled' : 'normal'}
            textId={
              submitting
                ? `${viewDictionary}.submittingText`
                : `${viewDictionary}.submitButton`
            }
            disabled={submitting}
          />
        </div>
      </form>
    </div>
  )
}

export default EventParticipationForm
