import aiAvatar from '../../assets/images/ai_avatar.png'
import CelebrationFall from '../../components/lessons/CelebrationFall'
import JourneyFooter from '../../components/lessons/JourneyFooter'
import LessonIcon from '../../components/lessons/LessonIcon'

export default function AchievementCelebrationPage({ achievement, current = 1, total = 1, onContinue }) {
  return (
    <main className="route-fade relative flex min-h-screen flex-col overflow-hidden bg-[radial-gradient(circle_at_top,#fff7cc_0,#f7f8ff_45%,#eef8ef_100%)] text-[#101c31]">
      <CelebrationFall />
      <section className="relative z-10 mx-auto grid w-full max-w-[1050px] flex-1 items-center gap-8 px-6 py-10 lg:grid-cols-[.9fr_1.1fr] lg:px-10">
        <div className="text-center lg:text-left">
          <p className="text-sm font-black uppercase tracking-[.25em] text-[#b46a00]">Achievement unlocked</p>
          <h1 className="mt-4 text-5xl font-black leading-tight sm:text-6xl">Congratulations!</h1>
          <p className="mt-5 text-xl leading-8 text-[#4f5c51]">
            You earned <strong className="text-[#0f6f25]">{achievement.title}</strong>. {achievement.description}
          </p>
          <div className="mt-7 inline-flex max-w-xl items-center gap-4 rounded-2xl bg-white/90 p-5 text-left shadow-[0_18px_45px_rgba(31,80,43,.12)]">
            <img className="size-24 shrink-0 object-contain" src={aiAvatar} alt="Lingora avatar celebrating your achievement" />
            <p className="font-bold leading-6 text-[#344137]">Fantastic progress! Every lesson is making you stronger. Keep going—the next badge is waiting for you.</p>
          </div>
        </div>

        <div className="mx-auto w-full max-w-md rounded-[2rem] border-4 border-white bg-white/85 p-8 text-center shadow-[0_25px_70px_rgba(31,80,43,.18)] backdrop-blur">
          <div className="mx-auto grid size-40 place-items-center rounded-full bg-[linear-gradient(145deg,#ffe789,#f4aa28)] text-[#764500] shadow-[inset_0_0_0_8px_rgba(255,255,255,.55),0_14px_35px_rgba(196,126,0,.3)]">
            <LessonIcon className="size-20" name={achievement.icon || 'emoji_events'} />
          </div>
          <p className="mt-7 text-xs font-black uppercase tracking-[.22em] text-[#9a6815]">New badge</p>
          <h2 className="mt-2 text-3xl font-black">{achievement.title}</h2>
          <p className="mt-3 text-[#5f695f]">{achievement.description}</p>
          {total > 1 && <p className="mt-6 text-sm font-bold text-[#0f6f25]">Badge {current} of {total}</p>}
        </div>
      </section>
      <JourneyFooter onClick={onContinue}>{current < total ? 'See next achievement' : 'View lesson results'}</JourneyFooter>
    </main>
  )
}
