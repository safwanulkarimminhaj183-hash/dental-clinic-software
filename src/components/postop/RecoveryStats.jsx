import { ClipboardList, HeartPulse, CalendarClock, CheckCircle2 } from 'lucide-react';

const RecoveryStats = ({ stats, loading, onSelect }) => {
  const cards = [
    { key: 'total', label: 'Total Recovery Records', value: stats?.total, icon: ClipboardList, tone: 'text-[#3ec1d3]', filter: null },
    { key: 'recovering', label: 'Currently Recovering', value: stats?.recovering, icon: HeartPulse, tone: 'text-sky-300', filter: { status: 'Recovering' } },
    { key: 'due', label: 'Follow-ups Due', value: stats?.followUpsDue, icon: CalendarClock, tone: 'text-amber-300', filter: { followUp: 'due' }, hint: stats?.overdue ? `${stats.overdue} overdue` : 'Next 7 days' },
    { key: 'done', label: 'Recovery Completed', value: stats?.completed, icon: CheckCircle2, tone: 'text-emerald-300', filter: { status: 'Completed' } },
  ];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4" role="list" aria-label="Recovery summary">
      {cards.map(({ key, label, value, icon: Icon, tone, filter, hint }) => (
        <button
          key={key}
          role="listitem"
          type="button"
          onClick={() => onSelect?.(filter)}
          className="text-left bg-[#112a42] border border-cyan-900/30 rounded-xl p-4 flex items-center gap-4 hover:border-[#3ec1d3]/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3ec1d3] transition-all cursor-pointer"
        >
          <div className="w-11 h-11 rounded-xl bg-[#0e2439] flex items-center justify-center shrink-0">
            <Icon className={`w-5 h-5 ${tone}`} aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-gray-400 font-semibold">{label}</p>
            <p className="text-2xl font-extrabold text-white leading-tight" aria-live="polite">
              {loading && value === undefined ? <span className="inline-block w-8 h-6 bg-[#183a5c] rounded animate-pulse" /> : (value ?? 0)}
            </p>
            {hint && <p className="text-[11px] text-amber-400/80">{hint}</p>}
          </div>
        </button>
      ))}
    </div>
  );
};
export default RecoveryStats;