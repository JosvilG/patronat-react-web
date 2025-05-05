import React, { useState, useEffect, useContext } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage'
import { db, storage } from '../../firebase/firebase'
import { AuthContext } from '../../contexts/AuthContext'
import Loader from '../../components/Loader'
import DynamicInput from '../../components/Inputs'
import DynamicButton from '../../components/Buttons'
import { showPopup } from '../../services/popupService'
import { useTranslation } from 'react-i18next'
import { validateFile } from '../../utils/fileValidator'
import DynamicCard from '../../components/Cards'

function ParticipantModifyForm() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id } = useParams()
  const { user } = useContext(AuthContext)
  const viewDictionary = 'pages.participants.modifyParticipants'

  const [formState, setFormState] = useState({
    name: '',
    description: '',
    instagram: '',
    facebook: '',
    twitter: '',
    file: null,
    currentUrl: '',
    uploading: false,
    submitting: false,
    newImageUrl: null,
  })

  useEffect(() => {
    const fetchParticipant = async () => {
      try {
        const docRef = doc(db, 'participants', id)
        const docSnap = await getDoc(docRef)
        if (docSnap.exists()) {
          setFormState({
            name: docSnap.data().name || '',
            description: docSnap.data().description || '',
            instagram: docSnap.data().instagram || '',
            facebook: docSnap.data().facebook || '',
            twitter: docSnap.data().twitter || '',
            currentUrl: docSnap.data().url || '',
            file: null,
            uploading: false,
            submitting: false,
            newImageUrl: null,
          })
        } else {
          showPopup({
            title: t(`${viewDictionary}.notFoundTitle`),
            text: t(`${viewDictionary}.notFoundText`),
            icon: 'error',
            confirmButtonText: t('components.popup.confirmButtonText'),
          })
          navigate('/dashboard')
        }
      } catch (error) {
        console.error('Error fetching participant:', error)
      }
    }
    fetchParticipant()
  }, [id, navigate, t])

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0]
    const validationError = validateFile(selectedFile, t)

    if (validationError) {
      showPopup({
        title: t(`${viewDictionary}.errorPopup.title`),
        text: validationError,
        icon: 'error',
        confirmButtonText: t('components.popup.confirmButtonText'),
      })
      return
    }

    setFormState((prev) => ({
      ...prev,
      file: selectedFile,
      newImageUrl: URL.createObjectURL(selectedFile),
    }))
  }

  const handleUpload = async () => {
    if (!formState.file) return { url: formState.currentUrl }

    setFormState((prev) => ({ ...prev, uploading: true }))

    const fileName =
      formState.name.trim() ||
      formState.file.name.replace(/[^a-zA-Z0-9.]/g, '_')
    const storageRef = ref(storage, `participants/${fileName}`)

    return new Promise((resolve, reject) => {
      const uploadTask = uploadBytesResumable(storageRef, formState.file)

      uploadTask.on(
        'state_changed',
        null,
        (error) => {
          console.error('Upload error:', error)
          showPopup({
            title: t(`${viewDictionary}.errorPopup.title`),
            text: t(`${viewDictionary}.errorPopup.text`),
            icon: 'error',
            confirmButtonText: t('components.popup.confirmButtonText'),
          })
          setFormState((prev) => ({ ...prev, uploading: false }))
          reject(error)
        },
        async () => {
          const url = await getDownloadURL(uploadTask.snapshot.ref)

          if (formState.currentUrl) {
            try {
              const oldImageRef = ref(storage, formState.currentUrl)
              await deleteObject(oldImageRef)
            } catch (error) {
              console.error('Error deleting old image:', error)
            }
          }
          resolve({ url, fileName })
        }
      )
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormState((prev) => ({ ...prev, submitting: true }))

    const validationError = formState.file
      ? validateFile(formState.file, t)
      : null
    if (validationError) {
      await showPopup({
        title: t(`${viewDictionary}.errorPopup.title`),
        text: validationError,
        icon: 'error',
        confirmButtonText: t('components.popup.confirmButtonText'),
      })
      setFormState((prev) => ({ ...prev, submitting: false }))
      return
    }

    if (!user) {
      await showPopup({
        title: t(`${viewDictionary}.errorPopup.title`),
        text: t(`${viewDictionary}.authError`),
        icon: 'error',
        confirmButtonText: t('components.popup.confirmButtonText'),
      })
      setFormState((prev) => ({ ...prev, submitting: false }))
      return
    }

    try {
      let updatedFields = {
        name: formState.name,
        description: formState.description,
        instagram: formState.instagram,
        facebook: formState.facebook,
        twitter: formState.twitter,
      }

      let newUrl = formState.currentUrl

      if (formState.file) {
        const { url } = await handleUpload()
        newUrl = url
      }

      if (newUrl !== formState.currentUrl) {
        updatedFields.url = newUrl
      }

      updatedFields.lastUpdateDate = serverTimestamp()
      updatedFields.userId = user.uid

      await updateDoc(doc(db, 'participants', id), updatedFields)

      showPopup({
        title: t(`${viewDictionary}.successPopup.title`),
        text: t(`${viewDictionary}.successPopup.text`),
        icon: 'success',
        confirmButtonText: t('components.popup.confirmButtonText'),
      })
      navigate('/dashboard')
    } catch (error) {
      console.error('Error updating participant:', error)
    } finally {
      setFormState((prev) => ({ ...prev, submitting: false }))
    }
  }

  return (
    <div className="h-auto max-w-lg p-6 mx-auto text-center">
      <Loader loading={formState.submitting} />
      <h1 className="mb-4 t40b">{t(`${viewDictionary}.title`)}</h1>
      <form
        onSubmit={handleSubmit}
        className="flex flex-col items-center space-y-4"
      >
        <div className="flex flex-col items-center w-full">
          <h1 className="mb-4 t16r">{t(`${viewDictionary}.nameLabel`)}</h1>
          <DynamicInput
            name="name"
            type="text"
            value={formState.name}
            onChange={(e) =>
              setFormState((prev) => ({ ...prev, name: e.target.value }))
            }
            disabled={formState.uploading}
          />
        </div>

        <div className="flex flex-col items-center w-full">
          <DynamicInput
            name="description"
            type="textarea"
            textId={t(`${viewDictionary}.descriptionLabel`)}
            value={formState.description}
            onChange={(e) =>
              setFormState((prev) => ({ ...prev, description: e.target.value }))
            }
            disabled={formState.uploading}
          />
        </div>

        <h2 className="w-full mt-6 mb-2 text-xl font-semibold text-left">
          {t(`${viewDictionary}.socialMediaTitle`)}
        </h2>

        <div className="flex flex-col items-center w-full">
          <h1 className="mb-4 t16r">{t(`${viewDictionary}.instagramLabel`)}</h1>
          <DynamicInput
            name="instagram"
            type="text"
            textId={t(`${viewDictionary}.instagramLabel`)}
            value={formState.instagram}
            onChange={(e) =>
              setFormState((prev) => ({ ...prev, instagram: e.target.value }))
            }
            disabled={formState.uploading}
          />
        </div>

        <div className="flex flex-col items-center w-full">
          <h1 className="mb-4 t16r">{t(`${viewDictionary}.facebookLabel`)}</h1>
          <DynamicInput
            name="facebook"
            type="text"
            textId={t(`${viewDictionary}.facebookLabel`)}
            value={formState.facebook}
            onChange={(e) =>
              setFormState((prev) => ({ ...prev, facebook: e.target.value }))
            }
            disabled={formState.uploading}
          />
        </div>

        <div className="flex flex-col items-center w-full">
          <h1 className="mb-4 t16r">{t(`${viewDictionary}.twitterLabel`)}</h1>
          <DynamicInput
            name="twitter"
            type="text"
            textId={t(`${viewDictionary}.twitterLabel`)}
            value={formState.twitter}
            onChange={(e) =>
              setFormState((prev) => ({ ...prev, twitter: e.target.value }))
            }
            disabled={formState.uploading}
          />
        </div>

        <div className="flex flex-col items-center w-full">
          <h1 className="mb-4 t16r">{t(`${viewDictionary}.imageLabel`)}</h1>
          <DynamicInput
            name="file"
            type="document"
            onChange={handleFileChange}
            disabled={formState.uploading}
            accept="image/*"
          />
        </div>

        <div className="grid w-full grid-cols-1 gap-6 mt-4 sm:grid-cols-2 sm:gap-4">
          {formState.currentUrl && (
            <div>
              <h1 className="mb-4 t16r">
                {t(`${viewDictionary}.oldImageTitle`)}
              </h1>
              <DynamicCard
                type="gallery"
                title="Imagen actual"
                imageUrl={formState.currentUrl}
              />
            </div>
          )}

          {formState.newImageUrl && (
            <div>
              <h1 className="mb-4 t16r">
                {t(`${viewDictionary}.newImageTitle`)}
              </h1>
              <DynamicCard
                type="gallery"
                title="Nueva imagen"
                imageUrl={formState.newImageUrl}
              />
            </div>
          )}
        </div>

        <DynamicButton
          type="submit"
          size="large"
          state={formState.uploading ? 'disabled' : 'normal'}
          textId={
            formState.uploading
              ? `${viewDictionary}.uploadingText`
              : `${viewDictionary}.uploadButton`
          }
          disabled={formState.uploading}
        />
      </form>
    </div>
  )
}

export default ParticipantModifyForm
