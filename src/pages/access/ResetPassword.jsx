import React, { useState, useEffect } from 'react'
import { getAuth, confirmPasswordReset } from 'firebase/auth'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import DynamicInput from '../../components/Inputs'
import DynamicButton from '../../components/Buttons'
import { showPopup } from '../../services/popupService'
import useGallery from '../../hooks/useGallery'

const ResetPassword = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [oobCode, setOobCode] = useState(null)
  const { galleryImages } = useGallery()
  const [backgroundImage, setBackgroundImage] = useState(null)

  useEffect(() => {
    const storedBackground = localStorage.getItem('loginBackgroundImage')
    if (storedBackground) {
      setBackgroundImage(storedBackground)
    } else if (galleryImages.length > 0) {
      const loginImages = galleryImages.filter((image) =>
        image.tags.includes('login')
      )

      if (loginImages.length > 0) {
        const imageUrl = loginImages[0].url
        setBackgroundImage(imageUrl)
        localStorage.setItem('loginBackgroundImage', imageUrl)
      }
    }
  }, [galleryImages])

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
      <div className="relative rounded-lg md:p-8 sm:p-4 grid-col-3 w-fit h-fit bottom-40">
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
      <div className="bottom-0 flex justify-end h-full grid-cols-3 col-span-2 md:relative md:bottom-20">
        <img
          src={backgroundImage}
          alt="login portada"
          className="object-cover max-sm:absolute -z-10 max-sm:top-0 max-sm:right-0 max-sm:opacity-10 lg:w-[80%] mg:w-[90%] sm:w-full h-full"
        />
      </div>
    </div>
  )
}

export default ResetPassword
