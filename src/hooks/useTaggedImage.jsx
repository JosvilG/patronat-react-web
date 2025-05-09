import { useState, useEffect } from 'react'
import useGallery from './useGallery'

/**
 * Custom hook to get the most recent image with a specific tag
 * @param {string} tag - The tag to filter images (default: 'login')
 * @param {string} fallbackImage - Fallback image URL if none is found
 * @returns {Object} - Image state and properties
 */
const useTaggedImage = (
  tag = 'login',
  fallbackImage = '/images/default-login.jpg'
) => {
  const { galleryImages } = useGallery()
  const [backgroundImage, setBackgroundImage] = useState(null)
  const [imageLoaded, setImageLoaded] = useState(false)

  useEffect(() => {
    if (galleryImages && galleryImages.length > 0) {
      // Filter images by the specified tag
      const taggedImages = galleryImages.filter((image) => {
        if (!image || !image.tags) return false

        // If it's an array, search for the tag
        if (Array.isArray(image.tags)) {
          return image.tags.some(
            (imageTag) =>
              typeof imageTag === 'string' &&
              imageTag.toLowerCase() === tag.toLowerCase()
          )
        }

        // If it's a string, convert to array and search
        if (typeof image.tags === 'string') {
          return image.tags.toLowerCase().includes(tag.toLowerCase())
        }

        return false
      })

      if (taggedImages.length > 0) {
        // Sort by creation date (most recent first)
        const sortedImages = [...taggedImages].sort((a, b) => {
          if (a.createdAt && b.createdAt) {
            const dateA =
              a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt)
            const dateB =
              b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt)
            return dateB - dateA
          }
          return 0
        })

        // Reset loading state when URL changes
        setImageLoaded(false)

        // Use the most recent image
        setBackgroundImage(sortedImages[0].url)
      }
    }
  }, [galleryImages, tag])

  // Handler for when the image finishes loading
  const handleImageLoad = () => {
    setImageLoaded(true)
  }

  // Handler for image loading errors
  const handleImageError = (e) => {
    e.target.onerror = null
    e.target.src = fallbackImage
    setImageLoaded(true)
  }

  return {
    backgroundImage,
    imageLoaded,
    handleImageLoad,
    handleImageError,
  }
}

export default useTaggedImage
