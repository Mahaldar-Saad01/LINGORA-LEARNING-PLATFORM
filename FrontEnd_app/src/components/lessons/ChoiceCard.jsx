export default function ChoiceCard({ children, index, selected, onClick, subtitle }) {
  return (
    <button className={`min-h-24 w-full rounded-2xl border-2 bg-white px-7 py-5 text-left shadow-[0_8px_22px_rgba(28,67,39,0.06)] transition hover:-translate-y-0.5 hover:border-[#2e7d32] ${selected ? 'border-[#2e7d32] ring-4 ring-[#2e7d32]/10' : 'border-[#cbd6c6]'}`} onClick={onClick} type="button">
      <span className="flex items-center gap-5">
        {index !== undefined && <span className="grid size-12 shrink-0 place-items-center rounded-full bg-[#e4efff] text-lg">{index + 1}</span>}
        <span><strong className="block text-xl font-bold">{children}</strong>{subtitle && <small className="mt-1 block uppercase tracking-wider text-[#566056]">{subtitle}</small>}</span>
      </span>
    </button>
  )
}
