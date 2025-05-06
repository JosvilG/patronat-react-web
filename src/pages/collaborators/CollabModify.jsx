import React, { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
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
  const location = useLocation()
  const collaboratorId = location.state?.collaboratorId
  const viewDictionary = 'pages.collaborators.modifyCollaborators'

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    file: null,
    currentUrl: '',
    uploading: false,
    submitting: false,
    newImageUrl: null,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchCollaborator = async () => {
      if (!collaboratorId) {
        console.error('No se proporcionó un ID de colaborador válido')
        setError('No se pudo cargar la información del colaborador.')
        setLoading(false)
        return
      }

      try {
        const docRef = doc(db, 'collaborators', collaboratorId)
        const docSnap = await getDoc(docRef)

        if (docSnap.exists()) {
          const collabData = docSnap.data()
          setFormData({
            id: docSnap.id,
            name: collabData.name || '',
            email: collabData.email || '',
            currentUrl: collabData.url || '',
            file: null,
            uploading: false,
            submitting: false,
            newImageUrl: null,
          })
        } else {
          setError('No se encontró el colaborador especificado.')
        }
      } catch (error) {
        console.error('Error al cargar los datos del colaborador:', error)
        setError('Ocurrió un error al cargar los datos del colaborador.')
      } finally {
        setLoading(false)
      }
    }

    fetchCollaborator()
  }, [collaboratorId])

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

    setFormData((prev) => ({
      ...prev,
      file: selectedFile,
      newImageUrl: URL.createObjectURL(selectedFile),
    }))
  }

  const handleUpload = async () => {
    if (!formData.file) return { url: formData.currentUrl }

    setFormData((prev) => ({ ...prev, uploading: true }))

    const fileName = formData.file.name.replace(/[^a-zA-Z0-9.]/g, '_')
    const storageRef = ref(storage, `collaborators/${fileName}`)

    return new Promise((resolve, reject) => {
      const uploadTask = uploadBytesResumable(storageRef, formData.file)

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
          setFormData((prev) => ({ ...prev, uploading: false }))
          reject(error)
        },
        async () => {
          const url = await getDownloadURL(uploadTask.snapshot.ref)

          if (formData.currentUrl) {
            const oldImageRef = ref(storage, formData.currentUrl)
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
    setFormData((prev) => ({ ...prev, submitting: true }))

    const validationError = formData.file
      ? validateFile(formData.file, t)
      : null
    if (validationError) {
      await showPopup({
        title: t(`${viewDictionary}.errorPopup.title`),
        text: validationError,
        icon: 'error',
      })
      setFormData((prev) => ({ ...prev, submitting: false }))
      return
    }

    try {
      let updatedFields = { name: formData.name, email: formData.email }
      let newUrl = formData.currentUrl

      if (formData.file) {
        const { url } = await handleUpload()
        newUrl = url
      }

      if (newUrl !== formData.currentUrl) {
        updatedFields.url = newUrl
      }

      const lastUpdateDate = new Date()

      updatedFields.lastUpdateDate = lastUpdateDate

      await updateDoc(doc(db, 'collaborators', collaboratorId), updatedFields)

      showPopup({
        title: t(`${viewDictionary}.successPopup.title`),
        text: t(`${viewDictionary}.successPopup.text`),
        icon: 'success',
      })
      navigate('/list-collaborator')
    } catch (error) {
      console.error('Error updating collaborator:', error)
    } finally {
      setFormData((prev) => ({ ...prev, submitting: false }))
    }
  }

  if (loading) {
    return <Loader loading={loading} />
  }

  if (error) {
    return <div>{error}</div>
  }

  return (
    <div className="h-auto p-6 mx-auto text-center max-w-fit ">
      <Loader loading={formData.submitting} />
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
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              disabled={formData.uploading}
            />
          </div>
          <div className="flex flex-col items-center">
            <h1 className="mb-4 t16r">{t(`${viewDictionary}.emailLabel`)}</h1>
            <DynamicInput
              name="email"
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, email: e.target.value }))
              }
              disabled={formData.uploading}
            />
          </div>
          <div className="flex flex-col items-center">
            <h1 className="mb-4 t16r">{t(`${viewDictionary}.imageLabel`)}</h1>
            <DynamicInput
              name="file"
              type="document"
              onChange={handleFileChange}
              disabled={formData.uploading}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 mt-4 sm:grid-cols-2 sm:gap-4">
          {formData.currentUrl && (
            <div>
              <h1 className="mb-4 t16r">
                {t(`${viewDictionary}.oldImageTitle`)}
              </h1>
              <DynamicCard
                type="gallery"
                title="Imagen actual"
                imageUrl={formData.currentUrl}
              />
            </div>
          )}

          {formData.newImageUrl && (
            <div>
              <h1 className="mb-4 t16r">
                {t(`${viewDictionary}.newImageTitle`)}
              </h1>
              <DynamicCard
                type="gallery"
                title="Nueva imagen"
                imageUrl={formData.newImageUrl}
              />
            </div>
          )}
        </div>

        <DynamicButton
          type="submit"
          size="large"
          state={formData.uploading ? 'disabled' : 'normal'}
          textId={
            formData.uploading
              ? `${viewDictionary}.uploadingText`
              : `${viewDictionary}.uploadButton`
          }
          disabled={formData.uploading}
        />
      </form>
    </div>
  )
}

export default CollaboratorModifyForm
