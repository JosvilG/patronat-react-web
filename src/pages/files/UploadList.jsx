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
import { showPopup } from '../../services/popupService' // Importamos showPopup

function UploadList() {
  const { t } = useTranslation()
  const [uploads, setUploads] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20
  const viewDictionary = 'pages.files.listUploads'
  const {
    searchQuery,
    filteredItems: filteredUploads,
    handleSearchChange,
    updateItems,
  } = useSearchFilter([], {
    searchFields: ['name', 'folder'],
    debounceTime: 300,
  })

  const totalPages = Math.ceil(filteredUploads.length / itemsPerPage)

  useEffect(() => {
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

        for (const folder of folders) {
          const folderRef = ref(storage, `${folder}/`)
          const result = await listAll(folderRef)

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

        setUploads(allFiles)
        updateItems(allFiles)
      } catch (error) {
        return
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
   * Muestra un diálogo de confirmación y luego borra el archivo si se confirma.
   * @param {string} filePath - La ruta completa del archivo a eliminar
   */
  const handleDelete = (filePath) => {
    const fileName = filePath.split('/').pop()

    showPopup({
      title: t(`${viewDictionary}.popups.delete.title`),
      text: t(`${viewDictionary}.popups.delete.text`, { fileName }),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: t(`${viewDictionary}.popups.delete.confirmButton`),
      cancelButtonText: t(`${viewDictionary}.popups.delete.cancelButton`),
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      onConfirm: async () => {
        try {
          const storage = getStorage()
          const fileRef = ref(storage, filePath)

          await deleteObject(fileRef)

          const updatedUploads = uploads.filter(
            (upload) => upload.fullPath !== filePath
          )
          setUploads(updatedUploads)
          updateItems(updatedUploads)

          showPopup({
            title: t(`${viewDictionary}.popups.success.title`),
            text: t(`${viewDictionary}.popups.success.text`),
            icon: 'success',
          })
        } catch (error) {
          showPopup({
            title: t(`${viewDictionary}.popups.error.title`),
            text: t(`${viewDictionary}.popups.error.text`),
            icon: 'error',
          })
        }
      },
    })
  }

  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentUploads = filteredUploads.slice(
    indexOfFirstItem,
    indexOfLastItem
  )

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
    <div className="flex flex-col items-center max-w-full pb-6 mx-auto min-h-dvh h-fit md:max-w-fit sm:flex-none">
      <h1 className="mb-4 text-center t40b sm:t64b">
        {t(`${viewDictionary}.title`)}
      </h1>
      <div className="grid items-center justify-end grid-cols-1 gap-4 mb-4 md:justify-items-end sm:grid-cols-2 sm:justify-between">
        <DynamicInput
          name="search"
          type="text"
          placeholder={t(`${viewDictionary}.searchPlaceholder`)}
          value={searchQuery}
          onChange={handleSearchChange}
        />
      </div>
      <ul className="space-y-4 max-w-[370px] sm:max-w-none">
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
