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
  lng: localStorage.getItem('language') || 'en',
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
})

export default i18next
