import React from 'react'
import { Outlet } from 'react-router-dom'
import { Navbar } from './Navbar'
import Footer from './Footer'
import LiveChat from '../pages/contact/LiveChat'

function Layout() {
  return (
    <div>
      <Navbar />
      <div className="justify-self-center max-w-[1200px] min-h-dvh w-full">
        <Outlet />
      </div>
      <Footer />
      <LiveChat />
    </div>
  )
}

export default Layout
