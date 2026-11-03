import { CalendarClock, AlertTriangle, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { fmtDate, isOverdue } from './postOpApi';

// Used in two places: the dashboard's upcoming/overdue panel (list) and the details view (single record)
export const FollowUpPanel = ({ data, loading, canWrite, busyId, onUpdate, onOpen }) => {
  const groups = [
    { key: 'overdue', title: 'Overdue', rows: data?.overdue || [], tone: 'text-rose-300', icon: AlertTriangle },
    { key: 'upcoming', title: 'Upcoming (next 7 days)', rows: data?.upcoming || [], tone: 'text-amber-300', icon: CalendarClock },
  ];
  return (
    <section aria-label="Follow-up schedule" className="bg-[#112a42] border border-cyan-900/30 rounded-xl p-4">
      <h4 className="font-bold text-white text-sm flex items-center gap-2"><CalendarClock className="w-4 h-4 text-[#3ec1d3]" aria-hidden="true" /> Follow-up Schedule</h4>
      {loading && !data ? <div className="h-10 bg-[#183a5c]/60 rounded animate-pulse mt-3" /> : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-3">
          {groups.map(({ key, title, rows, tone, icon: Icon }) => (
            <div key={key}>
              <p className={`text-xs font-bold flex items-center gap-1.5 ${tone}`}><Icon className="w-3.5 h-3.5" aria-hidden="true" />{title} ({rows.length})</p>
              {rows.length === 0 ? <p className="text-xs text-gray-500 mt-2">Nothing here.</p> : (
                <ul className="mt-2 flex flex-col gap-2">
                  {rows.slice(0, 6).map((r) => (
                    <li key={r._id} className="bg-[#0e2439] rounded-lg p-2.5 flex items-center justify-between gap-2">
                      <button type="button" onClick={() => onOpen(r)} className="text-left min-w-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3ec1d3] rounded">
                        <p className="text-xs font-semibold text-gray-100 truncate">{r.patientName} <span className="font-mono text-[#3ec1d3]">{r.patientId}</span></p>
                        <p className="text-[11px] text-gray-400 truncate">{r.procedure} • {fmtDate(r.followUpDate)}</p>
                      </button>
                      {canWrite && (
                        <div className="flex items-center gap-1 shrink-0">
                          {busyId === r._id ? <Loader2 className="w-4 h-4 animate-spin text-gray-400" /> : (<>
                            <button type="button" title="Mark follow-up completed" aria-label={`Mark follow-up completed for ${r.patientName}`} onClick={() => onUpdate(r, { followUpStatus: 'Completed' })} className="p-1.5 rounded-lg text-emerald-300 hover:bg-emerald-950/50 cursor-pointer"><CheckCircle2 className="w-4 h-4" /></button>
                            <button type="button" title="Mark missed" aria-label={`Mark follow-up missed for ${r.patientName}`} onClick={() => onUpdate(r, { followUpStatus: 'Missed' })} className="p-1.5 rounded-lg text-rose-300 hover:bg-rose-950/50 cursor-pointer"><XCircle className="w-4 h-4" /></button>
                          </>)}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

// Single-record follow-up block for the details view
export const FollowUpDetail = ({ record, canWrite, busy, onUpdate }) => {
  const overdue = isOverdue(record);
  const a = record.followUpAppointment;
  return (
    <div className="bg-[#091929] border border-cyan-900/30 rounded-xl p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-gray-100 font-semibold">{record.followUpDate ? fmtDate(record.followUpDate) : 'No follow-up scheduled'}{overdue && <span className="ml-2 text-[11px] text-rose-300 bg-rose-950/60 border border-rose-800/50 rounded px-1.5 py-0.5">Overdue</span>}</p>
        <span className="text-[11px] px-2 py-0.5 rounded bg-[#183a5c] text-gray-200 font-semibold">{record.followUpStatus}</span>
      </div>
      {a && <p className="text-xs text-gray-400">Linked appointment: {fmtDate(a.date)} at {a.time} • status {a.status}</p>}
      {record.followUpSyncNote && <p className="text-xs text-amber-300">{record.followUpSyncNote}</p>}
      {canWrite && record.followUpDate && !record.isArchived && !['Completed', 'Not Required'].includes(record.followUpStatus) && (
        <div className="flex gap-2 mt-1">
          <button disabled={busy} onClick={() => onUpdate({ followUpStatus: 'Completed' })} className="px-3 py-1.5 rounded-lg bg-emerald-950/50 border border-emerald-800/50 text-emerald-300 text-xs font-semibold cursor-pointer disabled:opacity-50">Mark Completed</button>
          <button disabled={busy} onClick={() => onUpdate({ followUpStatus: 'Missed' })} className="px-3 py-1.5 rounded-lg bg-rose-950/50 border border-rose-800/50 text-rose-300 text-xs font-semibold cursor-pointer disabled:opacity-50">Mark Missed</button>
        </div>
      )}
    </div>
  );
};