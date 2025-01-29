import React from 'react'
import PropTypes from 'prop-types'
import '../animations/loading.css'

const Loader = ({ loading, size = '50px', color = '#25b09b' }) => {
  if (!loading) return null

  const loaderStyle = {
    width: size,
    aspectRatio: '1',
    borderRightColor: color,
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-white backdrop-blur-sm"
      role="status"
      aria-live="polite"
    >
      <div className="loader" style={loaderStyle}></div>
    </div>
  )
}

Loader.propTypes = {
  loading: PropTypes.bool.isRequired,
  size: PropTypes.string,
  color: PropTypes.string,
}

export default Loader
