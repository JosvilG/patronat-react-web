import React, { useState, useContext, useCallback } from 'react'
import log from 'loglevel'
import { useNavigate } from 'react-router-dom'
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db, storage } from '../../firebase/firebase'
import { AuthContext } from '../../contexts/AuthContext'
import Loader from '../../components/Loader'
import DynamicInput from '../../components/Inputs'
import { showPopup } from '../../services/popupService'
import { useTranslation } from 'react-i18next'
import { validateFile } from '../../utils/fileValidator'
import DynamicButton from '../../components/Buttons'
import DynamicCard from '../../components/Cards'

function CollaboratorRegisterForm() {
  const { t } = useTranslation()
  const { user } = useContext(AuthContext)
  const navigate = useNavigate()
  const viewDictionary = 'pages.collaborators.registerCollaborators'

  const [formState, setFormState] = useState({
    file: null,
    name: '',
    uploading: false,
    submitting: false,
    newImageUrl: null,
  })

  log.setLevel('info')

  const resetForm = () => {
    setFormState({
      file: null,
      name: '',
      uploading: false,
      submitting: false,
      newImageUrl: null,
    })
  }

  const handleFileChange = useCallback(
    (e) => {
      const selectedFile = e.target.files[0]

      const validationError = validateFile(selectedFile, t)
      if (validationError) {
        showPopup({
          title: t(`${viewDictionary}.errorPopup.title`),
          text: validationError,
          icon: 'error',
          confirmButtonText: t('components.popup.confirmButtonText'),
        })
        setFormState((prev) => ({ ...prev, file: null, newImageUrl: null }))
        return
      }

      setFormState((prev) => ({
        ...prev,
        file: selectedFile,
        newImageUrl: URL.createObjectURL(selectedFile),
      }))
      log.info('Archivo seleccionado:', selectedFile)
    },
    [t]
  )

  const handleUpload = async () => {
    setFormState((prev) => ({ ...prev, uploading: true }))
    const fileName =
      formState.name.trim() ||
      formState.file.name.replace(/[^a-zA-Z0-9.]/g, '_')
    const storageRef = ref(storage, `collaborators/${fileName}`)

    return new Promise((resolve, reject) => {
      const uploadTask = uploadBytesResumable(storageRef, formState.file)

      uploadTask.on(
        'state_changed',
        null,
        async (error) => {
          log.error('Error al subir el archivo:', error)
          await showPopup({
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
          log.info('Archivo subido con éxito. URL:', url)
          resolve({ url, fileName })
        }
      )
    })
  }

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault()
      setFormState((prev) => ({ ...prev, submitting: true }))

      const validationError = validateFile(formState.file, t)
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
        const { url, fileName } = await handleUpload()
        await addDoc(collection(db, 'collaborators'), {
          name: fileName,
          url,
          createdAt: serverTimestamp(),
          userId: user.uid,
        })

        log.info('Datos guardados correctamente en Firestore.')
        await showPopup({
          title: t(`${viewDictionary}.successPopup.title`),
          text: t(`${viewDictionary}.successPopup.text`),
          icon: 'success',
          confirmButtonText: t('components.popup.confirmButtonText'),
        })

        navigate('/dashboard')
        resetForm()
      } catch (error) {
        log.error('Error en el proceso de subida:', error)
      } finally {
        setFormState((prev) => ({ ...prev, submitting: false }))
      }
    },
    [formState.file, formState.name, user, navigate, t]
  )

  return (
    <div className="h-auto max-w-lg p-6 mx-auto">
      <Loader loading={formState.submitting} />
      <h1 className="mb-4 text-2xl font-bold">
        {t('pages.collaborators.title')}
      </h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <h1 className="mb-4 t16r">{t(`${viewDictionary}.nameLabel`)}</h1>
        <DynamicInput
          name="name"
          textId={`${viewDictionary}.nameLabel`}
          type="text"
          value={formState.name}
          onChange={(e) =>
            setFormState((prev) => ({ ...prev, name: e.target.value }))
          }
          disabled={formState.uploading}
        />
        <DynamicInput
          name="file"
          textId={`${viewDictionary}.fileLabel`}
          type="document"
          onChange={handleFileChange}
          disabled={formState.uploading}
          required
          accept="image/*"
        />
        {formState.newImageUrl && (
          <div className="mt-4">
            <DynamicCard
              type="gallery"
              title={t(`${viewDictionary}.previewImageTitle`)}
              imageUrl={formState.newImageUrl}
            />
          </div>
        )}
        <div>
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
        </div>
      </form>
    </div>
  )
}

export default CollaboratorRegisterForm
