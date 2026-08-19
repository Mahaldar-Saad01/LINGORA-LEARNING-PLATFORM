import { Link } from 'react-router-dom'
import JourneyProgress from './JourneyProgress'
import LessonIcon from './LessonIcon'

export default function JourneyHeader({ current, total, compact = false }) {
  return (
    <header className="px-6 py-5 sm:px-10">
      <div className="flex items-center gap-5">
        <Link aria-label="Exit lesson" className="grid size-12 shrink-0 place-items-center rounded-lg text-[#344137] transition hover:bg-white hover:text-[#0f6f25]" to="/lessons">
          <LessonIcon name="close" />
        </Link>
        {!compact && <h1 className="hidden shrink-0 text-xl font-extrabold text-[#0f6f25] lg:block">Hindi Learning Journey</h1>}
        {current ? <div className="mx-auto max-w-4xl flex-1"><JourneyProgress current={current} total={total} /></div> : <div className="flex-1" />}
        <span className="hidden shrink-0 text-xl font-extrabold text-[#0f6f25] md:block">Hindi Learning Journey</span>
      </div>
    </header>
  )
}
