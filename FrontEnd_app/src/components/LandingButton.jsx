const buttonStyles = {
  primary:
    'min-h-[70px] w-full max-w-[336px] border-2 border-[#0f5d1e] bg-[#2d8738] text-white shadow-[0_14px_26px_rgba(20,110,36,0.18)]',
  outline:
    'min-h-14 w-full max-w-[336px] border border-[#0f5d1e]/35 bg-white text-[#0f5d1e]',
  ghost: 'min-h-8 border border-[#0f5d1e]/35 bg-white text-[#0f5d1e] hover:bg-[#dfeee1]/50 max-sm:hidden',
  compact: 'min-h-8 border border-[#0f5d1e] bg-[#2d8738] text-white hover:bg-[#257630]',
  light: 'min-h-[38px] min-w-[230px] border border-white bg-white text-[#0f5d1e] hover:bg-[#fbfaf9]',
}

function LandingButton({ children, className = '', href = '#', icon, variant = 'outline', ...props }) {
  return (
    <a
      className={`inline-flex items-center justify-center gap-2.5 rounded-lg px-7 text-xs font-extrabold leading-none transition duration-150 hover:-translate-y-0.5 hover:shadow-lg max-sm:px-4 ${buttonStyles[variant]} ${className}`.trim()}
      href={href}
      {...props}
    >
      <span>{children}</span>
      {icon ? <span aria-hidden="true">{icon}</span> : null}
    </a>
  )
}

export default LandingButton
