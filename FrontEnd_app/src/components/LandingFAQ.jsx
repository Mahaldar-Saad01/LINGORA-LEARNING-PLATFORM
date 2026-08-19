import { useState } from 'react'

const faqs = [
  {
    question: 'How does Lingora adapt to my own personal learning pace?',
    answer:
      'Unlike traditional language apps with stressful countdown timers and penalties, Lingora uses an empathetic AI coach that monitors your cognitive comfort. If a concept feels difficult, the tutor gently slows down, offers alternative visual analogies, or breaks words into phonetic syllables without any rush.',
  },
  {
    question: 'Is Lingora suitable for adults who are new to digital learning?',
    answer:
      'Yes, absolutely! Lingora was purpose-built with large, high-contrast typography, distraction-free screens, and natural voice interaction so you can practice simply by talking, without needing complex navigation or tech skills.',
  },
  {
    question: 'Can I switch or cancel my plan at any time?',
    answer:
      'Yes, you can upgrade, downgrade, or cancel your subscription at any time with a single click from your account settings. You will retain full access until the end of your billing cycle with zero hidden fees.',
  },
  {
    question: 'How does the 14-day free trial work?',
    answer:
      'When you start a trial of Bloom Pro or Heritage & Family, you get unrestricted access to all premium features including unlimited AI Voice Coaching. If you decide it is not for you before day 14, cancel with one click and you will not be charged a penny.',
  },
  {
    question: 'Can family members or caregivers follow a learner’s progress?',
    answer:
      'Yes! Our Heritage & Family plan includes a dedicated Caregiver and Mentor Dashboard. You can celebrate daily milestones, see areas of steady growth, and even share custom vocabulary vaults together.',
  },
]

function LandingFAQ() {
  const [openIndex, setOpenIndex] = useState(0)

  const toggleFAQ = (index) => {
    setOpenIndex(openIndex === index ? -1 : index)
  }

  return (
    <section className="mx-auto max-w-4xl px-6 py-20" id="faq">
      <div className="text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#88bf8a]/50 bg-[#dfeee1]/60 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-[#0f5d1e] shadow-sm">
          <span className="material-symbols-outlined text-sm">help</span>
          Frequently Asked Questions
        </div>
        <h2 className="mt-4 text-[clamp(30px,3.4vw,42px)] font-black leading-tight text-[#090909]">
          Everything You Need to Know
        </h2>
        <p className="mt-3 text-base text-[#555]">
          Have questions about our platform or plans? We are here to help every step of the way.
        </p>
      </div>

      <div className="mt-12 space-y-4">
        {faqs.map((faq, idx) => {
          const isOpen = openIndex === idx
          return (
            <div
              key={idx}
              className={`overflow-hidden rounded-2xl border transition-all duration-200 ${isOpen
                  ? 'border-[#2d8738]/50 bg-white shadow-[0_8px_24px_rgba(28,67,39,0.08)]'
                  : 'border-[#e7e7e7] bg-white/70 hover:border-[#88bf8a]'
                }`}
            >
              <button
                type="button"
                onClick={() => toggleFAQ(idx)}
                className="flex w-full cursor-pointer items-center justify-between gap-4 p-6 text-left"
                aria-expanded={isOpen}
              >
                <span className="text-base font-bold text-[#111] sm:text-lg">
                  {faq.question}
                </span>
                <span
                  className={`grid size-8 shrink-0 place-items-center rounded-full transition-transform duration-200 ${isOpen
                      ? 'rotate-180 bg-[#2d8738] text-white'
                      : 'bg-[#dfeee1] text-[#0f5d1e]'
                    }`}
                >
                  <span className="material-symbols-outlined text-lg">keyboard_arrow_down</span>
                </span>
              </button>

              {isOpen && (
                <div className="border-t border-[#f2f2f2] px-6 pb-6 pt-2 text-sm leading-relaxed text-[#444]">
                  {faq.answer}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}

export default LandingFAQ
