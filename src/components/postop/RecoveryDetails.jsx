import { useEffect } from 'react';
import { X, Printer, Edit3, Loader2 } from 'lucide-react';
import RecoveryAssessment from './RecoveryAssessment';
import { FollowUpDetail } from './FollowUpSchedule';
import { fmtDate, fmtDateTime, STATUS_STYLES } from './postOpApi';

const Row = ({ k, v }) => (<div><p className="text-[11px] text-gray-500">{k}</p><p className="text-sm text-gray-100 font-semibold break-words">{v || '—'}</p></div>);
const H = ({ children }) => <h4 className="text-xs font-bold uppercase tracking-wide text-[#3ec1d3] mb-2">{children}</h4>;

const RecoveryDetails = ({ record, loading, canWrite, busy, onClose, onEdit, onPrint, onFollowUp }) => {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const p = record?.patientInfo;
  return (
    <div className="fixed inset-0 z-[1500] bg-black/75 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="recovery-details-title">
      <div className="bg-[#0e2439] border border-cyan-900/50 rounded-2xl max-w-3xl w-full p-6 shadow-2xl my-8">
        <div className="flex items-start justify-between gap-3 pb-4 border-b border-cyan-900/40">
          <div>
            <h3 id="recovery-details-title" className="text-lg font-bold text-white">Recovery Details</h3>
            {record && <p className="text-xs text-gray-400 mt-0.5">{record.patientName} • <span className="font-mono text-[#3ec1d3]">{record.patientId}</span>{record.isArchived && <span className="ml-2 text-amber-300">Archived</span>}</p>}
          </div>
          <div className="flex items-center gap-1">
            {record && <button onClick={() => onPrint(record)} className="p-2 rounded-lg text-gray-300 hover:text-white hover:bg-[#14324f] cursor-pointer" aria-label="Print recovery report"><Printer className="w-4 h-4" /></button>}
            {record && canWrite && !record.isArchived && <button onClick={() => onEdit(record)} className="p-2 rounded-lg text-gray-300 hover:text-white hover:bg-[#14324f] cursor-pointer" aria-label="Edit record"><Edit3 className="w-4 h-4" /></button>}
            <button onClick={onClose} aria-label="Close details" className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-[#14324f] cursor-pointer"><X className="w-5 h-5" /></button>
          </div>
        </div>

        {loading || !record ? (
          <div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-[#3ec1d3]" aria-label="Loading" /></div>
        ) : (
          <div className="flex flex-col gap-6 mt-5">
            <section><H>Patient</H>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Row k="Name" v={record.patientName} /><Row k="Patient ID" v={record.patientId} />
                <Row k="Age / Gender" v={p ? [p.age, p.gender].filter(Boolean).join(' / ') : ''} /><Row k="Blood Group" v={p?.bloodGroup} />
                <Row k="Phone" v={p?.patientPhone} /><Row k="Email" v={p?.patientEmail} />
                <div className="col-span-2"><Row k="Allergies" v={p?.medicalHistory?.allergies?.join(', ')} /></div>
              </div>
            </section>
            <section><H>Procedure</H>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Row k="Procedure" v={record.procedure} /><Row k="Procedure Date" v={fmtDate(record.procedureDate)} />
                <Row k="Assigned Dentist" v={record.dentistName} /><Row k="Recovery Start" v={fmtDate(record.recoveryStartDate)} />
                <div><p className="text-[11px] text-gray-500">Status</p><span className={`inline-block mt-0.5 px-2 py-0.5 rounded border text-[11px] font-semibold ${STATUS_STYLES[record.recoveryStatus]}`}>{record.recoveryStatus}</span></div>
              </div>
            </section>
            <section><H>Current Assessment</H>
              <div className="grid grid-cols-3 gap-4">
                <Row k="Pain Level" v={`${record.painLevel}/10`} /><Row k="Swelling" v={record.swelling} /><Row k="Bleeding" v={record.bleeding} />
              </div>
              {record.symptoms && <p className="text-sm text-gray-200 mt-3"><span className="text-gray-500 text-xs">Reported symptoms: </span>{record.symptoms}</p>}
              {record.notes && <p className="text-sm text-gray-200 mt-2 whitespace-pre-wrap"><span className="text-gray-500 text-xs">Notes: </span>{record.notes}</p>}
            </section>
            <section><H>Care Instructions</H><p className="text-sm text-gray-200 whitespace-pre-wrap">{record.careInstructions || '—'}</p></section>
            <section><H>Follow-up Schedule</H><FollowUpDetail record={record} canWrite={canWrite} busy={busy} onUpdate={(b) => onFollowUp(record, b)} /></section>
            <section><H>Assessment History ({record.assessments?.length || 0})</H><RecoveryAssessment assessments={record.assessments} /></section>
            <section><H>Timestamps</H>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Row k="Created" v={fmtDateTime(record.createdAt)} /><Row k="Created by" v={record.createdBy} />
                <Row k="Last updated" v={fmtDateTime(record.updatedAt)} /><Row k="Updated by" v={record.updatedBy} />
                {record.isArchived && <><Row k="Archived" v={fmtDateTime(record.archivedAt)} /><Row k="Archived by" v={record.archivedBy} /><div className="col-span-2"><Row k="Archive reason" v={record.archiveReason} /></div></>}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
};
export default RecoveryDetails;