import React, { useState } from 'react'
import PropTypes from 'prop-types'

const DynamicItems = ({ items }) => {
  const [expandedIndex, setExpandedIndex] = useState(null)

  return (
    <div className="px-4 pb-[20px]">
      {items.map((item, index) => (
        <div key={index} className="relative w-fit min-w-[400px] max-w-[100%]">
          <div
            className={`flex items-center justify-between px-4 py-2 h-[40px] text-[#252525] hover:text-gray-700 max-w-[100%] ${
              index !== items.length - 1 && item.type !== 'eventData'
                ? 'border-b border-[#252525]'
                : ''
            }`}
          >
            {item.icon && (
              <div className="t16l flex flex-row justify-center items-center h-[46px] w-[76px] text-[#252525] hover:text-gray-700">
                {typeof item.icon === 'string' ? (
                  <img src={item.icon} alt="icon" className="w-6 h-6" />
                ) : (
                  item.icon
                )}
              </div>
            )}

            <div
              className={`flex ${item.type === 'eventData' ? 'flex-row' : 'flex-col'}`}
            >
              <span
                className="t16b text-base text-[#252525] truncate overflow-hidden whitespace-nowrap mr-4"
                title={item.title}
              >
                {item.title}
              </span>
              {item.description && (
                <span
                  className="overflow-hidden text-sm truncate t16r whitespace-nowrap"
                  title={item.description}
                >
                  {item.description}
                </span>
              )}
            </div>

            {item.badge && (
              <div className="t16l flex flex-row items-center h-[46px] w-[76px] text-[#252525] hover:text-gray-700 overflow-hidden text-ellipsis">
                {item.badge}
              </div>
            )}

            {item.haveChevron && (
              <button
                onClick={() => {
                  if (item.link) {
                    window.location.href = item.link
                  } else if (item.action) {
                    item.action()
                  }
                }}
                className="flex flex-row justify-center items-center ml-2 h-[46px] w-[76px] text-[#252525] hover:text-gray-700 border-l-2 border-[#252525]"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            )}

            {item.expandable && (
              <button
                onClick={() =>
                  setExpandedIndex((prev) => (prev === index ? null : index))
                }
                className="ml-4 text-sm text-blue-500 hover:underline"
              >
                {expandedIndex === index ? 'Collapse' : 'Expand'}
              </button>
            )}
          </div>

          {item.expandable && expandedIndex === index && (
            <div className="t16l mt-2 px-4 text-[#252525]">
              {item.expandableContent}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

DynamicItems.propTypes = {
  items: PropTypes.arrayOf(
    PropTypes.shape({
      title: PropTypes.string.isRequired,
      description: PropTypes.string,
      icon: PropTypes.oneOfType([PropTypes.string, PropTypes.element]),
      badge: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      expandable: PropTypes.bool,
      expandableContent: PropTypes.node,
      haveChevron: PropTypes.bool,
      link: PropTypes.string,
      action: PropTypes.func,
      type: PropTypes.string,
    })
  ).isRequired,
}

export default DynamicItems
