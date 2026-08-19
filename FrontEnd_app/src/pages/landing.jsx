import LandingButton from '../components/LandingButton'
import LandingFooter from '../components/LandingFooter'
import LandingHeader from '../components/LandingHeader'
import JourneyTimeline from '../components/JourneyTimeline'
import ProgressCard from '../components/ProgressCard'
import LandingPlans from '../components/LandingPlans'
import aiAvatar from '../assets/images/ai_avatar.png'

function HeroIllustration() {
  return (
    <div className="relative grid min-h-[480px] place-items-center py-6 lg:min-h-[560px]" aria-hidden="true">
      {/* Decorative ambient backdrop */}
      <div className="pointer-events-none absolute inset-0 -z-10 grid place-items-center">
        <div className="h-[360px] w-[360px] rounded-full bg-gradient-to-tr from-[#88bf8a]/30 to-[#dfeee1]/50 blur-3xl" />
      </div>

      {/* Floating Avatar */}
      <div className="relative">
        <img
          className="relative z-10 mx-auto w-[85%] max-w-[420px] animate-[ai-avatar-float_4s_ease-in-out_infinite] drop-shadow-[0_25px_35px_rgba(15,93,30,0.28)]"
          src={aiAvatar}
          alt="Lingora AI Tutor Companion"
        />

        {/* Floating Interactive Badges */}
        <div className="absolute -left-4 top-8 z-20 hidden items-center gap-2.5 rounded-2xl border border-white/80 bg-white/95 px-4 py-2.5 shadow-[0_12px_28px_rgba(28,67,39,0.12)] backdrop-blur-md transition-transform hover:scale-105 sm:flex">
          <span className="grid size-8 place-items-center rounded-xl bg-[#dfeee1] text-[#0f5d1e]">
            <span className="material-symbols-outlined text-lg">record_voice_over</span>
          </span>
          <div className="text-left">
            <p className="text-[11px] font-extrabold text-[#111]">Patient Voice Coach</p>
            <p className="text-[10px] text-[#666]">"Let's practice at your pace"</p>
          </div>
        </div>

        <div className="absolute -bottom-2 -right-4 z-20 hidden items-center gap-2.5 rounded-2xl border border-white/80 bg-white/95 px-4 py-2.5 shadow-[0_12px_28px_rgba(28,67,39,0.12)] backdrop-blur-md transition-transform hover:scale-105 sm:flex">
          <span className="grid size-8 place-items-center rounded-xl bg-[#e4f0e6] text-[#2d8738]">
            <span className="material-symbols-outlined text-lg">verified</span>
          </span>
          <div className="text-left">
            <p className="text-[11px] font-extrabold text-[#111]">Cognitive-Friendly</p>
            <p className="text-[10px] text-[#0f5d1e] font-semibold">Zero Stress • No Timers</p>
          </div>
        </div>
      </div>

      <style>
        {`
          @keyframes ai-avatar-float {
            0%, 100% {
              transform: translateY(0);
            }
            50% {
              transform: translateY(-16px);
            }
          }
        `}
      </style>
    </div>
  )
}

function ValueHighlights() {
  const highlights = [
    {
      icon: 'psychology',
      title: 'Empathetic AI Companion',
      desc: 'Practice speaking and reading 24/7 without judgement or embarrassment.',
    },
    {
      icon: 'timer_off',
      title: 'Zero Countdown Pressure',
      desc: 'No anxious countdowns. Take all the time you need to absorb each phrase.',
    },
    {
      icon: 'auto_stories',
      title: 'Multi-Sensory Learning',
      desc: 'Rich audio pronunciation, phonetic breakdown, and clear visual cues.',
    },
    {
      icon: 'celebration',
      title: 'Celebrating Small Wins',
      desc: 'Gentle positive reinforcement tracking daily milestones and steady progress.',
    },
  ]

  return (
    <section className="relative z-10 border-y border-[#dfe9df]/80 bg-white/80 py-2 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {highlights.map((item, idx) => (
            <div
              key={idx}
              className="group flex flex-col items-start rounded-2xl border border-transparent p-4 transition-all duration-200 hover:border-[#88bf8a]/30 hover:bg-[#fbfaf9]"
            >
              <div className="mb-4 grid size-12 place-items-center rounded-2xl bg-[#dfeee1] text-[#0f5d1e] transition-transform duration-200 group-hover:scale-110">
                <span className="material-symbols-outlined text-2xl">{item.icon}</span>
              </div>
              <h3 className="text-base font-black text-[#111]">{item.title}</h3>
              <p className="mt-2 text-xs leading-relaxed text-[#555]">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function CallToAction() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-5" id="signup">
      <div className="relative overflow-hidden rounded-[36px] bg-gradient-to-br from-[#0f5d1e] via-[#1b702c] to-[#2d8738] px-8 py-16 text-center text-white shadow-[0_25px_60px_rgba(15,93,30,0.25)] sm:px-16">
        {/* Subtle background glow circle */}
        <div
          className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-white/10 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-20 -left-20 h-80 w-80 rounded-full bg-[#88bf8a]/20 blur-3xl"
          aria-hidden="true"
        />

        <div className="relative z-10 mx-auto max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/15 px-4 py-1.5 text-xs font-bold uppercase tracking-wider backdrop-blur-sm">
            <span className="material-symbols-outlined text-sm">rocket_launch</span>
            Your Journey Starts Today
          </div>
          <h2 className="mt-5 text-[clamp(32px,4vw,50px)] font-black leading-tight tracking-tight">
            Ready to Nurture Your Language Journey?
          </h2>
          <p className="mt-4 text-base leading-relaxed text-white/90 sm:text-lg">
            Join thousands of adults and neo-learners discovering the calm joy of reading, speaking, and connecting.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a
              href="/register"
              className="inline-flex min-h-[54px] w-full items-center justify-center gap-2 rounded-2xl bg-white px-8 text-sm font-black text-black shadow-lg transition-all duration-150 hover:-translate-y-0.5 hover:bg-[#fbfaf9] hover:shadow-xl sm:w-auto"
            >
              <span className="font-black text-black">Get Started Free</span>
              <span className="material-symbols-outlined text-base text-black">arrow_forward</span>
            </a>
            <a
              href="#plans"
              className="inline-flex min-h-[54px] w-full items-center justify-center gap-2 rounded-2xl border-2 border-white/40 bg-white/10 px-8 text-sm font-bold text-white backdrop-blur-sm transition-all duration-150 hover:-translate-y-0.5 hover:bg-white/20 sm:w-auto"
            >
              <span>Explore Plans</span>
              <span className="material-symbols-outlined text-base">expand_more</span>
            </a>
          </div>

          <p className="mt-5 text-xs font-medium text-white/80">
            ✓ No credit card required • ✓ Free starter lessons • ✓ Cancel anytime
          </p>
        </div>
      </div>
    </section>
  )
}

function TestimonialsSection() {
  const reviews = [
    {
      name: 'Margaret H.',
      role: 'Adult Neo-Learner, 8 months',
      initials: 'M',
      color: 'from-[#25304f] to-[#d8b58c]',
      quote:
        'I finally feel like I am learning at a pace that respects my life experience. The interface is calm, large, and easy to read. It has become the highlight of my mornings.',
    },
    {
      name: 'David R.',
      role: 'Lifelong Learner, 4 months',
      initials: 'D',
      color: 'from-[#0f5d1e] to-[#88bf8a]',
      quote:
        'Having the AI Voice Coach practice with me without rushing is a game changer. I used to feel nervous speaking out loud; now I look forward to my daily 15 minutes.',
    },
    {
      name: 'Elena & Maria S.',
      role: 'Family & Caregiver, 1 year',
      initials: 'E',
      color: 'from-[#633a11] to-[#deb887]',
      quote:
        'The Caregiver Dashboard lets me celebrate my mother’s milestones every week. Lingora has given her so much renewed independence and joy in reading.',
    },
  ]

  return (
    <section className="mx-auto max-w-7xl px-6 py-20" id="community">
      <div className="text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#88bf8a]/50 bg-[#dfeee1]/60 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-[#0f5d1e] shadow-sm">
          <span className="material-symbols-outlined text-sm">favorite</span>
          Learner Stories
        </div>
        <h2 className="mt-4 text-[clamp(30px,3.4vw,42px)] font-black leading-tight text-[#090909]">
          Loved by Learners & Families
        </h2>
        <p className="mt-3 text-base text-[#555]">
          Real journeys of confidence, literacy, and connection.
        </p>
      </div>

      <div className="mt-14 grid gap-8 md:grid-cols-3">
        {reviews.map((review, i) => (
          <div
            key={i}
            className="relative flex flex-col justify-between rounded-3xl border border-[#ececec] bg-white p-8 shadow-[0_16px_40px_rgba(28,67,39,0.08)] transition-transform duration-200 hover:-translate-y-1"
          >
            <div>
              {/* Star Rating */}
              <div className="flex items-center gap-1 text-[#2d8738]">
                {[...Array(5)].map((_, s) => (
                  <span key={s} className="material-symbols-outlined text-lg">
                    star
                  </span>
                ))}
              </div>
              <blockquote className="mt-4 text-sm italic leading-relaxed text-[#333]">
                "{review.quote}"
              </blockquote>
            </div>

            <div className="mt-8 flex items-center gap-3.5 border-t border-[#f0f0f0] pt-4">
              <span
                className={`grid size-11 shrink-0 place-items-center rounded-full bg-gradient-to-br ${review.color} text-sm font-black text-white shadow-sm`}
              >
                {review.initials}
              </span>
              <div>
                <h4 className="text-xs font-extrabold text-[#0f5d1e]">{review.name}</h4>
                <p className="text-[11px] text-[#777]">{review.role}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function Landing() {
  return (
    <main className="min-h-screen bg-[#fbfaf9] text-[#101010] [box-sizing:border-box] [&_*]:box-border [&_a]:text-inherit [&_a]:no-underline" id="top">
      <LandingHeader />

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Warm sunlit library photographic background with soft gradient blend */}
        <div
          className="pointer-events-none absolute inset-y-0 right-0 z-0 w-full bg-cover bg-center opacity-55 max-md:opacity-20 lg:w-[56%]"
          style={{
            backgroundImage: `linear-gradient(90deg, #fbfaf9 0%, rgba(251, 250, 249, 0.42) 32%, rgba(251, 250, 249, 0) 64%), linear-gradient(180deg, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0.72)), url('https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1200&q=80')`,
          }}
          aria-hidden="true"
        />

        <div className="relative z-10 mx-auto grid max-w-7xl min-h-[720px] grid-cols-1 items-center gap-12 px-6 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:px-12 lg:py-24">
          <div className="max-w-2xl">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-[#88bf8a]/50 bg-[#dfeee1]/70 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-[#0f5d1e] shadow-sm">
              <span className="material-symbols-outlined text-sm">spa</span>
              AI-Powered Literacy & Language Assistant
            </div>

            <h1 className="mt-5 text-[clamp(42px,5.4vw,72px)] font-black leading-[1.08] tracking-tight text-[#111]">
              Rediscover the <span className="block text-[#2d8738]">Joy of Language.</span>
            </h1>

            <p className="mt-5 max-w-lg text-lg leading-relaxed text-[#414141] sm:text-xl">
              A calm, empathetic sanctuary designed for adults and neo-learners. Learn to read, speak, and express yourself at your own natural pace.
            </p>

            {/* CTA Buttons */}
            <div className="mt-8 flex flex-col gap-3.5 sm:flex-row sm:items-center">
              <a
                href="/register"
                className="inline-flex min-h-[58px] items-center justify-center gap-2.5 rounded-2xl border-2 border-[#0f5d1e] bg-[#2d8738] px-8 text-base font-black text-white shadow-[0_12px_28px_rgba(20,110,36,0.22)] transition-all duration-150 hover:-translate-y-0.5 hover:bg-[#257630] hover:shadow-[0_16px_32px_rgba(20,110,36,0.32)]"
              >
                <span>Get Started Free</span>
                <span className="material-symbols-outlined text-lg">arrow_forward</span>
              </a>

              <a
                href="#plans"
                className="inline-flex min-h-[58px] items-center justify-center gap-2 rounded-2xl border-2 border-[#0f5d1e]/25 bg-white px-7 text-sm font-bold text-[#0f5d1e] transition-all duration-150 hover:-translate-y-0.5 hover:border-[#0f5d1e] hover:bg-[#dfeee1]/40"
              >
                <span className="material-symbols-outlined text-lg">loyalty</span>
                <span>View Plans</span>
              </a>
            </div>

            {/* Trust Metrics */}
            <div className="mt-10 flex flex-wrap items-center gap-6 border-t border-[#e5eae5] pt-6 text-xs text-[#555]">
              <div className="flex items-center gap-2">
                <div className="flex text-[#2d8738]">
                  {[...Array(5)].map((_, i) => (
                    <span key={i} className="material-symbols-outlined text-base">
                      star
                    </span>
                  ))}
                </div>
                <span className="font-bold text-[#111]">4.9/5 Rating</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-base text-[#2d8738]">check_circle</span>
                <span>12,000+ Adult Learners</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-base text-[#2d8738]">lock</span>
                <span>No Credit Card Required</span>
              </div>
            </div>
          </div>

          <HeroIllustration />
        </div>
      </section>

      {/* Feature Highlights Bar */}
      <ValueHighlights />

      {/* Journey Timeline */}
      <JourneyTimeline />

      {/* Progress Card Section */}
      <ProgressCard />

      {/* Plans & Pricing Container */}
      <LandingPlans />

      {/* Testimonials */}
      <TestimonialsSection />

      {/* Final Call to Action */}
      <CallToAction />

      {/* Footer */}
      <LandingFooter />
    </main>
  )
}

export default Landing
