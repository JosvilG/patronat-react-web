import React from 'react'
import PropTypes from 'prop-types'
import { useTranslation } from 'react-i18next'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import VisibilityIcon from '@mui/icons-material/Visibility'
import SaveIcon from '@mui/icons-material/Save'
import CancelIcon from '@mui/icons-material/Cancel'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import AddCircleIcon from '@mui/icons-material/AddCircle'
import LoopIcon from '@mui/icons-material/Loop'
import SendIcon from '@mui/icons-material/Send'

const DynamicButton = ({ size, state, type, textId, children, ...props }) => {
  const { t } = useTranslation()

  const getSizeClasses = (size) => {
    switch (size) {
      case 'large':
        return 'w-[400px] h-[56px]'
      case 'medium':
        return 'w-[250px] h-[56px]'
      case 'small':
        return 'w-[150px] h-[41px]'
      case 'x-small':
        return 'w-[41px] h-[41px]'
      default:
        return 'w-[250px]'
    }
  }

  const getStateClasses = (state) => {
    switch (state) {
      case 'normal':
        return 'bg-[#3A3A3A] text-[#FFFFFF] hover:bg-[#696969] hover:text-[#3A3A3A]'
      case 'disabled':
        return 'bg-[rgba(91,91,91,0.53)] text-[rgba(80,79,80,0.31)] cursor-not-allowed'
      case 'highlighted':
        return 'bg-[#696969] text-[#3A3A3A] hover:bg-[#3A3A3A] hover:text-[#FFFFFF]'
      default:
        return 'bg-[#3A3A3A] text-[#FFFFFF]'
    }
  }

  const getTypeClasses = (type) => {
    switch (type) {
      case 'delete':
        return {
          icon: <DeleteIcon />,
          classes:
            'bg-[#EB0E00] text-[#FFFFFF] hover:bg-[#E55C52] hover:text-[#FFFFFF]',
        }
      case 'edit':
        return {
          icon: <EditIcon />,
        }
      case 'view':
        return {
          icon: <VisibilityIcon />,
        }
      case 'save':
        return {
          icon: <SaveIcon />,
        }
      case 'cancel':
        return {
          icon: <CancelIcon />,
        }
      case 'confirm':
        return {
          icon: <CheckCircleIcon />,
        }
      case 'add':
        return {
          icon: <AddCircleIcon />,
        }
      case 'loading':
        return {
          icon: <LoopIcon className="animate-spin" />,
        }
      case 'submit':
        return {
          icon: <SendIcon />,
        }
      default:
        return { icon: null, classes: '' }
    }
  }

  const sizeClasses = getSizeClasses(size)
  const stateClasses = getStateClasses(state)
  const { icon, classes: typeClasses } = getTypeClasses(type)

  return (
    <button
      className={`t16s flex justify-center items-center ${sizeClasses} ${stateClasses} px-4 py-2 rounded-[60px] ${props.className} ${typeClasses}`}
      disabled={state === 'disabled' || props.disabled}
      {...props}
    >
      {textId ? t(textId) : icon || children || ''}
    </button>
  )
}

DynamicButton.propTypes = {
  size: PropTypes.string,
  state: PropTypes.string,
  type: PropTypes.string,
  textId: PropTypes.string,
  children: PropTypes.node,
  className: PropTypes.string,
  disabled: PropTypes.bool,
}

export default DynamicButton
