export default function LessonHeader({ activity }) {
  return <div><div className="flex flex-wrap gap-2">{activity?.difficulty && <span className="rounded-full bg-[#a7f3a0] px-4 py-2 text-sm font-bold text-[#155d25]">{activity.difficulty}</span>}{activity?.xp != null && <span className="rounded-full bg-[#eaf1ff] px-4 py-2 text-sm font-bold">{activity.xp} XP</span>}</div><h1 className="mt-5 text-3xl font-black sm:text-4xl">{activity?.title ?? 'Lesson activity'}</h1>{activity?.instruction && <p className="mt-3 text-lg text-[#475047]" dir="auto">{activity.instruction}</p>}</div>
}
