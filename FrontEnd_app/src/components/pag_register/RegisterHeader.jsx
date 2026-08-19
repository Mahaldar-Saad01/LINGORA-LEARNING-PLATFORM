import { Link } from 'react-router-dom'

function RegisterHeader() {
  return (
    <header className="relative z-20 grid min-h-[66px] grid-cols-[1fr_auto_1fr] items-center border-b border-black/5 bg-[#fbfaf9]/95 px-10 backdrop-blur-md max-md:grid-cols-[1fr_auto] max-md:px-5">
      <Link
        className="inline-flex items-center gap-3 text-sm font-semibold text-[#555f52] transition hover:text-[#0f6f25]"
        to="/"
      >
        <span className="material-symbols-outlined text-xl" aria-hidden="true">
          arrow_back
        </span>
        Exit Journey
      </Link>

      <Link className="text-center text-3xl font-black text-[#0f6f25] max-sm:text-2xl" to="/">
        Lingora Learning
      </Link>

      <div className="flex justify-end max-md:hidden" aria-label="Registration progress">
        <span className="h-2 w-24 overflow-hidden rounded-full bg-[#e4e1df]">
          <span className="xp-bar-fill block h-full rounded-full bg-[#0f6f25]" style={{ '--xp-target': '33.333%' }} />
        </span>
      </div>
    </header>
  )
}

export default RegisterHeader
