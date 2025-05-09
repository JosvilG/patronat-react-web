import { useState, useEffect, useCallback } from 'react'

/**
 * Custom hook to filter a collection by search terms
 * @param {Array} initialItems - Initial collection of elements
 * @param {Object} options - Optional configuration options
 * @returns {Object} - State and methods to handle the search
 */
const useSearchFilter = (initialItems = [], options = {}) => {
  const [items, setItems] = useState(initialItems)
  const [searchQuery, setSearchQuery] = useState('')
  const [filteredItems, setFilteredItems] = useState(initialItems)
  const [timer, setTimer] = useState(null)

  // Default configuration
  const {
    searchFields = ['name', 'description'], // Text fields to search in
    arrayFields = [], // Array type fields to search in
    debounceTime = 300, // Debounce time in ms
    caseSensitive = false, // Case sensitivity
  } = options

  /**
   * Apply search filter to elements
   */
  const applySearchFilter = useCallback(() => {
    if (!searchQuery.trim()) {
      setFilteredItems(items)
      return
    }

    // Prepare the search term for comparison
    const searchTerm = caseSensitive
      ? searchQuery.trim()
      : searchQuery.trim().toLowerCase()

    // Filter elements that match the search term
    const filtered = items.filter((item) => {
      // Search in text fields
      const matchesText = searchFields.some((field) => {
        if (!item[field]) return false
        const fieldValue = caseSensitive
          ? item[field]
          : item[field].toLowerCase()
        return fieldValue.includes(searchTerm)
      })

      if (matchesText) return true

      // Search in array type fields
      const matchesArray = arrayFields.some((field) => {
        if (!item[field] || !Array.isArray(item[field])) return false
        return item[field].some((value) => {
          const arrayValue = caseSensitive ? value : value.toLowerCase()
          return arrayValue.includes(searchTerm)
        })
      })

      return matchesArray
    })

    setFilteredItems(filtered)
  }, [searchQuery, items, searchFields, arrayFields, caseSensitive])

  // Apply filter when query or items change
  useEffect(() => {
    applySearchFilter()
  }, [applySearchFilter])

  /**
   * Handles search field changes with debounce
   */
  const handleSearchChange = useCallback(
    (event) => {
      const query = event?.target?.value || ''

      if (timer) {
        clearTimeout(timer)
      }

      setSearchQuery(query)

      // Apply debounce
      const newTimer = setTimeout(() => {
        setSearchQuery(query)
      }, debounceTime)

      setTimer(newTimer)
    },
    [debounceTime, timer]
  )

  /**
   * Updates the collection of items
   */
  const updateItems = useCallback((newItems) => {
    setItems(newItems)
  }, [])

  // Clean up the timer when unmounting
  useEffect(() => {
    return () => {
      if (timer) {
        clearTimeout(timer)
      }
    }
  }, [timer])

  return {
    searchQuery,
    filteredItems,
    handleSearchChange,
    setSearchQuery,
    updateItems,
  }
}

export default useSearchFilter
