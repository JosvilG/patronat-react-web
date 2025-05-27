import React, { useState } from 'react'
import { getAuth, sendPasswordResetEmail } from 'firebase/auth'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import DynamicInput from '../../components/Inputs'
import DynamicButton from '../../components/Buttons'
import { showPopup } from '../../services/popupService'
import useTaggedImage from '../../hooks/useTaggedImage'
import usePointerAnimation from '../../hooks/usePointerAnimation'

const RecoverPassword = () => {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  // Usar los hooks personalizados
  const { moveX, moveY, handleMouseMove } = usePointerAnimation()
  const { backgroundImage, imageLoaded, handleImageLoad, handleImageError } =
    useTaggedImage('login', '/images/default-login.jpg')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    const auth = getAuth()
    const actionCodeSettings = {
      url: `${window.location.origin}/reset-password`,
      handleCodeInApp: true,
    }

    try {
      await sendPasswordResetEmail(auth, email, actionCodeSettings)
      showPopup({
        title: t('components.popup.successTitle'),
        text: t('components.popup.recoverSuccess'),
        icon: 'success',
        confirmButtonText: t('components.popup.confirmButtonText'),
        confirmButtonColor: '#4CAF50',
        onConfirm: () => navigate('/login'),
      })
    } catch (error) {
      showPopup({
        title: t('components.popup.failTitle'),
        text: t('components.popup.failDecription'),
        icon: 'error',
        confirmButtonText: t('components.popup.confirmButtonText'),
        confirmButtonColor: '#d33',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid items-center h-screen mx-auto bg-center bg-cover max-sm:mt-40 md:grid-cols-3 sm:grid-cols-1 justify-items-center sm:px-6 lg:px-8">
      <div className="relative z-10 rounded-lg sm:p-4 grid-col-3 w-fit h-fit bottom-40">
        <div className="max-w-lg mx-auto text-center">
          <h1 className="text-black t24b sm:t64b">
            {t('pages.recoverPage.title')}
          </h1>
          <p className="mt-4 text-black t16r whitespace-break-spaces max-w-[370px] sm:max-w-none pb-8 sm:pb-0">
            {t('pages.recoverPage.description')}
          </p>
        </div>
        <form
          onSubmit={handleSubmit}
          className="flex flex-col items-center w-full"
        >
          <DynamicInput
            name="email"
            textId={t('pages.recoverPage.email')}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <DynamicButton
            size="medium"
            state={loading ? 'disabled' : 'normal'}
            textId={t('components.buttons.recover')}
            type="submit"
            disabled={loading}
          />
        </form>
      </div>

      {/* Sección de la imagen con animación */}
      <motion.div
        className="bottom-0 flex justify-end h-full grid-cols-3 col-span-2 overflow-hidden md:absolute md:bottom-4 md:right-2 bg-blend-multiply mix-blend-multiply"
        onMouseMove={handleMouseMove}
      >
        {backgroundImage && (
          <motion.div
            className="relative w-full h-full overflow-hidden"
            style={{
              x: moveX,
              y: moveY,
            }}
          >
            <motion.img
              src={backgroundImage}
              alt="recover password portada"
              className={`
                object-cover max-sm:absolute -z-10 max-sm:top-0 max-sm:right-0 max-sm:opacity-10 
                lg:w-[80%] mg:w-[90%] sm:w-full h-full
                transition-opacity duration-1000 ease-in-out
                ${imageLoaded ? 'opacity-100' : 'opacity-0'}
              `}
              onLoad={handleImageLoad}
              onError={handleImageError}
              style={{
                width: '105%',
                height: '105%',
                objectFit: 'cover',
                objectPosition: 'center',
              }}
              initial={{ scale: 1.02 }}
              animate={{
                scale: 1.02,
                opacity: imageLoaded ? 1 : 0,
              }}
              transition={{
                opacity: { duration: 0.8, ease: 'easeInOut' },
                scale: { duration: 1.2, ease: 'easeOut' },
              }}
            />
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}

export default RecoverPassword
