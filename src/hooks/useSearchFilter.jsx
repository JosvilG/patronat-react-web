import { useState, useEffect, useCallback, useRef } from 'react'

/**
 * Custom hook to filter a collection by search terms
 * @param {Array} initialItems - Initial collection of elements
 * @param {Object} options - Optional configuration options
 * @returns {Object} - State and methods to handle the search
 */
const useSearchFilter = (initialItems = [], options = {}) => {
  const [items, setItems] = useState(initialItems)
  const [searchQuery, setSearchQuery] = useState('')
  const [inputValue, setInputValue] = useState('')
  const [filteredItems, setFilteredItems] = useState(initialItems)
  
  // Usar useRef para el timer para evitar problemas de cierre (closure)
  const timerRef = useRef(null)

  // Default configuration
  const {
    searchFields = ['name', 'description'],
    arrayFields = [],
    debounceTime = 300,
    caseSensitive = false,
  } = options

  // Limpiar el timer cuando el componente se desmonte
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [])

  /**
   * Apply search filter to elements
   */
  const applySearchFilter = useCallback(() => {
    // Evitar operaciones innecesarias si el componente se está desmontando
    if (!searchQuery.trim()) {
      setFilteredItems(items)
      return
    }

    // Resto de código existente...
    const searchTerm = caseSensitive
      ? searchQuery.trim()
      : searchQuery.trim().toLowerCase()

    const filtered = items.filter((item) => {
      // Search in text fields
      const matchesText = searchFields.some((field) => {
        if (!item[field]) return false
        const fieldValue = caseSensitive
          ? String(item[field])
          : String(item[field]).toLowerCase()
        return fieldValue.includes(searchTerm)
      })

      if (matchesText) return true

      // Search in array type fields
      const matchesArray = arrayFields.some((field) => {
        if (!item[field] || !Array.isArray(item[field])) return false
        return item[field].some((value) => {
          if (value === null || value === undefined) return false
          const arrayValue = caseSensitive ? String(value) : String(value).toLowerCase()
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
  }, [searchQuery, items]) // Quitar applySearchFilter de las dependencias para evitar ciclos

  /**
   * Handles search field changes with debounce
   */
  const handleSearchChange = useCallback(
    (event) => {
      const query = event?.target?.value || ''
      
      // Actualizar inmediatamente el valor del input
      setInputValue(query)
      
      // Limpiar el timer anterior si existe
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }

      // Crear un nuevo timer con referencia guardada
      timerRef.current = setTimeout(() => {
        setSearchQuery(query)
        // Asegurar que la referencia se borra después de usarla
        timerRef.current = null
      }, debounceTime)
    },
    [debounceTime] // Quitar timer de las dependencias y usar timerRef
  )

  /**
   * Updates the collection of items
   */
  const updateItems = useCallback((newItems) => {
    setItems(Array.isArray(newItems) ? newItems : [])
  }, [])

  return {
    searchQuery: inputValue,
    filteredItems,
    handleSearchChange,
    setSearchQuery: (query) => {
      setInputValue(query);
      setSearchQuery(query);
    },
    updateItems,
  }
}

export default useSearchFilter
