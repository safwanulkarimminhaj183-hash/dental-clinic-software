import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, Search, RefreshCw, AlertTriangle, Calendar, Phone, Mail, Plus } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { getLocalAppointments, saveLocalAppointments, mergeAppointments } from '../utils/urgentAppointments';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
const STATUSES = ['Pending', 'Confirmed', 'Completed', 'Cancelled'];
const STATUS_STYLE = {
  Pending: 'bg-amber-100 text-amber-700',
  Confirmed: 'bg-blue-100 text-blue-700',
  Completed: 'bg-emerald-100 text-emerald-700',
  Cancelled: 'bg-gray-200 text-gray-600',
};

const AppointmentsPage = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    let server = [];
    try {
      const res = await fetch(`${API_BASE}/api/urgent-appointments`);
      if (res.ok) {
        const json = await res.json();
        server = json.data || [];
      }
    } catch (_) { /* backend offline: show local data only */ }
    setAppointments(mergeAppointments(server, getLocalAppointments()));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (apt, status) => {
    const targetId = apt.id || apt._id;
    try {
      if (/^[a-f\d]{24}$/i.test(targetId)) {
        const res = await fetch(`${API_BASE}/api/urgent-appointments/${targetId}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        });
        if (!res.ok) throw new Error('Server could not update the status.');
      }
      saveLocalAppointments(getLocalAppointments().map((a) => ((a.id === targetId || a._id === targetId) ? { ...a, status } : a)));
      setAppointments((prev) => prev.map((a) => ((a.id === targetId || a._id === targetId) ? { ...a, status } : a)));
      showToast(`Status updated to ${status}.`);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const deleteAppointment = async (apt) => {
    const targetId = apt.id || apt._id;
    if (!window.confirm('Are you sure you want to delete this appointment?')) return;
    try {
      if (/^[a-f\d]{24}$/i.test(targetId)) {
        const res = await fetch(`${API_BASE}/api/urgent-appointments/${targetId}`, {
          method: 'DELETE',
        });
        if (!res.ok) throw new Error('Server could not delete the appointment.');
      }
      saveLocalAppointments(getLocalAppointments().filter((a) => a.id !== targetId && a._id !== targetId));
      setAppointments((prev) => prev.filter((a) => a.id !== targetId && a._id !== targetId));
      showToast('Appointment deleted successfully.');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const stats = useMemo(() => ({
    total: appointments.length,
    pending: appointments.filter((a) => a.status === 'Pending').length,
    confirmed: appointments.filter((a) => a.status === 'Confirmed').length,
    emergency: appointments.filter((a) => a.type === 'Emergency').length,
  }), [appointments]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return appointments.filter((a) => {
      if (statusFilter !== 'All' && a.status !== statusFilter) return false;
      if (typeFilter !== 'All' && a.type !== typeFilter) return false;
      if (!q) return true;
      return [a.patientName, a.patientPhone, a.patientEmail, a.symptomDescription]
        .some((v) => (v || '').toLowerCase().includes(q));
    });
  }, [appointments, search, statusFilter, typeFilter]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />

      <main className="flex-grow container mx-auto px-4 py-10 max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#0e2a47] flex items-center gap-2">
              <ClipboardList className="w-7 h-7 text-[#3ec1d3]" /> Appointments
            </h1>
            <p className="text-gray-500 text-sm mt-1">All requests submitted from the Urgency Based booking form.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={load} className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-semibold text-[#0e2a47] hover:bg-gray-100">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
            <Link to="/urgency-based" className="inline-flex items-center gap-2 px-4 py-2 bg-[#3ec1d3] hover:bg-[#34adb9] text-white rounded-lg text-sm font-semibold">
              <Plus className="w-4 h-4" /> New Appointment
            </Link>
          </div>
        </div>

        {toast && (
          <div className={`mb-6 p-3 rounded-lg text-sm border ${toast.type === 'error' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
            {toast.message}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            ['Total', stats.total, 'text-[#0e2a47]'],
            ['Pending', stats.pending, 'text-amber-600'],
            ['Confirmed', stats.confirmed, 'text-blue-600'],
            ['Emergency', stats.emergency, 'text-red-500'],
          ].map(([label, value, color]) => (
            <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <p className="text-xs uppercase tracking-wider text-gray-400 font-semibold">{label}</p>
              <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-6 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, phone, email, symptom..."
              className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3ec1d3]"
            />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm">
            <option>All</option>
            {STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm">
            <option>All</option>
            <option>Routine</option>
            <option>Emergency</option>
          </select>
        </div>

        <div className="space-y-3">
          {loading ? (
            <p className="text-center text-gray-500 py-10">Loading appointments...</p>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 p-10 text-center text-gray-500 text-sm">
              No appointments found. Submit one from the Urgency Based page.
            </div>
          ) : (
            filtered.map((apt) => (
              <div key={apt.id || apt._id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex flex-wrap gap-4 items-start justify-between">
                <div className="min-w-[220px] flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-[#0e2a47]">{apt.patientName || 'Unknown patient'}</h3>
                    {apt.type === 'Emergency' ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600">
                        <AlertTriangle className="w-3 h-3" /> Emergency
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#3ec1d3]/15 text-[#0e2a47]">Routine</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 flex items-center gap-1"><Phone className="w-3 h-3" /> {apt.patientPhone || 'N/A'}</p>
                  {apt.patientEmail && <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5"><Mail className="w-3 h-3" /> {apt.patientEmail}</p>}
                  {apt.symptomDescription && <p className="text-sm text-gray-600 mt-2">{apt.symptomDescription}</p>}
                </div>

                <div className="text-sm text-gray-600 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#3ec1d3]" />
                  {apt.date ? new Date(apt.date).toLocaleDateString() : 'N/A'} at {apt.timeSlot || 'N/A'}
                </div>

                <div className="flex items-center gap-2">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLE[apt.status] || STATUS_STYLE.Pending}`}>{apt.status}</span>
                  <select
                    value={apt.status}
                    onChange={(e) => updateStatus(apt, e.target.value)}
                    className="text-xs px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg"
                  >
                    {STATUSES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                  <button
                    onClick={() => deleteAppointment(apt)}
                    className="text-xs px-2.5 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 rounded-lg font-medium transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default AppointmentsPage;
