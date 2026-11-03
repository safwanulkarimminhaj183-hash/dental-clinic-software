import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  MessageSquare,
  Search,
  RefreshCw,
  Calendar,
  Phone,
  Mail,
  User,
  Sparkles,
  Trash2,
  Eye,
  CheckCircle2,
  Clock,
  ArrowRight,
  X,
  FileText,
  Filter,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import {
  getLocalEnquiries,
  saveLocalEnquiries,
  mergeEnquiries,
  updateLocalEnquiryStatus,
  deleteLocalEnquiry,
} from '../utils/enquiriesStorage';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const STATUSES = ['New', 'Contacted', 'Converted'];

const STATUS_STYLE = {
  New: 'bg-amber-100 text-amber-800 border-amber-300',
  Contacted: 'bg-blue-100 text-blue-800 border-blue-300',
  Converted: 'bg-emerald-100 text-emerald-800 border-emerald-300',
};

const EnquiriesPage = () => {
  const [enquiries, setEnquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedPlanFilter, setSelectedPlanFilter] = useState('All');
  const [toast, setToast] = useState(null);
  const [activeModalEnquiry, setActiveModalEnquiry] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Load enquiries from backend API + localStorage fallback
  const loadEnquiries = useCallback(async () => {
    setLoading(true);
    let serverData = [];

    try {
      // Try primary enquiries endpoint
      let res = await fetch(`${API_BASE}/api/enquiries`);
      if (!res.ok) {
        // Fallback to treatment-plans/enquiries endpoint
        res = await fetch(`${API_BASE}/api/treatment-plans/enquiries`);
      }
      if (res.ok) {
        const json = await res.json();
        serverData = json.data || [];
      }
    } catch (err) {
      console.warn('Backend server offline, using local storage cache for enquiries:', err.message);
    }

    const merged = mergeEnquiries(serverData, getLocalEnquiries());
    setEnquiries(merged);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadEnquiries();

    // Listen for cross-tab or in-page enquiry events
    const handleSync = () => loadEnquiries();
    window.addEventListener('enquiriesUpdated', handleSync);
    window.addEventListener('storage', handleSync);

    return () => {
      window.removeEventListener('enquiriesUpdated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [loadEnquiries]);

  // Handle status update
  const handleStatusChange = async (enquiry, newStatus) => {
    const id = enquiry._id || enquiry.id;
    setActionLoadingId(id);

    // Optimistically update UI and localStorage
    updateLocalEnquiryStatus(id, newStatus);
    setEnquiries((prev) =>
      prev.map((item) => ((item._id === id || item.id === id) ? { ...item, status: newStatus } : item))
    );

    if (activeModalEnquiry && (activeModalEnquiry._id === id || activeModalEnquiry.id === id)) {
      setActiveModalEnquiry((prev) => ({ ...prev, status: newStatus }));
    }

    try {
      // Try updating on backend if available
      if (id && /^[a-f\d]{24}$/i.test(id)) {
        let res = await fetch(`${API_BASE}/api/enquiries/${id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        });
        if (!res.ok) {
          await fetch(`${API_BASE}/api/treatment-plans/enquiries/${id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus }),
          });
        }
      }
      showToast(`Status updated to "${newStatus}" successfully.`);
    } catch (err) {
      console.warn('Backend status sync note:', err.message);
      showToast(`Status updated to "${newStatus}" (stored locally).`);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle delete enquiry
  const handleDeleteEnquiry = async (enquiry) => {
    const id = enquiry._id || enquiry.id;
    if (!window.confirm(`Are you sure you want to delete the enquiry from "${enquiry.patientName || 'this customer'}"?`)) {
      return;
    }

    setActionLoadingId(id);

    // Remove from UI and localStorage immediately
    deleteLocalEnquiry(id);
    setEnquiries((prev) => prev.filter((item) => item._id !== id && item.id !== id));

    if (activeModalEnquiry && (activeModalEnquiry._id === id || activeModalEnquiry.id === id)) {
      setActiveModalEnquiry(null);
    }

    try {
      if (id && /^[a-f\d]{24}$/i.test(id)) {
        let res = await fetch(`${API_BASE}/api/enquiries/${id}`, {
          method: 'DELETE',
        });
        if (!res.ok) {
          await fetch(`${API_BASE}/api/treatment-plans/enquiries/${id}`, {
            method: 'DELETE',
          });
        }
      }
      showToast('Enquiry deleted successfully.');
    } catch (err) {
      console.warn('Backend delete sync note:', err.message);
      showToast('Enquiry deleted successfully from local storage.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Summary statistics
  const stats = useMemo(() => {
    const total = enquiries.length;
    const newCount = enquiries.filter((e) => (e.status || 'New') === 'New').length;
    const contactedCount = enquiries.filter((e) => e.status === 'Contacted').length;
    const convertedCount = enquiries.filter((e) => e.status === 'Converted').length;

    return { total, newCount, contactedCount, convertedCount };
  }, [enquiries]);

  // Unique plan titles for filter dropdown
  const uniquePlans = useMemo(() => {
    const plansSet = new Set(enquiries.map((e) => e.treatmentPlanTitle).filter(Boolean));
    return Array.from(plansSet);
  }, [enquiries]);

  // Filtered enquiries
  const filteredEnquiries = useMemo(() => {
    const q = search.trim().toLowerCase();

    return enquiries.filter((item) => {
      // Status filter
      if (statusFilter !== 'All' && (item.status || 'New') !== statusFilter) {
        return false;
      }

      // Treatment Plan filter
      if (selectedPlanFilter !== 'All' && item.treatmentPlanTitle !== selectedPlanFilter) {
        return false;
      }

      // Search query filter
      if (!q) return true;

      return [
        item.patientName,
        item.patientEmail,
        item.patientPhone,
        item.treatmentPlanTitle,
        item.message,
      ].some((val) => (val || '').toLowerCase().includes(q));
    });
  }, [enquiries, search, statusFilter, selectedPlanFilter]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <Navbar />

      <main className="flex-grow container mx-auto px-4 py-8 md:py-10 max-w-6xl">
        {/* Page Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#3ec1d3]/15 text-[#0e2a47] text-xs font-bold uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5 text-[#3ec1d3]" /> Overview • Lead Management
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-[#0e2a47] flex items-center gap-3">
              <MessageSquare className="w-8 h-8 text-[#3ec1d3]" />
              Treatment Plan Enquiries
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              Review and manage customer inquiries submitted from the Treatment Plans page.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadEnquiries}
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
              <span>Treatment Plans</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Toast / Notification */}
        {toast && (
          <div
            className={`mb-6 p-4 rounded-xl text-sm font-medium border flex items-center justify-between shadow-sm animate-fade-in ${
              toast.type === 'error'
                ? 'bg-red-50 border-red-200 text-red-700'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}
          >
            <span>{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              className="text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* 4 Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-wider text-gray-400 font-bold">Total Enquiries</p>
              <div className="w-8 h-8 rounded-lg bg-slate-100 text-[#0e2a47] flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl font-black mt-2 text-[#0e2a47]">{stats.total}</p>
            <p className="text-[11px] text-gray-400 mt-1">All incoming inquiries</p>
          </div>

          <div className="bg-amber-50/60 rounded-2xl border border-amber-200/80 shadow-sm p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-wider text-amber-700 font-bold">New</p>
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl font-black mt-2 text-amber-700">{stats.newCount}</p>
            <p className="text-[11px] text-amber-600/80 mt-1">Awaiting first response</p>
          </div>

          <div className="bg-blue-50/60 rounded-2xl border border-blue-200/80 shadow-sm p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-wider text-blue-700 font-bold">Contacted</p>
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl font-black mt-2 text-blue-700">{stats.contactedCount}</p>
            <p className="text-[11px] text-blue-600/80 mt-1">In communication</p>
          </div>

          <div className="bg-emerald-50/60 rounded-2xl border border-emerald-200/80 shadow-sm p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-wider text-emerald-700 font-bold">Converted</p>
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl font-black mt-2 text-emerald-700">{stats.convertedCount}</p>
            <p className="text-[11px] text-emerald-600/80 mt-1">Booked appointment</p>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-6 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by customer name, email, phone, plan or message..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3ec1d3] focus:bg-white transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-500 whitespace-nowrap">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-[#0e2a47] focus:outline-none focus:ring-2 focus:ring-[#3ec1d3] cursor-pointer"
            >
              <option value="All">All Statuses ({enquiries.length})</option>
              {STATUSES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          {/* Treatment Plan Filter */}
          {uniquePlans.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-500 whitespace-nowrap">Plan:</span>
              <select
                value={selectedPlanFilter}
                onChange={(e) => setSelectedPlanFilter(e.target.value)}
                className="max-w-[220px] px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-[#0e2a47] focus:outline-none focus:ring-2 focus:ring-[#3ec1d3] truncate cursor-pointer"
              >
                <option value="All">All Treatment Plans</option>
                {uniquePlans.map((planTitle) => (
                  <option key={planTitle} value={planTitle}>
                    {planTitle}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Enquiries List */}
        <div className="space-y-4">
          {loading ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-500 flex flex-col items-center justify-center">
              <RefreshCw className="w-8 h-8 text-[#3ec1d3] animate-spin mb-3" />
              <p className="font-semibold text-[#0e2a47]">Loading enquiries...</p>
              <p className="text-xs text-gray-400 mt-1">Retrieving latest submissions from database</p>
            </div>
          ) : filteredEnquiries.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-500 shadow-sm">
              <div className="w-14 h-14 bg-sky-50 text-[#3ec1d3] rounded-2xl flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-[#0e2a47] mb-1">No Enquiries Found</h3>
              <p className="text-sm text-gray-500 max-w-md mx-auto mb-6">
                {search || statusFilter !== 'All' || selectedPlanFilter !== 'All'
                  ? 'No enquiries match your current filters. Try resetting search parameters.'
                  : 'No enquiries have been submitted yet. Go to Treatment Plans and submit a Quick Enquiry to see updates here.'}
              </p>
              <Link
                to="/treatment-plans"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#3ec1d3] hover:bg-[#34adb9] text-white rounded-xl text-sm font-bold shadow-md transition-all cursor-pointer"
              >
                Go to Treatment Plans
              </Link>
            </div>
          ) : (
            filteredEnquiries.map((enq) => {
              const currentStatus = enq.status || 'New';
              const targetId = enq._id || enq.id;

              return (
                <div
                  key={targetId}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all p-5 md:p-6 flex flex-col lg:flex-row gap-5 items-start justify-between"
                >
                  {/* Left Column: Customer details & Plan */}
                  <div className="flex-1 min-w-[280px]">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="font-extrabold text-lg text-[#0e2a47]">
                        {enq.patientName || 'Anonymous Customer'}
                      </span>
                      <span
                        className={`text-xs font-bold px-3 py-0.5 rounded-full border ${
                          STATUS_STYLE[currentStatus] || STATUS_STYLE.New
                        }`}
                      >
                        {currentStatus}
                      </span>
                    </div>

                    {/* Inquired Treatment Plan */}
                    <div className="mb-3 inline-flex items-center gap-2 px-3 py-1 bg-sky-50 text-[#0e2a47] border border-sky-100 rounded-lg text-xs font-bold">
                      <Sparkles className="w-3.5 h-3.5 text-[#3ec1d3] shrink-0" />
                      <span>Plan: {enq.treatmentPlanTitle || 'General Treatment Plan'}</span>
                    </div>

                    {/* Contact Information */}
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-gray-500 mb-3">
                      {enq.patientEmail && (
                        <a
                          href={`mailto:${enq.patientEmail}`}
                          className="flex items-center gap-1.5 hover:text-[#3ec1d3] transition-colors"
                        >
                          <Mail className="w-3.5 h-3.5 text-gray-400" />
                          <span>{enq.patientEmail}</span>
                        </a>
                      )}
                      {enq.patientPhone && (
                        <a
                          href={`tel:${enq.patientPhone}`}
                          className="flex items-center gap-1.5 hover:text-[#3ec1d3] transition-colors"
                        >
                          <Phone className="w-3.5 h-3.5 text-gray-400" />
                          <span>{enq.patientPhone}</span>
                        </a>
                      )}
                      <div className="flex items-center gap-1.5 text-gray-400">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>
                          {enq.createdAt
                            ? new Date(enq.createdAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              }) +
                              ' at ' +
                              new Date(enq.createdAt).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : 'Recently'}
                        </span>
                      </div>
                    </div>

                    {/* Customer Message Box */}
                    {enq.message && (
                      <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 text-xs text-gray-700 leading-relaxed">
                        <span className="font-bold text-gray-400 block mb-0.5 uppercase tracking-wider text-[10px]">
                          Customer Message:
                        </span>
                        {enq.message}
                      </div>
                    )}
                  </div>

                  {/* Right Column: Actions (Status selector, Details, Delete) */}
                  <div className="flex flex-wrap lg:flex-col items-center lg:items-end gap-2.5 shrink-0 w-full lg:w-auto pt-2 lg:pt-0 border-t lg:border-t-0 border-gray-100">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 font-semibold">Change Status:</span>
                      <select
                        value={currentStatus}
                        disabled={actionLoadingId === targetId}
                        onChange={(e) => handleStatusChange(enq, e.target.value)}
                        className="text-xs font-bold px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3ec1d3] cursor-pointer text-[#0e2a47]"
                      >
                        {STATUSES.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-2 mt-auto">
                      {/* View Details Button */}
                      <button
                        onClick={() => setActiveModalEnquiry(enq)}
                        className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 bg-white border border-gray-200 text-[#0e2a47] hover:bg-gray-50 rounded-xl transition-colors cursor-pointer shadow-sm"
                        title="View Enquiry Details"
                      >
                        <Eye className="w-3.5 h-3.5 text-[#3ec1d3]" />
                        <span>Details</span>
                      </button>

                      {/* Delete Button */}
                      <button
                        onClick={() => handleDeleteEnquiry(enq)}
                        disabled={actionLoadingId === targetId}
                        className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                        title="Delete Enquiry"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* Details Modal */}
      {activeModalEnquiry && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-2xl relative animate-scale-up">
            <button
              onClick={() => setActiveModalEnquiry(null)}
              className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-[#3ec1d3]/15 text-[#3ec1d3] flex items-center justify-center">
                <MessageSquare className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-extrabold text-[#0e2a47]">Enquiry Details</h3>
                <p className="text-xs text-gray-400">Treatment Plan Consultation Request</p>
              </div>
            </div>

            <div className="space-y-4 mb-6 text-sm">
              <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 space-y-3">
                <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                  <span className="text-xs text-gray-500 font-semibold">Customer Name:</span>
                  <span className="font-extrabold text-[#0e2a47]">{activeModalEnquiry.patientName || 'N/A'}</span>
                </div>

                <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                  <span className="text-xs text-gray-500 font-semibold">Treatment Plan:</span>
                  <span className="font-bold text-[#3ec1d3] text-right max-w-[220px] truncate">
                    {activeModalEnquiry.treatmentPlanTitle || 'General Plan'}
                  </span>
                </div>

                <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                  <span className="text-xs text-gray-500 font-semibold">Email:</span>
                  <a
                    href={`mailto:${activeModalEnquiry.patientEmail}`}
                    className="font-semibold text-blue-600 hover:underline flex items-center gap-1"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>{activeModalEnquiry.patientEmail || 'N/A'}</span>
                  </a>
                </div>

                <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                  <span className="text-xs text-gray-500 font-semibold">Phone:</span>
                  <a
                    href={`tel:${activeModalEnquiry.patientPhone}`}
                    className="font-semibold text-[#0e2a47] hover:text-[#3ec1d3] flex items-center gap-1"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>{activeModalEnquiry.patientPhone || 'Not provided'}</span>
                  </a>
                </div>

                <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                  <span className="text-xs text-gray-500 font-semibold">Current Status:</span>
                  <span
                    className={`text-xs font-bold px-3 py-0.5 rounded-full border ${
                      STATUS_STYLE[activeModalEnquiry.status || 'New'] || STATUS_STYLE.New
                    }`}
                  >
                    {activeModalEnquiry.status || 'New'}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500 font-semibold">Date Submitted:</span>
                  <span className="text-xs text-gray-600">
                    {activeModalEnquiry.createdAt
                      ? new Date(activeModalEnquiry.createdAt).toLocaleString()
                      : 'Recently'}
                  </span>
                </div>
              </div>

              {/* Full Message */}
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                  Customer Message:
                </label>
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-gray-800 leading-relaxed min-h-[70px]">
                  {activeModalEnquiry.message || 'No specific message entered by the customer.'}
                </div>
              </div>

              {/* Status Update from modal */}
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs font-bold text-gray-600">Update Status:</span>
                <div className="flex gap-2">
                  {STATUSES.map((st) => (
                    <button
                      key={st}
                      onClick={() => handleStatusChange(activeModalEnquiry, st)}
                      className={`text-xs px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer border ${
                        (activeModalEnquiry.status || 'New') === st
                          ? 'bg-[#3ec1d3] text-white border-[#3ec1d3] shadow-sm'
                          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              {activeModalEnquiry.patientEmail && (
                <a
                  href={`mailto:${activeModalEnquiry.patientEmail}?subject=Regarding your inquiry for ${encodeURIComponent(
                    activeModalEnquiry.treatmentPlanTitle || 'Dental Treatment'
                  )}&body=Hello ${encodeURIComponent(activeModalEnquiry.patientName || '')},`}
                  className="flex-1 inline-flex items-center justify-center gap-2 bg-[#3ec1d3] hover:bg-[#34adb9] text-white py-3 rounded-xl font-bold text-sm shadow-md transition-all cursor-pointer"
                >
                  <Mail className="w-4 h-4" />
                  <span>Reply via Email</span>
                </a>
              )}
              <button
                onClick={() => handleDeleteEnquiry(activeModalEnquiry)}
                className="px-4 py-3 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 rounded-xl font-bold text-sm transition-colors cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default EnquiriesPage;
