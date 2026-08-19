import { useState, useEffect } from 'react'

const targetLanguages = [
  // { label: 'Hindi', icon: 'hi', desc: 'Hindi' },
  { label: 'English', icon: 'en', desc: 'English' },
  { label: 'German', icon: '🇩🇪', desc: 'German' },
  // { label: 'Japanese', icon: '🇯🇵', desc: 'Japanese' },
  // { label: 'Italian', icon: '🇮🇹', desc: 'Italian' },
]

const referrals = [
  { label: 'Friend / Family', icon: 'group' },
  { label: 'Social Media', icon: 'share' },
  { label: 'Online Search', icon: 'search' },
  { label: 'Article / Blog', icon: 'menu_book' },
  { label: 'Ad', icon: 'campaign' },
]

const proficiencies = [
  { label: 'New to language', desc: 'Complete beginner. Starting from scratch!' },
  { label: 'Some common words', desc: 'Know greetings, basics, and some simple nouns.' },
  { label: 'Basic conversation', desc: 'Can ask directions and talk in simple sentences.' },
  { label: 'Can talk about various topics', desc: 'Relatively comfortable, but need practice.' },
  { label: 'Discuss topics in detail', desc: 'Advanced skills, aiming for full fluency.' },
]

const reasons = [
  { label: 'Career Growth', icon: 'work' },
  { label: 'Travel Plans', icon: 'flight_takeoff' },
  { label: 'Brain Exercise', icon: 'psychology' },
  { label: 'Connect with People', icon: 'forum' },
  { label: 'Just Curious', icon: 'explore' },
]

const commitments = [
  { label: '5 mins/day', detail: 'Casual', desc: 'Quick daily exercises.' },
  { label: '15 mins/day', detail: 'Regular', desc: 'Balanced vocabulary building.' },
  { label: '30 mins/day', detail: 'Serious', desc: 'Rapid speech and grammar progression.' },
  { label: '60 mins/day', detail: 'Intense', desc: 'Complete language immersion.' },
]

function OnboardingFlow({ isSubmitting = false, onAvatarStateChange, onComplete, submitError }) {
  const [currentStep, setCurrentStep] = useState(1)
  const [answers, setAnswers] = useState({
    learnLanguage: '',
    referral: '',
    proficiency: '',
    reason: '',
    commitment: '',
  })

  // Set avatar funny responses
  useEffect(() => {
    let title = ''
    let text = ''

    if (currentStep === 1) {
      if (!answers.learnLanguage) {
        title = 'Step 1: Choose Your Passion'
        text = "Ooh, a new language! Let's choose the flavor of your next language headache."
      } else {
        title = 'Beautiful Choice!'
        switch (answers.learnLanguage) {
          case 'Hindi':
            text = 'Ah, Hindi! Prepare your tongue for the rolling double-R. *Rrrrr-pido!*'
            break
          case 'English':
            text = 'French! Excellent choice for practicing silent letters. You only pronounce half of them anyway!'
            break
          case 'German':
            text = 'German! Get ready to concatenate twenty nouns together to describe a single feeling.'
            break
          case 'Japanese':
            text = 'Japanese! Polite bowing and drawing kanji characters incoming. You can do this!'
            break
          case 'Italian':
            text = 'Italian! Perfect for learning how to gesture dramatically while arguing.'
            break
          default:
            text = 'A wonderful target! Open minds unlock new doors.'
        }
      }
    } else if (currentStep === 2) {
      if (!answers.referral) {
        title = 'Step 2: Who sent you?'
        text = 'Who dragged you here? Tell me, I want to send them a thank-you note (or a warning).'
      } else {
        title = 'Interesting...'
        switch (answers.referral) {
          case 'Friend / Family':
            text = 'Ah, a friend! So you both can be confused in two languages together. True friendship!'
            break
          case 'Social Media':
            text = "Social media! I promise I'm more educational than cat videos... and only slightly more judgmental."
            break
          case 'Online Search':
            text = "Search engine! You typed 'how to be smart' and I appeared. Good algorithm."
            break
          case 'Ad':
            text = "An ad! Glad to see our marketing team's memes are working."
            break
          default:
            text = 'Nice! Happy you discovered us.'
        }
      }
    } else if (currentStep === 3) {
      if (!answers.proficiency) {
        title = 'Step 3: State of Knowledge'
        text = "Be honest. I won't judge... much."
      } else {
        title = 'Got it!'
        switch (answers.proficiency) {
          case 'New to language':
            text = 'Zero knowledge? Perfect. Blank slate. You are my clay. I will mold you into a polyglot.'
            break
          case 'Some common words':
            text = "Ah, common words. So you can say 'hello', 'beer', and 'where is the bathroom'. Priorities!"
            break
          case 'Basic conversation':
            text = "Basic conversation! Ready to ask 'how are you' and panic when they answer too fast?"
            break
          case 'Can talk about various topics':
            text = 'Talk about various topics? Wow, check out the expert! I might have to learn from you.'
            break
          case 'Discuss topics in detail':
            text = "Discuss in detail? You're basically a native speaker. Show-off!"
            break
          default:
            text = 'We will tailor the plan to fit this level.'
        }
      }
    } else if (currentStep === 4) {
      if (!answers.reason) {
        title = 'Step 4: Your "Why"'
        text = 'Why are we doing this? To impress someone? For glory? Tell me.'
      } else {
        title = 'A Noble Goal!'
        switch (answers.reason) {
          case 'Career Growth':
            text = "Career growth? Nice! Soon you'll be writing passive-aggressive emails internationally."
            break
          case 'Travel Plans':
            text = 'Travel! Ordering coffee without pointing at the menu is the ultimate power move.'
            break
          case 'Brain Exercise':
            text = 'Brain exercise! Keep those neurons firing. Way better than Sudoku.'
            break
          case 'Connect with People':
            text = 'Connection! The best way to make friends is to speak their language. Or at least try to.'
            break
          case 'Just Curious':
            text = 'Curiosity! I love curious minds. They are the easiest to distract with random verbs.'
            break
          default:
            text = 'An excellent reason to start!'
        }
      }
    } else if (currentStep === 5) {
      if (!answers.commitment) {
        title = 'Step 5: Time commitment'
        text = 'How much of your daily life can I consume?'
      } else {
        title = 'Perfect Schedule!'
        switch (answers.commitment) {
          case '5 mins/day':
            text = "5 minutes? That's about the length of a commercial break. I'll take it."
            break
          case '15 mins/day':
            text = '15 minutes. A respectable, steady pace. Steady wins the race!'
            break
          case '30 mins/day':
            text = "30 minutes! Look at you, future polyglot! I'll make sure to remind you every single day... no escaping."
            break
          case '60 mins/day':
            text = '60 minutes?! A true warrior. I hope your brain is ready for the workout.'
            break
          default:
            text = 'Awesome! Consistency is the secret.'
        }
      }
    } else if (currentStep === 6) {
      title = 'Your Personalized Journey Plan'
      text = "Tada! Here is your custom plan. I've designed it to be highly effective, or at least highly entertaining. Let's get started!"
    }

    onAvatarStateChange({ title, text })
  }, [currentStep, answers])

  const selectAnswer = (key, value) => {
    setAnswers((prev) => ({ ...prev, [key]: value }))
  }

  const handleNext = () => {
    if (currentStep < 6) {
      setCurrentStep((prev) => prev + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1)
    }
  }

  const generatePlanDays = () => {
    const lang = answers.learnLanguage || 'Language'
    const time = answers.commitment || '15 mins/day'
    const prof = answers.proficiency || 'New to language'

    const plans = {
      'New to language': [
        { day: 'Day 1', action: 'Alphabet & Phonics', details: `Learn first 5 key characters & sounds of ${lang}` },
        { day: 'Day 2', action: 'Core Greetings', details: `Practice "Hello" & "Goodbye" in ${lang} out loud` },
        { day: 'Day 3', action: 'Numbers 1-10', details: `Simple counting drills & age statements` },
        { day: 'Day 4', action: 'Lumina Simulation', details: `Interactive self-introduction dialog` },
        { day: 'Day 5', action: 'Milestone Review', details: `Pass your first greeting quiz!` },
      ],
      'Some common words': [
        { day: 'Day 1', action: 'Essential Phrases', details: `Learn questions like "Where is..." and "How much..."` },
        { day: 'Day 2', action: 'Pronunciation Check', details: `Correct vowel stress and voice intonations` },
        { day: 'Day 3', action: 'Food & Cafes', details: `Order foods, specify counts, ask for the check` },
        { day: 'Day 4', action: 'Simple Answers', details: `Respond to common conversation starters` },
        { day: 'Day 5', action: 'First Milestone', details: `Complete cafe scenario chat quiz!` },
      ],
      'default': [
        { day: 'Day 1', action: 'Diagnostic Challenge', details: `Translate 10 intermediate sentences to gauge level` },
        { day: 'Day 2', action: 'Grammar Deep Dive', details: `Understand tense structures & sentence modifiers` },
        { day: 'Day 3', action: 'Colloquial Expressions', details: `Idioms & local vocabulary terms` },
        { day: 'Day 4', action: 'Active Mock Speech', details: `Narrate a 1-minute story to Lumina` },
        { day: 'Day 5', action: 'Milestone Test', details: `Unlock your Intermediate Badge!` },
      ],
    }

    return plans[prof] || plans['default']
  }

  const activePlan = generatePlanDays()

  return (
    <section className="w-full transition-all duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] md:-translate-x-[220px] md:-translate-y-6 scale-[1.03]">
      <div className="glass-panel premium-card overflow-hidden rounded-[28px] border border-black/5 px-9 py-9 shadow-[0_26px_44px_rgba(0,0,0,0.12)] max-sm:px-5">

        {/* Step Indicators */}
        {currentStep < 6 && (
          <div className="mb-6 flex items-center justify-between border-b border-black/5 pb-4">
            <div className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-full bg-[#0f6f25] text-sm font-black text-white">
                {currentStep}
              </span>
              <span className="text-sm font-semibold text-[#566052]">Onboarding Milestone</span>
            </div>
            <span className="text-xs text-[#a2aaa0]">Step {currentStep} of 5</span>
          </div>
        )}

        {/* Step 1: Target Language */}
        {currentStep === 1 && (
          <div className="animate-fadeIn">
            <h3 className="text-2xl font-black text-[#202020]">What language do you want to learn?</h3>
            <p className="mt-2 text-sm text-[#566052]">Select a language to unlock custom learning tasks.</p>
            <div className="mt-6 grid grid-cols-2 gap-3 max-sm:grid-cols-1">
              {targetLanguages.map((lang) => (
                <button
                  key={lang.label}
                  type="button"
                  onClick={() => selectAnswer('learnLanguage', lang.label)}
                  className={`flex items-center gap-4 rounded-2xl border-2 px-5 py-4 text-left transition hover:border-[#0f6f25] ${answers.learnLanguage === lang.label
                    ? 'border-[#0f6f25] bg-[#0f6f25]/5 text-[#0f6f25]'
                    : 'border-[#eeeeee] hover:bg-neutral-50'
                    }`}
                >
                  <span className="text-3xl">{lang.icon}</span>
                  <div>
                    <span className="block text-base font-bold">{lang.label}</span>
                    <span className="text-xs text-gray-500">Learn {lang.desc}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Referral */}
        {currentStep === 2 && (
          <div className="animate-fadeIn">
            <h3 className="text-2xl font-black text-[#202020]">How did you hear about us?</h3>
            <p className="mt-2 text-sm text-[#566052]">Help us know what channels lead to our platform.</p>
            <div className="mt-6 grid grid-cols-2 gap-3 max-sm:grid-cols-1">
              {referrals.map((ref) => (
                <button
                  key={ref.label}
                  type="button"
                  onClick={() => selectAnswer('referral', ref.label)}
                  className={`flex items-center gap-4 rounded-2xl border-2 px-5 py-4 text-left transition hover:border-[#0f6f25] ${answers.referral === ref.label
                    ? 'border-[#0f6f25] bg-[#0f6f25]/5 text-[#0f6f25]'
                    : 'border-[#eeeeee] hover:bg-neutral-50'
                    }`}
                >
                  <span className="material-symbols-outlined text-2xl text-[#0f6f25]">{ref.icon}</span>
                  <span className="text-base font-bold">{ref.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Proficiency */}
        {currentStep === 3 && (
          <div className="animate-fadeIn">
            <h3 className="text-2xl font-black text-[#202020]">How much of {answers.learnLanguage || 'the language'} do you know?</h3>
            <p className="mt-2 text-sm text-[#566052]">We will calibrate quizzes to align with your current vocabulary.</p>
            <div className="mt-6 grid grid-cols-1 gap-3">
              {proficiencies.map((prof) => (
                <button
                  key={prof.label}
                  type="button"
                  onClick={() => selectAnswer('proficiency', prof.label)}
                  className={`flex flex-col rounded-2xl border-2 px-5 py-3.5 text-left transition hover:border-[#0f6f25] ${answers.proficiency === prof.label
                    ? 'border-[#0f6f25] bg-[#0f6f25]/5 text-[#0f6f25]'
                    : 'border-[#eeeeee] hover:bg-neutral-50'
                    }`}
                >
                  <span className="text-base font-bold">{prof.label}</span>
                  <span className="text-xs text-gray-500 mt-1">{prof.desc}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 4: Reason */}
        {currentStep === 4 && (
          <div className="animate-fadeIn">
            <h3 className="text-2xl font-black text-[#202020]">Why want to learn this language?</h3>
            <p className="mt-2 text-sm text-[#566052]">Knowing your motivation helps customize recommendations.</p>
            <div className="mt-6 grid grid-cols-2 gap-3 max-sm:grid-cols-1">
              {reasons.map((r) => (
                <button
                  key={r.label}
                  type="button"
                  onClick={() => selectAnswer('reason', r.label)}
                  className={`flex items-center gap-4 rounded-2xl border-2 px-5 py-4 text-left transition hover:border-[#0f6f25] ${answers.reason === r.label
                    ? 'border-[#0f6f25] bg-[#0f6f25]/5 text-[#0f6f25]'
                    : 'border-[#eeeeee] hover:bg-neutral-50'
                    }`}
                >
                  <span className="material-symbols-outlined text-2xl text-[#0f6f25]">{r.icon}</span>
                  <span className="text-base font-bold">{r.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 5: Time Commitment */}
        {currentStep === 5 && (
          <div className="animate-fadeIn">
            <h3 className="text-2xl font-black text-[#202020]">How much time will you spend to learn?</h3>
            <p className="mt-2 text-sm text-[#566052]">Daily consistency keeps vocabulary retention high.</p>
            <div className="mt-6 grid grid-cols-2 gap-3 max-sm:grid-cols-1">
              {commitments.map((c) => (
                <button
                  key={c.label}
                  type="button"
                  onClick={() => selectAnswer('commitment', c.label)}
                  className={`flex flex-col rounded-2xl border-2 px-5 py-4 text-left transition hover:border-[#0f6f25] ${answers.commitment === c.label
                    ? 'border-[#0f6f25] bg-[#0f6f25]/5 text-[#0f6f25]'
                    : 'border-[#eeeeee] hover:bg-neutral-50'
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-base font-bold">{c.label}</span>
                    <span className="rounded bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600 font-bold">{c.detail}</span>
                  </div>
                  <span className="text-xs text-gray-500 mt-2">{c.desc}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 6: Personalized Plan */}
        {currentStep === 6 && (
          <div className="animate-fadeIn">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[#0f6f25] text-3xl">auto_awesome</span>
              <h3 className="text-2xl font-black text-[#202020]">Plan for next 5 days</h3>
            </div>
            <p className="mt-2 text-sm text-[#566052]">
              Here is your structured schedule for learning <strong className="text-[#0f6f25]">{answers.learnLanguage}</strong> starting from today!
            </p>

            <div className="mt-6 space-y-3">
              {activePlan.map((d, index) => (
                <div key={d.day} className="flex gap-4 rounded-xl border border-black/5 bg-neutral-50 p-4 transition hover:bg-white hover:shadow-md">
                  <div className="grid size-10 place-items-center rounded-full bg-[#0f6f25]/10 text-[#0f6f25] font-black text-sm">
                    {index + 1}
                  </div>
                  <div>
                    <h4 className="font-bold text-[#202020] text-base">{d.day}: {d.action}</h4>
                    <p className="text-xs text-neutral-500 mt-1">{d.details} • {answers.commitment}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions Area */}
        <div className="mt-8 flex items-center justify-between gap-4 border-t border-black/5 pt-6">
          {currentStep > 1 && currentStep < 6 ? (
            <button
              onClick={handleBack}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full border-2 border-[#dadada] px-6 text-sm font-bold text-[#566052] transition hover:border-[#0f6f25] hover:text-[#0f6f25]"
              type="button"
            >
              <span className="material-symbols-outlined text-lg" aria-hidden="true">arrow_back</span>
              Back
            </button>
          ) : (
            <div />
          )}

          {currentStep === 6 ? (
            <button
              disabled={isSubmitting}
              onClick={() => onComplete?.(answers)}
              className="premium-button inline-flex h-14 min-w-[200px] items-center justify-center gap-3 rounded-full bg-[#0f6f25] px-8 text-lg font-black text-white shadow-[0_12px_22px_rgba(15,111,37,0.22)] hover:bg-[#0b5f1f]"
              type="button"
            >
              {isSubmitting ? 'Creating Account...' : 'Start Learning'}
              <span className="material-symbols-outlined text-xl" aria-hidden="true">arrow_forward</span>
            </button>
          ) : (
            <button
              onClick={handleNext}
              disabled={
                (currentStep === 1 && !answers.learnLanguage) ||
                (currentStep === 2 && !answers.referral) ||
                (currentStep === 3 && !answers.proficiency) ||
                (currentStep === 4 && !answers.reason) ||
                (currentStep === 5 && !answers.commitment)
              }
              className={`premium-button inline-flex h-12 min-w-[140px] items-center justify-center gap-2 rounded-full px-6 text-sm font-black text-white shadow-md ${((currentStep === 1 && !answers.learnLanguage) ||
                (currentStep === 2 && !answers.referral) ||
                (currentStep === 3 && !answers.proficiency) ||
                (currentStep === 4 && !answers.reason) ||
                (currentStep === 5 && !answers.commitment))
                ? 'bg-neutral-300 shadow-none cursor-not-allowed'
                : 'bg-[#0f6f25] hover:bg-[#0b5f1f]'
                }`}
              type="button"
            >
              Next
              <span className="material-symbols-outlined text-lg" aria-hidden="true">arrow_forward</span>
            </button>
          )}
        </div>
        {submitError && (
          <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-bold text-red-700">
            {submitError}
          </p>
        )}
      </div>
    </section>
  )
}

export default OnboardingFlow
