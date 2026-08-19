import { useState } from 'react'

const plans = [
  {
    id: 'seedling',
    name: 'Seedling Starter',
    badge: 'Free Forever',
    tagline: 'Ideal for taking your first gentle steps in adult literacy and everyday confidence.',
    monthlyPrice: 0,
    annualPrice: 0,
    period: '/ month',
    highlighted: false,
    ctaText: 'Start Learning Free',
    ctaVariant: 'outline',
    features: [
      '15 minutes of calm daily lessons',
      'Basic AI conversation tutor (10 chats/day)',
      'Core vocabulary & essential words library',
      'Visual progress & streak tracking',
      'Community learner circle access',
      'Standard audio pronunciation guide',
    ],
  },
  {
    id: 'bloom',
    name: 'Bloom Pro',
    badge: 'Most Popular',
    tagline: 'Unlimited voice coaching and adaptive pacing for steady, confident daily mastery.',
    monthlyPrice: 12,
    annualPrice: 9,
    period: '/ month',
    highlighted: true,
    ctaText: 'Start 14-Day Free Trial',
    ctaVariant: 'primary',
    savingsNote: 'Billed $108 annually (Save $36)',
    features: [
      'Everything in Seedling Starter',
      'Unlimited 24/7 AI Voice Language Coach',
      'Adaptive Cognitive Pacing (no stress or timers)',
      'Personalized Story & Memory Generator',
      'Deep Pronunciation & Speech Analysis',
      'Offline Audio Lessons & Multi-Device Sync',
      'Zero ads & distraction-free reading mode',
    ],
  },
  {
    id: 'heritage',
    name: 'Heritage & Family',
    badge: 'Family & Caregivers',
    tagline: 'Empower loved ones and caregivers with shared learning paths and mentor insights.',
    monthlyPrice: 24,
    annualPrice: 18,
    period: '/ month',
    highlighted: false,
    ctaText: 'Choose Family Plan',
    ctaVariant: 'outline',
    savingsNote: 'Billed $216 annually (Save $72)',
    features: [
      'Up to 4 individual learner profiles',
      'Dedicated Caregiver / Mentor Dashboard',
      'Shared dual-speaker practice sessions',
      'Custom vocabulary vaults & family themes',
      'Priority 1-on-1 Onboarding Guidance',
      '24/7 Priority Human & AI Assistance',
    ],
  },
]

const trustHighlights = [
  { icon: 'verified_user', title: '14-Day Free Trial', desc: 'No charge until day 14' },
  { icon: 'published_with_changes', title: 'Cancel Anytime', desc: '1-click effortless cancellation' },
  { icon: 'lock', title: 'Bank-Grade Security', desc: 'Encrypted & confidential data' },
  { icon: 'volunteer_activism', title: 'Need Assistance?', desc: 'Community scholarships available' },
]

function LandingPlans() {
  const [billingCycle, setBillingCycle] = useState('annual')
  const isAnnual = billingCycle === 'annual'

  return (
    <section className="relative mx-auto max-w-7xl px-6 py-2 lg:py-28" id="plans">
      {/* Background soft ambient decoration */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[520px] w-full max-w-[980px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-tr from-[#dfeee1]/40 via-[#e4f0e6]/25 to-transparent blur-3xl"
        aria-hidden="true"
      />

      {/* Header */}
      <div className="mx-auto max-w-3xl text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#88bf8a]/50 bg-[#dfeee1]/60 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-[#0f5d1e] shadow-sm">
          <span className="material-symbols-outlined text-sm">spa</span>
          Transparent & Accessible Pricing
        </div>
        <h2 className="mt-4 text-[clamp(32px,3.8vw,46px)] font-black leading-tight tracking-tight text-[#090909]">
          Simple, Thoughtful Plans for <span className="text-[#2d8738]">Every Learner</span>
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-[#454545]">
          Start completely free and grow at your own natural pace. No hidden charges, no sudden lockouts, and no pressure.
        </p>

        {/* Billing Switch Toggle */}
        <div className="mt-8 inline-flex items-center rounded-2xl border border-[#dfe9df] bg-white p-1.5 shadow-[0_4px_20px_rgba(28,67,39,0.06)]">
          <button
            type="button"
            onClick={() => setBillingCycle('monthly')}
            className={`cursor-pointer rounded-xl px-5 py-2.5 text-sm font-bold transition-all duration-200 ${!isAnnual
              ? 'bg-[#2d8738] text-white shadow-[0_4px_12px_rgba(45,135,56,0.25)]'
              : 'text-[#555] hover:text-[#0f5d1e]'
              }`}
          >
            Monthly Billing
          </button>
          <button
            type="button"
            onClick={() => setBillingCycle('annual')}
            className={`flex cursor-pointer items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition-all duration-200 ${isAnnual
              ? 'bg-[#2d8738] text-white shadow-[0_4px_12px_rgba(45,135,56,0.25)]'
              : 'text-[#555] hover:text-[#0f5d1e]'
              }`}
          >
            <span>Annual Billing</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wide transition-colors ${isAnnual ? 'bg-white text-[#0f5d1e]' : 'bg-[#dfeee1] text-[#0f5d1e]'
                }`}
            >
              Save 25%
            </span>
          </button>
        </div>
      </div>

      {/* Plan Cards Grid */}
      <div className="mt-14 grid gap-8 lg:grid-cols-3 lg:items-stretch">
        {plans.map((plan) => {
          const currentPrice = isAnnual ? plan.annualPrice : plan.monthlyPrice
          const isPro = plan.highlighted

          return (
            <div
              key={plan.id}
              className={`relative flex flex-col justify-between rounded-[32px] p-8 transition-all duration-300 ${isPro
                ? 'border-2 border-[#2d8738] bg-white shadow-[0_24px_55px_rgba(28,67,39,0.16)] lg:-translate-y-3'
                : 'border border-[#ececec] bg-white/90 shadow-[0_12px_35px_rgba(28,67,39,0.06)] hover:-translate-y-1 hover:shadow-[0_20px_45px_rgba(28,67,39,0.1)]'
                }`}
            >
              {/* Pro Badge Ribbon */}
              {isPro && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[#0f5d1e] bg-[#2d8738] px-4 py-1 text-xs font-black uppercase tracking-wider text-white shadow-md">
                    <span className="material-symbols-outlined text-sm">stars</span>
                    {plan.badge}
                  </span>
                </div>
              )}

              {/* Card Header */}
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-black text-[#111]">{plan.name}</h3>
                  {!isPro && (
                    <span className="rounded-full bg-[#f0f5f1] px-3 py-1 text-xs font-bold text-[#0f5d1e]">
                      {plan.badge}
                    </span>
                  )}
                </div>
                <p className="mt-2.5 min-h-[44px] text-xs leading-relaxed text-[#555]">
                  {plan.tagline}
                </p>

                {/* Price Display */}
                <div className="mt-6 border-y border-[#f0f0f0] py-5">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-4xl font-black text-[#0f5d1e] sm:text-5xl">
                      ${currentPrice}
                    </span>
                    <span className="text-sm font-semibold text-[#666]">
                      {plan.monthlyPrice === 0 ? 'forever' : plan.period}
                    </span>
                  </div>
                  {isAnnual && plan.savingsNote && (
                    <p className="mt-1.5 text-xs font-medium text-[#2d8738]">
                      {plan.savingsNote}
                    </p>
                  )}
                </div>

                {/* Features List */}
                <div className="mt-6">
                  <p className="text-xs font-extrabold uppercase tracking-wider text-[#888]">
                    What's Included:
                  </p>
                  <ul className="mt-4 space-y-3.5" aria-label={`${plan.name} features`}>
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-[#252525]">
                        <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-[#dfeee1] text-[#0f5d1e]">
                          <span className="material-symbols-outlined text-sm font-bold">check</span>
                        </span>
                        <span className="leading-snug">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* CTA Button */}
              <div className="mt-8 pt-4">
                <a
                  href="/register"
                  className={`flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-sm font-black transition-all duration-200 ${isPro
                    ? 'border-2 border-[#0f5d1e] bg-[#2d8738] text-white shadow-[0_10px_25px_rgba(45,135,56,0.3)] hover:-translate-y-0.5 hover:bg-[#257630] hover:shadow-[0_14px_30px_rgba(45,135,56,0.4)]'
                    : 'border-2 border-[#0f5d1e]/30 bg-[#fbfaf9] text-[#0f5d1e] hover:-translate-y-0.5 hover:border-[#0f5d1e] hover:bg-[#dfeee1]/40'
                    }`}
                >
                  <span>{plan.ctaText}</span>
                  <span className="material-symbols-outlined text-base">arrow_forward</span>
                </a>
                <p className="mt-2.5 text-center text-[11px] text-[#777]">
                  {plan.monthlyPrice === 0 ? 'No credit card required' : '14 days free • Cancel anytime'}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Trust & Reassurance Badges */}
      <div className="mt-16 rounded-3xl border border-[#dfe9df] bg-white/80 p-6 shadow-sm backdrop-blur-sm">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {trustHighlights.map((item, idx) => (
            <div key={idx} className="flex items-center gap-3.5">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#dfeee1] text-[#0f5d1e]">
                <span className="material-symbols-outlined text-2xl">{item.icon}</span>
              </span>
              <div>
                <h4 className="text-xs font-bold text-[#111]">{item.title}</h4>
                <p className="text-[11px] text-[#666]">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default LandingPlans
