import { Eye, Edit3, Printer, Archive, ArchiveRestore, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, AlertTriangle, HeartPulse, RefreshCw } from 'lucide-react';
import { fmtDate, isOverdue, STATUS_STYLES } from './postOpApi';

const COLS = [
  { key: 'patientId', label: 'Patient ID' },
  { key: 'patientName', label: 'Patient Name' },
  { key: 'procedure', label: 'Dental Procedure' },
  { key: 'procedureDate', label: 'Procedure Date' },
  { key: 'dentistName', label: 'Assigned Dentist' },
  { key: 'recoveryStatus', label: 'Recovery Status' },
  { key: 'followUpDate', label: 'Next Follow-up' },
];

const iconBtn = 'p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#183a5c] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3ec1d3] cursor-pointer';

const RecoveryTable = ({ rows, loading, error, onRetry, sort, onSort, pagination, onPage, canWrite, archivedView, onView, onEdit, onPrint, onArchive, onRestore, onCreate }) => {
  if (error) {
    return (
      <div role="alert" className="p-8 border border-rose-900/50 bg-rose-950/20 rounded-xl text-center flex flex-col items-center gap-3">
        <AlertTriangle className="w-7 h-7 text-rose-400" aria-hidden="true" />
        <p className="text-sm text-rose-200">{error}</p>
        <button onClick={onRetry} className="flex items-center gap-2 px-4 py-2 bg-[#3ec1d3] text-[#081523] rounded-lg font-bold text-xs cursor-pointer"><RefreshCw className="w-3.5 h-3.5" /> Retry</button>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto border border-cyan-900/30 rounded-xl">
        <table className="w-full text-left text-xs min-w-[900px]">
          <thead className="bg-[#112a42] text-gray-400">
            <tr>
              {COLS.map((c) => (
                <th key={c.key} scope="col" aria-sort={sort.by === c.key ? (sort.order === 'asc' ? 'ascending' : 'descending') : 'none'} className="px-4 py-3 font-semibold whitespace-nowrap">
                  <button type="button" onClick={() => onSort(c.key)} className="flex items-center gap-1 hover:text-white cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3ec1d3] rounded">
                    {c.label}
                    {sort.by === c.key && (sort.order === 'asc' ? <ArrowUp className="w-3 h-3" aria-hidden="true" /> : <ArrowDown className="w-3 h-3" aria-hidden="true" />)}
                  </button>
                </th>
              ))}
              <th scope="col" className="px-4 py-3 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-cyan-900/20">
            {loading && Array.from({ length: 5 }).map((_, i) => (
              <tr key={`sk${i}`}><td colSpan={COLS.length + 1} className="px-4 py-3"><div className="h-4 bg-[#183a5c]/60 rounded animate-pulse" /></td></tr>
            ))}
            {!loading && rows.map((r) => {
              const overdue = isOverdue(r);
              return (
                <tr key={r._id} className="hover:bg-[#112a42]/60">
                  <td className="px-4 py-3 font-mono text-[#3ec1d3] font-bold">{r.patientId || r.id || '—'}</td>
                  <td className="px-4 py-3 text-gray-100 font-semibold">{r.patientName || r.name || 'Patient'}</td>
                  <td className="px-4 py-3 text-gray-300">{r.procedure}</td>
                  <td className="px-4 py-3 text-gray-300 whitespace-nowrap">{fmtDate(r.procedureDate)}</td>
                  <td className="px-4 py-3 text-gray-300">{r.dentistName}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded border text-[11px] font-semibold whitespace-nowrap ${STATUS_STYLES[r.recoveryStatus]}`}>{r.recoveryStatus}</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {r.followUpDate ? (
                      <span className={overdue ? 'text-rose-300 font-semibold' : 'text-gray-300'}>
                        {fmtDate(r.followUpDate)}{overdue && <span className="ml-1.5 px-1.5 py-0.5 rounded bg-rose-950/60 border border-rose-800/50 text-[10px]">Overdue</span>}
                      </span>
                    ) : <span className="text-gray-500">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-0.5">
                      <button className={iconBtn} onClick={() => onView(r)} aria-label={`View details for ${r.patientName}`} title="View details"><Eye className="w-4 h-4" /></button>
                      {!archivedView && canWrite && <button className={iconBtn} onClick={() => onEdit(r)} aria-label={`Edit record for ${r.patientName}`} title="Edit"><Edit3 className="w-4 h-4" /></button>}
                      <button className={iconBtn} onClick={() => onPrint(r)} aria-label={`Print report for ${r.patientName}`} title="Print report"><Printer className="w-4 h-4" /></button>
                      {canWrite && (archivedView
                        ? <button className={iconBtn} onClick={() => onRestore(r)} aria-label={`Restore record for ${r.patientName}`} title="Restore"><ArchiveRestore className="w-4 h-4" /></button>
                        : <button className={`${iconBtn} hover:text-amber-300`} onClick={() => onArchive(r)} aria-label={`Archive record for ${r.patientName}`} title="Archive"><Archive className="w-4 h-4" /></button>)}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!loading && rows.length === 0 && (
          <div className="p-10 text-center flex flex-col items-center gap-3">
            <HeartPulse className="w-8 h-8 text-gray-600" aria-hidden="true" />
            <p className="text-sm font-semibold text-gray-300">{archivedView ? 'No archived recovery records' : 'No recovery records found'}</p>
            <p className="text-xs text-gray-500 max-w-sm">{archivedView ? 'Archived records will appear here.' : 'Try adjusting the search or filters, or create a new recovery record.'}</p>
            {!archivedView && canWrite && <button onClick={onCreate} className="px-4 py-2 bg-[#3ec1d3] text-[#081523] rounded-xl font-bold text-xs cursor-pointer">+ New Recovery Record</button>}
          </div>
        )}
      </div>

      {pagination && pagination.total > 0 && (
        <nav aria-label="Pagination" className="flex items-center justify-between text-xs text-gray-400 flex-wrap gap-2">
          <span>Showing page {pagination.page} of {pagination.pages} • {pagination.total} record{pagination.total === 1 ? '' : 's'}</span>
          <div className="flex items-center gap-2">
            <button disabled={pagination.page <= 1} onClick={() => onPage(pagination.page - 1)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#112a42] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed" aria-label="Previous page"><ChevronLeft className="w-3.5 h-3.5" /> Prev</button>
            <button disabled={pagination.page >= pagination.pages} onClick={() => onPage(pagination.page + 1)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#112a42] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed" aria-label="Next page">Next <ChevronRight className="w-3.5 h-3.5" /></button>
          </div>
        </nav>
      )}
    </div>
  );
};
export default RecoveryTable;