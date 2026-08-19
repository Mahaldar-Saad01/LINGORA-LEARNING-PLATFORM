function LandingFooter() {
  return (
    <footer className="border-t border-[#e5eae5] bg-[#f4f7f4] px-6 py-14 sm:px-12">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-10 sm:grid-cols-2 md:grid-cols-4 lg:gap-12">
          {/* Brand Col */}
          <div className="space-y-4 sm:col-span-2 md:col-span-1">
            <a
              className="flex items-center gap-2 text-xl font-black text-[#0f5d1e]"
              href="#top"
            >
              <span className="grid size-7 place-items-center rounded-lg bg-[#dfeee1] text-[#0f5d1e]">
                <span className="material-symbols-outlined text-lg">auto_stories</span>
              </span>
              <span>Lingora</span>
            </a>
            <p className="text-xs leading-relaxed text-[#555]">
              A calm, AI-assisted literacy companion designed for adults and neo-learners to build confidence at their own pace.
            </p>
            <div className="flex items-center gap-3 pt-2 text-[#0f5d1e]">
              <span className="grid size-8 place-items-center rounded-full bg-white shadow-sm">
                <span className="material-symbols-outlined text-base">eco</span>
              </span>
              <span className="text-xs font-semibold text-[#333]">Zero-Pressure Learning</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#111]">Platform</h4>
            <ul className="mt-4 space-y-2.5 text-xs text-[#555]">
              <li><a href="#lessons" className="hover:text-[#0f5d1e] transition-colors">How It Works</a></li>
              <li><a href="#library" className="hover:text-[#0f5d1e] transition-colors">Progress Tracking</a></li>
              <li><a href="#plans" className="hover:text-[#0f5d1e] transition-colors">Plans & Pricing</a></li>
              <li><a href="/login" className="hover:text-[#0f5d1e] transition-colors">Learner Login</a></li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#111]">Resources</h4>
            <ul className="mt-4 space-y-2.5 text-xs text-[#555]">
              <li><a href="#community" className="hover:text-[#0f5d1e] transition-colors">Learner Stories</a></li>
              <li><a href="#plans" className="hover:text-[#0f5d1e] transition-colors">Scholarship Program</a></li>
              <li><a href="#signup" className="hover:text-[#0f5d1e] transition-colors">Caregiver Guide</a></li>
            </ul>
          </div>

          {/* Trust & Legal */}
          <div>
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#111]">Trust & Legal</h4>
            <ul className="mt-4 space-y-2.5 text-xs text-[#555]">
              <li><a href="#top" className="hover:text-[#0f5d1e] transition-colors">Privacy Policy</a></li>
              <li><a href="#top" className="hover:text-[#0f5d1e] transition-colors">Terms of Service</a></li>
              <li><a href="#top" className="hover:text-[#0f5d1e] transition-colors">Accessibility Statement</a></li>
              <li><a href="#top" className="hover:text-[#0f5d1e] transition-colors">Help Center</a></li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-[#e2e8e2] pt-6 text-center text-xs text-[#777] sm:flex-row sm:text-left">
          <p>© 2026 Lingora Learning. Nurturing curiosity and literacy for every generation.</p>
          <a
            href="#top"
            className="inline-flex items-center gap-1 font-bold text-[#0f5d1e] hover:underline"
          >
            <span>Back to top</span>
            <span className="material-symbols-outlined text-sm">arrow_upward</span>
          </a>
        </div>
      </div>
    </footer>
  )
}

export default LandingFooter
