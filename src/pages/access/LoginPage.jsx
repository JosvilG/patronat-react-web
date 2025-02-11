import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'
import log from 'loglevel'
import { useTranslation } from 'react-i18next'
import useGallery from '../../hooks/useGallery'
import DynamicInput from '../../components/Inputs'
import DynamicButton from '../../components/Buttons'

function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const navigate = useNavigate()
  const { t } = useTranslation()

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

  const handleLogin = async (e) => {
    e.preventDefault()
    const auth = getAuth()

    try {
      log.info(`Intentando iniciar sesión con el correo: ${email}`)
      await signInWithEmailAndPassword(auth, email, password)
      log.info('Inicio de sesión exitoso')
      navigate('/')
    } catch (err) {
      log.error('Error al intentar iniciar sesión:', err.message)
      setLoginError(
        'Error al iniciar sesión. Por favor verifica tus credenciales.'
      )
    }
  }

  return (
    <div className="grid items-center h-screen mx-auto bg-center bg-cover max-sm:mt-40 md:grid-cols-3 sm:grid-cols-1 justify-items-center sm:px-6 lg:px-8">
      <div className="relative rounded-lg md:p-8 sm:p-4 grid-col-3 w-fit h-fit bottom-40">
        <div className="max-w-lg mx-auto text-center">
          <h1 className="text-black t40b">{t('pages.login.title')}</h1>
          <p className="mt-4 text-black t16r whitespace-break-spaces">
            {t('pages.login.description')}
          </p>
        </div>

        <form
          onSubmit={handleLogin}
          className="max-w-md mx-auto mt-8 mb-0 space-y-4 max-sm:flex max-sm:flex-col max-sm:items-center"
        >
          {loginError && (
            <p className="mb-4 text-center text-red-500">{loginError}</p>
          )}

          <DynamicInput
            name="email"
            type="text"
            textId="loginPage.email"
            placeholder={t('pages.login.mailInput')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <DynamicInput
            name="password"
            type="password"
            textId="loginPage.password"
            placeholder={t('pages.login.passwordInput')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <div className="flex items-center justify-between">
            <p className="text-sm text-black">
              <Link className="t12s" to="/recover-password">
                {t('pages.login.forgotPassword')}
              </Link>
            </p>
          </div>

          <DynamicButton size="large" state="normal" type="submit">
            {t('components.buttons.login')}
          </DynamicButton>
        </form>

        <div className="flex items-center justify-center mt-4">
          <p className="text-black t12r">
            {t('pages.login.noAccount')}{' '}
            <Link className="t12b" to="/register">
              {t('pages.login.register')}
            </Link>
          </p>
        </div>
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

export default LoginPage
