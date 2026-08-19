const progressDays = [
  { day: 'M', value: 76 },
  { day: 'T', value: 44 },
  { day: 'W', value: 78 },
  { day: 'T', value: 96 },
  { day: 'F', value: 54 },
  { day: 'S', value: 80 },
  { day: 'S', value: 36 },
]

function ProgressCard() {
  return (
    <section className="mx-auto max-w-[800px] px-6 py-2 text-center" id="library">
      <div className="inline-flex items-center gap-2 rounded-full border border-[#88bf8a]/50 bg-[#dfeee1]/60 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-[#0f5d1e] shadow-sm">
        <span className="material-symbols-outlined text-sm">insights</span>
        Calm Habit Building
      </div>
      <h2 className="mt-4 text-[clamp(30px,3.4vw,42px)] font-black leading-tight text-[#090909]">
        Your Progress, Always in Sight
      </h2>
      <p className="mx-auto mt-3 max-w-xl text-base leading-relaxed text-[#555]">
        Celebrate every small win. We track your learning journey so you can see how far
        you've come, with gentle encouragement and zero stress.
      </p>

      <div
        className="mx-auto mt-12 w-full max-w-[420px] rounded-[32px] border border-[#ececec] bg-white px-8 pb-8 pt-8 text-left shadow-[0_20px_45px_rgba(28,67,39,0.1)] transition-transform duration-200 hover:-translate-y-1 max-sm:rounded-[24px] max-sm:px-6 max-sm:py-6"
        aria-label="Weekly progress"
      >
        <div className="flex items-center justify-between">
          <span className="text-[15px] font-extrabold text-[#0f5d1e]">
            <small className="block text-[11px] font-extrabold uppercase tracking-[0.7px] text-[#939393]">
              Weekly Goal
            </small>
            15 minutes / day
          </span>
          <span
            className="grid size-14 place-items-center rounded-full bg-[#e4f0e6] text-[#2d8738]"
            aria-hidden="true"
          >
            /
          </span>
        </div>

        <div className="mt-[30px] flex items-center justify-between gap-6 max-sm:items-end">
          <div className="grid h-[118px] grid-cols-7 items-end gap-3.5 max-sm:gap-[9px]">
            {progressDays.map((item, index) => (
              <span
                key={`${item.day}-${index}`}
                className="grid h-full w-5 items-end justify-items-center max-sm:w-3.5"
              >
                <i
                  className={`min-h-[18px] w-full rounded-full ${index % 2 === 1 || index === 4 || index === 6 ? 'bg-[#cfe7d4]' : 'bg-[#2d8738]'
                    }`}
                  style={{ height: `${item.value}%` }}
                />
                <small className="mt-4 text-[10px] text-[#454545]">{item.day}</small>
              </span>
            ))}
          </div>

          <div className="min-w-[82px] text-center text-[#0f5d1e]">
            <strong className="block text-[34px] leading-none max-sm:text-[28px]">85%</strong>
            <span className="text-xs text-[#606060]">This Week</span>
          </div>
        </div>
      </div>
    </section>
  )
}

export default ProgressCard
