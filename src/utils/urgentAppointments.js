export const getLocalAppointments = () => {
  try {
    const data = localStorage.getItem('urgent_appointments');
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

export const saveLocalAppointments = (appointments) => {
  try {
    localStorage.setItem('urgent_appointments', JSON.stringify(appointments));
  } catch (err) {
    console.error('Failed to save local appointments', err);
  }
};

export const addLocalAppointment = (appointment) => {
  try {
    const appointments = getLocalAppointments();
    const newAppointment = {
      ...appointment,
      id: appointment.id || 'local_' + Date.now(),
      status: appointment.status || 'Pending',
      createdAt: appointment.createdAt || new Date().toISOString()
    };
    appointments.unshift(newAppointment);
    saveLocalAppointments(appointments);
    return newAppointment;
  } catch (err) {
    console.error('Failed to add local appointment', err);
  }
};

export const mergeAppointments = (serverApts, localApts) => {
  const map = new Map();
  // Server data takes precedence
  serverApts.forEach(apt => map.set(apt.id || apt._id, { ...apt, id: apt.id || apt._id }));
  localApts.forEach(apt => {
    if (!map.has(apt.id)) {
      map.set(apt.id, apt);
    }
  });
  return Array.from(map.values());
};