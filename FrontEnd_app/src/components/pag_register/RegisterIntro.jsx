import aiAvatar from '../../assets/images/ai_avatar.png'

function RegisterIntro({
  activeStep,
  assistantRef,
  isSideLayout = false,
  name,
  selectedInterest,
  promptOverride,
}) {
  const isChoosingPassion = activeStep === 2
  const isLanguageSelected = Boolean(selectedInterest)
  const displayName = name.trim() || 'Traveler'
  const prompt = promptOverride
    ? promptOverride
    : selectedInterest
      ? {
        title: `Beautiful choice, ${displayName}!`,
        text: `${selectedInterest} is a great comfort language. I will use it to make your journey feel easier.`,
      }
      : isChoosingPassion
        ? {
          title: `Nice to meet you, ${displayName}!`,
          text: 'Now tell me which language you are comfortable with. I will guide you from there.',
        }
        : {
          title: 'Welcome, Traveler!',
          text: "Let's start your adventure. How should I call you in this community?",
        }

  return (
    <section
      className={`relative z-20 px-6 pt-8 transition-all duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] max-sm:pt-6 ${isSideLayout
          ? 'mx-0 max-w-none pb-4 text-left lg:sticky lg:top-24 lg:self-start lg:pl-10 lg:pr-0 lg:pt-12 max-md:text-center'
          : `mx-auto max-w-5xl text-center ${isChoosingPassion ? 'pb-0' : 'pb-4'}`
        }`}
    >
      <h1
        className={`text-[clamp(34px,5vw,36px)] font-black leading-tight text-[#202020] transition-all duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] ${isChoosingPassion && !isSideLayout ? 'md:-translate-y-3 md:scale-90 md:opacity-70' : ''
          }`}
      >
        Join our community of lifelong learners
      </h1>
      <p
        className={`mt-2 text-base font-medium text-[#6b7066] transition-all duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] ${isChoosingPassion && !isSideLayout ? 'md:-mt-1 md:opacity-60' : ''
          }`}
      >
        A peaceful space to grow your knowledge at your own pace.
      </p>

      <div
        className={`relative z-30 mt-6 flex gap-6 text-left transition-all duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] ${isSideLayout
            ? 'mx-0 max-w-[460px] flex-col items-start justify-start max-md:mx-auto max-md:items-center max-md:text-center'
            : `mx-auto max-w-[830px] items-center justify-center max-md:flex-col max-md:text-center ${isLanguageSelected
              ? 'translate-x-[360px] translate-y-[218px] scale-[0.86] max-xl:translate-x-[260px] max-md:translate-x-0 max-md:translate-y-16'
              : isChoosingPassion
                ? 'translate-x-[120px] translate-y-[138px] scale-[0.92] max-md:translate-x-0 max-md:translate-y-8'
                : 'translate-x-0 translate-y-0 scale-100'
            }`
          }`}
      >
        <div
          className={`transition-all duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] ${!isSideLayout && isLanguageSelected ? 'md:-translate-y-4' : !isSideLayout && isChoosingPassion ? 'md:-translate-y-2' : ''
            }`}
        >
          <img
            className="floating w-50 drop-shadow-[0_18px_24px_rgba(46,125,50,0.28)]"
            src={aiAvatar}
            alt="Lingora assistant"
          />
        </div>

        <div
          ref={assistantRef}
          tabIndex={-1}
          aria-live="polite"
          className={`glass-panel premium-card relative max-w-md rounded-[28px] border-4 !border-[#0f6f25] px-7 py-5 shadow-[0_18px_40px_rgba(28,67,39,0.08)] after:absolute after:size-8 after:rotate-45 after:border-[#0f6f25] after:bg-white/80 max-md:after:left-1/2 max-md:after:-translate-x-1/2 ${isSideLayout
              ? 'after:-top-[17px] after:left-12 after:border-l-2 after:border-t-2 max-md:after:left-1/2'
              : isLanguageSelected || isChoosingPassion
                ? 'after:-left-[17px] after:top-1/2 after:-translate-y-1/2 after:border-b-2 after:border-l-2 max-md:after:-bottom-[17px] max-md:after:left-1/2 max-md:after:top-auto max-md:after:border-b-2 max-md:after:border-l-0 max-md:after:border-r-2'
                : 'after:-bottom-[17px] after:left-10 after:border-b-2 after:border-r-2'
            }`}
        >
          <h2 className="text-xl font-extrabold text-[#21803a]">{prompt.title}</h2>
          <p className="mt-3 font-xbold text-sm leading-relaxed text-[#565f53]">
            {prompt.text}
          </p>
        </div>
      </div>
    </section>
  )
}

export default RegisterIntro
