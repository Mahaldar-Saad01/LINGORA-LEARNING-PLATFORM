import LessonShell from './LessonShell'

export default function UnsupportedActivityPage({ activity, onNext }) {
  return <LessonShell current={activity.progress.current} onContinue={onNext} total={activity.progress.total}>
    <div className="mx-auto max-w-2xl rounded-2xl bg-white p-10 text-center shadow-lg">
      <h2 className="text-3xl font-black">New activity available</h2>
      <p className="mt-4 text-[#566056]">This app version does not yet have a renderer for <strong>{activity.activity_type}</strong>.</p>
    </div>
  </LessonShell>
}
