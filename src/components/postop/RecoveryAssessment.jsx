import { fmtDateTime } from './postOpApi';

const painTone = (n) => (n >= 7 ? 'text-rose-300' : n >= 4 ? 'text-amber-300' : 'text-emerald-300');

// Read-only, newest-first history of every assessment ever recorded for a record
const RecoveryAssessment = ({ assessments = [] }) => {
  if (!assessments.length) return <p className="text-xs text-gray-500">No assessments recorded.</p>;
  const list = [...assessments].sort((a, b) => new Date(b.recordedAt) - new Date(a.recordedAt));
  return (
    <ol className="flex flex-col gap-3" aria-label="Assessment history">
      {list.map((a, i) => (
        <li key={a._id || i} className="bg-[#091929] border border-cyan-900/30 rounded-xl p-3">
          <div className="flex items-center justify-between flex-wrap gap-2 text-[11px] text-gray-400">
            <span>{fmtDateTime(a.recordedAt)}{a.recordedBy ? ` • ${a.recordedBy}` : ''}</span>
            {i === 0 && <span className="px-2 py-0.5 rounded bg-cyan-950/60 text-cyan-300 border border-cyan-800/40 font-semibold">Latest</span>}
          </div>
          <div className="grid grid-cols-3 gap-3 mt-2 text-xs">
            <div><p className="text-gray-500">Pain</p><p className={`font-bold text-sm ${painTone(a.painLevel)}`}>{a.painLevel}/10</p></div>
            <div><p className="text-gray-500">Swelling</p><p className="text-gray-200 font-semibold">{a.swelling}</p></div>
            <div><p className="text-gray-500">Bleeding</p><p className="text-gray-200 font-semibold">{a.bleeding}</p></div>
          </div>
          {a.symptoms && <p className="text-xs text-gray-300 mt-2"><span className="text-gray-500">Symptoms: </span>{a.symptoms}</p>}
          {a.notes && <p className="text-xs text-gray-300 mt-1 whitespace-pre-wrap"><span className="text-gray-500">Notes: </span>{a.notes}</p>}
        </li>
      ))}
    </ol>
  );
};
export default RecoveryAssessment;