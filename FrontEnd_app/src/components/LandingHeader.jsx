import LandingButton from './LandingButton'

const navItems = [
  { label: 'How It Works', href: '#lessons' },
  { label: 'Progress', href: '#library' },
  { label: 'Plans & Pricing', href: '#plans' },
  { label: 'Community', href: '#community' },
]

function LandingHeader() {
  return (
    <header className="sticky top-0 z-50 flex min-h-[64px] items-center justify-between border-b border-[#0f5d1e]/10 bg-white/95 px-6 backdrop-blur-md transition-all sm:px-10">
      <a
        className="flex items-center gap-2 text-2xl font-black tracking-tight text-[#0f5d1e] transition-opacity hover:opacity-90"
        href="#top"
        aria-label="Lingora Learning Home"
      >
        <span className="grid size-8 place-items-center rounded-xl bg-[#dfeee1] text-[#0f5d1e]">
          <span className="material-symbols-outlined text-xl">auto_stories</span>
        </span>
        <span>Lingora</span>
      </a>

      <nav className="flex items-center gap-7 text-sm font-semibold text-[#444] max-lg:hidden" aria-label="Primary navigation">
        {navItems.map((item) => (
          <a
            className="transition-colors hover:text-[#0f5d1e]"
            key={item.label}
            href={item.href}
          >
            {item.label}
          </a>
        ))}
      </nav>

      <div className="flex items-center gap-3">
        <a
          href="/login"
          className="rounded-xl border border-[#0f5d1e]/25 bg-white px-4 py-2 text-xs font-bold text-[#0f5d1e] transition-all hover:bg-[#dfeee1]/40"
        >
          Log In
        </a>
        <a
          href="/register"
          className="rounded-xl border border-[#0f5d1e] bg-[#2d8738] px-4 py-2 text-xs font-bold text-white shadow-sm transition-all hover:bg-[#257630] hover:shadow-md"
        >
          Get Started
        </a>
      </div>
    </header>
  )
}

export default LandingHeader
