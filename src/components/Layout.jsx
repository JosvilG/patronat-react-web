import React from 'react'
import { Outlet } from 'react-router-dom'
import { Navbar } from './Navbar'
import Footer from './Footer'

function Layout() {
  return (
    <div>
      <Navbar />
      <div className=" justify-self-center sm:max-w-[1200px] max-w-[300px] min-h-dvh w-full">
        <Outlet />
      </div>
      <Footer />
    </div>
  )
}

export default Layout
