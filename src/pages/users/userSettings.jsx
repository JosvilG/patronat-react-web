import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import i18next from 'i18next'

function Settings() {
  const { t } = useTranslation()
  const [selectedLanguage, setSelectedLanguage] = useState('en')

  useEffect(() => {
    const savedLanguage = localStorage.getItem('language')
    if (savedLanguage) {
      setSelectedLanguage(savedLanguage)
      i18next.changeLanguage(savedLanguage)
    }
  }, [])

  const handleLanguageChange = (event) => {
    const lang = event.target.value
    setSelectedLanguage(lang)
    i18next.changeLanguage(lang)
    localStorage.setItem('language', lang)
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-6 bg-gray-100">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-lg">
        <h2 className="mb-6 text-2xl font-semibold text-center text-gray-700">
          {t('pages.settings.defaulLanguageTitle')}{' '}
          {/* Asegúrate de usar el hook `useTranslation` correctamente */}
        </h2>

        <div className="mb-4">
          <label
            htmlFor="language"
            className="block text-sm font-medium text-gray-600"
          >
            {t('pages.settings.defaulLanguageDescription')}
          </label>
          <select
            id="language"
            name="language"
            value={selectedLanguage}
            onChange={handleLanguageChange}
            className="w-full p-3 mt-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="en">English</option>
            <option value="es">Español</option>
            <option value="cat">Català</option>
          </select>
        </div>

        <div className="mt-6 text-center">
          <button
            type="button"
            className="px-6 py-2 text-white bg-blue-600 rounded-lg focus:outline-none hover:bg-blue-700"
          >
            {t('components.buttons.save')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default Settings
