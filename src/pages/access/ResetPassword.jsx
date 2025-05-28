import React, { useState, useEffect } from 'react'
import { getAuth, confirmPasswordReset } from 'firebase/auth'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import DynamicInput from '../../components/Inputs'
import DynamicButton from '../../components/Buttons'
import { showPopup } from '../../services/popupService'
import useTaggedImage from '../../hooks/useTaggedImage'
import usePointerAnimation from '../../hooks/usePointerAnimation'

const ResetPassword = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [oobCode, setOobCode] = useState(null)

  const { moveX, moveY, handleMouseMove } = usePointerAnimation()
  const { backgroundImage, imageLoaded, handleImageLoad, handleImageError } =
    useTaggedImage('login', '/images/default-login.jpg')

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search)
    const code = queryParams.get('oobCode')
    if (code) {
      setOobCode(code)
    } else {
      navigate('/recover-password')
    }
  }, [location.search, navigate])

  const handleResetPassword = async (e) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      showPopup({
        title: t('components.popup.failTitle'),
        text: t('components.popup.passwordMismatch'),
        icon: 'error',
        confirmButtonText: t('components.popup.confirmButtonText'),
        confirmButtonColor: '#d33',
      })
      return
    }

    setLoading(true)
    const auth = getAuth()
    try {
      await confirmPasswordReset(auth, oobCode, newPassword)
      showPopup({
        title: t('components.popup.successTitle'),
        text: t('components.popup.passwordResetSuccess'),
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
      <div className="relative z-10 rounded-lg md:p-8 sm:p-4 grid-col-3 w-fit h-fit bottom-40">
        <div className="max-w-lg mx-auto text-center">
          <h1 className="text-black t40b">{t('pages.resetPassword.title')}</h1>
          <p className="mt-4 text-black t16r whitespace-break-spaces">
            {t('pages.resetPassword.description')}
          </p>
        </div>
        <form
          onSubmit={handleResetPassword}
          className="flex flex-col items-center w-full"
        >
          <DynamicInput
            name="newPassword"
            placeholder={t('pages.resetPassword.newPassword')}
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
          <DynamicInput
            name="confirmPassword"
            placeholder={t('pages.resetPassword.confirmPassword')}
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
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
              alt="reset password portada"
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

export default ResetPassword
