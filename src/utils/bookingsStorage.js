const BOOKINGS_KEY = 'dentocare_treatment_bookings';

export const getLocalBookings = () => {
  try {
    const raw = localStorage.getItem(BOOKINGS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Failed to read local bookings:', err);
    return [];
  }
};

export const saveLocalBookings = (bookings) => {
  try {
    localStorage.setItem(BOOKINGS_KEY, JSON.stringify(bookings));
  } catch (err) {
    console.error('Failed to save local bookings:', err);
  }
};

export const addLocalBooking = (booking) => {
  try {
    const list = getLocalBookings();
    const totalAmount = Number(booking.totalAmount) || 250;
    const amountPaid = Number(booking.amountPaid) || 0;
    const remainingBalance = Math.max(0, totalAmount - amountPaid);

    let paymentStatus = booking.paymentStatus;
    if (!paymentStatus) {
      if (amountPaid >= totalAmount && totalAmount > 0) paymentStatus = 'Paid';
      else if (amountPaid > 0) paymentStatus = 'Partially Paid';
      else paymentStatus = 'Unpaid';
    }

    const newBooking = {
      ...booking,
      id: booking.id || booking._id || 'BK-' + Date.now().toString().slice(-6),
      _id: booking._id || booking.id || 'BK-' + Date.now().toString().slice(-6),
      bookingReference: booking.bookingReference || 'BK-' + Math.floor(100000 + Math.random() * 900000),
      treatmentPlanTitle: booking.treatmentPlanTitle || 'Dental Consultation',
      patientName: booking.patientName,
      patientEmail: booking.patientEmail,
      patientPhone: booking.patientPhone,
      patientAge: booking.patientAge || 25,
      appointmentDate: booking.appointmentDate || new Date().toISOString().split('T')[0],
      appointmentTime: booking.appointmentTime || '10:30 AM',
      doctorName: booking.doctorName || 'Dr. Sarah Johnson (Chief Orthodontist)',
      totalAmount,
      amountPaid,
      remainingBalance,
      bookingStatus: booking.bookingStatus || 'Confirmed',
      paymentStatus,
      paymentMethod: booking.paymentMethod || 'Card',
      transactionId: booking.transactionId || 'TXN-' + Date.now(),
      payments: booking.payments || (amountPaid > 0 ? [{
        transactionId: 'TXN-' + Date.now(),
        amount: amountPaid,
        paymentMethod: booking.paymentMethod || 'Card',
        paymentDate: new Date().toISOString(),
        status: paymentStatus === 'Paid' ? 'Paid' : 'Partially Paid',
        notes: 'Initial Payment',
      }] : []),
      timeline: booking.timeline || [
        {
          action: 'Booking Created',
          status: 'Confirmed',
          timestamp: new Date().toISOString(),
          notes: `Appointment scheduled for ${booking.appointmentTime || '10:30 AM'}.`,
        },
      ],
      createdAt: booking.createdAt || new Date().toISOString(),
    };

    list.unshift(newBooking);
    saveLocalBookings(list);
    window.dispatchEvent(new CustomEvent('bookingsUpdated', { detail: newBooking }));
    return newBooking;
  } catch (err) {
    console.error('Failed to add local booking:', err);
    return booking;
  }
};

export const updateLocalBookingStatus = (id, newStatus, note = '') => {
  try {
    const list = getLocalBookings();
    const updated = list.map((b) => {
      if (b._id === id || b.id === id || b.bookingReference === id) {
        const timeline = Array.isArray(b.timeline) ? [...b.timeline] : [];
        timeline.push({
          action: `Status changed to ${newStatus}`,
          status: newStatus,
          timestamp: new Date().toISOString(),
          notes: note || 'Updated by staff.',
        });
        return { ...b, bookingStatus: newStatus, timeline };
      }
      return b;
    });
    saveLocalBookings(updated);
    window.dispatchEvent(new CustomEvent('bookingsUpdated'));
  } catch (err) {
    console.error('Failed to update local booking status:', err);
  }
};

export const recordLocalPayment = (id, paymentData) => {
  try {
    const list = getLocalBookings();
    const updated = list.map((b) => {
      if (b._id === id || b.id === id || b.bookingReference === id) {
        const addAmount = Number(paymentData.amount) || 0;
        const totalAmount = Number(b.totalAmount) || 0;
        const newPaid = (Number(b.amountPaid) || 0) + addAmount;
        const remainingBalance = Math.max(0, totalAmount - newPaid);

        let newPayStatus = 'Unpaid';
        if (newPaid >= totalAmount && totalAmount > 0) newPayStatus = 'Paid';
        else if (newPaid > 0) newPayStatus = 'Partially Paid';

        const payments = Array.isArray(b.payments) ? [...b.payments] : [];
        payments.push({
          transactionId: paymentData.transactionId || `TXN-${Date.now()}`,
          amount: addAmount,
          paymentMethod: paymentData.paymentMethod || 'Cash',
          paymentDate: new Date().toISOString(),
          status: 'Paid',
          notes: paymentData.notes || 'Recorded by staff',
        });

        const timeline = Array.isArray(b.timeline) ? [...b.timeline] : [];
        timeline.push({
          action: 'Payment Collected',
          status: newPayStatus,
          timestamp: new Date().toISOString(),
          notes: `Received $${addAmount} via ${paymentData.paymentMethod || 'Cash'}. Remaining: $${remainingBalance}.`,
        });

        return {
          ...b,
          amountPaid: newPaid,
          remainingBalance,
          paymentStatus: newPayStatus,
          payments,
          timeline,
        };
      }
      return b;
    });
    saveLocalBookings(updated);
    window.dispatchEvent(new CustomEvent('bookingsUpdated'));
  } catch (err) {
    console.error('Failed to record local payment:', err);
  }
};

export const rescheduleLocalBooking = (id, newDate, newTime, doctorName, note = '') => {
  try {
    const list = getLocalBookings();
    const updated = list.map((b) => {
      if (b._id === id || b.id === id || b.bookingReference === id) {
        const timeline = Array.isArray(b.timeline) ? [...b.timeline] : [];
        timeline.push({
          action: 'Appointment Rescheduled',
          status: 'Rescheduled',
          timestamp: new Date().toISOString(),
          notes: note || `Rescheduled to ${newDate} at ${newTime}.`,
        });
        return {
          ...b,
          appointmentDate: newDate,
          appointmentTime: newTime,
          doctorName: doctorName || b.doctorName,
          bookingStatus: 'Rescheduled',
          timeline,
        };
      }
      return b;
    });
    saveLocalBookings(updated);
    window.dispatchEvent(new CustomEvent('bookingsUpdated'));
  } catch (err) {
    console.error('Failed to reschedule local booking:', err);
  }
};

export const deleteLocalBooking = (id) => {
  try {
    const list = getLocalBookings();
    const filtered = list.filter((b) => b._id !== id && b.id !== id && b.bookingReference !== id);
    saveLocalBookings(filtered);
    window.dispatchEvent(new CustomEvent('bookingsUpdated'));
  } catch (err) {
    console.error('Failed to delete local booking:', err);
  }
};

export const mergeBookings = (serverBookings = [], localBookings = []) => {
  const map = new Map();

  // Local bookings first
  localBookings.forEach((b) => {
    const key = b.bookingReference || b._id || b.id;
    if (key) {
      map.set(key, { ...b, _id: b._id || key, id: b.id || key });
    }
  });

  // Server bookings take precedence
  serverBookings.forEach((b) => {
    const key = b.bookingReference || b._id || b.id;
    if (key) {
      map.set(key, { ...b, _id: b._id || key, id: b.id || key });
    }
  });

  return Array.from(map.values()).sort(
    (a, b) => new Date(b.createdAt || b.appointmentDate || 0) - new Date(a.createdAt || a.appointmentDate || 0)
  );
};
