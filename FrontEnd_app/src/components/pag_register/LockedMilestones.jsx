const languages = [
  { label: 'English', icon: 'translate' },
  { label: 'Hindi', icon: 'record_voice_over' },
  { label: 'Telugu', icon: 'menu_book' },
]

function LockedMilestones({
  firstOptionRef,
  isActive,
  loadingRef,
  selectedInterest,
  onSelectInterest,
}) {
  const isLanguageSelected = Boolean(selectedInterest)

  return (
    <section
      className={`w-full max-w-[760px] text-center transition-all duration-700 ease-out ${isActive
          ? 'mt-4 translate-y-0 opacity-100'
          : 'pointer-events-none mt-0 max-h-0 -translate-y-8 overflow-hidden opacity-0'
        }`}
    >
      <div
        className={`glass-panel premium-card overflow-hidden rounded-[28px] border border-black/5 px-9 py-9 shadow-[0_26px_44px_rgba(0,0,0,0.12)] transition-all duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] max-sm:px-5 ${isLanguageSelected
            ? 'max-h-0 border-transparent bg-white px-0 py-0 text-[#566052] opacity-0 shadow-none'
            : isActive
              ? 'max-h-[420px] bg-white text-[#566052]'
              : 'max-h-[420px] bg-white/55 text-[#a7a7a7]'
          }`}
      >
        <div className="flex items-center gap-5 text-left">
          <span
            className={`grid place-items-center rounded-full font-black transition-all duration-700 ${isLanguageSelected ? 'size-9 bg-[#0f6f25] text-base text-white' : 'size-10 text-lg'
              } ${isActive ? 'bg-[#0f6f25] text-white' : 'bg-[#eeeeee]'}`}
          >
            2
          </span>
          <h2
            className={`font-medium leading-tight text-[#202020] transition-all duration-700 ${isLanguageSelected ? 'text-xl' : 'text-[clamp(32px,4vw,42px)]'
              }`}
          >
            Step 2: What language are you comfortable with?
          </h2>
        </div>

        <div
          className={`grid overflow-hidden transition-all duration-700 max-sm:grid-cols-1 ${isLanguageSelected ? 'mt-0 max-h-0 opacity-0' : 'mt-10 max-h-[220px] grid-cols-3 gap-4 opacity-100'
            }`}
        >
          {languages.map((item) => (
            <button
              className={`grid min-h-[130px] place-items-center rounded-2xl border-2 bg-white px-4 transition ${selectedInterest === item.label
                  ? 'border-[#0f6f25] text-[#0f6f25] shadow-[0_12px_22px_rgba(15,111,37,0.14)]'
                  : 'border-[#dadada] hover:border-[#0f6f25]/50 hover:text-[#0f6f25]'
                } ${isActive ? 'cursor-pointer' : 'cursor-default'}`}
              disabled={!isActive}
              key={item.label}
              onClick={() => onSelectInterest(item.label)}
              ref={item.label === languages[0].label ? firstOptionRef : undefined}
              type="button"
            >
              <span className="material-symbols-outlined text-4xl" aria-hidden="true">
                {item.icon}
              </span>
              <span className="text-base">{item.label}</span>
            </button>
          ))}
        </div>

        <p
          className={`overflow-hidden text-sm transition-all duration-700 ${isLanguageSelected ? 'mt-3 max-h-10 opacity-100' : 'mt-7 max-h-10 opacity-100'
            }`}
        >
          {isLanguageSelected
            ? `${selectedInterest} selected`
            : isActive
              ? 'Choose the language you are most comfortable with...'
              : 'Finish step 1 to unlock these languages...'}
        </p>
      </div>

      <div
        ref={loadingRef}
        tabIndex={-1}
        aria-live="polite"
        className={`relative z-40 grid justify-items-center gap-5 outline-none transition-all duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] ${selectedInterest
            ? 'mt-6 -translate-x-[230px] -translate-y-6 scale-110 text-[#0f6f25] opacity-100 max-md:translate-x-0 max-md:translate-y-16'
            : 'mt-12 translate-x-0 translate-y-0 scale-100 text-[#dedbd6] opacity-70'
          }`}
      >
        <style>
          {`
            @keyframes loading-breathe {
              0%, 100% {
                transform: translateY(0) scale(1);
                filter: drop-shadow(0 0 0 rgba(15,111,37,0));
              }
              50% {
                transform: translateY(-8px) scale(1.05);
                filter: drop-shadow(0 18px 28px rgba(15,111,37,0.22));
              }
            }

            @keyframes loading-orbit {
              0% {
                transform: rotate(0deg) translateX(8px) rotate(0deg);
              }
              100% {
                transform: rotate(360deg) translateX(8px) rotate(-360deg);
              }
            }

            @keyframes loading-glow {
              0%, 100% {
                box-shadow: 0 18px 34px rgba(15,111,37,0.14);
              }
              50% {
                box-shadow: 0 22px 45px rgba(15,111,37,0.35);
              }
            }
          `}
        </style>
        <div className="fixed left-50 top-5 translate-55 z-10">
          <div
            className={`grid justify-items-center gap-5 transition-all duration-700 ${selectedInterest
                ? 'animate-[loading-breathe_2.4s_ease-in-out_infinite]'
                : ''
              }`}
          >
            <span
              className={`grid place-items-center rounded-full bg-[#fbf1ea] transition-all duration-700 ${selectedInterest
                  ? 'size-28 shadow-[0_18px_34px_rgba(15,111,37,0.14)]'
                  : 'size-24'
                }`}
            >
              <span className="material-symbols-outlined text-5xl" aria-hidden="true">
                auto_awesome
              </span>
            </span>

            <p className="text-lg text-center">
              {selectedInterest
                ? `${selectedInterest} world loading...`
                : 'Your Personalized World'}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

export default LockedMilestones
