import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import LockedMilestones from '../components/pag_register/LockedMilestones'
import RegisterHeader from '../components/pag_register/RegisterHeader'
import RegisterIntro from '../components/pag_register/RegisterIntro'
import RegisterStepCard from '../components/pag_register/RegisterStepCard'
import OnboardingFlow from '../components/pag_register/OnboardingFlow'
import aiAvatar from '../assets/images/ai_avatar.png'
import { safeParseJson } from '../services/lessonApi'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

const languageLevelCodes = {
  'New to language': 'new',
  'Some common words': 'words',
  'Basic conversation': 'basic',
  'Can talk about various topics': 'intermediate',
  'Discuss topics in detail': 'advanced',
}

const motivationCodes = {
  'Career Growth': 'cg',
  'Travel Plans': 'tp',
  'Brain Exercise': 'bx',
  'Connect with People': 'cp',
  'Just Curious': 'jc',
}

const referralCodes = {
  'Friend / Family': 'ff',
  'Social Media': 'socm',
  'Online Search': 'os',
  'Article / Blog': 'ab',
  'Ad': 'ad',
}

const studyTimeCodes = {
  '5 mins/day': '5_min',
  '15 mins/day': '15_min',
  '30 mins/day': '30_min',
  '60 mins/day': '60_min',
}

function getAssessmentKey(user) {
  return `firstAssessmentScore:${user.id || user.email || 'guest'}`
}


function Register() {
  const [activeStep, setActiveStep] = useState(1)
  const [selectedInterest, setSelectedInterest] = useState('')
  const [showLoading, setShowLoading] = useState(false)
  const [onboardingStarted, setOnboardingStarted] = useState(false)
  const [avatarOverride, setAvatarOverride] = useState(null)
  const [formError, setFormError] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [registrationComplete, setRegistrationComplete] = useState(false)
  const assistantRef = useRef(null)
  const firstInterestRef = useRef(null)
  const flowRef = useRef(null)
  const loadingRef = useRef(null)
  const nameInputRef = useRef(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  })

  useEffect(() => {
    const focusTimer = window.setTimeout(() => {
      if (activeStep === 1) {
        window.scrollTo({
          top: 0,
          behavior: 'smooth',
        })
        nameInputRef.current?.focus()
        return
      }

      const flowTop = flowRef.current
        ? flowRef.current.getBoundingClientRect().top + window.scrollY
        : window.scrollY

      window.scrollTo({
        behavior: 'smooth',
        top: Math.max(flowTop - 500, 0),
      })

      assistantRef.current?.focus({ preventScroll: true })

      window.setTimeout(() => {
        firstInterestRef.current?.focus({ preventScroll: true })
      }, 100)
    }, 120)

    return () => window.clearTimeout(focusTimer)
  }, [activeStep])

  useEffect(() => {
    if (!selectedInterest) {
      return undefined
    }

    const delayTimer = window.setTimeout(() => {
      setShowLoading(false)
      setOnboardingStarted(true)
    }, 3000)

    const loadingTimer = window.setTimeout(() => {
      const loadingTop = loadingRef.current
        ? loadingRef.current.getBoundingClientRect().top + window.scrollY
        : window.scrollY

      window.scrollTo({
        behavior: 'smooth',
        top: Math.max(loadingTop - 30, 0),
      })
      loadingRef.current?.focus({ preventScroll: true })
    }, 30)

    return () => {
      window.clearTimeout(delayTimer)
      window.clearTimeout(loadingTimer)
    }
  }, [selectedInterest])

  const handleFieldChange = (event) => {
    const { name, value } = event.target
    setFormError('')
    setFormData((current) => ({
      ...current,
      [name]: value,
    }))
  }

  const handleNextMilestone = (event) => {
    event.preventDefault()
    if (formData.password.length < 8) {
      setFormError('Password must be at least 8 characters long.')
      return
    }
    if (formData.password !== formData.confirmPassword) {
      setFormError('Password and confirm password must match.')
      return
    }
    setActiveStep(2)
  }

  const getFieldErrors = (errors) => {
    if (!errors || typeof errors !== 'object') {
      return 'Registration failed. Please try again.'
    }

    return Object.entries(errors)
      .map(([field, messages]) => {
        const text = Array.isArray(messages) ? messages.join(' ') : String(messages)
        return `${field}: ${text}`
      })
      .join(' ')
  }

  const handleRegistrationComplete = async (answers) => {
    setSubmitError('')
    setIsSubmitting(true)

    const payload = {
      name: formData.name.trim(),
      email: formData.email.trim().toLowerCase(),
      password: formData.password,
      confirm_password: formData.confirmPassword,
      preferred_language: selectedInterest,
      target_language: answers.learnLanguage,
      language_level: languageLevelCodes[answers.proficiency] || 'new',
      motivation: motivationCodes[answers.reason] || 'cg',
      referral_src: referralCodes[answers.referral] || 'socm',
      study_time: studyTimeCodes[answers.commitment] || '15_min',
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/accounts/register/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })
      const data = await safeParseJson(response)

      if (!response.ok) {
        throw new Error(getFieldErrors(data))
      }

      localStorage.setItem('accessToken', data.tokens.access)
      localStorage.setItem('refreshToken', data.tokens.refresh)
      localStorage.setItem('currentUser', JSON.stringify(data.user))
      localStorage.removeItem(getAssessmentKey(data.user))
      setRegistrationComplete(true)
    } catch (error) {
      setSubmitError(error.message || 'Registration failed. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleLetsGo = () => {
    window.location.href = '/assessment'
  }

  const handleSelectInterest = (interest) => {
    setSelectedInterest(interest)
    setOnboardingStarted(false)
    setShowLoading(true)
  }

  if (registrationComplete) {
    return (
      <main className="route-fade relative grid min-h-screen place-items-center overflow-hidden bg-[#fbfaf9] px-6 text-[#202020]">
        <div className="particle-field" aria-hidden="true">
          {[12, 22, 34, 46, 58, 70, 82, 92].map((left, index) => (
            <span
              className="particle"
              key={left}
              style={{
                left: `${left}%`,
                animationDelay: `${index * 0.75}s`,
                animationDuration: `${8 + (index % 3)}s`,
              }}
            />
          ))}
        </div>

        <section className="relative z-10 grid w-full max-w-[560px] justify-items-center text-center">
          <div className="success-pop relative">
            <img
              className="floating w-44 drop-shadow-[0_24px_30px_rgba(46,125,50,0.26)]"
              src={aiAvatar}
              alt="lingora assistant"
            />
            <svg
              className="absolute -right-2 top-4 size-12 rounded-full bg-white p-2 shadow-[0_10px_24px_rgba(15,111,37,0.18)]"
              viewBox="0 0 48 48"
              aria-hidden="true"
            >
              <circle cx="24" cy="24" r="19" fill="#0f6f25" opacity="0.12" />
              <path
                className="success-check"
                d="M15 24.5 21.5 31 34 17"
                fill="none"
                stroke="#0f6f25"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="4"
              />
            </svg>
          </div>

          <div className="glass-panel premium-card relative mt-8 !border-[#0f6f25] !border-3 max-w-[520px] rounded-[30px] px-8 py-7 shadow-[0_24px_55px_rgba(28,67,39,0.10)] after:absolute after:-top-[16px] after:left-1/2 after:size-8 after:-translate-x-1/2 after:rotate-45 after:border-l after:border-t after:border-[#0f6f25] after:bg-white/70">
            <h1 className="premium-text text-3xl font-black text-[#0f6f25]">
              Let&apos;s go on a ride.
            </h1>
            <p className="premium-text-delay mt-4 text-lg leading-relaxed text-[#565f53]">
              I want to know about you, your target language, and your level so I can shape
              the journey around you.
            </p>
          </div>

          <button
            className="premium-button mt-8 inline-flex h-14 min-w-[180px] items-center justify-center gap-3 rounded-full bg-[#0f6f25] px-8 text-lg font-black text-white shadow-[0_14px_26px_rgba(15,111,37,0.24)] hover:bg-[#0b5f1f]"
            onClick={handleLetsGo}
            type="button"
          >
            Let&apos;s go
            <span className="material-symbols-outlined text-xl" aria-hidden="true">
              arrow_forward
            </span>
          </button>
        </section>
      </main>
    )
  }

  return (
    <div className="route-fade flex flex-col h-screen bg-[#fbfaf9] text-[#202020]">
      <div className="particle-field" aria-hidden="true">
        {[10, 24, 39, 54, 68, 83].map((left, index) => (
          <span
            className="particle"
            key={left}
            style={{
              left: `${left}%`,
              animationDelay: `${index * 1.1}s`,
              animationDuration: `${9 + (index % 2)}s`,
            }}
          />
        ))}
      </div>
      <RegisterHeader />
      <main className=" overflow-x-hidden [box-sizing:border-box] [&_*]:box-border [&_a]:text-inherit [&_a]:no-underline">
        <div
          className="pointer-events-none absolute -left-28 top-16 h-[1120px] w-72 rotate-[-13deg] rounded-[50%] border-[32px] border-[#dce8dd] opacity-70"
          aria-hidden="true"
        />

        <div
          className={`relative z-[1] pb-12 ${!onboardingStarted
              ? 'mx-auto grid w-full max-w-7xl items-start gap-8 lg:grid-cols-[minmax(320px,0.85fr)_minmax(420px,1fr)] lg:gap-12'
              : ''
            }`}
        >
          <RegisterIntro
            activeStep={activeStep}
            assistantRef={assistantRef}
            isSideLayout={!onboardingStarted}
            name={formData.name}
            selectedInterest={selectedInterest}
            promptOverride={avatarOverride}
          />
          <div
            ref={flowRef}
            className={`relative z-10 grid w-full justify-items-center px-6 transition-all duration-700 ${!onboardingStarted
                ? `mx-auto max-w-[720px] lg:mx-0 lg:justify-items-stretch lg:px-0 lg:pr-10 ${activeStep > 1 ? 'mt-8 lg:mt-12' : 'mt-2 lg:mt-12'
                }`
                : `mx-auto max-w-[650px] ${activeStep > 1 ? 'mt-0' : 'mt-2'}`
              }`}
          >
            {!onboardingStarted && (
              <RegisterStepCard
                error={formError}
                formData={formData}
                isComplete={activeStep > 1}
                isHidden={Boolean(selectedInterest)}
                nameInputRef={nameInputRef}
                onChange={handleFieldChange}
                onNext={handleNextMilestone}
              />
            )}

            {(!onboardingStarted || showLoading) ? (
              <LockedMilestones
                firstOptionRef={firstInterestRef}
                isActive={activeStep > 1}
                loadingRef={loadingRef}
                selectedInterest={selectedInterest}
                onSelectInterest={handleSelectInterest}
              />
            ) : (
              <OnboardingFlow
                isSubmitting={isSubmitting}
                onAvatarStateChange={setAvatarOverride}
                onComplete={handleRegistrationComplete}
                submitError={submitError}
              />
            )}
          </div>
        </div>
      </main>
      {!onboardingStarted && (
        <p className="mt-10 px-6 pb-10 text-center text-base font-medium text-[#566052]">
          Already have an account?{' '}
          <Link className="font-black text-[#0f6f25]" to="/login">
            Log in here
          </Link>
        </p>
      )}
    </div>
  )
}

export default Register
