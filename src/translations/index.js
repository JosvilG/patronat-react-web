import i18next from 'i18next'
import { initReactI18next } from 'react-i18next'

import en from './standard/en.json'
import es from './standard/es.json'
import cat from './standard/cat.json'

i18next.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    es: { translation: es },
    cat: { translation: cat },
  },
  lng: localStorage.getItem('language') || 'cat',
  fallbackLng: 'cat',
  interpolation: {
    escapeValue: false,
  },
})

// Función para cambiar el idioma basado en la preferencia del usuario
export const setUserPreferredLanguage = (preferredLanguage) => {
  if (preferredLanguage && ['en', 'es', 'cat'].includes(preferredLanguage)) {
    i18next.changeLanguage(preferredLanguage)
    localStorage.setItem('language', preferredLanguage)
  }
}

export default i18next
