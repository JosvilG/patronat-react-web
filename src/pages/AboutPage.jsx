import React from 'react'
import { useTranslation } from 'react-i18next'
import DynamicCard from '../components/Cards'

function AboutPage() {
  const { t } = useTranslation()

  return (
    <div className="min-h-screen px-4 bg-transparent">
      <div>
        <h1 className="text-center t64s"> About as</h1>
      </div>
      <section className="mt-[84px] justify-end flex flex-col items-end">
        <h2 className="t64s mb-[30px]">Our story</h2>
        <p className="t24r text-end">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut et massa
          mi. Aliquam in hendrerit urna. Pellentesque sit amet sapien fringilla,
          mattis ligula consectetur, ultrices mauris. Maecenas vitae mattis
          tellus. Nullam quis imperdiet augue. Vestibulum auctor ornare leo, non
          suscipit magna interdum eu. Curabitur pellentesque nibh nibh, at
          maximus ante fermentum sit amet. Pellentesque commodo lacus at sodales
          sodales. Quisque sagittis orci ut diam condimentum, vel euismod erat
          placerat. In iaculis arcu eros, eget tempus orci facilisis id.Lorem
          ipsum dolor sit amet, consectetur adipiscing elit. Ut et massa mi.
          Aliquam in hendrerit urna. Pellentesque sit amet sapien fringilla,
          mattis ligula consectetur, ultrices mauris. Maecenas vitae mattis
          tellus. Nullam quis imperdiet augue. Vestibulum auctor ornare leo, non
          suscipit magna interdum eu. Curabitur pellentesque nibh nibh, at
          maximus ante fermentum sit amet. Pellentesque commodo lacus at sodales
          sodales. Quisque sagittis orci ut diam condimentum, vel euismod erat
          placerat. In iaculis arcu eros, eget tempus orci facilisis id.Lorem
          ipsum dolor sit amet, consectetur adipiscing elit. Ut et massa mi.
          Aliquam in hendrerit urna. Pellentesque sit amet sapien fringilla,
          mattis ligula consectetur, ultrices mauris. Maecenas vitae mattis
          tellus. Nullam quis imperdiet augue. Vestibulum auctor ornare leo, non
          suscipit magna interdum eu. Curabitur pellentesque nibh nibh, at
          maximus ante fermentum sit amet. Pellentesque commodo lacus at sodales
          sodales. Quisque sagittis orci ut diam condimentum, vel euismod erat
          placerat. In iaculis arcu eros, eget tempus orci facilisis id.Lorem
          ipsum dolor sit amet, consectetur adipiscing elit. Ut et massa mi.
          Aliquam in hendrerit urna. Pellentesque sit amet sapien fringilla,
          mattis ligula consectetur, ultrices mauris. Maecenas vitae mattis
          tellus. Nullam quis imperdiet augue. Vestibulum auctor ornare leo, non
          suscipit magna interdum eu. Curabitur pellentesque nibh nibh, at
          maximus ante fermentum sit amet. Pellentesque commodo lacus at sodales
          sodales. Quisque sagittis orci ut diam condimentum, vel euismod erat
          placerat. In iaculis arcu eros, eget tempus orci facilisis id.Lorem
          ipsum dolor sit amet, consectetur adipiscing elit. Ut et massa mi.
          Aliquam in hendrerit urna. Pellentesque sit amet sapien fringilla,
          mattis ligula consectetur, ultrices mauris. Maecenas vitae mattis
          tellus. Nullam quis imperdiet augue. Vestibulum auctor ornare leo, non
          suscipit magna interdum eu. Curabitur pellentesque nibh nibh, at
          maximus ante fermentum sit amet. Pellentesque commodo lacus at sodales
          sodales. Quisque sagittis orci ut diam condimentum, vel euismod erat
          placerat. In iaculis arcu eros, eget tempus orci facilisis id.
        </p>
      </section>
      <section className="mt-[84px] text-left justify-start flex flex-col items-start">
        <h2 className="t64s mb-[30px]">Motivation</h2>
        <p className="t24r text-start">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut et massa
          mi. Aliquam in hendrerit urna. Pellentesque sit amet sapien fringilla,
          mattis ligula consectetur, ultrices mauris. Maecenas vitae mattis
          tellus. Nullam quis imperdiet augue. Vestibulum auctor ornare leo, non
          suscipit magna interdum eu. Curabitur pellentesque nibh nibh, at
          maximus ante fermentum sit amet. Pellentesque commodo lacus at sodales
          sodales. Quisque sagittis orci ut diam condimentum, vel euismod erat
          placerat. In iaculis arcu eros, eget tempus orci facilisis id.Lorem
          ipsum dolor sit amet, consectetur adipiscing elit. Ut et massa mi.
          Aliquam in hendrerit urna. Pellentesque sit amet sapien fringilla,
          mattis ligula consectetur, ultrices mauris. Maecenas vitae mattis
          tellus. Nullam quis imperdiet augue.
        </p>
      </section>
      <section className="mt-[84px] flex flex-col">
        <h2 className="t64s mb-[84px] text-end">Actual STAFF</h2>
        <div className="flex h-[400px] mb-[84px]">
          <div className="w-[550px]">
            <DynamicCard
              t={t}
              imageUrl="/assets/Patronat_color_1024x1024.webp"
            ></DynamicCard>
          </div>
          <div className="ml-3 max-w-[794px]">
            <h3 className="t64s">Juan Carlos</h3>
            <h4 className="t36r text-[#000000] opacity-50">Sangres Muiña</h4>
            <p className="t20r">
              Lorem ipsum dolor sit amet, consectetur adipisicing elit.
              Accusamus voluptates ad, dolorum ipsa assumenda atque facere
              accusantium, corrupti ipsum corporis temporibus officia voluptatum
              sit exercitationem illo fugit saepe. Aperiam, quis.
            </p>
          </div>
        </div>
        <div className="flex flex-row-reverse h-[400px] mb-[84px]">
          <div className="w-[550px]">
            <DynamicCard
              t={t}
              imageUrl="/assets/Patronat_color_1024x1024.webp"
            ></DynamicCard>
          </div>
          <div className="mr-3 max-w-[794px]">
            <h3 className="t64s text-end">Susana</h3>
            <h4 className="t36r text-[#000000] opacity-50 text-end">
              Garcia Panisello
            </h4>
            <p className="t20r text-end">
              Lorem ipsum dolor sit amet, consectetur adipisicing elit.
              Accusamus voluptates ad, dolorum ipsa assumenda atque facere
              accusantium, corrupti ipsum corporis temporibus officia voluptatum
              sit exercitationem illo fugit saepe. Aperiam, quis.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}

export default AboutPage
