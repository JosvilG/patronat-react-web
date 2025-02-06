import React, { useState } from 'react'
import PropTypes from 'prop-types'
import OpenInFullIcon from '@mui/icons-material/OpenInFull'
import { useTranslation } from 'react-i18next'

const DynamicCard = ({ type, title, description, date, imageUrl, link }) => {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [imgError, setImgError] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  const { t } = useTranslation()

  const handleGalleryClick = () => {
    setIsFullscreen(true)
  }

  const handleCloseFullscreen = () => {
    setIsFullscreen(false)
  }

  const handleImageLoad = () => {
    setIsLoaded(true)
  }

  const handleImageError = () => {
    console.log('Error al cargar la imagen, mostrando placeholder')
    setImgError(true)
    setIsLoaded(true)
  }

  return (
    <>
      <div
        className={`relative w-full ${
          type === 'gallery' ? 'max-sm:h-[400px] h-[530px]' : 'sm:h-[550px]'
        } overflow-hidden group select-none transition-opacity duration-700 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={() => {
          if (type === 'event' && link) {
            window.open(link, '_blank')
          }
        }}
      >
        <div
          className={`relative cursor-pointer ${
            type === 'gallery' ? 'h-full' : 'h-auto sm:h-[400px]'
          }`}
          onClick={type === 'gallery' ? handleGalleryClick : undefined}
        >
          {/* Imagen */}
          <img
            src={imgError ? 'https://via.placeholder.com/150' : imageUrl}
            alt={title}
            onLoad={handleImageLoad}
            onError={handleImageError}
            className="object-cover w-full h-full rounded-[60px]"
          />

          {type === 'gallery' && (
            <div
              className="absolute inset-0 flex items-end p-4 transition-opacity duration-300 opacity-0 group-hover:opacity-100"
              style={{
                borderRadius: '60px',
                boxShadow: 'inset 0 -228px 17px -102px rgba(0, 0, 0, 0.45)',
              }}
            >
              <div className="flex items-baseline justify-between w-full overflow-hidden text-white">
                <p className="text-white t40b line-clamp-1">{title}</p>
                <button className="p-2 bg-black bg-opacity-50 rounded-full">
                  <OpenInFullIcon fontSize="medium"></OpenInFullIcon>
                </button>
              </div>
            </div>
          )}

          {type === 'event' && (
            <div
              className="absolute inset-0 flex flex-row justify-end items-end p-4 transition-opacity duration-300 opacity-0 group-hover:opacity-100 rounded-[60px]"
              style={{
                borderRadius: '60px',
                boxShadow: 'inset 0 -228px 17px -102px rgba(0, 0, 0, 0.45)',
              }}
            >
              <p className="text-right text-white t16b">
                {t('components.cards.eventDateTitle')} - {date}
              </p>
            </div>
          )}
        </div>

        {type === 'event' && (
          <div className="px-4 py-2">
            <p className="pb-2 leading-8 flex flex-row items-center line-clamp-1 font-bold text-gray-800 transition-colors t40b group-hover:text-[#696969] leading-10">
              {title}
            </p>
            <p className=" leading-7 text-gray-600 transition-colors t20r group-hover:text-[#696969] line-clamp-3">
              {description}
            </p>
          </div>
        )}
      </div>

      {isFullscreen && type === 'gallery' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 backdrop-blur-md">
          <button
            className="absolute rounded-[60px] p-2 text-white bg-gray-700 rounded-full top-4 right-4"
            onClick={handleCloseFullscreen}
          >
            ✕
          </button>
          <img
            src={
              imgError
                ? 'https://dynamoprojects.com/wp-content/uploads/2022/12/no-image.jpg'
                : imageUrl
            }
            alt={title}
            className="max-w-full max-h-full rounded-lg"
          />
        </div>
      )}
    </>
  )
}

DynamicCard.propTypes = {
  type: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  description: PropTypes.string,
  date: PropTypes.string,
  imageUrl: PropTypes.string.isRequired,
  link: PropTypes.string,
}

export default DynamicCard
