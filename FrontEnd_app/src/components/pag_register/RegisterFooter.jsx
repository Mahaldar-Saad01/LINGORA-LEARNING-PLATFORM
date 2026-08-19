import { Link } from 'react-router-dom'

const footerLinks = ['Privacy Policy', 'Terms of Service', 'Help Center', 'Accessibility']

function RegisterFooter() {
  return (
    <footer className="mt-14 border-t border-black/5 bg-[#f3f3f3] px-10 py-12 max-md:px-6">
      <div className="mx-auto flex max-w-6xl items-start justify-between gap-8 max-md:flex-col max-md:text-center">
        <div>
          <Link className="text-3xl font-black text-[#0f6f25]" to="/">
            Lingora Learning
          </Link>
          <p className="mt-2 text-base text-[#6b7066]">
            © 2024 Lingora Learning. Nurturing your journey.
          </p>
        </div>

        <nav className="flex flex-wrap justify-center gap-x-12 gap-y-8 text-base font-medium text-[#62685f]">
          {footerLinks.map((link) => (
            <a href={`#${link.toLowerCase().replaceAll(' ', '-')}`} key={link}>
              {link}
            </a>
          ))}
        </nav>
      </div>
    </footer>
  )
}

export default RegisterFooter
