import React, { useState } from 'react'
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

const DynamicInput = ({ name, textId, type, options, ...props }) => {
  const { t } = useTranslation()
  const [selectedOption, setSelectedOption] = useState(null)
  const [isOpen, setIsOpen] = useState(false)

  const translatedLabel = t(`${textId}`)
  const translatedPlaceholder = t(`${textId}`)

  const handleSelectOption = (option) => {
    setSelectedOption(option)
    setIsOpen(false)
  }

  const renderCustomSelect = () => (
    <div className="my-4">
      <label htmlFor={name} className="block mb-2 t16r">
        {translatedLabel}
      </label>
      <div className="relative">
        {/* Custom Select box */}
        <div
          className="w-[400px] h-[54px] px-4 py-2   text-[#696969] backdrop-blur-lg backdrop-saturate-[180%] bg-[rgba(255,255,255,0.75)] rounded-xl cursor-pointer flex justify-between items-center"
          onClick={() => setIsOpen(!isOpen)}
        >
          <span className="text-[#696969]">
            {selectedOption ? t(selectedOption.label) : translatedPlaceholder}
          </span>
          {!isOpen ? (
            <ExpandMoreIcon fontSize="large"></ExpandMoreIcon>
          ) : (
            <ExpandLessIcon fontSize="large"></ExpandLessIcon>
          )}
        </div>

        {/* Dropdown options */}
        {isOpen && (
          <div className="absolute flex flex-col items-end top-[58px] w-[400px]  left-0 right-0 z-10  rounded-[24px] max-h-60 overflow-y-auto">
            {options.map((option, index) => (
              <div
                key={index}
                onClick={() => handleSelectOption(option)}
                className="px-4 py-2 w-[348px] mb-1 text-[#D9D9D9] hover:bg-[#797979] backdrop-blur-lg backdrop-saturate-[180%] bg-[rgba(255,255,255,0.75)] rounded-xl"
              >
                {t(option.label)}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )

  const renderInput = () => {
    switch (type) {
      case 'text':
        return (
          <div>
            <label htmlFor={name} className="block mb-2 t16r">
              {translatedLabel}
            </label>
            <div className="my-4 w-fit max-sm:min-w-[350px] max-sm:pr-2  min-w-[400px] h-[54px] px-4 py-2 flex flex-row items-center text-[#696969] backdrop-blur-lg backdrop-saturate-[180%] bg-[rgba(255,255,255,0.75)] rounded-xl">
              <input
                name={name}
                type="text"
                placeholder={translatedPlaceholder}
                className="t16l w-[312px] overflow-hidden focus:outline-none bg-transparent"
                inputProps={{
                  className:
                    'focus:ring-2 focus:ring-blue-500 rounded-md px-4 py-2 ',
                }}
                {...props}
              />
              <TitleIcon
                fontSize="large"
                className="relative left-4 max-sm:left-0 text-[#696969]"
              />
            </div>
          </div>
        )

      case 'users':
        return (
          <div className="my-4 w-fit max-sm:min-w-[350px] max-sm:pr-2 min-w-[400px] h-[54px] px-4 py-2  text-[#696969] backdrop-blur-lg backdrop-saturate-[180%] bg-[rgba(255,255,255,0.75)] rounded-xl">
            <input
              name={name}
              type="text"
              placeholder={translatedPlaceholder}
              className="t16l w-[312px] overflow-hidden  focus:outline-none"
              inputProps={{
                className:
                  'focus:ring-2 focus:ring-blue-500 rounded-md px-4 py-2',
              }}
              {...props}
            />
            <AccountCircleIcon
              fontSize="large"
              className="relative left-4 max-sm:left-0 text-[#696969]"
            />
          </div>
        )

      case 'email':
        return (
          <div className="my-4 w-fit max-sm:min-w-[350px] max-sm:pr-2 min-w-[400px] h-[54px] px-4 py-2   text-[#696969] backdrop-blur-lg backdrop-saturate-[180%] bg-[rgba(255,255,255,0.75)] rounded-xl">
            <input
              name={name}
              type="email"
              placeholder={translatedPlaceholder}
              className="t16l w-[312px] overflow-hidden  focus:outline-none"
              inputProps={{
                className:
                  'focus:ring-2 focus:ring-blue-500 rounded-md px-4 py-2',
              }}
              {...props}
            />
            <EmailIcon
              fontSize="large"
              className="relative left-4 max-sm:left-0 text-[#696969]"
            />
          </div>
        )

      case 'password':
        return (
          <div className="my-4 w-fit max-sm:min-w-[350px] max-sm:pr-2 min-w-[400px] h-[54px] px-4 py-2   text-[#696969] backdrop-blur-lg backdrop-saturate-[180%] bg-[rgba(255,255,255,0.75)] rounded-xl">
            <input
              name={name}
              type="password"
              placeholder={t('components.inputs.enterPassword')}
              className="t16l w-[312px] overflow-hidden  focus:outline-none"
              inputProps={{
                className:
                  'focus:ring-2 focus:ring-blue-500 rounded-md px-4 py-2',
              }}
              {...props}
            />
            <VisibilityIcon
              fontSize="large"
              className="relative left-4 max-sm:left-0 text-[#696969]"
            ></VisibilityIcon>
          </div>
        )
      case 'number':
        return (
          <div className="my-4">
            <label htmlFor={name} className="block mb-2 t16r">
              {translatedLabel}
            </label>
            <input
              name={name}
              type="number"
              placeholder={translatedPlaceholder}
              className="t16l max-w-[200px] h-[54px] px-4 pr-12 py-2   text-[#696969] backdrop-blur-lg backdrop-saturate-[180%] bg-[rgba(255,255,255,0.75)] rounded-xl focus:ring-2 appearance-none"
              inputProps={{
                className:
                  'focus:ring-2 focus:ring-blue-500 rounded-md px-4 py-2',
              }}
              {...props}
            />
            <NumbersIcon className="relative right-[2.5rem] text-[#696969]"></NumbersIcon>
          </div>
        )

      case 'dni':
        return (
          <div className="my-4 w-fit max-sm:min-w-[350px] max-sm:pr-2 min-w-[400px] h-[54px] px-4 py-2   text-[#696969] backdrop-blur-lg backdrop-saturate-[180%] bg-[rgba(255,255,255,0.75)] rounded-xl">
            <input
              name={name}
              type="text"
              placeholder={translatedPlaceholder}
              className="t16l w-[312px] overflow-hidden  focus:outline-none"
              inputProps={{
                className:
                  'focus:ring-2 focus:ring-blue-500 rounded-md px-4 py-2',
              }}
              {...props}
            />
            <BrandingWatermarkIcon
              fontSize="large"
              className="relative left-4 max-sm:left-0 text-[#696969]"
            ></BrandingWatermarkIcon>
          </div>
        )

      case 'phone':
        return (
          <div className="my-4 w-fit max-sm:min-w-[350px] max-sm:pr-2 min-w-[400px] h-[54px] px-4 py-2   text-[#696969] backdrop-blur-lg backdrop-saturate-[180%] bg-[rgba(255,255,255,0.75)] rounded-xl">
            <input
              name={name}
              type="number"
              placeholder={translatedPlaceholder}
              className="t16l w-[312px] overflow-hidden  focus:outline-none"
              inputProps={{
                className:
                  'focus:ring-2 focus:ring-blue-500 rounded-md px-4 py-2',
              }}
              {...props}
            />
            <PhoneIcon
              fontSize="large"
              className="relative left-4 max-sm:left-0 text-[#696969]"
            ></PhoneIcon>
          </div>
        )

      case 'checkbox':
        return (
          <div
            className="w-fit "
            onClick={() => document.getElementById(name)?.click()}
          >
            <label htmlFor={name} className="block mb-2 t16r">
              {translatedLabel}
            </label>
            <div className="flex items-center w-fit h-[54px] px-4 py-2 border  t16r cursor-pointer  text-[#696969] backdrop-blur-lg backdrop-saturate-[180%] bg-[rgba(255,255,255,0.75)] rounded-xl">
              <input
                type="checkbox"
                id={name}
                name={name}
                {...props}
                className="hidden peer"
              />

              <div className="w-[34px] h-[34px] mr-3 border-4 border-[#696969] rounded-lg flex items-center justify-center transition-colors duration-200 ease-in-out peer-checked:bg-[#696969] peer-checked:border-[#696969]"></div>

              <label
                htmlFor={name}
                className="cursor-pointer select-none t16r peer-checked:text-white"
                onClick={() => document.getElementById(name)?.click()}
              >
                {translatedLabel}
              </label>
            </div>
          </div>
        )
      case 'radio':
        return (
          <div
            className="w-fit "
            onClick={() => document.getElementById(name)?.click()}
          >
            <div className="flex items-center w-fit h-[54px] px-4 py-2   text-[#696969] backdrop-blur-lg backdrop-saturate-[180%] bg-[rgba(255,255,255,0.75)] rounded-xl cursor-pointer">
              <input
                type="checkbox"
                id={name}
                name={name}
                {...props}
                className="hidden peer"
              />

              <div className="w-[34px] h-[34px] mr-3 border-4 border-[#696969] rounded-full flex items-center justify-center transition-colors duration-200 ease-in-out peer-checked:bg-[#696969] peer-checked:border-[#696969]"></div>

              <label
                htmlFor={name}
                className="cursor-pointer select-none t16r"
                onClick={() => document.getElementById(name)?.click()}
              >
                {translatedLabel}
              </label>
            </div>
          </div>
        )
      case 'textarea':
        return (
          <div className="my-4">
            <label htmlFor={name} className="block mb-2 t16r">
              {translatedLabel}
            </label>
            <textarea
              name={name}
              placeholder={translatedPlaceholder}
              className="t16l min-w-[400px] w-full min-h-[54px] h-fit px-4 py-2   text-[#696969] backdrop-blur-lg backdrop-saturate-[180%] bg-[rgba(255,255,255,0.75)] rounded-xl"
              {...props}
            />
          </div>
        )

      case 'select':
        return renderCustomSelect()

      case 'date':
        return (
          <div className="my-4">
            <label htmlFor={name} className="block mb-2 t16r">
              {translatedLabel}
            </label>
            <input
              type="date"
              name={name}
              className="t16l w-[200px] max-w-[200px] h-[54px] px-4 py-2   text-[#696969] backdrop-blur-lg backdrop-saturate-[180%] bg-[rgba(255,255,255,0.75)] rounded-xl appearance-none"
              {...props}
            />
          </div>
        )

      case 'time':
        return (
          <div className="my-4">
            <label htmlFor={name} className="block mb-2 t16r">
              {translatedLabel}
            </label>
            <input
              type="time"
              name={name}
              className="t16l w-[200px] max-w-[200px] h-[54px] px-4 py-2   text-[#696969] backdrop-blur-lg backdrop-saturate-[180%] bg-[rgba(255,255,255,0.75)] rounded-xl appearance-none"
              {...props}
            />
          </div>
        )

      case 'otp':
        return (
          <div className="my-4">
            <label htmlFor={name} className="block mb-2 t16r">
              {translatedLabel}
            </label>
            <div className="flex space-x-2">
              {Array.from({ length: 6 }).map((_, index) => (
                <input
                  key={index}
                  type="text"
                  maxLength="1"
                  name={`${name}[${index}]`}
                  className="t24s max-w-[54px] h-[54px] px-4 py-2   text-[#696969] backdrop-blur-lg backdrop-saturate-[180%] bg-[rgba(255,255,255,0.75)] rounded-xl text-center caret-transparent"
                  placeholder="X"
                  onInput={(e) => {
                    const target = e.target
                    const nextSibling = target.nextElementSibling
                    if (target.value.length === 1 && nextSibling) {
                      nextSibling.focus()
                    }
                  }}
                  onKeyDown={(e) => {
                    const target = e.target
                    const prevSibling = target.previousElementSibling

                    if (e.key === 'Backspace' && !target.value && prevSibling) {
                      prevSibling.focus()
                    }
                  }}
                  {...props}
                />
              ))}
            </div>
          </div>
        )

      case 'document':
        return (
          <div className="my-4">
            <label htmlFor={name} className="block mb-2 t16r">
              {translatedLabel}
            </label>
            <div className="w-[400px] h-[54px]">
              <label
                htmlFor={name}
                className="flex w-[400px] h-[54px] items-center px-4 py-2 t16r transition duration-200  cursor-pointer  text-[#696969] backdrop-blur-lg backdrop-saturate-[180%] bg-[rgba(255,255,255,0.75)] rounded-xl"
              >
                <span
                  className="mr-2 t16r max-w-[312px] w-[312px] overflow-hidden"
                  placeholder=""
                >
                  {t('components.inputs.addDocument')}
                </span>
                <div className="relative right-0 flex items-center justify-center">
                  <NoteAddIcon fontSize="large" className="t16r"></NoteAddIcon>
                </div>
              </label>
              <input id={name} type="file" className="hidden" {...props} />
            </div>
          </div>
        )

      default:
        return (
          <div className="my-4">
            <label htmlFor={name} className="block mb-2 t16r">
              {translatedLabel}
            </label>
            <Input
              name={name}
              placeholder={translatedPlaceholder}
              className="w-full px-4 py-2 border rounded-lg"
              inputProps={{
                className:
                  'focus:ring-2 focus:ring-blue-500 rounded-md px-4 py-2',
              }}
              {...props}
            />
          </div>
        )
    }
  }

  return renderInput()
}

export default DynamicInput
