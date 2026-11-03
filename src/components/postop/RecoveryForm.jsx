import { useEffect, useMemo, useState } from 'react';
import { X, Save, Loader2 } from 'lucide-react';
import { toInputDate } from './postOpApi';

const PROCEDURES = [
  'Tooth Extraction',
  'Wisdom Tooth Removal',
  'Dental Implant',
  'Root Canal Treatment',
  'Dental Crown / Bridge',
  'Gum Surgery',
  'Bone Graft',
  'Scaling & Root Planing',
  'Orthodontic Procedure',
  'Other',
];

const EMPTY = {
  patient: '',
  procedure: '',
  procedureDate: '',
  dentistName: '',
  dentistId: '',
  recoveryStartDate: '',
  painLevel: 0,
  swelling: 'None',
  bleeding: 'None',
  symptoms: '',
  notes: '',
  careInstructions: '',
  followUpDate: '',
  recoveryStatus: 'Recovering',
};

const field =
  'w-full bg-[#091929] border rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-[#3ec1d3]';
const Err = ({ id, msg }) =>
  msg ? (
    <p id={id} role="alert" className="text-[11px] text-rose-400 mt-1">
      {msg}
    </p>
  ) : null;

export const getPatientDisplayName = (p) => {
  if (!p) return '';
  const name =
    p.patientName ||
    p.name ||
    p.fullName ||
    p.patient_name ||
    p.userName ||
    (p.user && (p.user.name || p.user.fullName)) ||
    '';
  const id =
    p.patientId ||
    p.customId ||
    p.id ||
    (p._id && !String(p._id).startsWith('temp_') ? String(p._id).slice(-6).toUpperCase() : '');

  if (name && id) return `${name} (${id})`;
  if (name) return name;
  if (id) return `Patient (${id})`;
  return 'Unnamed Patient';
};

const initialState = (record, defaultPatientId, defaultPatient) => {
  if (record) {
    return {
      ...EMPTY,
      ...record,
      patient: record.patient || record.patientId || '',
      procedureDate: toInputDate(record.procedureDate),
      recoveryStartDate: toInputDate(record.recoveryStartDate),
      followUpDate: toInputDate(record.followUpDate),
    };
  }

  const initialPatient =
    defaultPatientId ||
    defaultPatient?._id ||
    defaultPatient?.patientId ||
    defaultPatient?.id ||
    '';

  return {
    ...EMPTY,
    patient: initialPatient,
    recoveryStartDate: toInputDate(new Date()),
  };
};

const RecoveryForm = ({
  record,
  patients = [],
  dentists = [],
  defaultPatientId,
  activePatient,
  saving,
  serverErrors,
  onSubmit,
  onClose,
}) => {
  const editing = !!record;

  // Build a normalized list of patients including activePatient and localStorage fallback
  const normalizedPatients = useMemo(() => {
    const list = Array.isArray(patients) ? [...patients] : [];

    // If an activePatient was passed from the parent and is not yet in the list, prepend it
    if (activePatient) {
      const activeKey = activePatient._id || activePatient.patientId || activePatient.id;
      const alreadyPresent = list.some(
        (p) =>
          (p._id && p._id === activeKey) ||
          (p.patientId && p.patientId === activeKey) ||
          (p.id && p.id === activeKey)
      );
      if (!alreadyPresent) {
        list.unshift(activePatient);
      }
    }

    // If still empty, check localStorage
    if (list.length === 0) {
      try {
        const stored = JSON.parse(localStorage.getItem('dentocare_patient_records') || '[]');
        if (Array.isArray(stored) && stored.length > 0) {
          list.push(...stored);
        }
      } catch {}
    }

    // Deduplicate by key (_id, patientId, or id)
    const seen = new Set();
    const result = [];
    for (const p of list) {
      const key = p._id || p.patientId || p.id;
      if (key && !seen.has(key)) {
        seen.add(key);
        result.push(p);
      } else if (!key) {
        result.push(p);
      }
    }
    return result;
  }, [patients, activePatient]);

  const [f, setF] = useState(() => initialState(record, defaultPatientId, activePatient));
  const [localErrors, setLocalErrors] = useState({});
  const errors = { ...(serverErrors || {}), ...localErrors };
  const setErrors = setLocalErrors;

  // If f.patient was empty or defaultPatientId arrived later, sync it up
  useEffect(() => {
    if (!f.patient && (defaultPatientId || activePatient)) {
      const nextId =
        defaultPatientId ||
        activePatient?._id ||
        activePatient?.patientId ||
        activePatient?.id ||
        '';
      if (nextId) {
        setF((prev) => ({ ...prev, patient: nextId }));
      }
    }
  }, [defaultPatientId, activePatient, f.patient]);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const set = (k) => (e) => {
    setF((p) => ({ ...p, [k]: e.target.value }));
    setErrors((p) => ({ ...p, [k]: '' }));
  };

  const patientLabel = useMemo(() => {
    if (!f.patient) return null;
    return (
      normalizedPatients.find(
        (p) =>
          p._id === f.patient ||
          p.patientId === f.patient ||
          p.id === f.patient
      ) ||
      (activePatient &&
      (activePatient._id === f.patient ||
        activePatient.patientId === f.patient ||
        activePatient.id === f.patient)
        ? activePatient
        : null)
    );
  }, [normalizedPatients, f.patient, activePatient]);

  const validate = () => {
    const e = {};
    if (!f.patient) e.patient = 'Select an existing patient';
    if (!f.procedure.trim()) e.procedure = 'Procedure is required';
    if (!f.procedureDate) e.procedureDate = 'Procedure date is required';
    if (!f.dentistName.trim()) e.dentistName = 'Assigned dentist is required';
    if (!f.recoveryStartDate) e.recoveryStartDate = 'Recovery start date is required';
    const n = Number(f.painLevel);
    if (f.painLevel === '' || !Number.isInteger(n) || n < 0 || n > 10)
      e.painLevel = 'Enter a whole number from 0 to 10';
    if (f.procedureDate && f.recoveryStartDate && f.recoveryStartDate < f.procedureDate)
      e.recoveryStartDate = 'Cannot start before the procedure date';
    if (f.procedureDate && f.followUpDate && f.followUpDate < f.procedureDate)
      e.followUpDate = 'Cannot be before the procedure date';
    return e;
  };

  const submit = (ev) => {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;

    const patientObj = patientLabel;
    const resolvedPatientId = patientObj?._id || f.patient;
    const customPatientId =
      patientObj?.patientId ||
      patientObj?.customId ||
      patientObj?.id ||
      '';
    const patientName =
      patientObj?.patientName ||
      patientObj?.name ||
      patientObj?.fullName ||
      '';

    onSubmit({
      ...f,
      patient: resolvedPatientId,
      patientId: customPatientId,
      patientName,
      painLevel: Number(f.painLevel),
      followUpDate: f.followUpDate || null,
    });
  };

  const bd = (k) => (errors[k] ? 'border-rose-500/70' : 'border-cyan-900/40');
  const lbl = 'block text-xs font-semibold text-gray-300 mb-1';

  return (
    <div
      className="fixed inset-0 z-[1500] bg-black/75 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="recovery-form-title"
    >
      <form
        onSubmit={submit}
        noValidate
        className="bg-[#0e2439] border border-cyan-900/50 rounded-2xl max-w-3xl w-full p-6 shadow-2xl my-8"
      >
        <div className="flex items-center justify-between pb-4 border-b border-cyan-900/40">
          <h3 id="recovery-form-title" className="text-lg font-bold text-white">
            {editing ? 'Edit Recovery Record' : 'New Recovery Record'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close form"
            className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-[#14324f] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errors._form && (
          <p
            role="alert"
            className="mt-4 text-sm text-rose-300 bg-rose-950/30 border border-rose-900/50 rounded-lg p-3"
          >
            {errors._form}
          </p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
          <div className="md:col-span-2">
            <label htmlFor="pr-patient" className={lbl}>
              Patient *
            </label>
            {editing ? (
              <p className="text-sm text-gray-200 bg-[#091929] border border-cyan-900/40 rounded-lg px-3 py-2">
                {record.patientName || record.name || 'Patient'}
                {(record.patientId || record.id) && (
                  <span className="font-mono text-[#3ec1d3] ml-2">
                    {record.patientId || record.id}
                  </span>
                )}
              </p>
            ) : (
              <select
                id="pr-patient"
                value={f.patient}
                onChange={set('patient')}
                aria-invalid={!!errors.patient}
                aria-describedby="e-patient"
                className={`${field} ${bd('patient')}`}
              >
                <option value="">Select an existing patient…</option>
                {normalizedPatients.map((p) => {
                  const val = p._id || p.patientId || p.id;
                  const label = getPatientDisplayName(p);
                  return (
                    <option key={val} value={val}>
                      {label}
                    </option>
                  );
                })}
              </select>
            )}
            <Err id="e-patient" msg={errors.patient} />
            {!editing &&
              patientLabel &&
              !patientLabel.patientEmail &&
              !patientLabel.email && (
                <p className="text-[11px] text-amber-400 mt-1">
                  This patient has no email on file — a follow-up appointment cannot be
                  created automatically.
                </p>
              )}
          </div>

          <div>
            <label htmlFor="pr-proc" className={lbl}>
              Procedure *
            </label>
            <input
              id="pr-proc"
              list="pr-proc-list"
              value={f.procedure}
              onChange={set('procedure')}
              maxLength={150}
              aria-invalid={!!errors.procedure}
              className={`${field} ${bd('procedure')}`}
              placeholder="e.g. Tooth Extraction"
            />
            <datalist id="pr-proc-list">
              {PROCEDURES.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
            <Err msg={errors.procedure} />
          </div>
          <div>
            <label htmlFor="pr-dentist" className={lbl}>
              Assigned Dentist *
            </label>
            <input
              id="pr-dentist"
              list="pr-dentist-list"
              value={f.dentistName}
              onChange={set('dentistName')}
              maxLength={120}
              aria-invalid={!!errors.dentistName}
              className={`${field} ${bd('dentistName')}`}
              placeholder="Select or type a dentist"
            />
            <datalist id="pr-dentist-list">
              {dentists.map((d) => (
                <option key={d._id || d.name} value={d.name} />
              ))}
            </datalist>
            <Err msg={errors.dentistName} />
          </div>

          <div>
            <label htmlFor="pr-pd" className={lbl}>
              Procedure Date *
            </label>
            <input
              id="pr-pd"
              type="date"
              value={f.procedureDate}
              onChange={set('procedureDate')}
              className={`${field} ${bd('procedureDate')}`}
            />
            <Err msg={errors.procedureDate} />
          </div>
          <div>
            <label htmlFor="pr-rs" className={lbl}>
              Recovery Start Date *
            </label>
            <input
              id="pr-rs"
              type="date"
              value={f.recoveryStartDate}
              min={f.procedureDate || undefined}
              onChange={set('recoveryStartDate')}
              className={`${field} ${bd('recoveryStartDate')}`}
            />
            <Err msg={errors.recoveryStartDate} />
          </div>

          <div>
            <label htmlFor="pr-pain" className={lbl}>
              Pain Level (0–10):{' '}
              <span className="text-[#3ec1d3] font-bold">{f.painLevel}</span> *
            </label>
            <input
              id="pr-pain"
              type="range"
              min="0"
              max="10"
              step="1"
              value={f.painLevel}
              onChange={set('painLevel')}
              className="w-full accent-[#3ec1d3]"
              aria-valuetext={`${f.painLevel} out of 10`}
            />
            <div className="flex justify-between text-[10px] text-gray-500">
              <span>0 none</span>
              <span>10 severe</span>
            </div>
            <Err msg={errors.painLevel} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="pr-sw" className={lbl}>
                Swelling
              </label>
              <select
                id="pr-sw"
                value={f.swelling}
                onChange={set('swelling')}
                className={`${field} ${bd('swelling')}`}
              >
                {['None', 'Mild', 'Moderate', 'Severe'].map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="pr-bl" className={lbl}>
                Bleeding
              </label>
              <select
                id="pr-bl"
                value={f.bleeding}
                onChange={set('bleeding')}
                className={`${field} ${bd('bleeding')}`}
              >
                {['None', 'Minimal', 'Moderate', 'Heavy'].map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="md:col-span-2">
            <label htmlFor="pr-sym" className={lbl}>
              Patient-Reported Symptoms
            </label>
            <textarea
              id="pr-sym"
              rows={2}
              maxLength={1000}
              value={f.symptoms}
              onChange={set('symptoms')}
              className={`${field} ${bd('symptoms')}`}
              placeholder="e.g. numbness, difficulty chewing, mild fever…"
            />
          </div>
          <div className="md:col-span-2">
            <label htmlFor="pr-notes" className={lbl}>
              Recovery Notes
            </label>
            <textarea
              id="pr-notes"
              rows={3}
              maxLength={2000}
              value={f.notes}
              onChange={set('notes')}
              className={`${field} ${bd('notes')}`}
            />
          </div>
          <div className="md:col-span-2">
            <label htmlFor="pr-care" className={lbl}>
              Care Instructions
            </label>
            <textarea
              id="pr-care"
              rows={3}
              maxLength={3000}
              value={f.careInstructions}
              onChange={set('careInstructions')}
              className={`${field} ${bd('careInstructions')}`}
              placeholder="Diet, medication, oral hygiene, activity restrictions…"
            />
          </div>

          <div>
            <label htmlFor="pr-fu" className={lbl}>
              Follow-up Date
            </label>
            <input
              id="pr-fu"
              type="date"
              value={f.followUpDate}
              min={f.procedureDate || undefined}
              onChange={set('followUpDate')}
              className={`${field} ${bd('followUpDate')}`}
            />
            <Err msg={errors.followUpDate} />
            <p className="text-[11px] text-gray-500 mt-1">
              An appointment is created/updated in the existing Appointments module.
            </p>
          </div>
          <div>
            <label htmlFor="pr-st" className={lbl}>
              Recovery Status
            </label>
            <select
              id="pr-st"
              value={f.recoveryStatus}
              onChange={set('recoveryStatus')}
              className={`${field} ${bd('recoveryStatus')}`}
            >
              {['Recovering', 'Needs Attention', 'Completed'].map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </div>
        </div>

        {editing && (
          <p className="text-[11px] text-gray-500 mt-4">
            Changing pain, swelling, bleeding, symptoms or notes saves a new assessment; earlier
            assessments are kept in the history.
          </p>
        )}

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-cyan-900/40">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm text-gray-300 hover:text-white hover:bg-[#14324f] cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 bg-[#3ec1d3] hover:bg-[#34adb9] disabled:opacity-60 text-[#081523] rounded-xl font-bold text-sm cursor-pointer"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            ) : (
              <Save className="w-4 h-4" aria-hidden="true" />
            )}
            {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Record'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default RecoveryForm;
