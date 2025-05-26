import React from 'react'
import { Pagination, Stack, Typography, Box } from '@mui/material'
import PropTypes from 'prop-types'
import { useTranslation } from 'react-i18next'

/**
 * @param {Object} props
 * @returns {JSX.Element}
 */
const PaginationControl = ({
  page,
  count,
  totalItems,
  onChange,
  showItemCount = true,
  size = 'medium',
  className = '',
  scrollToTop = true,
}) => {
  const { t } = useTranslation()
  const handlePageChange = (event, newPage) => {
    if (scrollToTop) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
    onChange(event, newPage)
  }

  return (
    <Box className={className || 'my-4'}>
      {count > 1 && (
        <Stack spacing={2} alignItems="center">
          <Pagination
            page={page}
            count={count}
            onChange={handlePageChange}
            size={size}
            showFirstButton
            showLastButton
            siblingCount={1}
          />
        </Stack>
      )}

      {/* Información de rango de elementos */}
      {showItemCount && totalItems > 0 && (
        <Typography
          variant="body2"
          color="text.secondary"
          align="center"
          className="mt-2"
        ></Typography>
      )}
    </Box>
  )
}

PaginationControl.propTypes = {
  page: PropTypes.number.isRequired,
  count: PropTypes.number.isRequired,
  totalItems: PropTypes.number.isRequired,
  itemsPerPage: PropTypes.number.isRequired,
  onChange: PropTypes.func.isRequired,
  showItemCount: PropTypes.bool,
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  className: PropTypes.string,
  scrollToTop: PropTypes.bool,
  itemName: PropTypes.string,
}

export default PaginationControl
