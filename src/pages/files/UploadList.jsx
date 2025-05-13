/**
 * Component for displaying and managing uploaded files from Firebase storage.
 * Provides functionality to view, search, download and delete files from various storage folders.
 */
import React, { useEffect, useState } from 'react'
import {
  getStorage,
  ref,
  listAll,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage'
import { useTranslation } from 'react-i18next'
import DynamicInput from '../../components/Inputs'
import DynamicButton from '../../components/Buttons'
import Loader from '../../components/Loader'
import PaginationControl from '../../components/Pagination'
import useSearchFilter from '../../hooks/useSearchFilter'

function UploadList() {
  const { t } = useTranslation()
  // State for storing all uploads
  const [uploads, setUploads] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20
  const viewDictionary = 'pages.files.listUploads'

  // Use the useSearchFilter hook for search functionality
  const {
    searchQuery,
    filteredItems: filteredUploads,
    handleSearchChange,
    updateItems,
  } = useSearchFilter([], {
    searchFields: ['name', 'folder'],
    debounceTime: 300,
  })

  // Calculate total pages for pagination
  const totalPages = Math.ceil(filteredUploads.length / itemsPerPage)

  useEffect(() => {
    /**
     * Fetches all files from specified folders in Firebase storage.
     * Aggregates files from multiple folders and stores them in state.
     */
    const fetchUploads = async () => {
      try {
        const storage = getStorage()
        const folders = [
          'authorizations',
          'collaborators',
          'participants',
          'uploads',
          'images',
        ]
        const allFiles = []

        // Iterate through each folder and retrieve files
        for (const folder of folders) {
          const folderRef = ref(storage, `${folder}/`)
          const result = await listAll(folderRef)

          // Process each file in the folder
          for (const itemRef of result.items) {
            const url = await getDownloadURL(itemRef)
            allFiles.push({
              name: itemRef.name,
              fullPath: itemRef.fullPath,
              folder,
              url,
            })
          }
        }

        // Update state with retrieved files
        setUploads(allFiles)
        // Update items in the search filter hook
        updateItems(allFiles)
      } catch (error) {
        // Handle errors silently in production
      } finally {
        setLoading(false)
      }
    }

    fetchUploads()
  }, [])

  /**
   * Handles pagination page changes.
   * @param {Event} event - The page change event
   * @param {number} page - The new page number
   */
  const handlePageChange = (event, page) => {
    setCurrentPage(page)
  }

  /**
   * Deletes a file from Firebase storage and updates the UI.
   * @param {string} filePath - The full path of the file to delete
   */
  const handleDelete = async (filePath) => {
    try {
      const storage = getStorage()
      const fileRef = ref(storage, filePath)

      await deleteObject(fileRef)

      // Update uploads state by removing the deleted file
      const updatedUploads = uploads.filter(
        (upload) => upload.fullPath !== filePath
      )
      setUploads(updatedUploads)
      // Update items in the search filter hook
      updateItems(updatedUploads)
    } catch (error) {
      // Handle errors silently in production
    }
  }

  // Calculate the current page's items for pagination
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentUploads = filteredUploads.slice(
    indexOfFirstItem,
    indexOfLastItem
  )

  // Show loader while data is being fetched
  if (loading)
    return (
      <Loader
        loading={true}
        size="50px"
        color="rgb(21, 100, 46)"
        text={t(`${viewDictionary}.loadingText`)}
      />
    )

  return (
    <div className="max-w-full pb-6 mx-auto min-h-dvh h-fit md:max-w-fit">
      <h1 className="mb-4 text-center t64b">{t(`${viewDictionary}.title`)}</h1>
      {/* Search input area */}
      <div className="grid items-center justify-end grid-cols-1 gap-4 mb-4 md:justify-items-end sm:grid-cols-2 sm:justify-between">
        <DynamicInput
          name="search"
          type="text"
          placeholder={t(`${viewDictionary}.searchPlaceholder`)}
          value={searchQuery}
          onChange={handleSearchChange}
        />
      </div>
      {/* File list */}
      <ul className="space-y-4">
        {currentUploads.map((upload, index) => (
          <li
            key={index}
            className="flex items-center justify-between p-4 space-x-4 bg-gray-100 rounded-lg shadow"
          >
            <div>
              <span className="block text-lg font-semibold">{upload.name}</span>
              <span className="block text-sm text-gray-500">
                {upload.fullPath}
              </span>
            </div>
            <div className="flex space-x-2">
              <DynamicButton
                size="x-small"
                type="save"
                onClick={() => window.open(upload.url, '_blank')}
              >
                {t('Descargar')}
              </DynamicButton>
              <DynamicButton
                size="x-small"
                type="delete"
                onClick={() => handleDelete(upload.fullPath)}
              />
            </div>
          </li>
        ))}
      </ul>

      {/* Pagination control */}
      <PaginationControl
        page={currentPage}
        count={totalPages}
        totalItems={filteredUploads.length}
        itemsPerPage={itemsPerPage}
        onChange={handlePageChange}
        itemName="archivos"
        size="medium"
        className="my-6"
      />
    </div>
  )
}

export default UploadList
