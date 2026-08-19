import { useState } from 'react'
import { Link } from 'react-router-dom'
import aiAvatar from '../assets/images/ai_avatar.png'
import AnimatedBackgroundPaths from '../components/AnimatedBackgroundpaths'
import { safeParseJson } from '../services/lessonApi'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

function getAssessmentKey(user) {
  return `firstAssessmentScore:${user.id || user.email || 'guest'}`
}

function hasCompletedFirstAssessment(user) {
  if (typeof user.has_completed_assessment === 'boolean') {
    return user.has_completed_assessment
  }

  return localStorage.getItem(getAssessmentKey(user)) !== null
}

function Login() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // Forgot password flow state: 'login' | 'request_otp' | 'verify_otp' | 'reset_password'
  const [mode, setMode] = useState('login')
  const [forgotEmail, setForgotEmail] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const handleChange = (event) => {
    const { name, value } = event.target
    setError('')
    setSuccessMessage('')
    setFormData((current) => ({
      ...current,
      [name]: value,
    }))
  }

  const getFieldErrors = (errors) => {
    if (!errors || typeof errors !== 'object') {
      return 'Request failed. Please try again.'
    }

    if (errors.detail) return String(errors.detail)

    if (errors.non_field_errors) {
      return Array.isArray(errors.non_field_errors)
        ? errors.non_field_errors.join(' ')
        : String(errors.non_field_errors)
    }

    return Object.entries(errors)
      .map(([field, messages]) => {
        const text = Array.isArray(messages) ? messages.join(' ') : String(messages)
        return `${field}: ${text}`
      })
      .join(' ')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSuccessMessage('')
    setIsSubmitting(true)

    try {
      const response = await fetch(`${API_BASE_URL}/api/accounts/login/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email.trim().toLowerCase(),
          password: formData.password,
        }),
      })
      const data = await safeParseJson(response)

      if (!response.ok) {
        throw new Error(getFieldErrors(data))
      }

      localStorage.setItem('accessToken', data.tokens.access)
      localStorage.setItem('refreshToken', data.tokens.refresh)
      localStorage.setItem('currentUser', JSON.stringify(data.user))
      const hasCompletedAssessment = hasCompletedFirstAssessment(data.user)

      if (!hasCompletedAssessment) {
        localStorage.removeItem(getAssessmentKey(data.user))
      }

      window.location.href = hasCompletedAssessment ? '/dashboard' : '/assessment'
    } catch (loginError) {
      setError(loginError.message || 'Login failed. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRequestOtp = async (e) => {
    e.preventDefault()
    setError('')
    setSuccessMessage('')
    setIsSubmitting(true)

    try {
      const response = await fetch(`${API_BASE_URL}/api/accounts/forgot-password/request-otp/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail.trim().toLowerCase() }),
      })
      const data = await safeParseJson(response)
      if (!response.ok) throw new Error(getFieldErrors(data))

      setSuccessMessage(data.message || 'OTP code sent to your email address!')
      setMode('verify_otp')
    } catch (err) {
      setError(err.message || 'Failed to send OTP. Please check your email address.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    setError('')
    setSuccessMessage('')
    setIsSubmitting(true)

    try {
      const response = await fetch(`${API_BASE_URL}/api/accounts/forgot-password/verify-otp/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: forgotEmail.trim().toLowerCase(),
          otp: otpCode.trim(),
        }),
      })
      const data = await safeParseJson(response)
      if (!response.ok) throw new Error(getFieldErrors(data))

      setSuccessMessage('OTP verified! Please enter your new password.')
      setMode('reset_password')
    } catch (err) {
      setError(err.message || 'Invalid or expired OTP code.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    setError('')
    setSuccessMessage('')

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.')
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch(`${API_BASE_URL}/api/accounts/forgot-password/reset-password/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: forgotEmail.trim().toLowerCase(),
          otp: otpCode.trim(),
          new_password: newPassword,
        }),
      })
      const data = await safeParseJson(response)
      if (!response.ok) throw new Error(getFieldErrors(data))

      setSuccessMessage(data.message || 'Password updated successfully! Please log in.')
      setFormData({ email: forgotEmail, password: '' })
      setMode('login')
    } catch (err) {
      setError(err.message || 'Failed to update password.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const startForgotPassword = () => {
    setForgotEmail(formData.email)
    setOtpCode('')
    setNewPassword('')
    setConfirmPassword('')
    setError('')
    setSuccessMessage('')
    setMode('request_otp')
  }

  const backToLogin = () => {
    setMode('login')
    setError('')
    setSuccessMessage('')
  }

  return (
    <main className="route-fade relative grid min-h-screen grid-rows-[auto_1fr_auto] overflow-hidden bg-[#fbfaf9] text-[#202020] [box-sizing:border-box] [&_*]:box-border [&_a]:no-underline">
      <AnimatedBackgroundPaths />
      <AnimatedBackgroundPaths />
      <div className="particle-field" aria-hidden="true">
        {[14, 27, 41, 57, 73, 88].map((left, index) => (
          <span
            className="particle"
            key={left}
            style={{
              left: `${left}%`,
              animationDelay: `${index * 1.05}s`,
              animationDuration: `${9 + (index % 2)}s`,
            }}
          />
        ))}
      </div>
      <header className="grid min-h-[78px] grid-cols-[1fr_auto_1fr] items-center border-b border-black/5 bg-[#fbfaf9]/95 px-10 backdrop-blur-md max-md:grid-cols-[1fr_auto] max-md:px-5">
        <Link className="text-3xl font-black text-[#0f6f25] max-sm:text-2xl" to="/">
          lingora Learning
        </Link>
        <span aria-hidden="true" />
        <Link
          className="justify-self-end text-lg font-bold text-[#4b5448] transition hover:text-[#0f6f25] max-md:text-base"
          to="/"
        >
          Help
        </Link>
      </header>

      <section className="grid place-items-center px-6 py-12">
        <div className="glass-panel premium-card relative z-10 w-full max-w-[640px] rounded-[28px] px-12 pb-10 pt-2 text-center shadow-[0_24px_55px_rgba(28,67,39,0.08)] max-sm:px-6">
          <img
            className="floating mx-auto size-30 rounded-full object-cover drop-shadow-[0_15px_20px_rgba(46,125,50,0.22)]"
            src={aiAvatar}
            alt="lingora assistant"
          />

          {mode === 'login' && (
            <form onSubmit={handleSubmit}>
              <h1 className="premium-text mx-auto mt-2 max-w-[560px] text-[clamp(40px,5vw,30px)] font-black leading-tight text-[#202020]">
                Welcome back, friend.
              </h1>
              <p className="premium-text-delay mx-auto mt-1 max-w-[380px] text-2xl leading-relaxed text-[#555f52] max-sm:text-xl">
                Log in to continue your journey of discovery.
              </p>

              <div className="mt-5 grid gap-8 text-left">
                <label className="grid gap-3 text-xl font-bold text-black">
                  Email Address
                  <input
                    className="h-[60px] rounded-2xl border-2 border-[#c3d0bf] bg-white px-7 text-2xl text-[#202020] outline-none transition placeholder:text-[#555f52] focus:border-[#0f6f25] focus:ring-4 focus:ring-[#0f6f25]/10 max-sm:text-xl"
                    name="email"
                    onChange={handleChange}
                    placeholder="name@example.com"
                    required
                    type="email"
                    value={formData.email}
                  />
                </label>

                <label className="grid gap-3 text-xl font-bold text-black">
                  <span className="flex items-center justify-between gap-4">
                    Password
                    <button
                      className="text-base font-black text-[#0f6f25] hover:text-[#0b5f1f]"
                      onClick={startForgotPassword}
                      type="button"
                    >
                      Forgot password?
                    </button>
                  </span>
                  <span className="flex h-[60px] items-center rounded-2xl border-2 border-[#c3d0bf] bg-white pr-5 transition focus-within:border-[#0f6f25] focus-within:ring-4 focus-within:ring-[#0f6f25]/10">
                    <input
                      className="h-full min-w-0 flex-1 rounded-2xl border-0 bg-transparent px-7 text-2xl text-[#202020] outline-none placeholder:text-[#555f52] max-sm:text-xl"
                      name="password"
                      onChange={handleChange}
                      placeholder="Password"
                      required
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                    />
                    <button
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="icon-bounce grid size-10 place-items-center rounded-full text-[#4b5448] transition hover:bg-[#eef3ed] hover:text-[#0f6f25]"
                      onClick={() => setShowPassword((current) => !current)}
                      type="button"
                    >
                      <span className="material-symbols-outlined text-3xl" aria-hidden="true">
                        {showPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </span>
                </label>
              </div>

              {successMessage && (
                <p className="mt-6 rounded-2xl border border-green-200 bg-green-50 px-5 py-3 text-left text-sm font-bold text-green-800">
                  {successMessage}
                </p>
              )}

              {error && (
                <p className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-3 text-left text-sm font-bold text-red-700">
                  {error}
                </p>
              )}

              <button
                className="premium-button mt-8 inline-flex h-[55px] w-full items-center justify-center rounded-[24px] bg-[#0f6f25] text-xl font-black text-white shadow-[0_14px_24px_rgba(15,111,37,0.22)] hover:bg-[#0b5f1f] disabled:cursor-not-allowed disabled:bg-neutral-300 disabled:shadow-none"
                disabled={isSubmitting}
                type="submit"
              >
                {isSubmitting ? 'Logging In...' : 'Log In'}
              </button>

              <div className="mt-5 border-t border-[#dedbd6] pt-3 text-center text-xl text-[#555f52]">
                New here?{' '}
                <Link className="font-black text-[#0f6f25] hover:text-[#0b5f1f]" to="/register">
                  Create an account
                </Link>
              </div>
            </form>
          )}

          {mode === 'request_otp' && (
            <form onSubmit={handleRequestOtp}>
              <h1 className="premium-text mx-auto mt-2 max-w-[560px] text-[clamp(40px,5vw,30px)] font-black leading-tight text-[#202020]">
                Reset Password
              </h1>
              <p className="premium-text-delay mx-auto mt-1 max-w-[380px] text-lg leading-relaxed text-[#555f52]">
                Enter your email address to receive a 6-digit OTP code.
              </p>

              <div className="mt-6 grid gap-6 text-left">
                <label className="grid gap-3 text-lg font-bold text-black">
                  Email Address
                  <input
                    className="h-[60px] rounded-2xl border-2 border-[#c3d0bf] bg-white px-7 text-xl text-[#202020] outline-none transition placeholder:text-[#555f52] focus:border-[#0f6f25] focus:ring-4 focus:ring-[#0f6f25]/10"
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="name@example.com"
                    required
                    type="email"
                    value={forgotEmail}
                  />
                </label>
              </div>

              {error && (
                <p className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-3 text-left text-sm font-bold text-red-700">
                  {error}
                </p>
              )}

              <button
                className="premium-button mt-8 inline-flex h-[55px] w-full items-center justify-center rounded-[24px] bg-[#0f6f25] text-xl font-black text-white shadow-[0_14px_24px_rgba(15,111,37,0.22)] hover:bg-[#0b5f1f] disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isSubmitting}
                type="submit"
              >
                {isSubmitting ? 'Sending OTP…' : 'Send OTP Code'}
              </button>

              <div className="mt-5 border-t border-[#dedbd6] pt-3 text-center text-lg">
                <button
                  className="font-bold text-[#555f52] hover:text-[#0f6f25]"
                  onClick={backToLogin}
                  type="button"
                >
                  ← Back to Login
                </button>
              </div>
            </form>
          )}

          {mode === 'verify_otp' && (
            <form onSubmit={handleVerifyOtp}>
              <h1 className="premium-text mx-auto mt-2 max-w-[560px] text-[clamp(40px,5vw,30px)] font-black leading-tight text-[#202020]">
                Verify OTP
              </h1>
              <p className="premium-text-delay mx-auto mt-1 max-w-[380px] text-lg leading-relaxed text-[#555f52]">
                We sent a 6-digit OTP code to <strong>{forgotEmail}</strong>.
              </p>

              <div className="mt-6 grid gap-6 text-left">
                <label className="grid gap-3 text-lg font-bold text-black">
                  6-Digit OTP Code
                  <input
                    className="h-[60px] rounded-2xl border-2 border-[#c3d0bf] bg-white px-7 text-center text-3xl font-mono tracking-[0.3em] text-[#202020] outline-none transition focus:border-[#0f6f25] focus:ring-4 focus:ring-[#0f6f25]/10"
                    maxLength={6}
                    onChange={(e) => setOtpCode(e.target.value)}
                    placeholder="123456"
                    required
                    type="text"
                    value={otpCode}
                  />
                </label>
              </div>

              {successMessage && (
                <p className="mt-6 rounded-2xl border border-green-200 bg-green-50 px-5 py-3 text-left text-sm font-bold text-green-800">
                  {successMessage}
                </p>
              )}

              {error && (
                <p className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-3 text-left text-sm font-bold text-red-700">
                  {error}
                </p>
              )}

              <button
                className="premium-button mt-8 inline-flex h-[55px] w-full items-center justify-center rounded-[24px] bg-[#0f6f25] text-xl font-black text-white shadow-[0_14px_24px_rgba(15,111,37,0.22)] hover:bg-[#0b5f1f] disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isSubmitting}
                type="submit"
              >
                {isSubmitting ? 'Verifying OTP…' : 'Verify OTP'}
              </button>

              <div className="mt-5 flex items-center justify-between border-t border-[#dedbd6] pt-3 text-base">
                <button
                  className="font-bold text-[#555f52] hover:text-[#0f6f25]"
                  onClick={() => setMode('request_otp')}
                  type="button"
                >
                  Resend OTP
                </button>
                <button
                  className="font-bold text-[#555f52] hover:text-[#0f6f25]"
                  onClick={backToLogin}
                  type="button"
                >
                  ← Back to Login
                </button>
              </div>
            </form>
          )}

          {mode === 'reset_password' && (
            <form onSubmit={handleResetPassword}>
              <h1 className="premium-text mx-auto mt-2 max-w-[560px] text-[clamp(40px,5vw,30px)] font-black leading-tight text-[#202020]">
                Set New Password
              </h1>
              <p className="premium-text-delay mx-auto mt-1 max-w-[380px] text-lg leading-relaxed text-[#555f52]">
                Create a new secure password for your account.
              </p>

              <div className="mt-6 grid gap-6 text-left">
                <label className="grid gap-3 text-lg font-bold text-black">
                  New Password
                  <input
                    className="h-[60px] rounded-2xl border-2 border-[#c3d0bf] bg-white px-7 text-xl text-[#202020] outline-none transition placeholder:text-[#555f52] focus:border-[#0f6f25] focus:ring-4 focus:ring-[#0f6f25]/10"
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="New password (min 6 characters)"
                    required
                    type="password"
                    value={newPassword}
                  />
                </label>

                <label className="grid gap-3 text-lg font-bold text-black">
                  Confirm New Password
                  <input
                    className="h-[60px] rounded-2xl border-2 border-[#c3d0bf] bg-white px-7 text-xl text-[#202020] outline-none transition placeholder:text-[#555f52] focus:border-[#0f6f25] focus:ring-4 focus:ring-[#0f6f25]/10"
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    required
                    type="password"
                    value={confirmPassword}
                  />
                </label>
              </div>

              {error && (
                <p className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-3 text-left text-sm font-bold text-red-700">
                  {error}
                </p>
              )}

              <button
                className="premium-button mt-8 inline-flex h-[55px] w-full items-center justify-center rounded-[24px] bg-[#0f6f25] text-xl font-black text-white shadow-[0_14px_24px_rgba(15,111,37,0.22)] hover:bg-[#0b5f1f] disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isSubmitting}
                type="submit"
              >
                {isSubmitting ? 'Updating Password…' : 'Update Password'}
              </button>

              <div className="mt-5 border-t border-[#dedbd6] pt-3 text-center text-lg">
                <button
                  className="font-bold text-[#555f52] hover:text-[#0f6f25]"
                  onClick={backToLogin}
                  type="button"
                >
                  Cancel & Back to Login
                </button>
              </div>
            </form>
          )}
        </div>
      </section>

      <footer className="flex flex-wrap items-center justify-center gap-8 px-6 pb-6 z-10 text-base font-bold text-[#4b5448]">
        <Link to="/">Help Center</Link>
        <Link to="/">Privacy Policy</Link>
        <Link to="/">Terms of Service</Link>
      </footer>
    </main>
  )
}

export default Login
