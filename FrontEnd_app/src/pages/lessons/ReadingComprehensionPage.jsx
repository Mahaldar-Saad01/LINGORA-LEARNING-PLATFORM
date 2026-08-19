import ChoiceActivity from '../../components/lessons/ChoiceActivity'

export default function ReadingComprehensionPage({ activity, onSubmit, onNext }) {
  return <ChoiceActivity activity={activity} onNext={onNext} onSubmit={onSubmit}><div><span className="rounded-full bg-[#e1ece8] px-4 py-2 text-sm font-bold text-[#0f6f25]">{activity.skill}</span><h1 className="mt-6 text-4xl font-black">{activity.title}</h1><p className="mt-3 text-lg text-[#566056]">{activity.instruction}</p><article className="mt-8 rounded-2xl bg-white p-8 text-lg leading-8 shadow-sm">{activity.passage}</article></div></ChoiceActivity>
}
