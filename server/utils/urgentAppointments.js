const KEY = 'dentocare_urgent_appointments';

export const getLocalAppointments = () => {
  try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; }
};

export const saveLocalAppointments = (list) => {
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* ignore */ }
};

export const addLocalAppointment = (form, serverDoc) => {
  const record = {
    id: String(serverDoc?._id || `local_${Date.now()}`),
    patientName: form.patientName,
    patientPhone: form.patientPhone,
    patientEmail: form.patientEmail,
    date: form.date,
    timeSlot: form.timeSlot,
    type: form.urgencyType,
    urgencyLevel: form.urgencyLevel,
    symptomDescription: form.symptomDescription,
    status: serverDoc?.status || 'Pending',
    createdAt: new Date().toISOString(),
  };
  saveLocalAppointments([record, ...getLocalAppointments()]);
  return record;
};

// Server data wins when the same id exists in both
export const mergeAppointments = (serverList = [], localList = []) => {
  const map = new Map();
  localList.forEach((a) => map.set(String(a.id), a));
  serverList.forEach((a) => {
    const id = String(a._id || a.id);
    map.set(id, { ...a, id });
  });
  return [...map.values()].sort(
    (a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date)
  );
};