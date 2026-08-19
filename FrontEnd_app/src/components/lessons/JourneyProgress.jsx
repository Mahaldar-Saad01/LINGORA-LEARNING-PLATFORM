export default function JourneyProgress({ current, total, label }) {
  const percentage = Math.round((current / total) * 100)
  return (
    <div className="w-full">
      <div className="mb-2 flex items-center justify-between text-sm font-bold text-[#344137]">
        <span>{label || `Step ${current} of ${total}`}</span>
        <span className="text-[#0f6f25]">{percentage}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[#dbe9fb]" role="progressbar" aria-valuemax={total} aria-valuemin="1" aria-valuenow={current}>
        <div className="h-full rounded-full bg-[#176d2a] transition-[width] duration-500" style={{ width: `${percentage}%` }} />
      </div>
    </div>
  )
}
