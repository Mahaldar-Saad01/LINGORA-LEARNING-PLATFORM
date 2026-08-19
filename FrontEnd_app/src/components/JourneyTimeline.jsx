const journeySteps = [
  {
    title: 'AI Language Coach',
    text: 'Your wise companion available 24/7. Practice conversation without any pressure, just encouragement.',
    icon: 'chat',
    preview: 'voice',
  },
  {
    title: 'Calm Learning Environment',
    text: 'Designed with clarity and large text to respect your vision and focus. No stressful timers or loud gamification.',
    icon: 'leaf',
    preview: 'text',
  },
  {
    title: 'Tailored for You',
    text: 'We adjust to your cognitive pace. Whether you want to master travel basics or deep cultural history, your journey is unique.',
    icon: 'spark',
    preview: 'image',
  },
]

function StepIcon({ type }) {
  const iconName = type === 'leaf' ? 'spa' : type === 'spark' ? 'person_celebrate' : 'mic'
  const iconSize = type === 'spark' || type === 'leaf' ? 'text-3xl' : 'text-xl'

  return (
    <span
      className="z-[1] grid size-[52px] place-items-center rounded-full border-2 border-[#0f5d1e] bg-[#2d8738] text-lg font-black text-white shadow-[0_10px_20px_rgba(16,97,31,0.2)]"
      aria-hidden="true"
    >
      <span className={`material-symbols-outlined ${iconSize}`}>{iconName}</span>
    </span>
  )
}

function StepPreview({ type }) {
  if (type === 'voice') {
    return (
      <div
        className="grid min-h-[76px] grid-cols-[34px_1fr] items-center gap-[18px] rounded-[14px] border border-[#e7e7e7] bg-white px-5 py-4 text-3xl font-extrabold text-[#cbcbcb] shadow-[0_20px_45px_rgba(28,67,39,0.12)]"
        aria-hidden="true"
      >
        <span className="size-[30px] rounded-full bg-[#dfeee1]" />
        <div>
          <i className="my-2 block h-2 w-[88%] rounded-full bg-[#ece8e5]" />
          <i className="my-2 block h-2 w-[56%] rounded-full bg-[#ece8e5]" />
        </div>
      </div>
    )
  }

  if (type === 'image') {
    return (
      <div
        className="grid min-h-[76px] grid-cols-3 items-center overflow-hidden rounded-[14px] border border-[#e7e7e7] bg-white p-4 shadow-[0_20px_45px_rgba(28,67,39,0.12)]"
        aria-hidden="true"
      >
        {[0, 1, 2].map((item) => (
          <span
            className="min-h-[58px] bg-cover bg-center"
            key={item}
            style={{
              backgroundImage:
                "linear-gradient(90deg, rgba(255,255,255,0.7), transparent), url('https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=500&q=80')",
            }}
          />
        ))}
      </div>
    )
  }

  return (
    <div
      className="grid min-h-[76px] items-center rounded-[14px] border border-[#e7e7e7] bg-white px-5 py-4 text-3xl font-extrabold text-[#cbcbcb] shadow-[0_20px_45px_rgba(28,67,39,0.12)]"
      aria-hidden="true"
    >
      No Pressure.
    </div>
  )
}

function JourneyStep({ step, index }) {
  const isReversed = index % 2 === 1

  return (
    <div className="relative z-[1] grid grid-cols-[1fr_52px_1fr] items-center gap-8 max-md:grid-cols-[52px_1fr] max-md:gap-[18px]">
      <div
        className={`${isReversed ? 'col-start-3 row-start-1 text-left max-md:col-start-2' : 'text-right'
          } max-md:col-start-2 max-md:row-start-1 max-md:text-left`}
      >
        <h3 className="mb-2 text-lg font-bold text-[#0f5d1e]">{step.title}</h3>
        <p className="text-[13px] leading-snug text-[#555]">{step.text}</p>
      </div>

      <StepIcon type={step.icon} />

      <div
        className={`${isReversed ? 'col-start-1 row-start-1 max-md:col-start-2 max-md:row-start-2' : ''
          } max-md:col-start-2 max-md:row-start-2`}
      >
        <StepPreview type={step.preview} />
      </div>
    </div>
  )
}

function JourneyTimeline() {
  return (
    <section className="mx-auto max-w-[800px] px-6 py-20 text-center" id="lessons">
      <div className="inline-flex items-center gap-2 rounded-full border border-[#88bf8a]/50 bg-[#dfeee1]/60 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-[#0f5d1e] shadow-sm">
        <span className="material-symbols-outlined text-sm">timeline</span>
        Step-by-Step Methodology
      </div>
      <h2 className="mt-4 text-[clamp(30px,3.4vw,42px)] font-black leading-tight text-[#090909]">
        How Your Journey Unfolds
      </h2>
      <p className="mt-3 text-base text-[#555]">
        Designed thoughtfully to eliminate cognitive overwhelm and foster natural retention.
      </p>
      <div
        className="relative mt-12 grid gap-7 before:absolute before:inset-y-0 before:left-1/2 before:w-0.5 before:bg-[#dfe9df] max-md:before:left-[25px]"
        aria-label="Learning journey steps"
      >
        {journeySteps.map((step, index) => (
          <JourneyStep key={step.title} step={step} index={index} />
        ))}
      </div>
    </section>
  )
}

export default JourneyTimeline
