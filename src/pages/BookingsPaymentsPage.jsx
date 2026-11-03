import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarCheck,
  CreditCard,
  Search,
  Filter,
  RefreshCw,
  Plus,
  Calendar,
  Clock,
  User,
  Phone,
  Mail,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  X,
  Eye,
  Trash2,
  Printer,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  AlertTriangle,
  ArrowRight,
  FileText,
  BadgeAlert,
  Send,
  Edit3,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import {
  getLocalBookings,
  saveLocalBookings,
  mergeBookings,
  updateLocalBookingStatus,
  recordLocalPayment,
  rescheduleLocalBooking,
  deleteLocalBooking,
} from '../utils/bookingsStorage';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const BOOKING_STATUSES = ['Pending', 'Confirmed', 'Rescheduled', 'Completed', 'Cancelled', 'No Show'];
const PAYMENT_STATUSES = ['Unpaid', 'Partially Paid', 'Paid', 'Refunded'];
const PAYMENT_METHODS = ['Cash', 'Card', 'Bank Transfer', 'Mobile Banking', 'Stripe', 'Pay At Clinic'];

const TIME_SLOTS = ['09:00 AM', '10:30 AM', '02:00 PM', '04:30 PM'];

const BOOKING_STATUS_STYLES = {
  Pending: 'bg-amber-100 text-amber-800 border-amber-300',
  Confirmed: 'bg-blue-100 text-blue-800 border-blue-300',
  Rescheduled: 'bg-purple-100 text-purple-800 border-purple-300',
  Completed: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  Cancelled: 'bg-red-100 text-red-800 border-red-300',
  'No Show': 'bg-gray-200 text-gray-700 border-gray-400',
};

const PAYMENT_STATUS_STYLES = {
  Paid: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  'Partially Paid': 'bg-sky-100 text-sky-800 border-sky-300',
  Unpaid: 'bg-amber-100 text-amber-800 border-amber-300',
  Refunded: 'bg-rose-100 text-rose-800 border-rose-300',
};

const fmt = (num) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(num || 0);

const BookingsPaymentsPage = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [paymentFilter, setPaymentFilter] = useState('All');
  const [planFilter, setPlanFilter] = useState('All');
  const [specialistFilter, setSpecialistFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('');
  const [sortOrder, setSortOrder] = useState('newest');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // Modals state
  const [detailsBooking, setDetailsBooking] = useState(null);
  const [rescheduleBookingTarget, setRescheduleBookingTarget] = useState(null);
  const [recordPaymentTarget, setRecordPaymentTarget] = useState(null);

  // Reschedule Form
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('10:30 AM');
  const [rescheduleNote, setRescheduleNote] = useState('');

  // Record Payment Form
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('Cash');
  const [payTxn, setPayTxn] = useState('');
  const [payNotes, setPayNotes] = useState('');

  // Staff Notes in Details Modal
  const [staffNoteInput, setStaffNoteInput] = useState('');

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // ─── Fetch Bookings (Backend + LocalStorage) ──────────────────────────────
  const loadBookings = useCallback(async () => {
    setLoading(true);
    let serverData = [];
    try {
      const res = await fetch(`${API_BASE}/api/bookings?limit=100`);
      if (res.ok) {
        const json = await res.json();
        serverData = json.data || [];
      }
    } catch (err) {
      console.warn('Backend offline, using cached local bookings:', err.message);
    }

    const merged = mergeBookings(serverData, getLocalBookings());
    setBookings(merged);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadBookings();

    const handleSync = () => loadBookings();
    window.addEventListener('bookingsUpdated', handleSync);
    window.addEventListener('storage', handleSync);

    return () => {
      window.removeEventListener('bookingsUpdated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [loadBookings]);

  // ─── Booking Status Update ───────────────────────────────────────────────
  const handleStatusChange = async (booking, newStatus) => {
    const id = booking._id || booking.id || booking.bookingReference;
    updateLocalBookingStatus(id, newStatus);

    setBookings((prev) =>
      prev.map((b) => ((b._id === id || b.id === id || b.bookingReference === id) ? { ...b, bookingStatus: newStatus } : b))
    );

    if (detailsBooking && (detailsBooking._id === id || detailsBooking.bookingReference === id)) {
      setDetailsBooking((prev) => ({ ...prev, bookingStatus: newStatus }));
    }

    try {
      if (id && /^[a-f\d]{24}$/i.test(id)) {
        await fetch(`${API_BASE}/api/bookings/${id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        });
      }
      showToast(`Booking status changed to "${newStatus}".`);
    } catch (err) {
      showToast(`Status updated to "${newStatus}" (saved locally).`);
    }
  };

  // ─── Confirm Booking Quick Action ─────────────────────────────────────────
  const handleQuickConfirm = (booking) => {
    handleStatusChange(booking, 'Confirmed');
  };

  // ─── Cancel Booking ───────────────────────────────────────────────────────
  const handleCancelBooking = (booking) => {
    if (!window.confirm(`Are you sure you want to cancel booking ${booking.bookingReference}?`)) return;
    handleStatusChange(booking, 'Cancelled');
  };

  // ─── Delete Booking ───────────────────────────────────────────────────────
  const handleDeleteBooking = async (booking) => {
    const id = booking._id || booking.id || booking.bookingReference;
    if (!window.confirm(`Permanently remove booking ${booking.bookingReference} for ${booking.patientName}?`)) return;

    deleteLocalBooking(id);
    setBookings((prev) => prev.filter((b) => b._id !== id && b.id !== id && b.bookingReference !== id));

    if (detailsBooking && (detailsBooking._id === id || detailsBooking.bookingReference === id)) {
      setDetailsBooking(null);
    }

    try {
      if (id && /^[a-f\d]{24}$/i.test(id)) {
        await fetch(`${API_BASE}/api/bookings/${id}`, { method: 'DELETE' });
      }
      showToast('Booking deleted successfully.');
    } catch (err) {
      showToast('Booking deleted from local records.');
    }
  };

  // ─── Reschedule Booking ───────────────────────────────────────────────────
  const handleRescheduleSubmit = async (e) => {
    e.preventDefault();
    if (!newDate || !newTime) {
      alert('Please select both appointment date and time slot.');
      return;
    }

    const id = rescheduleBookingTarget._id || rescheduleBookingTarget.id || rescheduleBookingTarget.bookingReference;

    // Check collision locally
    const conflict = bookings.find(
      (b) =>
        (b._id !== id && b.bookingReference !== id) &&
        b.appointmentTime === newTime &&
        b.bookingStatus !== 'Cancelled' &&
        new Date(b.appointmentDate).toISOString().split('T')[0] === newDate
    );

    if (conflict) {
      alert(`Time slot ${newTime} on ${newDate} is already booked for ${conflict.patientName}. Please select another slot.`);
      return;
    }

    rescheduleLocalBooking(id, newDate, newTime, rescheduleBookingTarget.doctorName, rescheduleNote);

    setBookings((prev) =>
      prev.map((b) =>
        b._id === id || b.bookingReference === id
          ? { ...b, appointmentDate: newDate, appointmentTime: newTime, bookingStatus: 'Rescheduled' }
          : b
      )
    );

    try {
      if (id && /^[a-f\d]{24}$/i.test(id)) {
        await fetch(`${API_BASE}/api/bookings/${id}/reschedule`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            appointmentDate: newDate,
            appointmentTime: newTime,
            note: rescheduleNote,
          }),
        });
      }
      showToast(`Appointment rescheduled to ${newDate} at ${newTime}.`);
    } catch (err) {
      showToast(`Appointment rescheduled to ${newDate} at ${newTime} (saved locally).`);
    } finally {
      setRescheduleBookingTarget(null);
      setNewDate('');
      setRescheduleNote('');
    }
  };

  // ─── Record Payment ───────────────────────────────────────────────────────
  const handleRecordPaymentSubmit = async (e) => {
    e.preventDefault();
    const amount = Number(payAmount);
    if (!amount || amount <= 0) {
      alert('Please enter a valid payment amount.');
      return;
    }

    const id = recordPaymentTarget._id || recordPaymentTarget.id || recordPaymentTarget.bookingReference;

    const paymentData = {
      amount,
      paymentMethod: payMethod,
      transactionId: payTxn || `TXN-${Date.now()}`,
      notes: payNotes,
    };

    recordLocalPayment(id, paymentData);

    setBookings((prev) =>
      prev.map((b) => {
        if (b._id === id || b.bookingReference === id) {
          const newPaid = (Number(b.amountPaid) || 0) + amount;
          const tot = Number(b.totalAmount) || 0;
          const remaining = Math.max(0, tot - newPaid);
          const payStatus = newPaid >= tot ? 'Paid' : newPaid > 0 ? 'Partially Paid' : 'Unpaid';
          return {
            ...b,
            amountPaid: newPaid,
            remainingBalance: remaining,
            paymentStatus: payStatus,
          };
        }
        return b;
      })
    );

    if (detailsBooking && (detailsBooking._id === id || detailsBooking.bookingReference === id)) {
      setDetailsBooking((prev) => {
        const newPaid = (Number(prev.amountPaid) || 0) + amount;
        const tot = Number(prev.totalAmount) || 0;
        return {
          ...prev,
          amountPaid: newPaid,
          remainingBalance: Math.max(0, tot - newPaid),
          paymentStatus: newPaid >= tot ? 'Paid' : newPaid > 0 ? 'Partially Paid' : 'Unpaid',
        };
      });
    }

    try {
      if (id && /^[a-f\d]{24}$/i.test(id)) {
        await fetch(`${API_BASE}/api/bookings/${id}/payments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(paymentData),
        });
      }
      showToast(`Payment of ${fmt(amount)} recorded successfully!`);
    } catch (err) {
      showToast(`Payment of ${fmt(amount)} recorded locally.`);
    } finally {
      setRecordPaymentTarget(null);
      setPayAmount('');
      setPayTxn('');
      setPayNotes('');
    }
  };

  // ─── Save Staff Notes in Details Modal ────────────────────────────────────
  const handleSaveStaffNotes = async () => {
    if (!detailsBooking) return;
    const id = detailsBooking._id || detailsBooking.id || detailsBooking.bookingReference;

    setDetailsBooking((prev) => ({ ...prev, staffNotes: staffNoteInput }));

    setBookings((prev) =>
      prev.map((b) => (b._id === id || b.bookingReference === id ? { ...b, staffNotes: staffNoteInput } : b))
    );

    try {
      if (id && /^[a-f\d]{24}$/i.test(id)) {
        await fetch(`${API_BASE}/api/bookings/${id}/notes`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ staffNotes: staffNoteInput }),
        });
      }
      showToast('Internal staff notes saved.');
    } catch (err) {
      showToast('Staff notes saved locally.');
    }
  };

  // ─── Printable Receipt ────────────────────────────────────────────────────
  const handlePrintReceipt = (booking) => {
    const printWin = window.open('', '_blank');
    if (!printWin) {
      alert('Please allow popups to print the receipt.');
      return;
    }

    const remaining = Math.max(0, (booking.totalAmount || 0) - (booking.amountPaid || 0));

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt - ${booking.bookingReference}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #0e2a47; max-width: 650px; margin: 0 auto; }
            .header { border-bottom: 2px solid #3ec1d3; padding-bottom: 20px; margin-bottom: 25px; display: flex; justify-content: space-between; align-items: center; }
            .logo { font-size: 26px; font-weight: 900; color: #0e2a47; }
            .badge { display: inline-block; background: #e0f7fa; color: #00838f; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: bold; }
            .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 25px; font-size: 13px; }
            .section-title { font-size: 14px; font-weight: bold; text-transform: uppercase; color: #78909c; margin-bottom: 8px; }
            .table { width: 100%; border-collapse: collapse; margin-bottom: 25px; font-size: 14px; }
            .table th { background: #f8fafc; text-align: left; padding: 10px; border-bottom: 2px solid #e2e8f0; }
            .table td { padding: 12px 10px; border-bottom: 1px solid #e2e8f0; }
            .total-row { font-weight: bold; font-size: 16px; }
            .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 20px; }
            @media print {
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="logo">DentoCare Clinic</div>
              <div style="font-size: 12px; color: #64748b;">Official Dental Treatment Booking & Payment Receipt</div>
            </div>
            <div style="text-align: right;">
              <div class="badge">${booking.paymentStatus || 'Paid'}</div>
              <div style="font-size: 12px; color: #64748b; margin-top: 5px;">Ref: <strong>${booking.bookingReference}</strong></div>
            </div>
          </div>

          <div class="meta-grid">
            <div>
              <div class="section-title">Patient Information</div>
              <strong>${booking.patientName}</strong><br/>
              Phone: ${booking.patientPhone || 'N/A'}<br/>
              Email: ${booking.patientEmail || 'N/A'}
            </div>
            <div style="text-align: right;">
              <div class="section-title">Appointment Schedule</div>
              Date: <strong>${new Date(booking.appointmentDate).toDateString()}</strong><br/>
              Time: <strong>${booking.appointmentTime}</strong><br/>
              Specialist: <strong>${booking.doctorName || 'Dr. Sarah Johnson'}</strong>
            </div>
          </div>

          <table class="table">
            <thead>
              <tr>
                <th>Description</th>
                <th style="text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <strong>${booking.treatmentPlanTitle}</strong><br/>
                  <span style="font-size: 12px; color: #64748b;">Method: ${booking.paymentMethod || 'Card'} | Status: ${booking.bookingStatus}</span>
                </td>
                <td style="text-align: right;">${fmt(booking.totalAmount)}</td>
              </tr>
              <tr>
                <td style="color: #059669; font-weight: bold;">Amount Paid / Deposit</td>
                <td style="text-align: right; color: #059669; font-weight: bold;">${fmt(booking.amountPaid)}</td>
              </tr>
              <tr class="total-row">
                <td style="color: ${remaining > 0 ? '#b91c1c' : '#0e2a47'};">Remaining Balance Due</td>
                <td style="text-align: right; color: ${remaining > 0 ? '#b91c1c' : '#0e2a47'};">${fmt(remaining)}</td>
              </tr>
            </tbody>
          </table>

          <div style="font-size: 12px; color: #475569; background: #f8fafc; padding: 12px; border-radius: 8px;">
            <strong>Transaction ID:</strong> ${booking.transactionId || 'TXN-' + Date.now()}<br/>
            <strong>Issued On:</strong> ${new Date().toLocaleString()}
          </div>

          <div class="footer">
            Thank you for choosing DentoCare! For appointment changes, call (512) 205-1826.
          </div>

          <div class="no-print" style="margin-top: 20px; text-align: center;">
            <button onclick="window.print()" style="background: #3ec1d3; color: white; border: none; padding: 10px 20px; font-weight: bold; border-radius: 6px; cursor: pointer;">Print Receipt</button>
          </div>
        </body>
      </html>
    `);
    printWin.document.close();
  };

  // ─── Computed Summary Statistics (A) ──────────────────────────────────────
  const summary = useMemo(() => {
    let totalRevenue = 0;
    let pendingPayments = 0;
    let pendingBookings = 0;
    let confirmedBookings = 0;
    let completedBookings = 0;

    bookings.forEach((b) => {
      const tot = Number(b.totalAmount) || 0;
      const pd = Number(b.amountPaid) || 0;
      totalRevenue += pd;

      if (pd < tot && b.bookingStatus !== 'Cancelled') {
        pendingPayments += tot - pd;
      }

      if (b.bookingStatus === 'Pending') pendingBookings++;
      else if (b.bookingStatus === 'Confirmed') confirmedBookings++;
      else if (b.bookingStatus === 'Completed') completedBookings++;
    });

    return {
      totalBookings: bookings.length,
      pendingBookings,
      confirmedBookings,
      completedBookings,
      totalRevenue,
      pendingPayments,
    };
  }, [bookings]);

  // Unique plans & specialists for filters
  const uniquePlans = useMemo(() => {
    return Array.from(new Set(bookings.map((b) => b.treatmentPlanTitle).filter(Boolean)));
  }, [bookings]);

  const uniqueSpecialists = useMemo(() => {
    return Array.from(new Set(bookings.map((b) => b.doctorName).filter(Boolean)));
  }, [bookings]);

  // ─── Filtered and Sorted Bookings (F) ──────────────────────────────────────
  const filteredBookings = useMemo(() => {
    const q = search.trim().toLowerCase();

    return bookings.filter((b) => {
      // Status filter
      if (statusFilter !== 'All' && b.bookingStatus !== statusFilter) return false;

      // Payment filter
      if (paymentFilter !== 'All' && b.paymentStatus !== paymentFilter) return false;

      // Plan filter
      if (planFilter !== 'All' && b.treatmentPlanTitle !== planFilter) return false;

      // Specialist filter
      if (specialistFilter !== 'All' && b.doctorName !== specialistFilter) return false;

      // Date filter
      if (dateFilter) {
        const apptDateStr = new Date(b.appointmentDate).toISOString().split('T')[0];
        if (apptDateStr !== dateFilter) return false;
      }

      // Search term
      if (!q) return true;
      return [
        b.bookingReference,
        b.patientName,
        b.patientPhone,
        b.patientEmail,
        b.treatmentPlanTitle,
        b.doctorName,
      ].some((val) => (val || '').toLowerCase().includes(q));
    }).sort((a, b) => {
      const dateA = new Date(a.createdAt || a.appointmentDate || 0).getTime();
      const dateB = new Date(b.createdAt || b.appointmentDate || 0).getTime();
      return sortOrder === 'oldest' ? dateA - dateB : dateB - dateA;
    });
  }, [bookings, search, statusFilter, paymentFilter, planFilter, specialistFilter, dateFilter, sortOrder]);

  // Paginated bookings
  const totalPages = Math.ceil(filteredBookings.length / pageSize) || 1;
  const paginatedBookings = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredBookings.slice(start, start + pageSize);
  }, [filteredBookings, currentPage, pageSize]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <Navbar />

      <main className="flex-grow container mx-auto px-4 py-8 md:py-10 max-w-7xl">
        {/* Module Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#3ec1d3]/15 text-[#0e2a47] text-xs font-bold uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5 text-[#3ec1d3]" /> Overview • Clinical Operations & Financials
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-[#0e2a47] flex items-center gap-3">
              <CalendarCheck className="w-8 h-8 text-[#3ec1d3]" />
              Booking & Payments Management
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              Centralized hub for treatment plan bookings, appointment schedules, and payment collections.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadBookings}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold text-[#0e2a47] hover:bg-gray-100 shadow-sm transition-all cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#3ec1d3]' : 'text-gray-500'}`} />
              Refresh
            </button>
            <Link
              to="/treatment-plans"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#3ec1d3] hover:bg-[#34adb9] text-white rounded-xl text-sm font-bold shadow-md transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Book Treatment Plan
            </Link>
          </div>
        </div>

        {/* Notifications & Reminders Alert Banner */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="bg-sky-50 border border-sky-200 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div className="text-xs">
              <p className="font-bold text-[#0e2a47]">Upcoming Treatment Appointments</p>
              <p className="text-gray-600 mt-0.5">
                {bookings.filter((b) => b.bookingStatus === 'Confirmed').length} active confirmed appointments scheduled. Automated SMS reminders queued.
              </p>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <CreditCard className="w-5 h-5" />
            </div>
            <div className="text-xs">
              <p className="font-bold text-amber-900">Outstanding Balance Alert</p>
              <p className="text-amber-700 mt-0.5">
                Total pending balance: <strong>{fmt(summary.pendingPayments)}</strong>. Staff can record clinic payments directly from the table.
              </p>
            </div>
          </div>
        </div>

        {/* Toast Alert */}
        {toast && (
          <div
            className={`mb-6 p-4 rounded-xl text-sm font-medium border flex items-center justify-between shadow-sm animate-fade-in ${
              toast.type === 'error'
                ? 'bg-red-50 border-red-200 text-red-700'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}
          >
            <span>{toast.message}</span>
            <button onClick={() => setToast(null)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* 6 Summary Cards (A) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4 mb-8">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow">
            <p className="text-[11px] uppercase tracking-wider text-gray-400 font-bold">Total Bookings</p>
            <p className="text-2xl font-black mt-1 text-[#0e2a47]">{summary.totalBookings}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">All reservations</p>
          </div>

          <div className="bg-amber-50/70 rounded-2xl border border-amber-200/80 shadow-sm p-4 hover:shadow-md transition-shadow">
            <p className="text-[11px] uppercase tracking-wider text-amber-700 font-bold">Pending</p>
            <p className="text-2xl font-black mt-1 text-amber-700">{summary.pendingBookings}</p>
            <p className="text-[10px] text-amber-600/80 mt-0.5">Needs confirmation</p>
          </div>

          <div className="bg-blue-50/70 rounded-2xl border border-blue-200/80 shadow-sm p-4 hover:shadow-md transition-shadow">
            <p className="text-[11px] uppercase tracking-wider text-blue-700 font-bold">Confirmed</p>
            <p className="text-2xl font-black mt-1 text-blue-700">{summary.confirmedBookings}</p>
            <p className="text-[10px] text-blue-600/80 mt-0.5">Ready for treatment</p>
          </div>

          <div className="bg-emerald-50/70 rounded-2xl border border-emerald-200/80 shadow-sm p-4 hover:shadow-md transition-shadow">
            <p className="text-[11px] uppercase tracking-wider text-emerald-700 font-bold">Completed</p>
            <p className="text-2xl font-black mt-1 text-emerald-700">{summary.completedBookings}</p>
            <p className="text-[10px] text-emerald-600/80 mt-0.5">Treatment finished</p>
          </div>

          <div className="bg-teal-50/70 rounded-2xl border border-teal-200/80 shadow-sm p-4 hover:shadow-md transition-shadow">
            <p className="text-[11px] uppercase tracking-wider text-teal-800 font-bold">Total Revenue</p>
            <p className="text-2xl font-black mt-1 text-teal-700">{fmt(summary.totalRevenue)}</p>
            <p className="text-[10px] text-teal-600/80 mt-0.5">Collected to date</p>
          </div>

          <div className="bg-rose-50/70 rounded-2xl border border-rose-200/80 shadow-sm p-4 hover:shadow-md transition-shadow">
            <p className="text-[11px] uppercase tracking-wider text-rose-800 font-bold">Pending Payments</p>
            <p className="text-2xl font-black mt-1 text-rose-700">{fmt(summary.pendingPayments)}</p>
            <p className="text-[10px] text-rose-600/80 mt-0.5">Remaining balance</p>
          </div>
        </div>

        {/* Search & Comprehensive Filters Toolbar (F) */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-6 space-y-3">
          <div className="flex flex-wrap gap-3 items-center">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search patient, phone, booking ID (e.g. BK-123456)..."
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3ec1d3] focus:bg-white transition-all"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Booking Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-[#0e2a47] focus:ring-2 focus:ring-[#3ec1d3] cursor-pointer"
            >
              <option value="All">All Booking Statuses</option>
              {BOOKING_STATUSES.map((st) => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>

            {/* Payment Status Filter */}
            <select
              value={paymentFilter}
              onChange={(e) => {
                setPaymentFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-[#0e2a47] focus:ring-2 focus:ring-[#3ec1d3] cursor-pointer"
            >
              <option value="All">All Payment Statuses</option>
              {PAYMENT_STATUSES.map((pst) => (
                <option key={pst} value={pst}>{pst}</option>
              ))}
            </select>

            {/* Appointment Date Picker Filter */}
            <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5">
              <Calendar className="w-3.5 h-3.5 text-gray-400" />
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => {
                  setDateFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-transparent text-xs font-semibold text-[#0e2a47] outline-none cursor-pointer"
                title="Filter by appointment date"
              />
              {dateFilter && (
                <button onClick={() => setDateFilter('')} className="text-gray-400 hover:text-gray-600 text-xs">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Sort order */}
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-[#0e2a47] focus:ring-2 focus:ring-[#3ec1d3] cursor-pointer"
            >
              <option value="newest">Sort: Newest First</option>
              <option value="oldest">Sort: Oldest First</option>
            </select>
          </div>

          {/* Secondary Filter Row: Plan & Specialist */}
          {(uniquePlans.length > 0 || uniqueSpecialists.length > 0) && (
            <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100 text-xs">
              {uniquePlans.length > 0 && (
                <select
                  value={planFilter}
                  onChange={(e) => {
                    setPlanFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-700 max-w-[260px] truncate"
                >
                  <option value="All">All Treatment Plans</option>
                  {uniquePlans.map((tp) => (
                    <option key={tp} value={tp}>{tp}</option>
                  ))}
                </select>
              )}

              {uniqueSpecialists.length > 0 && (
                <select
                  value={specialistFilter}
                  onChange={(e) => {
                    setSpecialistFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-700 max-w-[240px] truncate"
                >
                  <option value="All">All Attending Specialists</option>
                  {uniqueSpecialists.map((doc) => (
                    <option key={doc} value={doc}>{doc}</option>
                  ))}
                </select>
              )}

              {(search || statusFilter !== 'All' || paymentFilter !== 'All' || planFilter !== 'All' || specialistFilter !== 'All' || dateFilter) && (
                <button
                  onClick={() => {
                    setSearch('');
                    setStatusFilter('All');
                    setPaymentFilter('All');
                    setPlanFilter('All');
                    setSpecialistFilter('All');
                    setDateFilter('');
                  }}
                  className="text-xs text-rose-600 hover:underline px-2 py-1 font-semibold"
                >
                  Clear all filters
                </button>
              )}
            </div>
          )}
        </div>

        {/* Booking Management Table (B) */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-6">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-gray-500 font-bold uppercase tracking-wider border-b border-gray-200">
                <tr>
                  <th className="p-3.5">Booking ID</th>
                  <th className="p-3.5">Patient Info</th>
                  <th className="p-3.5">Treatment Plan</th>
                  <th className="p-3.5">Appointment Schedule</th>
                  <th className="p-3.5">Specialist</th>
                  <th className="p-3.5">Booking Status</th>
                  <th className="p-3.5">Payment Status</th>
                  <th className="p-3.5">Amount & Balance</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-gray-400">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#3ec1d3]" />
                      Loading bookings & payment records...
                    </td>
                  </tr>
                ) : paginatedBookings.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-gray-400">
                      <CalendarCheck className="w-8 h-8 text-[#3ec1d3] mx-auto mb-2 opacity-50" />
                      <p className="font-bold text-[#0e2a47]">No Bookings Found</p>
                      <p className="text-xs mt-1">Bookings submitted from Treatment Plans will appear here.</p>
                      <Link to="/treatment-plans" className="mt-3 inline-block px-4 py-1.5 bg-[#3ec1d3] text-white font-bold rounded-lg text-xs">
                        View Treatment Plans
                      </Link>
                    </td>
                  </tr>
                ) : (
                  paginatedBookings.map((b) => {
                    const id = b._id || b.id || b.bookingReference;
                    const remaining = Math.max(0, (b.totalAmount || 0) - (b.amountPaid || 0));

                    return (
                      <tr key={id} className="hover:bg-slate-50/70 transition-colors">
                        {/* Booking ID */}
                        <td className="p-3.5 font-mono font-bold text-[#0e2a47]">
                          <span className="bg-slate-100 px-2 py-1 rounded border border-slate-200">
                            {b.bookingReference || 'BK-1000'}
                          </span>
                        </td>

                        {/* Patient Info */}
                        <td className="p-3.5">
                          <div className="font-extrabold text-[#0e2a47]">{b.patientName}</div>
                          <div className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3 text-gray-400" />
                            <a href={`tel:${b.patientPhone}`} className="hover:text-[#3ec1d3]">{b.patientPhone}</a>
                          </div>
                        </td>

                        {/* Treatment Plan */}
                        <td className="p-3.5 max-w-[220px]">
                          <div className="font-semibold text-[#0e2a47] truncate" title={b.treatmentPlanTitle}>
                            {b.treatmentPlanTitle}
                          </div>
                          <div className="text-[10px] text-gray-400">Age: {b.patientAge || '25'} yrs</div>
                        </td>

                        {/* Appointment Schedule */}
                        <td className="p-3.5 whitespace-nowrap">
                          <div className="font-bold text-[#0e2a47] flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-[#3ec1d3]" />
                            {b.appointmentDate ? new Date(b.appointmentDate).toLocaleDateString() : 'TBD'}
                          </div>
                          <div className="text-[11px] text-gray-500 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-gray-400" />
                            {b.appointmentTime}
                          </div>
                        </td>

                        {/* Attending Specialist */}
                        <td className="p-3.5 max-w-[160px] truncate" title={b.doctorName}>
                          <div className="text-xs font-semibold text-gray-800">{b.doctorName || 'Dr. Sarah Johnson'}</div>
                        </td>

                        {/* Booking Status with Quick Selector */}
                        <td className="p-3.5 whitespace-nowrap">
                          <select
                            value={b.bookingStatus || 'Confirmed'}
                            onChange={(e) => handleStatusChange(b, e.target.value)}
                            className={`text-[11px] font-bold px-2 py-1 rounded-full border cursor-pointer outline-none ${
                              BOOKING_STATUS_STYLES[b.bookingStatus] || BOOKING_STATUS_STYLES.Confirmed
                            }`}
                          >
                            {BOOKING_STATUSES.map((st) => (
                              <option key={st} value={st}>{st}</option>
                            ))}
                          </select>
                        </td>

                        {/* Payment Status */}
                        <td className="p-3.5 whitespace-nowrap">
                          <span
                            className={`inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                              PAYMENT_STATUS_STYLES[b.paymentStatus] || PAYMENT_STATUS_STYLES.Unpaid
                            }`}
                          >
                            {b.paymentStatus || 'Unpaid'}
                          </span>
                          <div className="text-[10px] text-gray-400 mt-0.5">{b.paymentMethod || 'Card'}</div>
                        </td>

                        {/* Total Amount & Balance */}
                        <td className="p-3.5 whitespace-nowrap">
                          <div className="font-bold text-[#0e2a47]">{fmt(b.totalAmount)}</div>
                          <div className="text-[10px] text-emerald-600 font-semibold">Paid: {fmt(b.amountPaid)}</div>
                          {remaining > 0 && (
                            <div className="text-[10px] text-rose-600 font-bold">Due: {fmt(remaining)}</div>
                          )}
                        </td>

                        {/* Actions (G) */}
                        <td className="p-3.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Quick Confirm if pending */}
                            {b.bookingStatus === 'Pending' && (
                              <button
                                onClick={() => handleQuickConfirm(b)}
                                className="p-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                                title="Confirm Booking"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* View Details */}
                            <button
                              onClick={() => {
                                setDetailsBooking(b);
                                setStaffNoteInput(b.staffNotes || '');
                              }}
                              className="p-1.5 bg-white border border-gray-200 text-[#0e2a47] hover:bg-gray-100 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                              title="View Full Booking Details"
                            >
                              <Eye className="w-3.5 h-3.5 text-[#3ec1d3]" />
                            </button>

                            {/* Record Payment */}
                            <button
                              onClick={() => {
                                setRecordPaymentTarget(b);
                                setPayAmount(remaining > 0 ? remaining.toString() : '');
                              }}
                              className="p-1.5 bg-teal-50 text-teal-700 hover:bg-teal-100 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                              title="Record Payment"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                            </button>

                            {/* Reschedule */}
                            <button
                              onClick={() => {
                                setRescheduleBookingTarget(b);
                                setNewDate(new Date(b.appointmentDate).toISOString().split('T')[0]);
                                setNewTime(b.appointmentTime);
                              }}
                              className="p-1.5 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                              title="Reschedule Appointment"
                            >
                              <Clock className="w-3.5 h-3.5" />
                            </button>

                            {/* Print Receipt */}
                            <button
                              onClick={() => handlePrintReceipt(b)}
                              className="p-1.5 bg-slate-50 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                              title="Download / Print Receipt"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete / Cancel */}
                            <button
                              onClick={() => handleDeleteBooking(b)}
                              className="p-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                              title="Delete Booking"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="p-4 bg-slate-50 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-500">
            <div>
              Showing{' '}
              <span className="font-bold text-[#0e2a47]">
                {filteredBookings.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}
              </span>{' '}
              to{' '}
              <span className="font-bold text-[#0e2a47]">
                {Math.min(currentPage * pageSize, filteredBookings.length)}
              </span>{' '}
              of <span className="font-bold text-[#0e2a47]">{filteredBookings.length}</span> bookings
            </div>

            <div className="flex items-center gap-1.5">
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg font-bold disabled:opacity-40 hover:bg-gray-100 cursor-pointer flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Prev
              </button>

              <span className="px-2 font-bold text-[#0e2a47]">
                Page {currentPage} of {totalPages}
              </span>

              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg font-bold disabled:opacity-40 hover:bg-gray-100 cursor-pointer flex items-center gap-1"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* ─── MODAL 1: Booking Details (E) ─────────────────────────────────── */}
      {detailsBooking && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 md:p-8 shadow-2xl relative my-8 animate-scale-up max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setDetailsBooking(null)}
              className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-[#3ec1d3]/15 text-[#3ec1d3] flex items-center justify-center">
                <CalendarCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-extrabold text-[#0e2a47]">
                  Booking Reference: {detailsBooking.bookingReference}
                </h3>
                <p className="text-xs text-gray-400">Complete clinical & payment history log</p>
              </div>
            </div>

            <div className="space-y-6 text-xs">
              {/* Patient & Specialist Card */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div>
                  <p className="font-bold text-gray-400 uppercase tracking-wider text-[10px] mb-1">Patient Details</p>
                  <p className="text-base font-extrabold text-[#0e2a47]">{detailsBooking.patientName}</p>
                  <p className="text-gray-600 mt-1 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-gray-400" />
                    <a href={`tel:${detailsBooking.patientPhone}`} className="text-blue-600 font-semibold">{detailsBooking.patientPhone}</a>
                  </p>
                  <p className="text-gray-600 flex items-center gap-1.5 mt-0.5">
                    <Mail className="w-3.5 h-3.5 text-gray-400" />
                    <a href={`mailto:${detailsBooking.patientEmail}`} className="text-blue-600 font-semibold">{detailsBooking.patientEmail}</a>
                  </p>
                  <p className="text-gray-500 mt-0.5">Age: {detailsBooking.patientAge || '25'} years</p>
                </div>

                <div>
                  <p className="font-bold text-gray-400 uppercase tracking-wider text-[10px] mb-1">Schedule & Specialist</p>
                  <p className="font-bold text-[#0e2a47] text-sm">{detailsBooking.doctorName}</p>
                  <p className="text-gray-700 mt-1 flex items-center gap-1.5 font-semibold">
                    <Calendar className="w-3.5 h-3.5 text-[#3ec1d3]" />
                    {new Date(detailsBooking.appointmentDate).toDateString()}
                  </p>
                  <p className="text-gray-700 flex items-center gap-1.5 font-semibold mt-0.5">
                    <Clock className="w-3.5 h-3.5 text-[#3ec1d3]" />
                    {detailsBooking.appointmentTime}
                  </p>
                  <div className="mt-2 flex gap-2 items-center">
                    <span className={`px-2.5 py-0.5 rounded-full font-bold border ${BOOKING_STATUS_STYLES[detailsBooking.bookingStatus] || ''}`}>
                      {detailsBooking.bookingStatus}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full font-bold border ${PAYMENT_STATUS_STYLES[detailsBooking.paymentStatus] || ''}`}>
                      {detailsBooking.paymentStatus}
                    </span>
                  </div>
                </div>
              </div>

              {/* Treatment Plan Details */}
              <div className="bg-sky-50/70 p-4 rounded-2xl border border-sky-200">
                <p className="font-bold text-sky-800 uppercase tracking-wider text-[10px] mb-1">Treatment Plan Inquired & Booked</p>
                <p className="text-sm font-bold text-[#0e2a47]">{detailsBooking.treatmentPlanTitle}</p>
                {detailsBooking.notes && (
                  <p className="text-gray-600 mt-2 bg-white/70 p-2.5 rounded-lg border border-sky-100">
                    <strong>Patient Note:</strong> {detailsBooking.notes}
                  </p>
                )}
              </div>

              {/* Financial Breakdown */}
              <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-2">
                <p className="font-bold text-gray-400 uppercase tracking-wider text-[10px] mb-2">Financial Summary</p>
                <div className="flex justify-between border-b pb-1.5 text-gray-600">
                  <span>Total Treatment Cost:</span>
                  <span className="font-bold text-[#0e2a47]">{fmt(detailsBooking.totalAmount)}</span>
                </div>
                <div className="flex justify-between border-b pb-1.5 text-gray-600">
                  <span>Advance / Total Paid:</span>
                  <span className="font-bold text-emerald-600">{fmt(detailsBooking.amountPaid)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Remaining Balance Due:</span>
                  <span className="font-extrabold text-rose-600">
                    {fmt(Math.max(0, (detailsBooking.totalAmount || 0) - (detailsBooking.amountPaid || 0)))}
                  </span>
                </div>
              </div>

              {/* Payment Records History */}
              <div>
                <p className="font-bold text-gray-400 uppercase tracking-wider text-[10px] mb-2">Payment Records History</p>
                <div className="space-y-2">
                  {detailsBooking.payments && detailsBooking.payments.length > 0 ? (
                    detailsBooking.payments.map((pmt, idx) => (
                      <div key={idx} className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex justify-between items-center text-xs">
                        <div>
                          <p className="font-bold text-[#0e2a47]">{fmt(pmt.amount)} via {pmt.paymentMethod}</p>
                          <p className="text-[10px] text-gray-400">{pmt.transactionId} • {new Date(pmt.paymentDate).toLocaleString()}</p>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                          {pmt.status || 'Paid'}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-400 text-xs italic">No individual payment entries recorded yet.</p>
                  )}
                </div>
              </div>

              {/* Booking Timeline */}
              <div>
                <p className="font-bold text-gray-400 uppercase tracking-wider text-[10px] mb-2">Activity Timeline</p>
                <div className="border-l-2 border-[#3ec1d3] pl-3 space-y-3">
                  {detailsBooking.timeline && detailsBooking.timeline.length > 0 ? (
                    detailsBooking.timeline.map((item, idx) => (
                      <div key={idx} className="relative text-xs">
                        <div className="font-bold text-[#0e2a47]">{item.action}</div>
                        <div className="text-[11px] text-gray-500">{item.notes}</div>
                        <div className="text-[10px] text-gray-400">{new Date(item.timestamp).toLocaleString()}</div>
                      </div>
                    ))
                  ) : (
                    <div className="text-gray-400 text-xs">Booking created on {new Date(detailsBooking.createdAt || Date.now()).toLocaleString()}</div>
                  )}
                </div>
              </div>

              {/* Internal Staff Notes */}
              <div>
                <p className="font-bold text-gray-400 uppercase tracking-wider text-[10px] mb-2">Internal Staff Notes</p>
                <textarea
                  rows={2}
                  value={staffNoteInput}
                  onChange={(e) => setStaffNoteInput(e.target.value)}
                  placeholder="Add private staff comments regarding medical history, discounts, or insurance approvals..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#3ec1d3] outline-none"
                />
                <button
                  onClick={handleSaveStaffNotes}
                  className="mt-2 px-3 py-1.5 bg-[#0e2a47] text-white rounded-lg font-bold text-xs hover:bg-[#16385d] cursor-pointer"
                >
                  Save Internal Note
                </button>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-2 pt-4 border-t border-gray-100">
              <button
                onClick={() => handlePrintReceipt(detailsBooking)}
                className="flex-1 inline-flex items-center justify-center gap-2 bg-[#3ec1d3] hover:bg-[#34adb9] text-white py-2.5 rounded-xl font-bold text-xs cursor-pointer shadow-sm"
              >
                <Printer className="w-4 h-4" />
                Print Payment Receipt
              </button>
              <button
                onClick={() => {
                  setRecordPaymentTarget(detailsBooking);
                  setPayAmount(Math.max(0, (detailsBooking.totalAmount || 0) - (detailsBooking.amountPaid || 0)).toString());
                }}
                className="px-4 py-2.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-xl font-bold text-xs cursor-pointer"
              >
                Record Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 2: Reschedule Appointment ──────────────────────────────── */}
      {rescheduleBookingTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 md:p-8 shadow-2xl relative animate-scale-up">
            <button
              onClick={() => setRescheduleBookingTarget(null)}
              className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-extrabold text-[#0e2a47] mb-1">Reschedule Appointment</h3>
            <p className="text-xs text-gray-500 mb-6">
              Patient: <strong>{rescheduleBookingTarget.patientName}</strong> ({rescheduleBookingTarget.bookingReference})
            </p>

            <form onSubmit={handleRescheduleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-600 mb-1">Select New Date</label>
                <input
                  type="date"
                  required
                  value={newDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#3ec1d3] outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-600 mb-1">Select New Time Slot</label>
                <div className="grid grid-cols-2 gap-2">
                  {TIME_SLOTS.map((slot) => (
                    <button
                      type="button"
                      key={slot}
                      onClick={() => setNewTime(slot)}
                      className={`p-2.5 rounded-xl text-xs font-bold transition-all border ${
                        newTime === slot
                          ? 'bg-[#3ec1d3] text-white border-[#3ec1d3] shadow-sm'
                          : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-600 mb-1">Reschedule Reason / Staff Note</label>
                <input
                  type="text"
                  value={rescheduleNote}
                  onChange={(e) => setRescheduleNote(e.target.value)}
                  placeholder="Patient requested weekend slot, doctor schedule update, etc."
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-[#3ec1d3] outline-none"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setRescheduleBookingTarget(null)}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-600 font-bold rounded-xl text-xs hover:bg-gray-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#3ec1d3] hover:bg-[#34adb9] text-white font-bold rounded-xl text-xs shadow-md cursor-pointer"
                >
                  Save & Reschedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 3: Record Payment ───────────────────────────────────────── */}
      {recordPaymentTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 md:p-8 shadow-2xl relative animate-scale-up">
            <button
              onClick={() => setRecordPaymentTarget(null)}
              className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-extrabold text-[#0e2a47] mb-1">Record Clinic Payment</h3>
            <p className="text-xs text-gray-500 mb-4">
              Patient: <strong>{recordPaymentTarget.patientName}</strong> • Ref: {recordPaymentTarget.bookingReference}
            </p>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 mb-4 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-500">Total Treatment Cost:</span>
                <span className="font-bold text-[#0e2a47]">{fmt(recordPaymentTarget.totalAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Previously Paid:</span>
                <span className="font-bold text-emerald-600">{fmt(recordPaymentTarget.amountPaid)}</span>
              </div>
              <div className="flex justify-between border-t pt-1">
                <span className="font-bold text-gray-700">Outstanding Balance:</span>
                <span className="font-black text-rose-600">
                  {fmt(Math.max(0, (recordPaymentTarget.totalAmount || 0) - (recordPaymentTarget.amountPaid || 0)))}
                </span>
              </div>
            </div>

            <form onSubmit={handleRecordPaymentSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-600 mb-1">Payment Amount ($)</label>
                <input
                  type="number"
                  required
                  min="1"
                  step="any"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  placeholder="Enter collected amount..."
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-[#0e2a47] focus:ring-2 focus:ring-[#3ec1d3] outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-600 mb-1">Payment Method</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-[#0e2a47] focus:ring-2 focus:ring-[#3ec1d3] outline-none"
                >
                  {PAYMENT_METHODS.map((pm) => (
                    <option key={pm} value={pm}>{pm}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-600 mb-1">Transaction / Voucher ID (Optional)</label>
                <input
                  type="text"
                  value={payTxn}
                  onChange={(e) => setPayTxn(e.target.value)}
                  placeholder="e.g. CASH-RECEIPT-01, POS-4912..."
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-[#3ec1d3] outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-600 mb-1">Notes</label>
                <input
                  type="text"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="e.g. Paid in cash at reception, 10% loyalty discount applied..."
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-[#3ec1d3] outline-none"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setRecordPaymentTarget(null)}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-600 font-bold rounded-xl text-xs hover:bg-gray-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md cursor-pointer"
                >
                  Collect Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default BookingsPaymentsPage;
