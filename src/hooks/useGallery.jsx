// hooks/useGallery.js
import { useState, useEffect } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../firebase/firebase'

const useGallery = () => {
  const [galleryImages, setGalleryImages] = useState([])
  const [loadingGallery, setLoadingGallery] = useState(true)
  const [currentGalleryIndex, setCurrentGalleryIndex] = useState(0)

  useEffect(() => {
    const fetchImages = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'uploads'))
        const images = querySnapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }))
          .filter((item) => item.visibility === 'public')
          .slice(0, 10)
        setGalleryImages(images)
      } catch (error) {
        console.error('Error fetching gallery images:', error)
      } finally {
        setLoadingGallery(false)
      }
    }
    fetchImages()
  }, [])

  const handleGalleryNext = () => {
    setCurrentGalleryIndex((prevIndex) =>
      prevIndex === galleryImages.length - 1 ? 0 : prevIndex + 1
    )
  }

  const handleGalleryPrev = () => {
    setCurrentGalleryIndex((prevIndex) =>
      prevIndex === 0 ? galleryImages.length - 1 : prevIndex - 1
    )
  }

  return {
    galleryImages,
    loadingGallery,
    currentGalleryIndex,
    handleGalleryNext,
    handleGalleryPrev,
  }
}

export default useGallery
