import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '../firebase/firebase'
import DynamicButton from '../components/Buttons'
import { cards } from '../data/dashboardCards'
import { useTranslation } from 'react-i18next'

export default function Dashboard() {
  const { t } = useTranslation()
  const [pendingCrews, setPendingCrews] = useState(0)
  const viewDictionary = 'dashboard'

  useEffect(() => {
    const fetchPendingCrews = async () => {
      try {
        const q = query(
          collection(db, 'crews'),
          where('status', '==', 'Pendiente')
        )
        const querySnapshot = await getDocs(q)
        setPendingCrews(querySnapshot.size)
      } catch (error) {
        console.error('Error al buscar peñas pendientes:', error)
      }
    }

    fetchPendingCrews()
  }, [])

  return (
    <div className="px-5 pb-6 min-h-dvh ">
      <h1 className="mb-10 text-center t40b sm:t64b">
        {t(`${viewDictionary}.title`)}
      </h1>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.id}
            className="overflow-hidden transition-all duration-300 border border-gray-200 shadow-lg rounded-2xl hover:shadow-xl hover:scale-[1.01] hover:border-gray-300 text-[#696969] backdrop-blur-lg backdrop-saturate-[180%] bg-[rgba(255,255,255,0.75)]"
          >
            <div className="items-center p-6 ">
              <div className="flex items-center justify-between mb-4">
                <div className="text-5xl">{card.icon || '📄'}</div>
                <div className="px-3 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-full">
                  {card.actions
                    ? t(`${viewDictionary}.actionsCount`, {
                        count: card.actions.length,
                      })
                    : ''}
                </div>
              </div>

              <h2 className="mb-2 text-2xl font-bold text-gray-800">
                {t(card.titleKey)}
              </h2>
              <p className="mb-6 text-gray-600">{t(card.descriptionKey)}</p>

              {card.actions && (
                <div className="flex flex-col gap-2 mt-6 -ml-4 w-fit">
                  {card.actions.map((action) => (
                    <Link key={action.id} to={action.route} className="block">
                      <div className="relative">
                        <DynamicButton
                          size="medium"
                          state="normal"
                          type="button"
                        >
                          {t(action.titleKey)}
                        </DynamicButton>

                        {action.id === 'crews-list' && pendingCrews > 0 && (
                          <div className="absolute top-0 right-0 flex items-center justify-center w-5 h-5 mt-2 mr-4 text-xs font-bold text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
                            {pendingCrews}
                          </div>
                        )}
                      </div>
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
                    {t(`${viewDictionary}.accessButton`)}
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
