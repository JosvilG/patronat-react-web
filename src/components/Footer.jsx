import React from 'react'

function Footer() {
  return (
    <footer className="w-full h-[211px] bg-[#D9D9D9] max-sm:h-64 max-sm:mb-0 text-black flex flex-col items-center relative">
      <p className="absolute text-center t20sb top-10 max-sm:top-6">
        Carretera del Reguers, km 1, Roquetes
        <br />
        43520 Tarragona, España <br /> patronatfestesroquetes@gmail.com
      </p>
      <div className="absolute bottom-0 flex justify-between w-full px-4 direction-row max-sm:bottom-6">
        <p className="text-black opacity-50 t12sb bottom-4 left-4">
          © 2024 Patronat de Festes de Roquetes. <br />
          Todos los derechos reservados.
        </p>
        <div className="text-end">
          <p className="text-black opacity-50 t12sb bottom-4 left-4 ">
            Web designed and developed by: Josep Vilchez Garcia
          </p>
          <p className="text-black opacity-50 t14sb bottom-4 left-4">
            jvgcontacto@gmail.com or +34 650 851 990
          </p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
