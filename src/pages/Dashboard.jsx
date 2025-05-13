import React from 'react'
import { Link } from 'react-router-dom'
import DynamicButton from '../components/Buttons'
import { cards } from '../data/dashboardCards'

export default function Dashboard() {
  return (
    <div className="px-5 pb-6 min-h-dvh ">
      <h1 className="mb-10 text-center t64b">Panel de Administración</h1>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.id}
            className="overflow-hidden transition-all duration-300 border border-gray-200 shadow-lg rounded-2xl hover:shadow-xl hover:scale-[1.01] hover:border-gray-300 text-[#696969] backdrop-blur-lg backdrop-saturate-[180%] bg-[rgba(255,255,255,0.75)]"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="text-5xl">{card.icon || '📄'}</div>
                <div className="px-3 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-full">
                  {card.actions ? `${card.actions.length} acciones` : ''}
                </div>
              </div>

              <h2 className="mb-2 text-2xl font-bold text-gray-800">
                {card.title}
              </h2>
              <p className="mb-6 text-gray-600">{card.description}</p>

              {card.actions && (
                <div className="flex flex-col gap-2 mt-6 -ml-4 w-fit">
                  {card.actions.map((action) => (
                    <Link key={action.id} to={action.route} className="block">
                      <DynamicButton size="medium" state="normal" type="button">
                        {action.title}
                      </DynamicButton>
                    </Link>
                  ))}
                </div>
              )}

              {!card.actions && card.route && (
                <Link to={card.route} className="block mt-4">
                  <DynamicButton
                    type="view"
                    state="normal"
                    size="medium"
                    className="w-full"
                  >
                    Acceder
                  </DynamicButton>
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
