import React, { useState } from 'react'
import PropTypes from 'prop-types'
import OpenInFullIcon from '@mui/icons-material/OpenInFull'
import { useTranslation } from 'react-i18next'

const DynamicCard = ({ type, title, description, date, imageUrl, link }) => {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const { t } = useTranslation()
  const handleGalleryClick = () => {
    setIsFullscreen(true)
  }

  const handleCloseFullscreen = () => {
    setIsFullscreen(false)
  }

  return (
    <>
      {/* Card principal */}
      <div
        className={`relative ${
          type === 'gallery'
            ? 'w-[550px] h-[400px] rounded-[60px]'
            : 'w-[550px] h-[550px]'
        } overflow-hidden group rounded-[60px] select-none`}
        onClick={() => {
          if (type === 'event' && link) {
            window.open(link, '_blank')
          }
        }}
      >
        {/* Imagen principal */}
        <div
          className={`${
            type === 'gallery' ? 'h-full' : 'h-[400px]'
          } relative cursor-pointer`}
          onClick={type === 'gallery' ? handleGalleryClick : undefined}
        >
          <img
            src={imageUrl}
            alt={title}
            className="object-cover w-full h-full"
          />

          {/* Hover overlay para Gallery */}
          {type === 'gallery' && (
            <div
              className="absolute inset-0 flex items-end p-4 transition-opacity duration-300 opacity-0 group-hover:opacity-100"
              style={{
                boxShadow: 'inset 0 -228px 17px -102px rgba(0, 0, 0, 0.45)',
              }}
            >
              <div className="flex items-baseline justify-between w-full overflow-hidden text-white">
                <p className="t40b text-[#3A3A3A] line-clamp-1">{title}</p>
                <button className="p-2 bg-black bg-opacity-50 rounded-full">
                  <OpenInFullIcon fontSize="medium"></OpenInFullIcon>
                </button>
              </div>
            </div>
          )}

          {/* Hover overlay para Event */}
          {type === 'event' && (
            <div
              className="absolute inset-0 flex flex-row justify-end items-end p-4 transition-opacity duration-300 opacity-0 group-hover:opacity-100 rounded-[60px]"
              style={{
                boxShadow: 'inset 0 -228px 17px -102px rgba(0, 0, 0, 0.45)',
              }}
            >
              <p className="text-white t16b">
                {t('components.cards.eventDateTitle')} - {date}
              </p>
            </div>
          )}
        </div>

        {/* Contenido de la card para Event */}
        {type === 'event' && (
          <div className="h-[150px] p-4">
            <p className="pb-2 h-[60px] text-lg flex flex-row items-center  line-clamp-1 font-bold text-gray-800 transition-colors t40b group-hover:text-[#696969]">
              {title}
            </p>
            <p className="text-sm leading-7 text-gray-600 transition-colors t20r group-hover:text-[#696969] line-clamp-3">
              {description}
            </p>
          </div>
        )}
      </div>

      {/* Modal de pantalla completa para Gallery */}
      {isFullscreen && type === 'gallery' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 backdrop-blur-md">
          {/* Botón de cerrar */}
          <button
            className="absolute p-2 text-white bg-gray-700 rounded-full top-4 right-4"
            onClick={handleCloseFullscreen}
          >
            ✕
          </button>
          {/* Imagen en pantalla completa */}
          <img
            src={imageUrl}
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
