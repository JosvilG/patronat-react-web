import React from 'react'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import UnderConstruction from './pages/UnderConstruction'
import './translations/index'
import { publicRoutes, protectedRoutes } from './routes/routes'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          {/* Rutas públicas */}
          {publicRoutes.map(({ path, element }) => (
            <Route key={path} path={path} element={element} />
          ))}

          {/* Rutas protegidas */}
          {protectedRoutes.map(({ path, element }) => (
            <Route
              key={path}
              path={path}
              element={<ProtectedRoute>{element}</ProtectedRoute>}
            />
          ))}

          {/* Página en construcción para rutas no encontradas */}
          <Route path="*" element={<UnderConstruction />} />
        </Route>
      </Routes>
    </Router>
  )
}

export default App
