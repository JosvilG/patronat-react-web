import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'
import log from 'loglevel'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import usePointerAnimation from '../../hooks/usePointerAnimation'
import useTaggedImage from '../../hooks/useTaggedImage'
import DynamicInput from '../../components/Inputs'
import DynamicButton from '../../components/Buttons'

function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const navigate = useNavigate()
  const { t } = useTranslation()

  const { moveX, moveY, handleMouseMove } = usePointerAnimation()
  const { backgroundImage, imageLoaded, handleImageLoad, handleImageError } =
    useTaggedImage('login')

  const handleLogin = async (e) => {
    e.preventDefault()
    const auth = getAuth()

    try {
      await signInWithEmailAndPassword(auth, email, password)
      navigate('/')
    } catch (err) {
      log.error('Error al intentar iniciar sesión:', err.message)
      setLoginError(
        'Error al iniciar sesión. Por favor verifica tus credenciales.'
      )
    }
  }

  return (
    <div className="grid items-center min-h-dvh mx-auto bg-center bg-cover md:grid-cols-3 sm:grid-cols-1 justify-items-center px-[4%] sm:px-[5%] lg:px-[6%]">
      <div className="sm:mb-[50%] relative z-10 rounded-lg md:p-[5%] sm:p-[4%] p-[6%] grid-col-3 w-fit sm:translate-y-[-10vh] md:translate-y-0">
        <div className="max-w-lg mx-auto text-center">
          <h1 className="text-black t40b">{t('pages.login.title')}</h1>
          <p className="mt-[3vh] text-black t16r whitespace-break-spaces">
            {t('pages.login.description')}
          </p>
        </div>

        <form
          onSubmit={handleLogin}
          className="max-w-md mx-auto mt-[5vh] mb-0 space-y-[3vh] flex flex-col items-center sm:items-stretch"
        >
          {loginError && (
            <p className="mb-[2vh] text-center text-red-500">{loginError}</p>
          )}

          <DynamicInput
            name="email"
            type="text"
            textId={t('pages.login.mailInput')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <DynamicInput
            name="password"
            type="password"
            textId={t('pages.login.passwordInput')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <div className="flex items-center justify-between w-full mt-0">
            <p className="text-black">
              <Link className="t12s" to="/recover-password">
                {t('pages.login.forgotPassword')}
              </Link>
            </p>
          </div>
          <DynamicButton size="medium" state="normal" type="submit">
            {t('components.buttons.login')}
          </DynamicButton>
        </form>

        <div className="flex items-center justify-center mt-[3vh]">
          <p className="text-black t12r">
            {t('pages.login.noAccount')}{' '}
            <Link className="t12b" to="/register">
              {t('pages.login.register')}
            </Link>
          </p>
        </div>
      </div>

      <motion.div
        className="bottom-0 flex justify-end h-full grid-cols-3 col-span-2 overflow-hidden md:absolute md:bottom-[1vh] md:right-[1%] bg-blend-multiply mix-blend-multiply"
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
              alt="login portada"
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

export default LoginPage
