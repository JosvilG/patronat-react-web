import React, { useState, useCallback } from 'react'
import DOMPurify from 'dompurify'
import { Input } from '@mui/base'
import { useTranslation } from 'react-i18next'
import TitleIcon from '@mui/icons-material/Title'
import VisibilityIcon from '@mui/icons-material/Visibility'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import NumbersIcon from '@mui/icons-material/Numbers'
import NoteAddIcon from '@mui/icons-material/NoteAdd'
import EmailIcon from '@mui/icons-material/Email'
import PhoneIcon from '@mui/icons-material/Phone'
import AccountCircleIcon from '@mui/icons-material/AccountCircle'
import BrandingWatermarkIcon from '@mui/icons-material/BrandingWatermark'

const sanitizeInput = (value) => {
  const clean = DOMPurify.sanitize(value, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  })
  return clean
}

const DynamicInput = ({
  name,
  textId,
  type,
  options,
  onChange,
  ...restProps
}) => {
  const { t } = useTranslation()
  const [selectedOption, setSelectedOption] = useState(null)
  const [isOpen, setIsOpen] = useState(false)

  const translatedLabel = textId ? t(textId) : ''
  const translatedPlaceholder = textId ? t(textId) : ''
  const shouldShowLabel = Boolean(textId && textId.trim())

  const handleChange = useCallback(
    (e) => {
      if (e.target.type === 'checkbox' || e.target.type === 'radio') {
        onChange &&
          onChange({
            target: {
              name: e.target.name,
              value: e.target.checked,
            },
          })
        return
      }

      let val = e.target.value
      val = sanitizeInput(val)
      if (restProps.maxLength && val.length > restProps.maxLength) {
        val = val.slice(0, restProps.maxLength)
      }
      onChange && onChange({ target: { name: e.target.name, value: val } })
    },
    [onChange, restProps.maxLength]
  )

  const handleSelectOption = (option) => {
    const cleanValue = sanitizeInput(option.value)
    setSelectedOption(option)
    setIsOpen(false)
    onChange && onChange({ target: { name, value: cleanValue } })
  }

  const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg']
  const maxSize = 5 * 1024 * 1024
  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!allowedTypes.includes(file.type)) {
      alert(t('components.inputs.fileTypeError'))
      return
    }
    if (file.size > maxSize) {
      alert(t('components.inputs.fileSizeError', { size: '5MB' }))
      return
    }
    onChange && onChange({ target: { name: e.target.name, value: file } })
  }

  const renderCustomSelect = () => (
    <div className="my-4">
      {shouldShowLabel && (
        <label htmlFor={name} className="block mb-2 t16r">
          {translatedLabel}
        </label>
      )}
      <div className="relative">
        <div
          className="w-[400px] h-[54px] px-4 py-2 text-[#696969] backdrop-blur-lg backdrop-saturate-[180%] bg-[rgba(255,255,255,0.75)] rounded-xl cursor-pointer flex justify-between items-center"
          role="button"
          tabIndex={0}
          onClick={() => setIsOpen(!isOpen)}
        >
          <span className="text-[#696969]">
            {selectedOption ? t(selectedOption.label) : translatedPlaceholder}
          </span>
          {!isOpen ? (
            <ExpandMoreIcon fontSize="large" />
          ) : (
            <ExpandLessIcon fontSize="large" />
          )}
        </div>
        {isOpen && (
          <ul className="absolute flex flex-col items-end top-[58px] w-[400px] left-0 right-0 z-10 rounded-[24px] max-h-60 overflow-y-auto">
            {options.map((opt, idx) => (
              <li
                key={idx}
                onClick={() => handleSelectOption(opt)}
                className="px-4 py-2 w-[348px] mb-1 text-black backdrop-blur-lg backdrop-saturate-[180%] bg-[rgba(255,255,255,0.75)] rounded-xl hover:cursor-pointer"
                role="option"
              >
                {t(opt.label)}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )

  const renderInput = () => {
    switch (type) {
      case 'text':
      case 'users':
      case 'email':
      case 'password':
      case 'number':
      case 'dni':
      case 'phone':
        return (
          <div>
            {shouldShowLabel && (
              <label htmlFor={name} className="block mb-2 t16r">
                {translatedLabel}
              </label>
            )}
            <div
              className={`my-4 flex ${type === 'number' ? 'w-[200px]' : 'w-[400px]'} h-[54px] items-center backdrop-blur-lg backdrop-saturate-[180%] bg-[rgba(255,255,255,0.75)] rounded-xl`}
            >
              <input
                autoComplete={'off'}
                name={name}
                type={
                  type === 'password'
                    ? 'password'
                    : type === 'users'
                      ? 'text'
                      : type
                }
                placeholder={
                  type === 'password'
                    ? t('components.inputs.enterPassword')
                    : translatedPlaceholder
                }
                onChange={handleChange}
                {...restProps}
                className={`t16l ${type === 'number' ? 'w-[200px]' : 'w-[400px]'} px-4 py-2 focus:outline-none bg-transparent`}
              />
              {
                {
                  text: (
                    <TitleIcon
                      fontSize="large"
                      className="relative right-6 text-[#696969]"
                    />
                  ),
                  users: (
                    <AccountCircleIcon
                      fontSize="large"
                      className="relative right-6 text-[#696969]"
                    />
                  ),
                  email: (
                    <EmailIcon
                      fontSize="large"
                      className="relative right-6 text-[#696969]"
                    />
                  ),
                  password: (
                    <VisibilityIcon
                      fontSize="large"
                      className="relative right-6 text-[#696969]"
                    />
                  ),
                  number: (
                    <NumbersIcon className="relative right-10 text-[#696969]" />
                  ),
                  dni: (
                    <BrandingWatermarkIcon
                      fontSize="large"
                      className="relative right-6 text-[#696969]"
                    />
                  ),
                  phone: (
                    <PhoneIcon
                      fontSize="large"
                      className="relative right-6 text-[#696969]"
                    />
                  ),
                }[type]
              }
            </div>
          </div>
        )

      case 'checkbox':
      case 'radio':
        return (
          <div className="w-fit">
            {shouldShowLabel && (
              <label htmlFor={name} className="block mb-2 t16r">
                {translatedLabel}
              </label>
            )}
            <div
              className="flex items-center w-fit h-[54px] px-4 py-2 cursor-pointer backdrop-blur-lg backdrop-saturate-[180%] bg-[rgba(255,255,255,0.75)] rounded-xl"
              onClick={() => document.getElementById(name)?.click()}
            >
              <input
                type={type}
                id={name}
                name={name}
                onChange={handleChange}
                {...restProps}
                className="hidden peer"
              />
              <div
                className={`w-[34px] h-[34px] mr-3 border-4 border-[#696969] rounded-${
                  type === 'checkbox' ? 'lg' : 'full'
                } transition-colors duration-200 ease-in-out peer-checked:bg-[#696969] peer-checked:border-[#696969]`}
              />
              <span className="select-none t16r">{translatedLabel}</span>
            </div>
          </div>
        )

      case 'textarea':
        return (
          <div>
            {shouldShowLabel && (
              <label htmlFor={name} className="block mb-2 t16r">
                {translatedLabel}
              </label>
            )}
            <textarea
              name={name}
              placeholder={translatedPlaceholder}
              onChange={handleChange}
              {...restProps}
              className="t16l min-w-[400px] w-full min-h-[54px] px-4 py-2 backdrop-blur-lg backdrop-saturate-[180%] bg-[rgba(255,255,255,0.75)] rounded-xl"
            />
          </div>
        )

      case 'select':
        return renderCustomSelect()

      case 'date':
      case 'time':
        return (
          <div>
            {shouldShowLabel && (
              <label htmlFor={name} className="block mb-2 t16r">
                {translatedLabel}
              </label>
            )}
            <input
              type={type}
              name={name}
              onChange={handleChange}
              {...restProps}
              className="t16l w-[200px] h-[54px] px-4 py-2 backdrop-blur-lg backdrop-saturate-[180%] bg-[rgba(255,255,255,0.75)] rounded-xl appearance-none"
            />
          </div>
        )

      case 'otp':
        return (
          <div>
            {shouldShowLabel && (
              <label htmlFor={name} className="block mb-2 t16r">
                {translatedLabel}
              </label>
            )}
            <div className="flex space-x-2">
              {Array.from({ length: 6 }).map((_, idx) => (
                <input
                  key={idx}
                  type="text"
                  maxLength={1}
                  name={`${name}[${idx}]`}
                  onChange={handleChange}
                  {...restProps}
                  className="t24s w-[54px] h-[54px] px-4 py-2 backdrop-blur-lg backdrop-saturate-[180%] bg-[rgba(255,255,255,0.75)] rounded-xl text-center"
                />
              ))}
            </div>
          </div>
        )

      case 'document':
        return (
          <div className="w-[400px]">
            {shouldShowLabel && (
              <label htmlFor={name} className="block mb-2 t16r">
                {translatedLabel}
              </label>
            )}
            <div>
              <label
                htmlFor={name}
                className="flex content-center justify-between w-[400px] h-[54px] px-4 py-2 cursor-pointer backdrop-blur-lg backdrop-saturate-[180%] bg-[rgba(255,255,255,0.75)] rounded-xl"
              >
                <span className="flex flex-col justify-center mr-2 overflow-hidden t16r">
                  {t('components.inputs.addDocument')}
                </span>
                <NoteAddIcon fontSize="large" />
              </label>
              <input
                id={name}
                type="file"
                name={name}
                accept={restProps.accept}
                onChange={handleFileChange}
                className="hidden"
                {...restProps}
              />
            </div>
          </div>
        )

      default:
        return (
          <Input
            name={name}
            placeholder={translatedPlaceholder}
            onChange={handleChange}
            {...restProps}
            className="w-full px-4 py-2 border rounded-lg"
          />
        )
    }
  }

  return renderInput()
}

export default DynamicInput
