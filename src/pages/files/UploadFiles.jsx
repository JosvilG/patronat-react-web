import React, { useState, useContext } from 'react'
import log from 'loglevel'
import { useNavigate } from 'react-router-dom'
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db, storage } from '../../firebase/firebase'
import { AuthContext } from '../../contexts/AuthContext'
import DynamicInput from '../../components/Inputs'
import DynamicButton from '../../components/Buttons'
import Loader from '../../components/Loader'
import { useTranslation } from 'react-i18next'
import DynamicCard from '../../components/Cards'
import { validateFile, processFile } from '../../utils/fileValidator'
import { showPopup } from '../../services/popupService'

/**
 * UploadFileForm Component
 *
 * Provides a form interface for uploading files to Firebase Storage
 * with metadata stored in Firestore. Supports image optimization,
 * file validation, and progress tracking.
 *
 * Features:
 * - File validation and optimization
 * - Image preview generation
 * - Progress tracking during upload
 * - Metadata management (name, description, tags, etc.)
 * - Visibility control (public/private)
 */

function UploadFileForm() {
  // Auth context to get current user information
  const { user } = useContext(AuthContext)

  // File management states
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)

  // Form field states
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [tags, setTags] = useState('')
  const [visibility, setVisibility] = useState('private')

  // Process status states
  const [uploading, setUploading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [message, setMessage] = useState('')
  const [progress, setProgress] = useState(0)

  // Navigation and translation hooks
  const navigate = useNavigate()
  const { t } = useTranslation()

  // Translation dictionary paths
  const viewDictionary = 'pages.files.uploadFiles'
  const popupDictionary = 'components.popup'

  // Set logging level for production
  log.setLevel('info')

  /**
   * Handles file selection and processing
   *
   * 1. Validates the file format and size
   * 2. Processes/optimizes the file if needed
   * 3. Generates a preview for images
   *
   * @param {Event} e - The file input change event
   */
  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0]
    if (!selectedFile) {
      setFile(null)
      setPreview(null)
      return
    }

    // Validate file format and size
    const errorMessage = validateFile(selectedFile, t)
    if (errorMessage) {
      setMessage(errorMessage)
      setFile(null)
      setPreview(null)
      return
    }

    try {
      setProcessing(true)
      setMessage(t(`${viewDictionary}.optimizingText`))

      // Process and optimize the file
      const processedFile = await processFile(selectedFile)

      if (selectedFile.type !== processedFile.type) {
        setMessage(t(`${viewDictionary}.optimizationSuccessText`))
      } else {
        setMessage('')
      }

      setFile(processedFile)

      // Generate preview for the file
      const previewUrl = URL.createObjectURL(processedFile)
      setPreview(previewUrl)
    } catch (error) {
      setMessage(t(`${viewDictionary}.optimizationErrorText`))
      setFile(null)
      setPreview(null)
    } finally {
      setProcessing(false)
    }
  }

  /**
   * Handles form submission and file upload process
   *
   * 1. Creates a reference to Firebase Storage
   * 2. Uploads the file with progress tracking
   * 3. Gets the download URL
   * 4. Saves metadata to Firestore
   * 5. Shows success/error notifications
   *
   * @param {Event} e - Form submission event
   */
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!file) {
      setMessage(t(`${viewDictionary}.fileRequired`))
      return
    }

    setUploading(true)
    setMessage('')

    const fileName = name || file.name

    // Determine storage folder based on file type
    const isImage = file.type.startsWith('image/')
    const storageFolder = isImage ? 'images' : 'files'

    const storageRef = ref(storage, `${storageFolder}/${fileName}`)

    try {
      // Create upload task with progress tracking
      const uploadTask = uploadBytesResumable(storageRef, file)

      uploadTask.on(
        'state_changed',
        // Progress handler
        (snapshot) => {
          const progressPercent =
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100
          setProgress(progressPercent)
        },
        // Error handler
        (error) => {
          showPopup({
            title: t(`${popupDictionary}.failTitle`),
            text: t(`${viewDictionary}.errorText`),
            icon: 'error',
            confirmButtonText: t(`${popupDictionary}.closeButtonText`),
          })

          setUploading(false)
        },
        // Completion handler
        async () => {
          // Get the download URL
          const url = await getDownloadURL(uploadTask.snapshot.ref)

          const userId = user.uid

          // Save metadata to Firestore
          await addDoc(collection(db, 'uploads'), {
            name: fileName,
            description,
            category,
            tags: tags
              .split(',')
              .map((tag) => tag.trim())
              .filter((tag) => tag),
            visibility,
            url,
            size: file.size,
            type: file.type,
            isImage: isImage,
            fullPath: `${storageFolder}/${fileName}`,
            userId,
            createdAt: serverTimestamp(),
          })

          // Show success notification
          await showPopup({
            title: t(`${popupDictionary}.successTitle`),
            text: t(`${viewDictionary}.popups.successText`),
            icon: 'success',
            confirmButtonText: t(`${popupDictionary}.confirmButtonText`),
            onConfirm: () => {
              navigate('/dashboard')
            },
          })

          // Reset form
          setName('')
          setDescription('')
          setCategory('')
          setTags('')
          setFile(null)
          setPreview(null)
          setVisibility('private')

          // Clean up preview URL
          if (preview) {
            URL.revokeObjectURL(preview)
          }
          setUploading(false)
        }
      )
    } catch (error) {
      await showPopup({
        title: t(`${popupDictionary}.failTitle`),
        text: t(`${viewDictionary}.errorText`),
        icon: 'error',
        confirmButtonText: t(`${popupDictionary}.closeButtonText`),
      })

      setUploading(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center h-auto max-w-xl pb-6 mx-auto">
      {/* Loading indicator for upload process */}
      <Loader loading={uploading} />
      <h1 className="mb-4 sm:t64b t40b">{t(`${viewDictionary}.title`)}</h1>
      <form
        onSubmit={handleSubmit}
        className="flex flex-col items-center justify-center space-y-4"
      >
        {/* File input field */}
        <DynamicInput
          name="file"
          textId={t(`${viewDictionary}.fileLabel`)}
          type="document"
          onChange={handleFileChange}
          disabled={uploading || processing}
          required
        />

        {/* Image preview */}
        {preview && (
          <div className="mt-4">
            <DynamicCard type="gallery" imageUrl={preview} />
          </div>
        )}

        {/* Processing indicator */}
        {processing && (
          <div className="flex items-center justify-center mt-4">
            <div className="w-6 h-6 border-2 border-t-2 border-blue-500 rounded-full border-t-transparent animate-spin"></div>
            <span className="ml-2">
              {' '}
              {t(`${viewDictionary}.optimizingText`)}
            </span>
          </div>
        )}

        {/* Status message */}
        {message && !processing && (
          <div
            className={`p-2 mt-4 text-center text-white ${
              message.includes('optimizado')
                ? 'bg-blue-500'
                : message.includes('Error')
                  ? 'bg-red-500'
                  : 'bg-green-500'
            } rounded-md`}
          >
            {message}
          </div>
        )}

        {/* File metadata form fields */}
        <DynamicInput
          name="name"
          textId={`${viewDictionary}.nameLabel`}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={uploading || processing}
        />
        <DynamicInput
          name="description"
          textId={`${viewDictionary}.descriptionLabel`}
          type="textarea"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={uploading || processing}
        />
        <DynamicInput
          name="category"
          textId={`${viewDictionary}.categoryLabel`}
          type="text"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          disabled={uploading || processing}
        />
        <DynamicInput
          name="tags"
          textId={`${viewDictionary}.tagsLabel`}
          type="text"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          disabled={uploading || processing}
        />
        <p className="t12l"> {t(`${viewDictionary}.tagsDescription`)}</p>
        <DynamicInput
          name="visibility"
          textId={`${viewDictionary}.visibilityLabel`}
          type="select"
          options={[
            {
              value: 'private',
              label: t(`${viewDictionary}.visibilityPrivate`),
            },
            { value: 'public', label: t(`${viewDictionary}.visibilityPublic`) },
          ]}
          value={visibility}
          onChange={(e) => setVisibility(e.target.value)}
          disabled={uploading || processing}
          required={true}
        />
        <p className="t12l"> {t(`${viewDictionary}.visibliityDescription`)}</p>

        {/* Upload progress indicator */}
        {uploading && (
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full">
              <div
                className="h-2 bg-blue-600 rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="mt-2 text-sm text-center">
              {Math.round(progress)}%
            </div>
          </div>
        )}

        {/* Submit button */}
        <div>
          <DynamicButton
            type="submit"
            size="medium"
            state={uploading || processing ? 'disabled' : 'normal'}
            textId={
              uploading
                ? `${viewDictionary}.uploadingText`
                : `${viewDictionary}.uploadButton`
            }
            disabled={uploading || processing}
          />
        </div>
      </form>
    </div>
  )
}

export default UploadFileForm
