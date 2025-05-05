import React from 'react'
import { Outlet } from 'react-router-dom'
import { Navbar } from './Navbar'
import Footer from './Footer'

function Layout() {
  return (
    <div>
      <Navbar />
      <div className="mt-16 justify-self-center max-w-[1200px]">
        <Outlet />
      </div>
      <Footer />
    </div>
  )
}

export default Layout
