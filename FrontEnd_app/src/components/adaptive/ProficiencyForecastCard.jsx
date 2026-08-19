import { useEffect, useRef, useState } from 'react'
import { getForecast } from '../../services/lessonApi'

const SKILL_LABELS = {
  reading: 'Reading',
  writing: 'Writing',
  listening: 'Listening',
  speaking: 'Speaking',
  vocabulary: 'Vocabulary',
  grammar: 'Grammar',
}

const LESSON_OPTIONS = [1, 2, 3, 5, 10]
const DAY_OPTIONS = [7, 14, 30, 60, 90]
const CONSISTENCY_OPTIONS = [50, 60, 70, 80, 90, 100]

const clampScore = (score) => Math.max(0, Math.min(100, Number(score) || 0))

function ScenarioSelect({ label, value, values, suffix = '', onChange }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-[11px] font-black uppercase tracking-wider text-[#607064]">
        {label}
      </span>
      <select
        className="h-10 w-full rounded-xl border border-[#d8e6da] bg-white px-3 text-xs font-bold text-[#102b18] outline-none transition hover:border-[#9ecba5] focus:border-[#188038] focus:ring-2 focus:ring-[#188038]/10"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      >
        {values.map((option) => (
          <option key={option} value={option}>
            {option}{suffix}
          </option>
        ))}
      </select>
    </label>
  )
}

/* --- Graph Component 1: Overall Timeline Trend --- */
function AreaTrendGraph({ current, predicted, days }) {
  const points = [
    { label: 'Start', score: current },
    { label: `Day ${Math.round(days / 2)}`, score: Math.round(current + (predicted - current) * 0.45) },
    { label: `Day ${days}`, score: predicted }
  ]

  return (
    <div className="flex flex-col justify-between rounded-xl border border-[#dce8dd] bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between border-b border-[#edf2ed] pb-2">
        <span className="text-xs font-black text-[#102b18]">Proficiency Projection Curve</span>
        <span className="text-[10px] font-extrabold text-[#13752f]">+{predicted - current}% Growth</span>
      </div>

      <div className="relative mt-4 h-32 w-full">
        <svg className="h-full w-full overflow-visible" viewBox="0 0 100 40" preserveAspectRatio="none">
          <defs>
            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#188038" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#188038" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Graph Fill Area */}
          <path
            d={`M 0,${40 - (current / 100) * 35} Q 50,${40 - (points[1].score / 100) * 35} 100,${40 - (predicted / 100) * 35} L 100,40 L 0,40 Z`}
            fill="url(#areaGradient)"
          />

          {/* Graph Smooth Stroke */}
          <path
            d={`M 0,${40 - (current / 100) * 35} Q 50,${40 - (points[1].score / 100) * 35} 100,${40 - (predicted / 100) * 35}`}
            fill="none"
            stroke="#13752f"
            strokeWidth="2"
            strokeLinecap="round"
          />

          {/* Points */}
          <circle cx="0" cy={40 - (current / 100) * 35} r="2.5" className="fill-[#102b18]" />
          <circle cx="50" cy={40 - (points[1].score / 100) * 35} r="2.5" className="fill-[#188038]" />
          <circle cx="100" cy={40 - (predicted / 100) * 35} r="3" className="fill-[#13752f]" />
        </svg>
      </div>

      <div className="mt-2 flex justify-between text-[10px] font-black text-[#617067]">
        {points.map((p, i) => (
          <div key={i} className="text-center">
            <span>{p.label}</span>
            <p className="text-[#102b18]">{p.score}%</p>
          </div>
        ))}
      </div>
    </div>
  )
}

/* --- Graph Component 2: Skill Activity Comparative Bar --- */
function SkillBarGraph({ current, predicted, range }) {
  return (
    <div className="mt-3 space-y-2">
      {/* Current Level */}
      <div>
        <div className="flex justify-between text-[11px] font-semibold text-[#617067]">
          <span>Current</span>
          <span className="font-bold text-[#102b18]">{current}%</span>
        </div>
        <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-[#e8f2ea]">
          <div className="h-full bg-[#8fae94] transition-all duration-500" style={{ width: `${current}%` }} />
        </div>
      </div>

      {/* Projected Level */}
      <div>
        <div className="flex justify-between text-[11px] font-semibold text-[#13752f]">
          <span>Projected Target</span>
          <span className="font-black">{predicted}%</span>
        </div>
        <div className="relative mt-1 h-2 w-full overflow-hidden rounded-full bg-[#e8f2ea]">
          <div className="h-full bg-[#13752f] transition-all duration-500" style={{ width: `${predicted}%` }} />
        </div>
      </div>

      {/* Predicted Range Bar */}
      {range && (
        <div className="pt-1 flex items-center justify-between text-[10px] text-[#77827a]">
          <span>Confidence Range:</span>
          <span className="font-bold text-[#263b2c]">{range.minimum ?? current}% – {range.maximum ?? predicted}%</span>
        </div>
      )}
    </div>
  )
}

export default function ProficiencyForecastCard() {
  const [days, setDays] = useState(14)
  const [lessons, setLessons] = useState(2)
  const [consistency, setConsistency] = useState(80)
  const [activeTab, setActiveTab] = useState('skills')

  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const requestId = useRef(0)

  const updateForecast = async (scenario = { days, lessons, consistency }) => {
    const activeRequest = requestId.current + 1
    requestId.current = activeRequest

    setLoading(true)
    setError('')

    try {
      const value = await getForecast(scenario)
      if (requestId.current === activeRequest) setData(value)
    } catch (requestError) {
      if (requestId.current === activeRequest) {
        setError(requestError?.message || 'Unable to calculate the forecast.')
      }
    } finally {
      if (requestId.current === activeRequest) setLoading(false)
    }
  }

  useEffect(() => {
    updateForecast({ days: 14, lessons: 2, consistency: 80 })
    return () => { requestId.current += 1 }
  }, [])

  const skills = Array.isArray(data?.skills) ? data.skills : []
  const assumptions = Array.isArray(data?.assumptions) ? data.assumptions : []
  const upcomingLessons = Array.isArray(data?.upcoming_lessons) ? data.upcoming_lessons : []

  const currentScore = clampScore(data?.current_overall_score)
  const predictedScore = clampScore(data?.predicted_overall_score)
  const overallGain = Number(data?.overall_improvement) || 0

  return (
    <section className="overflow-hidden rounded-[28px] border border-[#dce8dd] bg-white shadow-[0_18px_50px_rgba(20,70,35,0.06)]">

      {/* Dynamic Scenario Controls */}
      <div className="border-b border-[#e5eee6] bg-gradient-to-r from-[#fcfefd] via-[#f7faf8] to-[#edf8ee] p-5 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#cce5d0] bg-white px-3 py-1">
              <span className="h-2 w-2 rounded-full bg-[#20a044]" />
              <span className="text-[10px] font-black uppercase tracking-widest text-[#13752f]">
                Forecast Engine
              </span>
            </div>
            <h3 className="mt-2 text-xl font-black text-[#102b18]">
              Projection Simulator
            </h3>
          </div>

          {data?.confidence && (
            <div className="inline-flex items-center gap-2 rounded-xl border border-[#cfe5d3] bg-white px-3.5 py-1.5 shadow-sm">
              <span className="text-[10px] font-black uppercase text-[#79857c]">Confidence Level:</span>
              <span className="text-xs font-black text-[#13752f] capitalize">{data.confidence}</span>
            </div>
          )}
        </div>

        <div className="mt-5 grid items-end gap-3 rounded-2xl border border-[#dfebe1] bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
          <ScenarioSelect label="Lessons / Day" value={lessons} values={LESSON_OPTIONS} onChange={setLessons} />
          <ScenarioSelect label="Timeline" value={days} values={DAY_OPTIONS} suffix=" days" onChange={setDays} />
          <ScenarioSelect label="Consistency" value={consistency} values={CONSISTENCY_OPTIONS} suffix="%" onChange={setConsistency} />

          <button
            className="h-10 rounded-xl bg-[#137c31] px-4 text-xs font-black text-white shadow-md transition hover:bg-[#0d6927] disabled:opacity-50"
            disabled={loading}
            onClick={() => updateForecast()}
            type="button"
          >
            {loading ? 'Calculating...' : 'Recalculate'}
          </button>
        </div>
      </div>

      {loading && !data && (
        <div className="grid min-h-[300px] place-items-center p-8">
          <div className="text-center">
            <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-[#d5ead9] border-t-[#188038]" />
            <p className="mt-3 text-xs font-bold text-[#617067]">Generating skill forecast visualizer...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="m-6 rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-700">
          {error}
        </div>
      )}

      {data && (
        <div className="p-5 sm:p-7">

          {/* Top Panel: Summary Metric & Overall Graph */}
          <div className="grid gap-6 rounded-2xl border border-[#d3e7d6] bg-[#f1f9f2] p-5 lg:grid-cols-12 lg:items-center">
            <div className="space-y-3 lg:col-span-5">
              <span className="text-[11px] font-black uppercase tracking-wider text-[#617067]">Overall Proficiency Target</span>

              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-black text-[#102b18]">{currentScore}%</span>
                <span className="text-xl font-bold text-[#13752f]">➔</span>
                <span className="text-5xl font-black text-[#13752f]">{predictedScore}%</span>
              </div>

              <div className="inline-block rounded-lg bg-[#d9efdd] px-3 py-1 text-xs font-black text-[#13752f]">
                {overallGain > 0 ? `+${overallGain}% Expected Increase` : 'Maintaining Proficiency'}
              </div>

              <p className="text-xs leading-relaxed text-[#617067]">
                {data.summary || 'Projections refine dynamically as you perform activities in your target focus areas.'}
              </p>
            </div>

            {/* Overall Area Trend Graph */}
            <div className="lg:col-span-7">
              <AreaTrendGraph current={currentScore} predicted={predictedScore} days={days} />
            </div>
          </div>

          {/* Secondary Details Section */}
          <div className="mt-8">
            <div className="flex border-b border-[#e1ebd3] gap-6">
              {[
                { id: 'skills', label: 'Activity & Skill Graphs' },
                { id: 'lessons', label: `Lessons Covered (${upcomingLessons.length})` },
                { id: 'assumptions', label: 'Forecast Conditions' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`pb-3 text-xs font-black transition-all ${activeTab === tab.id
                    ? 'border-b-2 border-[#13752f] text-[#13752f]'
                    : 'text-[#829185] hover:text-[#102b18]'
                    }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="mt-5">
              {/* Activity & Skill Bar Graphs */}
              {activeTab === 'skills' && (
                skills.length ? (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {skills.map((item) => {
                      const current = clampScore(item.current_score)
                      const predicted = clampScore(item.predicted_score)
                      const gain = Number(item.improvement) || 0

                      return (
                        <div key={item.skill} className="flex flex-col justify-between rounded-xl border border-[#dbe9dd] bg-white p-4 shadow-sm hover:border-[#b8d8bd] transition">
                          <div>
                            <div className="flex items-center justify-between border-b border-[#edf2ed] pb-2">
                              <h4 className="text-xs font-black text-[#102b18]">
                                {SKILL_LABELS[item.skill] || item.skill}
                              </h4>
                              <span className="rounded bg-[#edf7ef] px-2 py-0.5 text-[10px] font-black text-[#13752f]">
                                {gain > 0 ? `+${gain}%` : '0%'}
                              </span>
                            </div>

                            {/* Bar Graph Visualizer */}
                            <SkillBarGraph current={current} predicted={predicted} range={item.predicted_range} />
                          </div>

                          <p className="mt-3 border-t border-[#edf2ed] pt-2 text-[11px] leading-relaxed text-[#68756c]">
                            {item.reason || 'Sufficient practice supports projected proficiency growth.'}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-center py-6 text-xs text-[#68756c]">No skill metrics available.</p>
                )
              )}

              {/* Upcoming Lessons */}
              {activeTab === 'lessons' && (
                upcomingLessons.length ? (
                  <div className="divide-y divide-[#e7eee8] rounded-xl border border-[#dce8dd] bg-[#fafcf9] px-4">
                    {upcomingLessons.map((lesson, idx) => (
                      <div key={lesson.id} className="flex items-center gap-3 py-3">
                        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#edf7ef] text-[10px] font-black text-[#13752f]">
                          {idx + 1}
                        </span>
                        <div>
                          <p className="text-xs font-bold text-[#263b2c]">{lesson.title}</p>
                          {lesson.skills && (
                            <p className="text-[10px] text-[#77827a]">
                              {lesson.skills.map((s) => SKILL_LABELS[s] || s).join(' • ')}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-6 text-xs text-[#68756c]">No upcoming lessons scheduled.</p>
                )
              )}

              {/* Assumptions */}
              {activeTab === 'assumptions' && (
                assumptions.length ? (
                  <ul className="grid gap-2 rounded-xl border border-[#dce8dd] bg-[#fafcf9] p-4">
                    {assumptions.map((item, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-xs text-[#68756c]">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#65ad73]" />
                        {item}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-center py-6 text-xs text-[#68756c]">No conditions specified.</p>
                )
              )}
            </div>
          </div>

          <p className="mt-6 text-center text-[10px] text-[#859087]">
            * Visual projections are estimates based on active usage trends and learning scenario input.
          </p>
        </div>
      )}
    </section>
  )
}