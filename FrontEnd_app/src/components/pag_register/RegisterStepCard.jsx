function RegisterStepCard({
  error,
  formData,
  isComplete,
  isHidden,
  nameInputRef,
  onChange,
  onNext,
}) {
  return (
    <section
      className={`glass-panel premium-card w-full overflow-hidden rounded-[28px] border border-black/5 shadow-[0_26px_44px_rgba(0,0,0,0.12)] transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${isHidden
          ? 'pointer-events-none max-h-0 -translate-y-6 border-transparent px-0 py-0 opacity-0 shadow-none'
          : isComplete
            ? 'max-w-[700px] px-6 py-5 opacity-70 shadow-[0_14px_24px_rgba(0,0,0,0.08)]'
            : 'max-w-[760px] px-9 py-9 opacity-100 max-sm:px-5'
        }`}
    >
      <div className="flex items-center gap-5">
        <span
          className={`grid place-items-center rounded-full bg-[#0f6f25] font-black text-white transition-all duration-700 ${isComplete ? 'size-9 text-base' : 'size-12 text-xl'
            }`}
        >
          1
        </span>
        <h2
          className={`font-medium leading-tight text-[#202020] transition-all duration-700 ${isComplete ? 'text-xl' : 'text-[clamp(32px,4vw,44px)]'
            }`}
        >
          Step 1: Personal Details
        </h2>
      </div>

      <form
        className={`grid overflow-hidden transition-all duration-700 ${isComplete ? 'mt-0 max-h-0 opacity-0' : 'mt-10 max-h-[760px] gap-7 opacity-100'
          }`}
        onSubmit={onNext}
      >
        <label className="grid gap-3 text-xl font-medium text-[#566052]">
          How should we address you?
          <input
            className="h-14 rounded-2xl border-2 border-[#c3d0bf] bg-[#fbfaf9] px-6 text-xl text-[#202020] outline-none transition placeholder:text-[#202020] focus:border-[#0f6f25] focus:bg-white focus:ring-4 focus:ring-[#0f6f25]/10"
            name="name"
            onChange={onChange}
            placeholder="Enter your name"
            ref={nameInputRef}
            required
            type="text"
            value={formData.name}
          />
        </label>

        <label className="grid gap-3 text-xl font-medium text-[#566052]">
          Email address
          <input
            className="h-14 rounded-2xl border-2 border-[#c3d0bf] bg-[#fbfaf9] px-6 text-xl text-[#202020] outline-none transition placeholder:text-[#202020] focus:border-[#0f6f25] focus:bg-white focus:ring-4 focus:ring-[#0f6f25]/10"
            name="email"
            onChange={onChange}
            placeholder="email@example.com"
            required
            type="email"
            value={formData.email}
          />
        </label>

        <label className="grid gap-3 text-xl font-medium text-[#566052]">
          Password
          <input
            className="h-14 rounded-2xl border-2 border-[#c3d0bf] bg-[#fbfaf9] px-6 text-xl text-[#202020] outline-none transition placeholder:text-[#202020] focus:border-[#0f6f25] focus:bg-white focus:ring-4 focus:ring-[#0f6f25]/10"
            name="password"
            onChange={onChange}
            placeholder="Enter your password"
            required
            minLength={8}
            onInvalid={(event) =>
              event.target.setCustomValidity('Password must be at least 8 characters long.')
            }
            onInput={(event) => event.target.setCustomValidity('')}
            type="password"
            value={formData.password}
          />
          {formData.password.length > 0 && formData.password.length < 8 && (
            <p className="text-sm font-bold text-red-600">
              Password must be at least 8 characters long.
            </p>
          )}
        </label>

        <label className="grid gap-3 text-xl font-medium text-[#566052]">
          Confirm password
          <input
            className="h-14 rounded-2xl border-2 border-[#c3d0bf] bg-[#fbfaf9] px-6 text-xl text-[#202020] outline-none transition placeholder:text-[#202020] focus:border-[#0f6f25] focus:bg-white focus:ring-4 focus:ring-[#0f6f25]/10"
            name="confirmPassword"
            onChange={onChange}
            placeholder="Confirm your password"
            required
            type="password"
            value={formData.confirmPassword}
          />
        </label>

        {error && (
          <p className="rounded-2xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-bold text-red-700">
            {error}
          </p>
        )}

        <div className="mt-4 flex items-center justify-between gap-5 max-sm:flex-col max-sm:items-stretch">
          <p className="text-sm font-medium text-[#6b7066]">
            Next: Which language are you comfortable with?
          </p>
          <button
            className="premium-button inline-flex h-[60px] min-w-[250px] items-center justify-center gap-3 rounded-full bg-[#0f6f25] px-8 text-xl font-black text-white shadow-[0_16px_26px_rgba(15,111,37,0.24)] hover:bg-[#0b5f1f]"
            type="submit"
          >
            Next Milestone
            <span className="material-symbols-outlined text-2xl" aria-hidden="true">
              arrow_forward
            </span>
          </button>
        </div>
      </form>

      <div
        className={`grid overflow-hidden transition-all duration-700 ${isComplete ? 'mt-3 max-h-16 opacity-100' : 'mt-0 max-h-0 opacity-0'
          }`}
      >
        <p className="text-sm font-medium text-[#566052]">
          {formData.name} - {formData.email}
        </p>
      </div>
    </section>
  )
}

export default RegisterStepCard
