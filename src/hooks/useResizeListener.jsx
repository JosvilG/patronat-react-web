import { useState, useEffect } from 'react'

// Hook personalizado para detectar el tamaño de la pantalla
export const useResizeListener = () => {
  const [isSmallScreen, setIsSmallScreen] = useState(window.innerWidth <= 987)

  useEffect(() => {
    const handleResize = () => {
      setIsSmallScreen(window.innerWidth <= 987) // Cambia el valor según el tamaño de la pantalla
    }

    // Se agrega el evento de resize
    window.addEventListener('resize', handleResize)

    // Cleanup: se elimina el evento cuando el componente se desmonta
    return () => window.removeEventListener('resize', handleResize)
  }, []) // El arreglo vacío asegura que solo se ejecute una vez al montar el componente

  return isSmallScreen
}
