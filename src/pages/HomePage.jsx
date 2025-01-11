import React from 'react'
import { Calendar } from '../components/Calendar'
import { EventCard } from '../components/EventCard'
import { Navbar } from '../components/Navbar'

function HomePage() {
  return (
    <div className="min-h-screen bg-black">
      <Navbar />

      <section
        id="video-section"
        className="relative top-0 h-screen -mt-16 bg-gray-300"
      >
        <div className="absolute inset-0 z-0 bg-black opacity-50" />
        <div className="relative z-10 flex items-center justify-center h-full">
          <h1 className="font-bold text-center text-white text-9xl">
            PATRONAT DE FESTES DE ROQUETES
          </h1>
        </div>
      </section>

      <section className="py-10 text-center bg-white">
        <h2 className="text-3xl font-semibold">Nuestra Misión</h2>
        <p className="max-w-3xl mx-auto mt-4 text-lg text-gray-700">
          El Patronat de Festes de Roquetes es una entidad sin ánimo de lucro
          independiente y apolítico se encarga de organizar fiestas y eventos
          para el pueblo de Roquetes en Tarragona. Aquí podrás encontrar toda la
          información sobre los eventos más próximos y mucho más.
        </p>
      </section>

      <section className="py-16 bg-gray-50">
        <h2 className="mb-6 text-3xl font-semibold text-center">
          Eventos Destacados
        </h2>
        <div className="grid grid-cols-1 gap-8 mx-auto max-w-7xl sm:grid-cols-2 md:grid-cols-3">
          <EventCard />
          <EventCard />
          <EventCard />
        </div>
      </section>

      <section className="py-16 bg-white">
        <h2 className="mb-6 text-3xl font-semibold text-center">
          Calendario de Eventos
        </h2>
        <div className="mx-auto max-w-7xl">
          <Calendar />
        </div>
      </section>

      <section className="py-16 bg-gray-50">
        <h2 className="mb-6 text-3xl font-semibold text-center">
          Galería de Fotos
        </h2>
        <div className="grid grid-cols-1 gap-8 mx-auto max-w-7xl sm:grid-cols-2 md:grid-cols-3">
          <div className="h-64 bg-gray-300 rounded-lg" />
          <div className="h-64 bg-gray-300 rounded-lg" />
          <div className="h-64 bg-gray-300 rounded-lg" />
        </div>
      </section>
    </div>
  )
}

export default HomePage
