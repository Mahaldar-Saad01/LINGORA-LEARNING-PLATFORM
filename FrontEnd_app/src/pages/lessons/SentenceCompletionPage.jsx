import ChoiceActivity from '../../components/lessons/ChoiceActivity'

export default function SentenceCompletionPage({ activity, onSubmit, onNext }) {
  return <ChoiceActivity activity={activity} onNext={onNext} onSubmit={onSubmit}><div><h1 className="text-4xl font-black">{activity.title}</h1><p className="mt-3 text-lg text-[#566056]">{activity.instruction}</p><div className="mt-9 rounded-2xl bg-white p-9 text-center text-3xl font-black shadow-sm"><span>{activity.before_text}</span><span className="mx-3 inline-block min-w-28 border-b-2 border-[#2e7d32] text-[#0f6f25]">___</span><span>{activity.after_text}</span></div>{activity.hint && <p className="mt-5 rounded-xl bg-[#eaf1ff] p-4"><strong>Hint:</strong> {activity.hint}</p>}</div></ChoiceActivity>
}
