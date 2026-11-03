import { useEffect, useState } from 'react';
import { Plus, RefreshCw, X, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import RecoveryStats from './postop/RecoveryStats';
import RecoverySearch from './postop/RecoverySearch';
import RecoveryTable from './postop/RecoveryTable';
import RecoveryForm from './postop/RecoveryForm';
import RecoveryDetails from './postop/RecoveryDetails';
import { FollowUpPanel } from './postop/FollowUpSchedule';
import { printRecoveryReport } from './postop/printReport';
import { recoveryApi, getUserRole, CLINICAL_WRITE_ROLES } from './postop/postOpApi';

const DEFAULT_FILTERS = { search: '', status: 'all', dentist: 'all', followUp: 'all', archived: false };
const PAGE_SIZE = 10;

// Post-Op Recovery dashboard. All clinical data lives in MongoDB via /api/v1/post-op-recovery;
// component state only caches what the server returned.
const PostOpRecovery = ({ defaultPatientId, activePatient, patientsList }) => {
  const role = getUserRole();
  const canWrite = CLINICAL_WRITE_ROLES.includes(role);

  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [debounced, setDebounced] = useState('');
  const [sort, setSort] = useState({ by: 'createdAt', order: 'desc' });
  const [page, setPage] = useState(1);

  const [result, setResult] = useState({ key: null, rows: [], stats: null, dentists: [], pagination: null, error: null });
  const [followUps, setFollowUps] = useState(null);
  const [tick, setTick] = useState(0); // bump to force a reload

  const [patients, setPatients] = useState(() => {
    if (Array.isArray(patientsList) && patientsList.length > 0) return patientsList;
    try {
      const stored = JSON.parse(localStorage.getItem('dentocare_patient_records') || '[]');
      if (Array.isArray(stored) && stored.length > 0) return stored;
    } catch {}
    return activePatient ? [activePatient] : [];
  });
  const [dentists, setDentists] = useState([]);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [serverErrors, setServerErrors] = useState(null);

  const [details, setDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState(null);
  const [archiveReason, setArchiveReason] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4500);
  };

  // Debounce search typing
  useEffect(() => {
    const t = setTimeout(() => { setDebounced(filters.search); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [filters.search]);

  const queryKey = JSON.stringify([debounced, filters.status, filters.dentist, filters.followUp, filters.archived, sort, page, tick]);
  const loading = result.key !== queryKey;
  const { rows, stats, pagination, error } = result;
  const dentistOptions = result.dentists;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { ok, data } = await recoveryApi.list({
        search: debounced, status: filters.status, dentist: filters.dentist, followUp: filters.followUp,
        archived: String(filters.archived), sortBy: sort.by, order: sort.order, page, limit: PAGE_SIZE,
      });
      if (cancelled) return; // a newer query superseded this one
      setResult(ok
        ? { key: queryKey, rows: data.data, stats: data.stats, dentists: data.dentists || [], pagination: data.pagination, error: null }
        : { key: queryKey, rows: [], stats: null, dentists: [], pagination: null, error: data?.message || 'Failed to load recovery records.' });
    })();
    return () => { cancelled = true; };
  }, [queryKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let cancelled = false;
    recoveryApi.followUps().then(({ ok, data }) => { if (!cancelled && ok) setFollowUps(data.data); });
    return () => { cancelled = true; };
  }, [tick]);

  // Lookups for the form (existing patients + dentists)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [p, d] = await Promise.all([recoveryApi.patients(), recoveryApi.dentists()]);
      if (cancelled) return;

      const fetchedPatients = p.ok ? (p.data?.data || []) : [];
      const local = (() => {
        try {
          return JSON.parse(localStorage.getItem('dentocare_patient_records') || '[]');
        } catch {
          return [];
        }
      })();

      const mergedMap = new Map();
      fetchedPatients.forEach((r) => mergedMap.set(r._id || r.patientId || r.id, r));
      local.forEach((r) => {
        const k = r._id || r.patientId || r.id;
        if (!mergedMap.has(k)) mergedMap.set(k, r);
      });
      if (activePatient) {
        const ak = activePatient._id || activePatient.patientId || activePatient.id;
        if (!mergedMap.has(ak)) mergedMap.set(ak, activePatient);
      }

      const combined = Array.from(mergedMap.values());
      if (combined.length > 0) {
        setPatients(combined);
      }

      if (d.ok) setDentists(d.data?.data || d.data?.specialists || (Array.isArray(d.data) ? d.data : []));
    })();
    return () => { cancelled = true; };
  }, [activePatient]);

  const refreshAll = () => setTick((t) => t + 1);
  const changeFilters = (patch) => { setFilters((f) => ({ ...f, ...patch })); if (!('search' in patch)) setPage(1); };
  const onSort = (by) => { setSort((s) => (s.by === by ? { by, order: s.order === 'asc' ? 'desc' : 'asc' } : { by, order: 'asc' })); setPage(1); };
  const onStatSelect = (f) => setFilters({ ...DEFAULT_FILTERS, ...(f || {}) });

  const openDetails = async (row) => {
    setDetails({ _loading: true }); setDetailsLoading(true);
    const { ok, data } = await recoveryApi.get(row._id);
    setDetailsLoading(false);
    if (!ok) { setDetails(null); showToast(data?.message || 'Could not load record', 'error'); return; }
    setDetails(data.data);
  };

  const openEdit = async (row) => {
    const full = row.assessments ? row : (await recoveryApi.get(row._id)).data?.data || row;
    setServerErrors(null); setEditing(full); setFormOpen(true); setDetails(null);
  };

  const submitForm = async (body) => {
    setSaving(true); setServerErrors(null);
    const res = editing ? await recoveryApi.update(editing._id, body) : await recoveryApi.create(body);
    setSaving(false);
    if (!res.ok) {
      setServerErrors({ ...(res.data?.errors || {}), _form: res.data?.errors ? undefined : (res.data?.message || 'Could not save the record.') });
      return;
    }
    setFormOpen(false); setEditing(null);
    const note = res.data?.data?.followUpSyncNote;
    showToast(editing ? 'Recovery record updated.' : 'Recovery record created.');
    if (note) setTimeout(() => showToast(note, 'error'), 300);
    refreshAll();
  };

  const doPrint = async (row) => {
    const full = row.assessments && row.patientInfo ? row : (await recoveryApi.get(row._id)).data?.data;
    if (!full) return showToast('Could not load the record for printing', 'error');
    if (!printRecoveryReport(full)) showToast('Pop-up blocked — allow pop-ups to print the report.', 'error');
  };

  const confirmArchive = async () => {
    const target = archiveTarget;
    setBusyId(target._id);
    const { ok, data } = await recoveryApi.archive(target._id, archiveReason);
    setBusyId(null);
    if (!ok) return showToast(data?.message || 'Could not archive record', 'error');
    setArchiveTarget(null); setArchiveReason(''); setDetails(null);
    showToast('Record archived. It can be restored from the Archived view.');
    refreshAll();
  };

  const restore = async (row) => {
    setBusyId(row._id);
    const { ok, data } = await recoveryApi.restore(row._id);
    setBusyId(null);
    if (!ok) return showToast(data?.message || 'Could not restore record', 'error');
    showToast('Record restored.'); refreshAll();
  };

  const updateFollowUp = async (row, body) => {
    setBusyId(row._id);
    const { ok, data } = await recoveryApi.followUp(row._id, body);
    setBusyId(null);
    if (!ok) return showToast(data?.message || 'Could not update follow-up', 'error');
    showToast(`Follow-up marked ${body.followUpStatus?.toLowerCase() || 'updated'}.`);
    if (details?._id === row._id) setDetails((d) => ({ ...d, ...data.data, patientInfo: d.patientInfo }));
    refreshAll();
  };

  return (
    <div className="flex flex-col gap-5 animate-in fade-in duration-200">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="font-bold text-white text-base">Post-Op Recovery</h3>
          <p className="text-xs text-gray-400">Patient recovery tracking and follow-up care</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={refreshAll} aria-label="Refresh" title="Refresh" className="p-2 rounded-xl bg-[#112a42] text-gray-300 hover:text-white cursor-pointer"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
          {canWrite && (
            <button onClick={() => { setEditing(null); setServerErrors(null); setFormOpen(true); }} className="flex items-center gap-2 px-4 py-2 bg-[#3ec1d3] hover:bg-[#34adb9] text-[#081523] rounded-xl font-bold text-xs transition-all shadow-md cursor-pointer">
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" /> <span>New Recovery Record</span>
            </button>
          )}
        </div>
      </div>

      <RecoveryStats stats={stats} loading={loading} onSelect={onStatSelect} />
      <FollowUpPanel data={followUps} loading={loading} canWrite={role !== 'patient'} busyId={busyId} onUpdate={updateFollowUp} onOpen={openDetails} />
      <RecoverySearch filters={filters} dentists={dentistOptions} onChange={changeFilters} onReset={() => setFilters(DEFAULT_FILTERS)} />
      <RecoveryTable
        rows={rows} loading={loading} error={error} onRetry={refreshAll} sort={sort} onSort={onSort}
        pagination={pagination} onPage={setPage} canWrite={canWrite} archivedView={filters.archived}
        onView={openDetails} onEdit={openEdit} onPrint={doPrint} onArchive={setArchiveTarget} onRestore={restore}
        onCreate={() => { setEditing(null); setFormOpen(true); }}
      />

      {formOpen && (
        <RecoveryForm
          record={editing}
          patients={patients}
          dentists={dentists}
          defaultPatientId={defaultPatientId || activePatient?._id || activePatient?.patientId}
          activePatient={activePatient}
          saving={saving}
          serverErrors={serverErrors}
          onSubmit={submitForm}
          onClose={() => { setFormOpen(false); setEditing(null); }}
        />
      )}

      {details && (
        <RecoveryDetails
          record={details._loading ? null : details} loading={detailsLoading} canWrite={canWrite} busy={busyId === details?._id}
          onClose={() => setDetails(null)} onEdit={openEdit} onPrint={doPrint} onFollowUp={updateFollowUp}
        />
      )}

      {archiveTarget && (
        <div className="fixed inset-0 z-[1600] bg-black/75 flex items-center justify-center p-4" role="alertdialog" aria-modal="true" aria-labelledby="archive-title">
          <div className="bg-[#0e2439] border border-amber-900/50 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 id="archive-title" className="text-lg font-bold text-white">Archive this recovery record?</h3>
            <p className="text-sm text-gray-300 mt-2">{(archiveTarget.patientName || archiveTarget.name)} — {archiveTarget.procedure}. The record is hidden from the active list but kept in the database and can be restored. Nothing is permanently deleted.</p>
            <label htmlFor="archive-reason" className="block text-xs text-gray-400 mt-4 mb-1">Reason (optional)</label>
            <input id="archive-reason" value={archiveReason} onChange={(e) => setArchiveReason(e.target.value)} maxLength={500} className="w-full bg-[#091929] border border-cyan-900/40 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-[#3ec1d3]" />
            <div className="flex justify-end gap-3 mt-5">
              <button onClick={() => { setArchiveTarget(null); setArchiveReason(''); }} className="px-4 py-2 rounded-xl text-sm text-gray-300 hover:bg-[#14324f] cursor-pointer">Cancel</button>
              <button onClick={confirmArchive} disabled={busyId === archiveTarget._id} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-[#081523] text-sm font-bold cursor-pointer disabled:opacity-60">
                {busyId === archiveTarget._id && <Loader2 className="w-4 h-4 animate-spin" />} Archive
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div role="status" aria-live="polite" className={`fixed bottom-6 right-6 z-[1700] flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold shadow-2xl border ${toast.type === 'error' ? 'bg-rose-950 border-rose-700 text-rose-200' : 'bg-emerald-950 border-emerald-700 text-emerald-200'}`}>
          {toast.type === 'error' ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
          {toast.message}
          <button onClick={() => setToast(null)} aria-label="Dismiss" className="ml-2 opacity-70 hover:opacity-100 cursor-pointer"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}
    </div>
  );
};
export default PostOpRecovery;
