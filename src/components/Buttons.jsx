import React from 'react'
import PropTypes from 'prop-types'
import { useTranslation } from 'react-i18next'

const DynamicButton = ({ size, state, textId, children, ...props }) => {
  const { t } = useTranslation()

  const getSizeClasses = (size) => {
    switch (size) {
      case 'large':
        return 'w-[400px] h-[56px]'
      case 'medium':
        return 'w-[250px] h-[56px]'
      case 'small':
        return 'w-[150px] h-[41px]'
      default:
        return 'w-[250px]'
    }
  }

  const getStateClasses = (state) => {
    switch (state) {
      case 'normal':
        return 'bg-[#3A3A3A] text-[#FFFFFF] hover:bg-[#696969] hover:text-[#3A3A3A]'
      case 'disabled':
        return 'bg-[rgba(91,91,91,0.53)] text-[rgba(80,79,80,0.31)]  cursor-not-allowed'
      case 'highlighted':
        return 'bg-[#696969] text-[#3A3A3A] hover:bg-[#3A3A3A] hover:text-[#FFFFFF]'
      default:
        return 'bg-[#3A3A3A] text-[#FFFFFF]'
    }
  }

  const sizeClasses = getSizeClasses(size)
  const stateClasses = getStateClasses(state)

  return (
    <button
      className={`t16s flex justify-center items-center ${sizeClasses} ${stateClasses} px-4 py-2 rounded-[60px] ${props.className}`}
      disabled={state === 'disabled' || props.disabled}
      {...props}
    >
      {textId ? t(textId) : children}
    </button>
  )
}
DynamicButton.propTypes = {
  size: PropTypes.string,
  state: PropTypes.string,
  textId: PropTypes.string,
  children: PropTypes.node,
  className: PropTypes.string,
  disabled: PropTypes.bool,
}

export default DynamicButton
