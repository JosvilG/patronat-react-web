import React, { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import DynamicCard from './../components/Cards'
import useEvents from '../hooks/useEvents'
import Calendar from '../components/Calendar'
import { useTranslation } from 'react-i18next'
import useGallery from '../hooks/useGallery'
import { Link } from 'react-router-dom'
import { Trans } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'

function HomePage() {
  const { t } = useTranslation()
  const {
    galleryImages,
    loadingGallery,
    currentGalleryIndex,
    handleGalleryNext,
    handleGalleryPrev,
  } = useGallery()
  const { events, loading: loadingEvents, handleEventClick } = useEvents()

  const upcomingEvents = events
    .filter((event) => {
      const eventStartDate = new Date(event.start)
      const eventEndDate = event.end ? new Date(event.end) : null
      const now = new Date()

      const isSameDay =
        eventStartDate.getDate() === now.getDate() &&
        eventStartDate.getMonth() === now.getMonth() &&
        eventStartDate.getFullYear() === now.getFullYear()

      const isActive =
        eventEndDate && now >= eventStartDate && now <= eventEndDate
      const isFuture = eventStartDate >= now

      return isSameDay || isActive || isFuture
    })
    .sort((a, b) => new Date(a.start) - new Date(b.start))
    .slice(0, 3)

  return (
    <div className="flex flex-col items-center min-h-screen px-4 bg-transparent">
      <HeroSection t={t} />
      <AboutSection t={t} />
      <GallerySection
        t={t}
        galleryImages={galleryImages}
        loadingGallery={loadingGallery}
        currentGalleryIndex={currentGalleryIndex}
        onNext={handleGalleryNext}
        onPrev={handleGalleryPrev}
      />
      <EventsSection
        t={t}
        events={upcomingEvents}
        loadingEvents={loadingEvents}
        onEventClick={handleEventClick}
      />
      <Calendar />
      <WantToParticipateSection t={t} />
    </div>
  )
}

const HeroSection = ({ t }) => (
  <section className="relative top-0 h-[690px] -mt-16 mb-[84px] bg-transparent">
    <div className="absolute inset-0 bg-transparent" />
    <div className="relative flex flex-col justify-between h-full">
      <p
        className="w-auto font-bold text-black t36r text-9xl"
        dangerouslySetInnerHTML={{
          __html: t('pages.home.heroSection.description'),
        }}
      ></p>
      <div className="">
        <p
          className="font-bold text-black t64xl text-9xl text-end"
          dangerouslySetInnerHTML={{
            __html: t('pages.home.heroSection.title'),
          }}
        ></p>
        <p
          className="font-bold t96b text-9xl text-end text-[#15642E]"
          dangerouslySetInnerHTML={{
            __html: t('pages.home.heroSection.roquetesTitle'),
          }}
        ></p>
      </div>
    </div>
  </section>
)

const GallerySection = ({
  t,
  galleryImages,
  loadingGallery,
  currentGalleryIndex,
  onNext,
  onPrev,
}) => {
  const [isChanging, setIsChanging] = useState(false)

  const handlePrev = () => {
    if (!isChanging) {
      setIsChanging(true)
      onPrev()
      setTimeout(() => setIsChanging(false), 500)
    }
  }

  const handleNext = () => {
    if (!isChanging) {
      setIsChanging(true)
      onNext()
      setTimeout(() => setIsChanging(false), 500)
    }
  }

  useEffect(() => {
    if (galleryImages.length > 0) {
      galleryImages.forEach((image) => {
        const img = new Image()
        img.src = image.url
      })
    }
  }, [galleryImages])

  return (
    <section className="py-16 bg-transparent">
      <h2 className="mb-6 text-right t64s">
        <a href="/gallery">{t('pages.home.galerySection.title')}</a>
      </h2>
      {loadingGallery ? (
        <div className="flex items-center justify-center">
          {/* <Loader loading={loadingGallery} /> */}
        </div>
      ) : galleryImages.length >= 3 ? (
        <div className="relative">
          <div className="flex justify-center overflow-hidden max-sm:h-[400px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={`left-${currentGalleryIndex}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 0.5, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.4 }}
                className="flex-shrink-0"
              >
                <GalleryCard
                  galleryImages={galleryImages}
                  index={
                    (currentGalleryIndex - 1 + galleryImages.length) %
                    galleryImages.length
                  }
                  opacity={0.5}
                  scale={0.9}
                />
              </motion.div>
              <motion.div
                key={`center-${currentGalleryIndex}`}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.4 }}
                className="flex-shrink-0 "
              >
                <GalleryCard
                  galleryImages={galleryImages}
                  index={currentGalleryIndex}
                />
              </motion.div>
              <motion.div
                key={`right-${currentGalleryIndex}`}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 0.5, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.4 }}
                className="flex-shrink-0"
              >
                <GalleryCard
                  galleryImages={galleryImages}
                  index={(currentGalleryIndex + 1) % galleryImages.length}
                  opacity={0.5}
                  scale={0.9}
                />
              </motion.div>
            </AnimatePresence>
          </div>
          <GalleryNavigation
            onPrev={handlePrev}
            onNext={handleNext}
            disabled={isChanging}
          />
        </div>
      ) : galleryImages.length >= 1 ? (
        <div className="flex justify-center">
          <GalleryCard
            galleryImages={galleryImages}
            index={currentGalleryIndex}
          />
          {galleryImages.length === 2 && (
            <GalleryCard
              galleryImages={galleryImages}
              index={(currentGalleryIndex + 1) % galleryImages.length}
            />
          )}
        </div>
      ) : galleryImages.length === 0 ? (
        <p className="text-center">{t('pages.home.gallerySection.noImages')}</p>
      ) : null}
    </section>
  )
}

const GalleryCard = ({ galleryImages, index, opacity = 1, scale = 1 }) => (
  <motion.div
    className="flex-shrink-0 max-sm:w-[380px] w-[550px] h-[530px] transition-all duration-300 px-3"
    style={{ opacity, scale }}
  >
    <DynamicCard
      type="gallery"
      title={galleryImages[index]?.name}
      imageUrl={galleryImages[index]?.url}
      description={galleryImages[index]?.description}
    />
  </motion.div>
)

const AboutSection = ({ t }) => (
  <section className="py-10 mb-[84px] text-center bg-transparent">
    <h2 className="text-left t64s mb-[48px]">
      <a href="/about">{t('pages.home.aboutSection.title')}</a>
    </h2>
    <p className="t24l m-w-[1109px]">
      {t('pages.home.aboutSection.description')}
    </p>
  </section>
)

const GalleryNavigation = ({ onPrev, onNext, disabled }) => (
  <>
    <div className="absolute inset-y-0 left-0 flex items-center justify-center">
      <motion.button
        onClick={onPrev}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        disabled={disabled}
        className={`p-2 text-black t36b backdrop-blur-lg shadow-[0px_12px_20px_rgba(0,0,0,0.7)] backdrop-saturate-[180%] bg-[rgba(255,255,255,0.8)] max-sm:w-[40px] max-sm:h-[40px] h-[80px] w-[80px] rounded-full transition-transform duration-300 ${disabled ? 'opacity-70 cursor-not-allowed' : 'hover:bg-[rgba(255,255,255,0.9)]'}`}
      >
        &lt;
      </motion.button>
    </div>
    <div className="absolute inset-y-0 right-0 flex items-center justify-center">
      <motion.button
        onClick={onNext}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        disabled={disabled}
        className={`p-2 text-black t36b backdrop-blur-lg shadow-[0px_12px_20px_rgba(0,0,0,0.7)] backdrop-saturate-[180%] bg-[rgba(255,255,255,0.8)] max-sm:w-[40px] max-sm:h-[40px] h-[80px] w-[80px] rounded-full transition-transform duration-300 ${disabled ? 'opacity-70 cursor-not-allowed' : 'hover:bg-[rgba(255,255,255,0.9)]'}`}
      >
        &gt;
      </motion.button>
    </div>
  </>
)

const EventsSection = ({ t, events, loadingEvents, onEventClick }) => (
  <section className="py-16 bg-transparent">
    <h2 className="mb-6 text-left t64s">
      <a href="/events-list"> {t('pages.home.eventSection.title')}</a>
    </h2>
    {loadingEvents ? (
      <div className="flex items-center justify-center">
        {/* <Loader loading={loadingEvents} /> */}
      </div>
    ) : events.length > 0 ? (
      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        {events.map((event) => (
          <div key={event.eventId} onClick={() => onEventClick(event)}>
            <DynamicCard
              type="event"
              title={event.title}
              description={event.description}
              date={new Date(event.start).toLocaleDateString('es-ES', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
              imageUrl={
                event.eventURL
                  ? event.eventURL
                  : event.imageURL
                    ? event.imageURL
                    : '/placeholder.png'
              }
              link={`/event/${event.title.toLowerCase().replace(/ /g, '-')}`}
            />
          </div>
        ))}
      </div>
    ) : (
      <p className="text-center"> {t('pages.home.eventSection.noEvents')}</p>
    )}
  </section>
)

const WantToParticipateSection = ({ t }) => (
  <section className="wantTo py-10 mb-[84px] text-center bg-transparent">
    <h2 className="text-right t64s mb-[48px]">
      {t('pages.home.wantToParticipateSection.title')}
    </h2>
    <p className="t24l m-w-[1109px] text-right mb-[40px]">
      {t('pages.home.wantToParticipateSection.firstPar')}
    </p>
    <p className="t24l m-w-[1109px] text-left mb-[40px]">
      {t('pages.home.wantToParticipateSection.secondPar')}
    </p>
    <p className="t24l m-w-[1109px] text-right mb-[40px]">
      {t('pages.home.wantToParticipateSection.thirdPar')}
    </p>
    <p className="t24l m-w-[1109px] text-center mb-[40px]">
      <Trans
        i18nKey="pages.home.wantToParticipateSection.linksPar"
        components={{
          2: (
            <Link to="/new-crew">
              <b className="underline t24b" />
            </Link>
          ),
          1: (
            <Link to="/partner-form">
              <b className="underline t24b" />
            </Link>
          ),
        }}
      />
    </p>
  </section>
)

GallerySection.propTypes = {
  galleryImages: PropTypes.array.isRequired,
  loadingGallery: PropTypes.bool.isRequired,
  currentGalleryIndex: PropTypes.number.isRequired,
  onNext: PropTypes.func.isRequired,
  onPrev: PropTypes.func.isRequired,
  t: PropTypes.func.isRequired,
}

AboutSection.propTypes = {
  t: PropTypes.func.isRequired,
}

HeroSection.propTypes = {
  t: PropTypes.func.isRequired,
}

WantToParticipateSection.propTypes = {
  t: PropTypes.func.isRequired,
}

EventsSection.propTypes = {
  t: PropTypes.func.isRequired,
  events: PropTypes.array.isRequired,
  loadingEvents: PropTypes.bool.isRequired,
  onEventClick: PropTypes.func.isRequired,
}

GalleryNavigation.propTypes = {
  onPrev: PropTypes.func.isRequired,
  onNext: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
}

GalleryCard.propTypes = {
  galleryImages: PropTypes.array.isRequired,
  index: PropTypes.number.isRequired,
  opacity: PropTypes.number,
  scale: PropTypes.number,
}

export default HomePage
