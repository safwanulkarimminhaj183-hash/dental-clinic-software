import mongoose from 'mongoose';
import PostOpRecovery from '../models/PostOpRecovery.js';
import PatientRecord from '../models/PatientRecord.js';
import Appointment from '../models/Appointment.js';
import UserActivity from '../models/UserActivity.js';
import logger from '../utils/logger.js';

const DAY = 24 * 60 * 60 * 1000;
const FOLLOW_UP_WINDOW_DAYS = 7; // "due" = overdue or falling within the next 7 days
const FOLLOW_UP_TAG = 'Post-op follow-up';
const SLOTS = ['10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM'];

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};
const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const actorName = (req) => req.user?.name || req.user?.email || 'system';

// ── Audit: Winston log + UserActivity (existing audit/analytics store) ─────────
const audit = (req, action, recovery, extra = {}) => {
  try {
    logger.info('PostOpRecovery audit', {
      action,
      recoveryId: recovery?._id?.toString(),
      patientId: recovery?.patientId,
      by: actorName(req),
      role: req.user?.role,
      ...extra,
    });
    const userId = mongoose.isValidObjectId(req.user?._id) ? req.user._id : null;
    UserActivity.create({
      userId,
      email: req.user?.email || null,
      ipAddress: req.ip || req.socket?.remoteAddress || 'unknown',
      userAgent: req.get('user-agent'),
      action,
      // Metadata deliberately excludes clinical content (PHI)
      metadata: { recoveryId: recovery?._id, patientId: recovery?.patientId, ...extra },
    }).catch((e) => logger.error('PostOpRecovery audit write failed', { error: e.message }));
  } catch (e) {
    logger.error('PostOpRecovery audit error', { error: e.message });
  }
};

// ── Follow-up ⇄ existing Appointment module (no second appointment system) ──────
const syncFollowUpAppointment = async (recovery, patient) => {
  if (!recovery.followUpDate || recovery.recoveryStatus === 'Completed') return recovery;

  const date = new Date(recovery.followUpDate);
  const dayStart = new Date(date); dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date); dayEnd.setHours(23, 59, 59, 999);
  const tag = `[PostOp:${recovery._id}]`;

  // 1. Reuse the appointment already linked to this recovery record
  let appt = recovery.followUpAppointmentId
    ? await Appointment.findById(recovery.followUpAppointmentId)
    : null;

  // 2. Otherwise reuse any existing appointment for this tag (prevents duplicates after re-saves)
  if (!appt) appt = await Appointment.findOne({ notes: { $regex: escapeRegex(tag) } });

  // 3. Otherwise reuse a same-day, active appointment for the same patient
  if (!appt && patient.patientEmail) {
    appt = await Appointment.findOne({
      email: patient.patientEmail.toLowerCase(),
      appointmentDate: { $gte: dayStart, $lte: dayEnd },
      status: { $nin: ['Cancelled', 'cancelled', 'Completed'] },
    });
  }

  if (appt) {
    const sameDay = appt.appointmentDate >= dayStart && appt.appointmentDate <= dayEnd;
    if (!sameDay) {
      appt.appointmentDate = date;
      if (['Cancelled', 'cancelled'].includes(appt.status)) appt.status = 'Pending';
    }
    if (!appt.notes?.includes(tag)) appt.notes = `${FOLLOW_UP_TAG} ${tag}`.slice(0, 1000);
    await appt.save();
    recovery.followUpAppointmentId = appt._id;
    recovery.followUpStatus = 'Scheduled';
    recovery.followUpSyncNote = '';
    return recovery;
  }

  if (!patient.patientEmail || !patient.patientPhone) {
    recovery.followUpSyncNote =
      'Follow-up date saved, but no appointment was created: patient has no email/phone on file.';
    return recovery;
  }

  // Pick the first free slot that day so we never collide with an existing booking
  const taken = await Appointment.find({
    appointmentDate: { $gte: dayStart, $lte: dayEnd },
    status: { $nin: ['Cancelled', 'cancelled', 'Completed'] },
  }).select('appointmentTime');
  const takenSet = new Set(taken.map((a) => a.appointmentTime));
  const time = SLOTS.find((s) => !takenSet.has(s));
  if (!time) {
    recovery.followUpSyncNote = 'No free appointment slot on that day — please choose another follow-up date.';
    return recovery;
  }

  appt = await Appointment.create({
    name: patient.patientName,
    email: patient.patientEmail,
    phone: patient.patientPhone,
    department: 'General Dentistry',
    appointmentDate: date,
    appointmentTime: time,
    doctorName: recovery.dentistName,
    doctorId: recovery.dentistId || null,
    notes: `${FOLLOW_UP_TAG} for ${recovery.procedure} ${tag}`.slice(0, 1000),
    status: 'Pending',
  });
  recovery.followUpAppointmentId = appt._id;
  recovery.followUpStatus = 'Scheduled';
  recovery.followUpSyncNote = '';
  return recovery;
};

const trySync = async (recovery, patient) => {
  try {
    await syncFollowUpAppointment(recovery, patient);
  } catch (e) {
    logger.error('Post-op follow-up sync failed', { error: e.message, recoveryId: recovery._id?.toString() });
    recovery.followUpSyncNote = 'Follow-up saved, but the appointment could not be synced.';
  }
};

const withLiveAppointment = async (doc) => {
  const obj = doc.toObject ? doc.toObject() : doc;
  if (obj.followUpAppointmentId) {
    const a = await Appointment.findById(obj.followUpAppointmentId).select('appointmentDate appointmentTime status');
    obj.followUpAppointment = a
      ? { _id: a._id, date: a.appointmentDate, time: a.appointmentTime, status: a.status }
      : null;
  }
  return obj;
};

// ── Validation helpers ─────────────────────────────────────────────────────────
const toDate = (v) => {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

const validateBody = (b, { partial = false } = {}) => {
  const errors = {};
  const need = (k, msg) => { if (!partial || b[k] !== undefined) if (b[k] === undefined || b[k] === null || String(b[k]).trim() === '') errors[k] = msg; };

  if (!partial) need('patient', 'Select an existing patient');
  need('procedure', 'Procedure is required');
  need('procedureDate', 'Procedure date is required');
  need('dentistName', 'Assigned dentist is required');
  need('recoveryStartDate', 'Recovery start date is required');
  need('painLevel', 'Pain level (0–10) is required');

  if (b.painLevel !== undefined && b.painLevel !== '') {
    const n = Number(b.painLevel);
    if (!Number.isInteger(n) || n < 0 || n > 10) errors.painLevel = 'Pain level must be a whole number from 0 to 10';
  }
  const pd = toDate(b.procedureDate), rs = toDate(b.recoveryStartDate), fu = toDate(b.followUpDate);
  if (b.procedureDate && !pd) errors.procedureDate = 'Invalid date';
  if (b.recoveryStartDate && !rs) errors.recoveryStartDate = 'Invalid date';
  if (b.followUpDate && !fu) errors.followUpDate = 'Invalid date';
  if (pd && rs && rs < pd) errors.recoveryStartDate = 'Recovery cannot start before the procedure date';
  if (pd && fu && fu < pd) errors.followUpDate = 'Follow-up cannot be before the procedure date';
  if (b.swelling && !['None', 'Mild', 'Moderate', 'Severe'].includes(b.swelling)) errors.swelling = 'Invalid swelling level';
  if (b.bleeding && !['None', 'Minimal', 'Moderate', 'Heavy'].includes(b.bleeding)) errors.bleeding = 'Invalid bleeding level';
  if (b.recoveryStatus && !['Recovering', 'Needs Attention', 'Completed'].includes(b.recoveryStatus)) errors.recoveryStatus = 'Invalid status';
  for (const [k, max] of [['procedure', 150], ['dentistName', 120], ['symptoms', 1000], ['notes', 2000], ['careInstructions', 3000]]) {
    if (b[k] && String(b[k]).length > max) errors[k] = `Must be ${max} characters or fewer`;
  }
  return errors;
};

const fail = (res, status, message, errors) =>
  res.status(status).json({ success: false, message, ...(errors ? { errors } : {}) });

// ── Stats (computed from the database, never stored) ───────────────────────────
const computeStats = async () => {
  const today = startOfToday();
  const windowEnd = new Date(today.getTime() + (FOLLOW_UP_WINDOW_DAYS + 1) * DAY - 1);
  const active = { isArchived: false };
  const [total, recovering, followUpsDue, overdue, completed] = await Promise.all([
    PostOpRecovery.countDocuments(active),
    PostOpRecovery.countDocuments({ ...active, recoveryStatus: { $in: ['Recovering', 'Needs Attention'] } }),
    PostOpRecovery.countDocuments({
      ...active,
      recoveryStatus: { $ne: 'Completed' },
      followUpStatus: { $nin: ['Completed', 'Not Required'] },
      followUpDate: { $ne: null, $lte: windowEnd },
    }),
    PostOpRecovery.countDocuments({
      ...active,
      recoveryStatus: { $ne: 'Completed' },
      followUpStatus: { $nin: ['Completed', 'Not Required'] },
      followUpDate: { $ne: null, $lt: today },
    }),
    PostOpRecovery.countDocuments({ ...active, recoveryStatus: 'Completed' }),
  ]);
  return { total, recovering, followUpsDue, overdue, completed };
};

// ── Handlers ───────────────────────────────────────────────────────────────────
const SORT_FIELDS = {
  patientId: 'patientId', patientName: 'patientName', procedure: 'procedure',
  procedureDate: 'procedureDate', dentistName: 'dentistName',
  recoveryStatus: 'recoveryStatus', followUpDate: 'followUpDate', createdAt: 'createdAt',
};

export const listRecoveries = async (req, res) => {
  try {
    const { search = '', status = 'all', dentist = 'all', archived = 'false', followUp = 'all',
      sortBy = 'createdAt', order = 'desc' } = req.query;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));

    const q = { isArchived: archived === 'true' };
    if (String(search).trim()) {
      const rx = new RegExp(escapeRegex(String(search).trim().slice(0, 80)), 'i');
      q.$or = [{ patientId: rx }, { patientName: rx }, { procedure: rx }, { dentistName: rx }];
    }
    if (status !== 'all') q.recoveryStatus = status;
    if (dentist !== 'all') q.dentistName = dentist;

    const today = startOfToday();
    if (followUp === 'overdue') {
      Object.assign(q, { recoveryStatus: { $ne: 'Completed' }, followUpStatus: { $nin: ['Completed', 'Not Required'] }, followUpDate: { $ne: null, $lt: today } });
    } else if (followUp === 'upcoming') {
      Object.assign(q, { recoveryStatus: { $ne: 'Completed' }, followUpStatus: { $nin: ['Completed', 'Not Required'] }, followUpDate: { $gte: today } });
    } else if (followUp === 'due') {
      Object.assign(q, { recoveryStatus: { $ne: 'Completed' }, followUpStatus: { $nin: ['Completed', 'Not Required'] }, followUpDate: { $ne: null, $lte: new Date(today.getTime() + (FOLLOW_UP_WINDOW_DAYS + 1) * DAY - 1) } });
    }

    const sortField = SORT_FIELDS[sortBy] || 'createdAt';
    const sort = { [sortField]: order === 'asc' ? 1 : -1, _id: -1 };

    const [items, filteredTotal, stats, dentists] = await Promise.all([
      PostOpRecovery.find(q).select('-assessments').sort(sort).skip((page - 1) * limit).limit(limit).lean(),
      PostOpRecovery.countDocuments(q),
      computeStats(),
      PostOpRecovery.distinct('dentistName', { isArchived: false }),
    ]);

    return res.json({
      success: true,
      data: items,
      stats,
      dentists: dentists.filter(Boolean).sort(),
      pagination: { page, limit, total: filteredTotal, pages: Math.max(1, Math.ceil(filteredTotal / limit)) },
    });
  } catch (e) {
    logger.error('listRecoveries failed', { error: e.message });
    return fail(res, 500, 'Failed to load recovery records');
  }
};

export const getFollowUps = async (req, res) => {
  try {
    const today = startOfToday();
    const windowEnd = new Date(today.getTime() + (FOLLOW_UP_WINDOW_DAYS + 1) * DAY - 1);
    const base = {
      isArchived: false, recoveryStatus: { $ne: 'Completed' },
      followUpStatus: { $nin: ['Completed', 'Not Required'] },
    };
    const [overdue, upcoming] = await Promise.all([
      PostOpRecovery.find({ ...base, followUpDate: { $ne: null, $lt: today } }).select('-assessments').sort({ followUpDate: 1 }).limit(50).lean(),
      PostOpRecovery.find({ ...base, followUpDate: { $gte: today, $lte: windowEnd } }).select('-assessments').sort({ followUpDate: 1 }).limit(50).lean(),
    ]);
    return res.json({ success: true, data: { overdue, upcoming } });
  } catch (e) {
    logger.error('getFollowUps failed', { error: e.message });
    return fail(res, 500, 'Failed to load follow-ups');
  }
};

export const getRecovery = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return fail(res, 400, 'Invalid recovery record id');
    const doc = await PostOpRecovery.findById(req.params.id);
    if (!doc) return fail(res, 404, 'Recovery record not found');
    const patient = await PatientRecord.findById(doc.patient).select(
      'patientId patientName age gender bloodGroup patientPhone patientEmail medicalHistory.allergies'
    ).lean();
    audit(req, 'post_op_recovery_view', doc);
    return res.json({ success: true, data: { ...(await withLiveAppointment(doc)), patientInfo: patient || null } });
  } catch (e) {
    logger.error('getRecovery failed', { error: e.message });
    return fail(res, 500, 'Failed to load recovery record');
  }
};

const buildAssessment = (b, req) => ({
  recordedAt: new Date(),
  recordedBy: actorName(req),
  painLevel: Number(b.painLevel),
  swelling: b.swelling || 'None',
  bleeding: b.bleeding || 'None',
  symptoms: (b.symptoms || '').trim(),
  notes: (b.notes || '').trim(),
});

export const createRecovery = async (req, res) => {
  try {
    const b = req.body || {};
    const errors = validateBody(b);
    if (!errors.patient && !mongoose.isValidObjectId(b.patient) && !b.patient && !b.patientId) errors.patient = 'Select an existing patient';
    if (Object.keys(errors).length) return fail(res, 400, 'Please correct the highlighted fields', errors);

    // Link to an existing patient — this endpoint never creates patients
    let patient = null;
    if (mongoose.isValidObjectId(b.patient)) {
      patient = await PatientRecord.findById(b.patient);
    }
    if (!patient && b.patient) {
      patient = await PatientRecord.findOne({ patientId: b.patient });
    }
    if (!patient && b.patientId) {
      patient = await PatientRecord.findOne({ patientId: b.patientId });
    }
    if (!patient) return fail(res, 404, 'Selected patient does not exist', { patient: 'Patient not found' });

    // Prevent accidental duplicates: same patient + procedure + date, still active
    const pd = toDate(b.procedureDate);
    const dayStart = new Date(pd); dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(pd); dayEnd.setHours(23, 59, 59, 999);
    const dup = await PostOpRecovery.findOne({
      patient: patient._id, procedure: new RegExp(`^${escapeRegex(b.procedure.trim())}$`, 'i'),
      procedureDate: { $gte: dayStart, $lte: dayEnd }, isArchived: false,
    }).select('_id');
    if (dup) return fail(res, 409, 'A recovery record for this patient, procedure and date already exists', { procedure: 'Duplicate record' });

    const doc = new PostOpRecovery({
      patient: patient._id,
      patientId: patient.patientId,
      patientName: patient.patientName,
      procedure: b.procedure.trim(),
      procedureDate: pd,
      dentistName: b.dentistName.trim(),
      dentistId: b.dentistId || '',
      recoveryStartDate: toDate(b.recoveryStartDate),
      painLevel: Number(b.painLevel),
      swelling: b.swelling || 'None',
      bleeding: b.bleeding || 'None',
      symptoms: (b.symptoms || '').trim(),
      notes: (b.notes || '').trim(),
      careInstructions: (b.careInstructions || '').trim(),
      recoveryStatus: b.recoveryStatus || 'Recovering',
      followUpDate: toDate(b.followUpDate),
      followUpStatus: b.followUpDate ? 'Pending' : 'Not Required',
      assessments: [buildAssessment(b, req)],
      createdBy: actorName(req),
      updatedBy: actorName(req),
    });
    if (doc.followUpDate) await trySync(doc, patient);
    await doc.save();
    audit(req, 'post_op_recovery_create', doc);
    return res.status(201).json({ success: true, data: await withLiveAppointment(doc) });
  } catch (e) {
    if (e.name === 'ValidationError') return fail(res, 400, e.message);
    logger.error('createRecovery failed', { error: e.message });
    return fail(res, 500, 'Failed to save recovery record');
  }
};

export const updateRecovery = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return fail(res, 400, 'Invalid recovery record id');
    const doc = await PostOpRecovery.findById(req.params.id);
    if (!doc) return fail(res, 404, 'Recovery record not found');
    if (doc.isArchived) return fail(res, 409, 'Archived records must be restored before editing');

    const b = { ...req.body };
    // Merge so partial edits still validate against the full record
    const merged = {
      procedure: doc.procedure, procedureDate: doc.procedureDate, dentistName: doc.dentistName,
      recoveryStartDate: doc.recoveryStartDate, painLevel: doc.painLevel, followUpDate: doc.followUpDate,
      ...b,
    };
    const errors = validateBody(merged, { partial: true });
    if (Object.keys(errors).length) return fail(res, 400, 'Please correct the highlighted fields', errors);

    // Patient link is immutable here: re-pointing a record would rewrite clinical history
    if (b.patient && String(b.patient) !== String(doc.patient)) {
      return fail(res, 400, 'The patient of an existing recovery record cannot be changed', { patient: 'Cannot change patient' });
    }

    const clinicalChanged =
      Number(merged.painLevel) !== doc.painLevel ||
      (merged.swelling ?? doc.swelling) !== doc.swelling ||
      (merged.bleeding ?? doc.bleeding) !== doc.bleeding ||
      (merged.symptoms ?? doc.symptoms ?? '').trim() !== (doc.symptoms || '') ||
      (merged.notes ?? doc.notes ?? '').trim() !== (doc.notes || '');

    const oldFollowUp = doc.followUpDate ? doc.followUpDate.getTime() : null;

    doc.procedure = String(merged.procedure).trim();
    doc.procedureDate = toDate(merged.procedureDate);
    doc.dentistName = String(merged.dentistName).trim();
    if (b.dentistId !== undefined) doc.dentistId = b.dentistId || '';
    doc.recoveryStartDate = toDate(merged.recoveryStartDate);
    if (b.careInstructions !== undefined) doc.careInstructions = String(b.careInstructions).trim();
    if (b.recoveryStatus) doc.recoveryStatus = b.recoveryStatus;
    if (b.followUpDate !== undefined) doc.followUpDate = toDate(b.followUpDate);

    if (clinicalChanged) {
      // Append — previous assessments stay untouched
      const a = buildAssessment({ ...merged, swelling: merged.swelling ?? doc.swelling, bleeding: merged.bleeding ?? doc.bleeding }, req);
      doc.assessments.push(a);
      doc.painLevel = a.painLevel; doc.swelling = a.swelling; doc.bleeding = a.bleeding;
      doc.symptoms = a.symptoms; doc.notes = a.notes;
    }
    doc.updatedBy = actorName(req);

    const newFollowUp = doc.followUpDate ? doc.followUpDate.getTime() : null;
    if (!doc.followUpDate) {
      doc.followUpStatus = 'Not Required';
    } else if (newFollowUp !== oldFollowUp) {
      doc.followUpStatus = 'Pending';
      const patient = await PatientRecord.findById(doc.patient);
      if (patient) await trySync(doc, patient);
    }

    await doc.save();
    audit(req, 'post_op_recovery_update', doc, { newAssessment: clinicalChanged });
    return res.json({ success: true, data: await withLiveAppointment(doc) });
  } catch (e) {
    if (e.name === 'ValidationError') return fail(res, 400, e.message);
    logger.error('updateRecovery failed', { error: e.message });
    return fail(res, 500, 'Failed to update recovery record');
  }
};

export const updateFollowUp = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return fail(res, 400, 'Invalid recovery record id');
    const { followUpStatus, followUpDate } = req.body || {};
    if (!followUpStatus && !followUpDate) return fail(res, 400, 'Provide followUpStatus and/or followUpDate');
    if (followUpStatus && !['Pending', 'Scheduled', 'Completed', 'Missed'].includes(followUpStatus)) {
      return fail(res, 400, 'Invalid follow-up status', { followUpStatus: 'Invalid value' });
    }
    const doc = await PostOpRecovery.findById(req.params.id);
    if (!doc) return fail(res, 404, 'Recovery record not found');
    if (doc.isArchived) return fail(res, 409, 'Archived records cannot be changed');

    if (followUpDate) {
      const d = toDate(followUpDate);
      if (!d) return fail(res, 400, 'Invalid follow-up date', { followUpDate: 'Invalid date' });
      if (d < doc.procedureDate) return fail(res, 400, 'Follow-up cannot be before the procedure date', { followUpDate: 'Too early' });
      doc.followUpDate = d;
      doc.followUpStatus = 'Pending';
      const patient = await PatientRecord.findById(doc.patient);
      if (patient) await trySync(doc, patient);
    }
    if (followUpStatus) {
      doc.followUpStatus = followUpStatus;
      if (doc.followUpAppointmentId && followUpStatus === 'Completed') {
        await Appointment.findByIdAndUpdate(doc.followUpAppointmentId, { status: 'Completed' });
      }
    }
    doc.updatedBy = actorName(req);
    await doc.save();
    audit(req, 'post_op_recovery_followup', doc, { followUpStatus: doc.followUpStatus });
    return res.json({ success: true, data: await withLiveAppointment(doc) });
  } catch (e) {
    logger.error('updateFollowUp failed', { error: e.message });
    return fail(res, 500, 'Failed to update follow-up');
  }
};

// Soft archive only — nothing is ever permanently deleted by this module
export const archiveRecovery = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return fail(res, 400, 'Invalid recovery record id');
    const doc = await PostOpRecovery.findById(req.params.id);
    if (!doc) return fail(res, 404, 'Recovery record not found');
    if (doc.isArchived) return fail(res, 409, 'Record is already archived');
    doc.isArchived = true;
    doc.archivedAt = new Date();
    doc.archivedBy = actorName(req);
    doc.archiveReason = String(req.body?.reason || '').trim().slice(0, 500);
    doc.updatedBy = actorName(req);
    await doc.save();
    audit(req, 'post_op_recovery_archive', doc);
    return res.json({ success: true, message: 'Recovery record archived', data: doc });
  } catch (e) {
    logger.error('archiveRecovery failed', { error: e.message });
    return fail(res, 500, 'Failed to archive recovery record');
  }
};

export const restoreRecovery = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return fail(res, 400, 'Invalid recovery record id');
    const doc = await PostOpRecovery.findById(req.params.id);
    if (!doc) return fail(res, 404, 'Recovery record not found');
    if (!doc.isArchived) return fail(res, 409, 'Record is not archived');
    doc.isArchived = false;
    doc.archivedAt = null;
    doc.archivedBy = '';
    doc.archiveReason = '';
    doc.updatedBy = actorName(req);
    await doc.save();
    audit(req, 'post_op_recovery_restore', doc);
    return res.json({ success: true, message: 'Recovery record restored', data: doc });
  } catch (e) {
    logger.error('restoreRecovery failed', { error: e.message });
    return fail(res, 500, 'Failed to restore recovery record');
  }
};