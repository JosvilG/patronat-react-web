import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage'
import { db, storage } from '../../firebase/firebase'
import Loader from '../../components/Loader'
import DynamicInput from '../../components/Inputs'
import DynamicButton from '../../components/Buttons'
import { showPopup } from '../../services/popupService'
import { useTranslation } from 'react-i18next'
import { validateFile } from '../../utils/fileValidator'
import DynamicCard from '../../components/Cards'

function CollaboratorModifyForm() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id } = useParams()
  const viewDictionary = 'pages.collaborators.modifyCollaborators'

  const [formState, setFormState] = useState({
    name: '',
    file: null,
    currentUrl: '',
    uploading: false,
    submitting: false,
    newImageUrl: null,
  })

  useEffect(() => {
    const fetchCollaborator = async () => {
      try {
        const docRef = doc(db, 'collaborators', id)
        const docSnap = await getDoc(docRef)
        if (docSnap.exists()) {
          setFormState({
            name: docSnap.data().name,
            currentUrl: docSnap.data().url,
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
          })
          navigate('/list-collaborator')
        }
      } catch (error) {
        console.error('Error fetching collaborator:', error)
      }
    }
    fetchCollaborator()
  }, [id, navigate, t])

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0]
    const validationError = validateFile(selectedFile, t)

    if (validationError) {
      showPopup({
        title: t(`${viewDictionary}.errorPopup.title`),
        text: validationError,
        icon: 'error',
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

    const fileName = formState.file.name.replace(/[^a-zA-Z0-9.]/g, '_')
    const storageRef = ref(storage, `collaborators/${fileName}`)

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
          })
          setFormState((prev) => ({ ...prev, uploading: false }))
          reject(error)
        },
        async () => {
          const url = await getDownloadURL(uploadTask.snapshot.ref)

          if (formState.currentUrl) {
            const oldImageRef = ref(storage, formState.currentUrl)
            try {
              await deleteObject(oldImageRef)
            } catch (error) {
              console.error('Error deleting old image:', error)
            }
          }
          resolve({ url })
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
      })
      setFormState((prev) => ({ ...prev, submitting: false }))
      return
    }

    try {
      let updatedFields = { name: formState.name }
      let newUrl = formState.currentUrl

      if (formState.file) {
        const { url } = await handleUpload()
        newUrl = url
      }

      if (newUrl !== formState.currentUrl) {
        updatedFields.url = newUrl
      }

      const lastUpdateDate = new Date()

      updatedFields.lastUpdateDate = lastUpdateDate

      await updateDoc(doc(db, 'collaborators', id), updatedFields)

      showPopup({
        title: t(`${viewDictionary}.successPopup.title`),
        text: t(`${viewDictionary}.successPopup.text`),
        icon: 'success',
      })
      navigate('/list-collaborator')
    } catch (error) {
      console.error('Error updating collaborator:', error)
    } finally {
      setFormState((prev) => ({ ...prev, submitting: false }))
    }
  }

  return (
    <div className="h-auto p-6 mx-auto text-center max-w-fit ">
      <Loader loading={formState.submitting} />
      <h1 className="mb-4 t40b">{t(`${viewDictionary}.title`)}</h1>
      <form
        onSubmit={handleSubmit}
        className="flex flex-col items-center space-y-4"
      >
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-4 min-w-max">
          <div className="flex flex-col items-center">
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
          <div className="flex flex-col items-center">
            <h1 className="mb-4 t16r">{t(`${viewDictionary}.imageLabel`)}</h1>
            <DynamicInput
              name="file"
              type="document"
              onChange={handleFileChange}
              disabled={formState.uploading}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 mt-4 sm:grid-cols-2 sm:gap-4">
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

export default CollaboratorModifyForm
