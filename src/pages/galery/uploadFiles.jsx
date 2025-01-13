import React, { useState, useContext } from 'react'
import Swal from 'sweetalert2'
import withReactContent from 'sweetalert2-react-content'
import log from 'loglevel'
import { useNavigate } from 'react-router-dom'
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db, storage } from '../../firebase/firebase'
import { AuthContext } from '../../contexts/AuthContext' // Importa el AuthContext

const MySwal = withReactContent(Swal)

function UploadGalleryForm() {
  const { user } = useContext(AuthContext) // Accede al usuario autenticado desde el contexto
  const [file, setFile] = useState(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [tags, setTags] = useState('')
  const [visibility, setVisibility] = useState('public')
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')
  const [progress, setProgress] = useState(0) // Progreso de la barra
  const navigate = useNavigate()

  log.setLevel('info')

  const handleFileChange = (e) => {
    setFile(e.target.files[0])
    log.info('Archivo seleccionado:', e.target.files[0])
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!file) {
      setMessage('Por favor selecciona un archivo.')
      log.warn('No se ha seleccionado ningún archivo.')
      return
    }

    if (!user) {
      setMessage('Debes estar autenticado para subir archivos.')
      log.warn('Usuario no autenticado.')
      return
    }

    setUploading(true)
    const storageRef = ref(storage, `uploads/${file.name}`)

    try {
      log.info('Iniciando subida del archivo a Firebase Storage...')

      // Subir archivo con progreso
      const uploadTask = uploadBytesResumable(storageRef, file)

      // Escuchar el progreso de la subida
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          // Calcular el progreso
          const progressPercent =
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100
          setProgress(progressPercent)
        },
        (error) => {
          // Manejo de errores en la subida
          log.error('Error al subir el archivo:', error)
          MySwal.fire({
            title: '¡Error!',
            text: 'Hubo un problema al subir el archivo. Inténtalo nuevamente.',
            icon: 'error',
            confirmButtonText: 'Aceptar',
          })
          setUploading(false)
        },
        async () => {
          // Subida completada
          const url = await getDownloadURL(uploadTask.snapshot.ref)
          log.info('Archivo subido con éxito. URL del archivo:', url)

          // Obtener el UID del usuario desde el contexto
          const userId = user.uid // Accede al UID del usuario desde el contexto

          // Guardar metadatos en Firestore
          log.info('Guardando metadatos en Firestore...')
          await addDoc(collection(db, 'uploads'), {
            name: name || file.name,
            description,
            category,
            tags: tags.split(',').map((tag) => tag.trim()),
            visibility,
            url,
            size: file.size,
            type: file.type,
            userId, // Aquí guardamos el UID del usuario
            createdAt: serverTimestamp(),
          })

          log.info('Metadatos guardados correctamente en Firestore.')

          await MySwal.fire({
            title: '¡Éxito!',
            text: 'El archivo se subió correctamente.',
            icon: 'success',
            confirmButtonText: 'Aceptar',
          }).then(() => {
            navigate('/dashboard')
          })

          // Limpiar formulario
          setName('')
          setDescription('')
          setCategory('')
          setTags('')
          setFile(null)
          setVisibility('public')
        }
      )
    } catch (error) {
      log.error('Error al subir el archivo o guardar los datos:', error)

      await MySwal.fire({
        title: '¡Error!',
        text: 'Hubo un problema al subir el archivo. Inténtalo nuevamente.',
        icon: 'error',
        confirmButtonText: 'Aceptar',
      })
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="max-w-lg p-6 mx-auto bg-white rounded-lg shadow-md">
      <h1 className="mb-4 text-2xl font-bold">Subir Archivo</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Archivo
          </label>
          <input
            required
            type="file"
            onChange={handleFileChange}
            className="block w-full mt-1 text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Nombre del Archivo (opcional)
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ejemplo: Mi Imagen"
            className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Descripción
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descripción del archivo"
            className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Categoría
          </label>
          <input
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Ejemplo: Documentos, Imágenes"
            className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Etiquetas (separadas por comas)
          </label>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="Ejemplo: vacaciones, verano"
            className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Visibilidad
          </label>
          <select
            value={visibility}
            onChange={(e) => setVisibility(e.target.value)}
            className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200"
          >
            <option value="public">Público</option>
            <option value="private">Privado</option>
          </select>
        </div>
        {/* Barra de progreso */}
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
        <div>
          <button
            type="submit"
            disabled={uploading}
            className={`w-full py-2 px-4 rounded-md text-white font-semibold ${
              uploading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {uploading ? 'Subiendo...' : 'Subir Archivo'}
          </button>
        </div>
      </form>
      {message && (
        <div className="p-2 mt-4 text-center text-white bg-green-500 rounded-md">
          {message}
        </div>
      )}
    </div>
  )
}

export default UploadGalleryForm
