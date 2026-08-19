export default function SkillScoreCard({ skill, score, change }) {
  const value = Math.round(Number(score) || 0)
  return <article className="rounded-2xl border border-green-100 bg-white p-4 shadow-sm">
    <div className="flex items-center justify-between">
      <h3 className="font-black capitalize">{skill}</h3>
      <strong className="text-[#0f6f25]">{value}%</strong>
    </div>
    <div className="mt-3 h-2 overflow-hidden rounded-full bg-green-50" role="progressbar" aria-label={`${skill} proficiency`} aria-valuemin="0" aria-valuemax="100" aria-valuenow={value}>
      <div className="h-full rounded-full bg-[#0f6f25]" style={{ width: `${value}%` }} />
    </div>
    {change != null && <p className="mt-2 text-xs text-slate-500">{change >= 0 ? '+' : ''}{change} recently</p>}
  </article>
}
