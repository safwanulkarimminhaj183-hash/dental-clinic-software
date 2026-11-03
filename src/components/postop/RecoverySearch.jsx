import { Search, Filter, X, Archive } from 'lucide-react';

const sel = 'bg-[#091929] border border-cyan-900/40 rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-[#3ec1d3] cursor-pointer';

const RecoverySearch = ({ filters, dentists, onChange, onReset }) => {
  const active = filters.search || filters.status !== 'all' || filters.dentist !== 'all' || filters.followUp !== 'all' || filters.archived;
  return (
    <div className="flex flex-wrap items-center gap-3" role="search">
      <div className="relative flex-1 min-w-[220px]">
        <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
        <label htmlFor="recovery-search" className="sr-only">Search recovery records</label>
        <input
          id="recovery-search"
          value={filters.search}
          onChange={(e) => onChange({ search: e.target.value })}
          placeholder="Search by patient, ID, procedure or dentist…"
          className="w-full bg-[#091929] border border-cyan-900/40 rounded-lg pl-9 pr-3 py-2 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-[#3ec1d3]"
        />
      </div>
      <Filter className="w-4 h-4 text-gray-500 hidden sm:block" aria-hidden="true" />
      <label className="sr-only" htmlFor="rf-status">Recovery status</label>
      <select id="rf-status" className={sel} value={filters.status} onChange={(e) => onChange({ status: e.target.value })}>
        <option value="all">All statuses</option>
        <option>Recovering</option><option>Needs Attention</option><option>Completed</option>
      </select>
      <label className="sr-only" htmlFor="rf-dentist">Dentist</label>
      <select id="rf-dentist" className={sel} value={filters.dentist} onChange={(e) => onChange({ dentist: e.target.value })}>
        <option value="all">All dentists</option>
        {dentists.map((d) => <option key={d} value={d}>{d}</option>)}
      </select>
      <label className="sr-only" htmlFor="rf-fu">Follow-up</label>
      <select id="rf-fu" className={sel} value={filters.followUp} onChange={(e) => onChange({ followUp: e.target.value })}>
        <option value="all">Any follow-up</option>
        <option value="due">Due (overdue + 7 days)</option>
        <option value="overdue">Overdue</option>
        <option value="upcoming">Upcoming</option>
      </select>
      <button
        type="button"
        aria-pressed={filters.archived}
        onClick={() => onChange({ archived: !filters.archived })}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border cursor-pointer ${filters.archived ? 'bg-amber-950/50 border-amber-700/50 text-amber-300' : 'bg-[#091929] border-cyan-900/40 text-gray-300 hover:text-white'}`}
      >
        <Archive className="w-3.5 h-3.5" aria-hidden="true" /> Archived
      </button>
      {active && (
        <button type="button" onClick={onReset} className="flex items-center gap-1 text-xs text-gray-400 hover:text-white cursor-pointer">
          <X className="w-3.5 h-3.5" aria-hidden="true" /> Clear
        </button>
      )}
    </div>
  );
};
export default RecoverySearch;