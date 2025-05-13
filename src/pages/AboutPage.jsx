import React from 'react'
import { useTranslation } from 'react-i18next'
import DynamicCard from '../components/Cards'
import useStaffMembers from '../hooks/useStaffMembers'

function AboutPage() {
  const { t } = useTranslation()
  const { staffMembers, loading, error } = useStaffMembers()

  return (
    <div className="px-4 pb-6 bg-transparent min-h-dvh">
      <div>
        <h1 className="text-center t64b">
          {t('aboutSection.mainTitle', 'Sobre nosotros')}
        </h1>
      </div>
      <section className="mt-[84px] text-left justify-start flex flex-col items-start">
        <h2 className="t40s mb-[30px]">
          {t('aboutSection.title', '¿Quiénes somos?')}
        </h2>
        <p className="t24r text-start">
          {t(
            'aboutSection.description',
            'El Patronat de Festes de Roquetes es una organización independiente y apolítica sin ánimo de lucro encargada de organizar festivales y eventos para la localidad de Roquetes en Tarragona. Aquí puedes encontrar toda la información sobre los próximos eventos y mucho más.'
          )}
        </p>
      </section>

      <section className="mt-[84px] justify-end flex flex-col items-end">
        <h2 className="t40s mb-[30px]">
          {t('aboutSection.historyTitle', 'Nuestra historia')}
        </h2>
        <p className="t24r text-end">
          {t(
            'aboutSection.historyDescription',
            'El Patronat de Festes de Roquetes nació en 1973 con un objetivo claro: preservar y promover las fiestas populares que dan vida a nuestra ciudad. Desde entonces, hemos sido parte esencial de la identidad de Roquetes, organizando cada año celebraciones que combinan tradición, cultura y participación. A lo largo de los años, más de un centenar de personas han contribuido con su esfuerzo y pasión a consolidar esta entidad como uno de los pilares festivos del municipio. Hoy, con más de cinco décadas de historia, seguimos creciendo con el mismo espíritu con el que empezamos: hacer de cada fiesta un reflejo del alma de Roquetes.'
          )}
        </p>
      </section>

      <section className="mt-[84px] justify-start flex flex-col items-start">
        <h2 className="t40s mb-[30px]">
          {t('aboutSection.motivationTitle', 'Motivación')}
        </h2>
        <p className="t24r text-start">
          {t(
            'aboutSection.motivationDescription',
            'Creemos que las fiestas son mucho más que celebraciones: son momentos que fortalecen los vínculos, que nos conectan con nuestras raíces y que nos permiten compartir lo mejor de nosotros mismos. Nos motiva ver a niños, jóvenes y mayores vivir con ilusión cada acto, cada tradición y cada encuentro. Trabajamos con entusiasmo para ofrecer propuestas inclusivas, creativas y con sentido comunitario. Nuestra motivación es clara: seguir construyendo, a través de las fiestas, una Roquetes viva, unida y orgullosa de su cultura.'
          )}
        </p>
      </section>

      <section className="mt-[84px] flex flex-col">
        <h2 className="t64s mb-[84px] text-end">
          {t('aboutSection.staffTitle', 'Actual STAFF')}
        </h2>

        {loading && (
          <p className="text-center t24r">
            {t('aboutSection.loadingStaff', 'Cargando miembros del staff...')}
          </p>
        )}

        {error && (
          <p className="text-center text-red-500 t24r">
            {t('aboutSection.errorStaff', 'Error al cargar el staff:')} {error}
          </p>
        )}

        {!loading && !error && staffMembers.length === 0 && (
          <p className="text-center t24r">
            {t(
              'aboutSection.noStaffMembers',
              'No se encontraron miembros del staff.'
            )}
          </p>
        )}

        {!loading &&
          !error &&
          staffMembers.map((member, index) => (
            <div
              key={member.id}
              className={`flex ${index % 2 !== 0 ? 'flex-row-reverse' : ''} h-[400px] mb-[84px]`}
            >
              <div className="w-[550px]">
                <DynamicCard
                  t={t}
                  imageUrl={
                    member.documentUrl ||
                    '/assets/Patronat_color_1024x1024.webp'
                  }
                />
              </div>
              <div
                className={`${index % 2 !== 0 ? 'mr-4' : 'ml-4'} max-w-[794px]`}
              >
                <h3 className={`t64b ${index % 2 !== 0 ? 'text-end' : ''}`}>
                  {member.firstName || t('aboutSection.defaultName', 'Nombre')}
                </h3>
                <h4
                  className={`t36s text-[#000000] opacity-50 ${index % 2 !== 0 ? 'text-end' : ''}`}
                >
                  {member.lastName ||
                    t('aboutSection.defaultLastName', 'Apellido')}
                </h4>
                <span
                  className={`t18r italic text-[#000000] opacity-70 ${index % 2 !== 0 ? 'text-end' : ''} block mb-2`}
                >
                  {member.position ||
                    t('aboutSection.defaultPosition', 'Miembro')}
                </span>
                <p className={`t24r ${index % 2 !== 0 ? 'text-end' : ''}`}>
                  {member.description ||
                    t(
                      'aboutSection.defaultDescription',
                      'Este miembro del staff no tiene descripción disponible.'
                    )}
                </p>
              </div>
            </div>
          ))}
      </section>
    </div>
  )
}

export default AboutPage
