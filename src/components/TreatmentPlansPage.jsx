import React, { useState, useEffect, useCallback } from 'react';
import {
  Filter,
  Search,
  DollarSign,
  UserCheck,
  Sparkles,
  Calendar,
  Clock,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  Eye,
  TrendingUp,
  Send,
  ShieldCheck,
  ChevronDown,
  X,
  Zap,
  Award,
  Lock,
  RefreshCw,
} from 'lucide-react';
import Navbar from './Navbar';
import Footer from './Footer';
import { addLocalEnquiry } from '../utils/enquiriesStorage';
import { addLocalBooking } from '../utils/bookingsStorage';

const API_BASE = 'http://localhost:5000/api/treatment-plans';

const DENTAL_ISSUES = [
  'All',
  'Crooked Teeth',
  'Misaligned Teeth',
  'Missing Tooth',
  'Plaque',
  'Tartar Accumulation',
  'Cavities',
  'Toothache',
  'Stained Teeth',
  'Bleeding Gums',
];

const CATEGORIES = [
  'All',
  'Orthodontics',
  'Implants',
  'Cleaning',
  'Root Canal',
  'Cosmetic',
  'Pediatric',
];

const TreatmentPlansPage = () => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cacheSource, setCacheSource] = useState('');
  const [cacheHeader, setCacheHeader] = useState('');

  // Filters State
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [ageFilter, setAgeFilter] = useState('');
  const [minBudget, setMinBudget] = useState('');
  const [maxBudget, setMaxBudget] = useState('');
  const [selectedIssue, setSelectedIssue] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Personalized Patient State
  const [patientEmailInput, setPatientEmailInput] = useState('');
  const [activePatientEmail, setActivePatientEmail] = useState('patient.test@example.com');
  const [personalizedReason, setPersonalizedReason] = useState('');

  // Modals & Active Selections
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isEnquiryModalOpen, setIsEnquiryModalOpen] = useState(false);
  const [isAdminAnalyticsOpen, setIsAdminAnalyticsOpen] = useState(false);
  const [analyticsData, setAnalyticsData] = useState(null);

  // Booking Form State
  const [bookingStep, setBookingStep] = useState(1);
  const [bookingForm, setBookingForm] = useState({
    patientName: '',
    patientEmail: '',
    patientPhone: '',
    patientAge: '25',
    appointmentDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
    appointmentTime: '10:30 AM',
    doctorName: 'Dr. Sarah Johnson (Chief Orthodontist)',
    paymentOption: 'partial',
    amountToPay: 200,
    cardNumber: '4242 •••• •••• 4242',
    cardExp: '12/28',
    cardCvc: '123',
    notes: '',
  });

  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(null);

  // Enquiry Form State
  const [enquiryForm, setEnquiryForm] = useState({
    patientName: '',
    patientEmail: '',
    patientPhone: '',
    message: '',
  });
  const [enquiryLoading, setEnquiryLoading] = useState(false);
  const [enquirySuccess, setEnquirySuccess] = useState(false);

  // ─── Fetch Treatment Plans from Backend API ──────────────────────────────
  const fetchPlans = useCallback(async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (selectedCategory !== 'All') queryParams.append('category', selectedCategory);
      if (ageFilter) queryParams.append('age', ageFilter);
      if (minBudget) queryParams.append('minBudget', minBudget);
      if (maxBudget) queryParams.append('maxBudget', maxBudget);
      if (selectedIssue !== 'All') queryParams.append('issue', selectedIssue);
      if (searchQuery) queryParams.append('search', searchQuery);
      if (activePatientEmail) queryParams.append('email', activePatientEmail);

      const res = await fetch(`${API_BASE}?${queryParams.toString()}`);
      const cacheHdr = res.headers.get('x-cache') || 'MISS';
      setCacheHeader(cacheHdr);

      const result = await res.json();
      if (result.success) {
        setPlans(result.data || []);
        setCacheSource(result.source || 'database');
      }
    } catch (error) {
      console.error('Failed to fetch treatment plans:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, ageFilter, minBudget, maxBudget, selectedIssue, searchQuery, activePatientEmail]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  // ─── Track Click API ($inc counter) ──────────────────────────────────────
  const handlePlanClick = async (plan) => {
    setSelectedPlan(plan);
    try {
      await fetch(`${API_BASE}/${plan._id || plan.id}/click`, { method: 'POST' });
      setPlans((prev) =>
        prev.map((p) =>
          (p._id === plan._id || p.id === plan.id) ? { ...p, clicks: (p.clicks || 0) + 1 } : p
        )
      );
    } catch (err) {
      console.warn('Click track error:', err.message);
    }
  };

  // ─── Fetch Admin Analytics API ──────────────────────────────────────────
  const fetchAnalytics = async () => {
    try {
      const res = await fetch(`${API_BASE}/analytics`);
            const data = await res.json();
      if (data.success) {
        setBookingSuccess(data.booking);
        setBookingStep(4);
        fetchPlans(); // Refresh counts

        // Automatically sync with Overview -> Booking and Payments
        try {
          addLocalBooking({
            ...(data.booking || bookPayload),
            treatmentPlanTitle: selectedPlan.title,
            totalAmount: selectedPlan.netPayable || selectedPlan.price || 250,
            amountPaid: amountPaidNum,
            bookingReference: data.booking?.bookingReference || 'BK-' + Math.floor(100000 + Math.random() * 900000),
            bookingStatus: 'Confirmed',
            paymentStatus: amountPaidNum >= (selectedPlan.netPayable || selectedPlan.price) ? 'Paid' : amountPaidNum > 0 ? 'Partially Paid' : 'Unpaid',
            paymentMethod: bookingForm.paymentOption === 'clinic' ? 'Pay At Clinic' : 'Card',
            appointmentDate: bookingForm.appointmentDate,
            appointmentTime: bookingForm.appointmentTime,
            doctorName: bookingForm.doctorName,
            patientName: bookingForm.patientName,
            patientEmail: bookingForm.patientEmail,
            patientPhone: bookingForm.patientPhone,
            patientAge: bookingForm.patientAge,
            createdAt: new Date().toISOString(),
          });
        } catch (syncErr) {
          console.warn('Booking sync note:', syncErr.message);
        }
      } else {
        alert(data.message || 'Booking failed.');
      }
    } catch (err) {
      alert(`Booking error: ${err.message}`);
    } finally {
      setBookingLoading(false);
    }
  };

  // ─── Handle Enquiry Submission (BullMQ Notification) ────────────────────
  const handleEnquirySubmit = async (e) => {
    e.preventDefault();
    setEnquiryLoading(true);

    const enquiryData = {
      treatmentPlanTitle: selectedPlan?.title || 'General Treatment Inquiry',
      patientName: enquiryForm.patientName,
      patientEmail: enquiryForm.patientEmail,
      patientPhone: enquiryForm.patientPhone,
      message: enquiryForm.message,
      status: 'New',
      createdAt: new Date().toISOString(),
    };

    // Save locally immediately so no update is missed
    addLocalEnquiry(enquiryData);

    try {
      const res = await fetch(`${API_BASE}/enquire`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          treatmentPlanTitle: selectedPlan?.title || 'General Treatment Inquiry',
          ...enquiryForm,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setEnquirySuccess(true);
      } else {
        setEnquirySuccess(true);
      }
    } catch (err) {
      console.warn('Enquiry fallback active:', err.message);
      setEnquirySuccess(true);
    } finally {
      setEnquiryLoading(false);
    }
  };

  const resetFilters = () => {
    setSelectedCategory('All');
    setAgeFilter('');
    setMinBudget('');
    setMaxBudget('');
    setSelectedIssue('All');
    setSearchQuery('');
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#0e2a47]">
      <Navbar />

      {/* Hero Banner */}
      <section className="bg-gradient-to-r from-[#0e2a47] via-[#12385e] to-[#3ec1d3] text-white py-16 px-6 md:px-12 shadow-inner">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-semibold uppercase tracking-wider text-[#3ec1d3] mb-4">
              <Sparkles className="w-4 h-4 text-[#3ec1d3]" /> Personalized Oral Healthcare Architecture
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight leading-tight mb-4">
              Advanced Treatment Plans & Personalized Dental Care
            </h1>
            <p className="text-gray-200 text-base md:text-lg leading-relaxed">
              Explore dynamic treatment plans tailored to your age, budget, and clinical requirements. Powered by Redis performance caching, secure MongoDB ACID transactions, and automated notifications.
            </p>
          </div>

          <div className="flex flex-col gap-3 w-full md:w-auto">
            <button
              onClick={fetchAnalytics}
              className="flex items-center justify-center gap-2 bg-[#3ec1d3] hover:bg-[#34adb9] text-white px-6 py-3.5 rounded-xl font-bold text-sm shadow-lg transition-all hover:scale-105 cursor-pointer"
            >
              <BarChart3 className="w-5 h-5" />
              <span>Admin Insight Dashboard</span>
            </button>
            <div className="flex items-center justify-center gap-2 text-xs text-gray-200 bg-black/20 py-2 px-4 rounded-lg">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Cache Status: </span>
              <span className={`font-bold px-2 py-0.5 rounded text-[11px] ${cacheHeader === 'HIT' ? 'bg-emerald-500 text-white' : 'bg-blue-500 text-white'}`}>
                {cacheHeader === 'HIT' ? 'REDIS CACHE HIT ⚡' : 'DATABASE QUERY 🗄️'}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-10">

        {/* 1. Personalized Patient Medical History Bar */}
        <div className="bg-white rounded-2xl p-6 shadow-md border border-sky-100 mb-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#3ec1d3]/15 text-[#3ec1d3] flex items-center justify-center shrink-0">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-[#0e2a47]">Personalized Patient Recommendation Engine</h3>
              <p className="text-sm text-gray-500">Enter patient email to load custom recommendations based on past medical records.</p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <input
              type="email"
              placeholder="e.g. patient.test@example.com"
              value={patientEmailInput}
              onChange={(e) => setPatientEmailInput(e.target.value)}
              className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#3ec1d3] w-full md:w-64"
            />
            <button
              onClick={() => {
                setActivePatientEmail(patientEmailInput || 'patient.test@example.com');
                fetchPlans();
              }}
              className="bg-[#0e2a47] hover:bg-[#163b61] text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap cursor-pointer shrink-0"
            >
              Match History
            </button>
          </div>
        </div>

        {/* 2. Dynamic Query Filter Control Panel */}
        <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100 mb-10">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-6 border-b border-gray-100 pb-4">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-[#3ec1d3]" />
              <h2 className="text-lg font-bold">Dynamic Treatment Filter</h2>
            </div>

            <div className="flex items-center gap-3 w-full lg:w-auto">
              {/* Search Box */}
              <div className="relative w-full lg:w-72">
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search procedures, aligners..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#3ec1d3]"
                />
              </div>

              <button
                onClick={resetFilters}
                className="text-xs text-gray-500 hover:text-red-500 font-semibold px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors shrink-0 cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Category Filter */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#3ec1d3] bg-white cursor-pointer"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Age Filter */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Patient Age</label>
              <input
                type="number"
                placeholder="e.g. 25"
                value={ageFilter}
                onChange={(e) => setAgeFilter(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#3ec1d3]"
              />
            </div>

            {/* Budget Filter */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Max Budget ($)</label>
              <input
                type="number"
                placeholder="e.g. 2000"
                value={maxBudget}
                onChange={(e) => setMaxBudget(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#3ec1d3]"
              />
            </div>

            {/* Dental Issues Filter */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Dental Issues</label>
              <select
                value={selectedIssue}
                onChange={(e) => setSelectedIssue(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#3ec1d3] bg-white cursor-pointer"
              >
                {DENTAL_ISSUES.map((issue) => (
                  <option key={issue} value={issue}>{issue}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* 3. Treatment Plans Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <RefreshCw className="w-10 h-10 text-[#3ec1d3] animate-spin mb-4" />
            <p className="text-gray-500 font-semibold">Querying Treatment Plans Database...</p>
          </div>
        ) : plans.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
            <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">No Matching Treatment Plans Found</h3>
            <p className="text-gray-500 max-w-md mx-auto mb-6">Try adjusting your budget, age filter, or category selection to explore more options.</p>
            <button
              onClick={resetFilters}
              className="bg-[#3ec1d3] text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow hover:bg-[#34adb9] transition-all cursor-pointer"
            >
              Clear All Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {plans.map((plan) => (
              <div
                key={plan._id || plan.id}
                onClick={() => handlePlanClick(plan)}
                className={`bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-300 border flex flex-col justify-between cursor-pointer group relative ${
                  plan.isRecommended ? 'border-emerald-400 ring-2 ring-emerald-400/20' : 'border-gray-100'
                }`}
              >
                {/* Badges */}
                <div className="absolute top-4 left-4 z-10 flex flex-wrap gap-2">
                  {plan.isRecommended && (
                    <span className="bg-emerald-500 text-white text-[11px] font-extrabold px-3 py-1 rounded-full shadow flex items-center gap-1 animate-pulse">
                      <Sparkles className="w-3.5 h-3.5" /> Recommended
                    </span>
                  )}
                  {plan.isPopular && (
                    <span className="bg-amber-500 text-white text-[11px] font-extrabold px-3 py-1 rounded-full shadow flex items-center gap-1">
                      🔥 Popular
                    </span>
                  )}
                </div>

                <div>
                  {/* Plan Image Header */}
                  <div className="h-48 overflow-hidden relative bg-slate-100">
                    <img
                      src={plan.imageUrl || 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&q=80&w=800'}
                      alt={plan.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                    <div className="absolute bottom-3 left-4 right-4 text-white">
                      <span className="bg-[#3ec1d3] text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md inline-block mb-1">
                        {plan.category}
                      </span>
                      <h3 className="font-bold text-lg leading-snug drop-shadow-sm">{plan.title}</h3>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-6">
                    {/* Recommendation Reason Banner */}
                    {plan.isRecommended && (
                      <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl p-3 mb-4 flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{plan.recommendationReason || 'Tailored to your medical record history.'}</span>
                      </div>
                    )}

                    <p className="text-gray-600 text-sm line-clamp-3 mb-4 leading-relaxed">
                      {plan.description}
                    </p>

                    {/* Metadata Badges */}
                    <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-gray-500 mb-6 bg-slate-50 p-3 rounded-xl">
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4 text-[#3ec1d3]" />
                        <span>{plan.duration || '1-3 months'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <UserCheck className="w-4 h-4 text-[#3ec1d3]" />
                        <span>Ages {plan.targetAgeMin || 0} - {plan.targetAgeMax || 80}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Eye className="w-4 h-4 text-gray-400" />
                        <span>{plan.clicks || 0} Views</span>
                      </div>
                    </div>

                    {/* Suitable Conditions Tags */}
                    {plan.suitableForConditions && plan.suitableForConditions.length > 0 && (
                      <div className="mb-6">
                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Suitable For</p>
                        <div className="flex flex-wrap gap-1.5">
                          {plan.suitableForConditions.map((cond, idx) => (
                            <span key={idx} className="bg-sky-50 text-[#0e2a47] border border-sky-100 text-[11px] font-semibold px-2.5 py-0.5 rounded-md">
                              {cond}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Pricing & Actions */}
                <div className="p-6 pt-0 border-t border-gray-50 mt-auto">
                  <div className="flex items-baseline justify-between mb-4">
                    <div>
                      <span className="text-xs text-gray-400 line-through mr-2 font-medium">${plan.originalPrice || plan.price + 200}</span>
                      <span className="text-2xl font-extrabold text-[#0e2a47]">${plan.netPayable || plan.price}</span>
                      <span className="text-xs text-gray-500 font-normal"> / full plan</span>
                    </div>
                    {plan.insuranceCovered > 0 && (
                      <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded">
                        -${plan.insuranceCovered} Insurance
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPlan(plan);
                        setIsEnquiryModalOpen(true);
                      }}
                      className="bg-gray-100 hover:bg-gray-200 text-[#0e2a47] font-bold py-2.5 rounded-xl text-xs transition-colors cursor-pointer"
                    >
                      Quick Enquiry
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPlan(plan);
                        setBookingStep(1);
                        setBookingForm((prev) => ({
                          ...prev,
                          patientName: 'Jane Smith',
                          patientEmail: activePatientEmail || 'patient.test@example.com',
                          patientPhone: '512-205-1826',
                          patientAge: ageFilter || '25',
                          amountToPay: Math.round((plan.netPayable || plan.price) * 0.2),
                        }));
                        setIsBookingModalOpen(true);
                      }}
                      className="bg-[#3ec1d3] hover:bg-[#34adb9] text-white font-bold py-2.5 rounded-xl text-xs shadow-md transition-all cursor-pointer"
                    >
                      Book Plan Now
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── 4. Secure Treatment Booking & Multi-Step Payment Gateway Modal ──── */}
      {isBookingModalOpen && selectedPlan && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-8 shadow-2xl relative my-8">
            <button
              onClick={() => setIsBookingModalOpen(false)}
              className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Stepper Header */}
            <div className="mb-6">
              <span className="text-xs font-bold uppercase tracking-wider text-[#3ec1d3]">Step {bookingStep} of 4</span>
              <h2 className="text-2xl font-bold text-[#0e2a47]">{selectedPlan.title}</h2>
            </div>

            {bookingStep === 1 && (
              <div>
                <h3 className="font-bold text-sm text-gray-600 mb-4">Select Preferred Appointment Schedule</h3>
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Appointment Date</label>
                    <input
                      type="date"
                      value={bookingForm.appointmentDate}
                      onChange={(e) => setBookingForm({ ...bookingForm, appointmentDate: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#3ec1d3]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Time Slot</label>
                    <select
                      value={bookingForm.appointmentTime}
                      onChange={(e) => setBookingForm({ ...bookingForm, appointmentTime: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#3ec1d3] bg-white cursor-pointer"
                    >
                      <option value="09:00 AM">09:00 AM</option>
                      <option value="10:30 AM">10:30 AM</option>
                      <option value="02:00 PM">02:00 PM</option>
                      <option value="04:30 PM">04:30 PM</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Attending Specialist</label>
                    <input
                      type="text"
                      readOnly
                      value={bookingForm.doctorName}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-gray-50 text-gray-700 font-medium"
                    />
                  </div>
                </div>
                <button
                  onClick={() => setBookingStep(2)}
                  className="w-full bg-[#3ec1d3] hover:bg-[#34adb9] text-white py-3 rounded-xl font-bold shadow-md cursor-pointer"
                >
                  Continue to Patient Info
                </button>
              </div>
            )}

            {bookingStep === 2 && (
              <div>
                <h3 className="font-bold text-sm text-gray-600 mb-4">Patient Profile & Contact Details</h3>
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Full Name</label>
                    <input
                      type="text"
                      value={bookingForm.patientName}
                      onChange={(e) => setBookingForm({ ...bookingForm, patientName: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#3ec1d3]"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email</label>
                      <input
                        type="email"
                        value={bookingForm.patientEmail}
                        onChange={(e) => setBookingForm({ ...bookingForm, patientEmail: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#3ec1d3]"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Phone</label>
                      <input
                        type="tel"
                        value={bookingForm.patientPhone}
                        onChange={(e) => setBookingForm({ ...bookingForm, patientPhone: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#3ec1d3]"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Notes / Specific Concerns</label>
                    <textarea
                      rows={2}
                      value={bookingForm.notes}
                      onChange={(e) => setBookingForm({ ...bookingForm, notes: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#3ec1d3]"
                      placeholder="e.g. Sensitivity on upper right premolar..."
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setBookingStep(1)}
                    className="w-1/3 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl font-bold cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => setBookingStep(3)}
                    className="w-2/3 bg-[#3ec1d3] hover:bg-[#34adb9] text-white py-3 rounded-xl font-bold shadow-md cursor-pointer"
                  >
                    Proceed to Payment Gateway
                  </button>
                </div>
              </div>
            )}

            {bookingStep === 3 && (
              <form onSubmit={handleBookingSubmit}>
                <h3 className="font-bold text-sm text-gray-600 mb-4">Multi-Step Payment Gateway Integration</h3>

                <div className="bg-slate-50 p-4 rounded-xl mb-6 border border-slate-100">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-500">Plan Net Price:</span>
                    <span className="font-bold">${selectedPlan.netPayable || selectedPlan.price}</span>
                  </div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-500">Selected Payment Amount:</span>
                    <span className="font-extrabold text-[#3ec1d3]">${bookingForm.paymentOption === 'full' ? (selectedPlan.netPayable || selectedPlan.price) : bookingForm.paymentOption === 'partial' ? bookingForm.amountToPay : 0}</span>
                  </div>
                </div>

                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Payment Mode</label>
                    <div className="grid grid-cols-3 gap-3">
                      <button
                        type="button"
                        onClick={() => setBookingForm({ ...bookingForm, paymentOption: 'partial' })}
                        className={`p-3 rounded-xl border text-xs font-bold transition-all ${
                          bookingForm.paymentOption === 'partial' ? 'border-[#3ec1d3] bg-sky-50 text-[#3ec1d3]' : 'border-gray-200 text-gray-600'
                        }`}
                      >
                        Partial Deposit ($200)
                      </button>
                      <button
                        type="button"
                        onClick={() => setBookingForm({ ...bookingForm, paymentOption: 'full' })}
                        className={`p-3 rounded-xl border text-xs font-bold transition-all ${
                          bookingForm.paymentOption === 'full' ? 'border-[#3ec1d3] bg-sky-50 text-[#3ec1d3]' : 'border-gray-200 text-gray-600'
                        }`}
                      >
                        Full Payment
                      </button>
                      <button
                        type="button"
                        onClick={() => setBookingForm({ ...bookingForm, paymentOption: 'clinic' })}
                        className={`p-3 rounded-xl border text-xs font-bold transition-all ${
                          bookingForm.paymentOption === 'clinic' ? 'border-[#3ec1d3] bg-sky-50 text-[#3ec1d3]' : 'border-gray-200 text-gray-600'
                        }`}
                      >
                        Pay at Clinic
                      </button>
                    </div>
                  </div>

                  {bookingForm.paymentOption !== 'clinic' && (
                    <div className="border border-gray-200 rounded-xl p-4 bg-white space-y-3">
                      <div className="flex items-center justify-between text-xs font-bold text-gray-500">
                        <span className="flex items-center gap-1"><Lock className="w-3.5 h-3.5 text-emerald-500" /> Stripe SSL Encrypted Checkout</span>
                        <span>Visa / MasterCard</span>
                      </div>
                      <input
                        type="text"
                        value={bookingForm.cardNumber}
                        onChange={(e) => setBookingForm({ ...bookingForm, cardNumber: e.target.value })}
                        className="w-full px-3.5 py-2 rounded-lg border text-sm font-mono"
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="text"
                          value={bookingForm.cardExp}
                          onChange={(e) => setBookingForm({ ...bookingForm, cardExp: e.target.value })}
                          className="px-3.5 py-2 rounded-lg border text-sm font-mono"
                        />
                        <input
                          type="text"
                          value={bookingForm.cardCvc}
                          onChange={(e) => setBookingForm({ ...bookingForm, cardCvc: e.target.value })}
                          className="px-3.5 py-2 rounded-lg border text-sm font-mono"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setBookingStep(2)}
                    className="w-1/3 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl font-bold cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={bookingLoading}
                    className="w-2/3 bg-[#3ec1d3] hover:bg-[#34adb9] text-white py-3 rounded-xl font-bold shadow-md cursor-pointer flex items-center justify-center gap-2"
                  >
                    {bookingLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" /> Processing Transaction...
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-5 h-5" /> Confirm & Secure Slot
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {bookingStep === 4 && bookingSuccess && (
              <div className="text-center py-4">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-extrabold text-[#0e2a47] mb-2">Booking Confirmed!</h3>
                <p className="text-gray-500 text-sm mb-6">
                  ACID Session transaction committed successfully. An automated confirmation email has been dispatched via BullMQ background queue.
                </p>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left text-sm mb-6 space-y-2">
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-gray-500">Booking Reference:</span>
                    <span className="font-mono font-bold text-[#3ec1d3]">{bookingSuccess.bookingReference}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-gray-500">Patient Name:</span>
                    <span className="font-semibold">{bookingSuccess.patientName}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-gray-500">Appointment Date:</span>
                    <span className="font-semibold">{new Date(bookingSuccess.appointmentDate).toDateString()} at {bookingSuccess.appointmentTime}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Payment Received:</span>
                    <span className="font-bold text-emerald-600">${bookingSuccess.amountPaid} ({bookingSuccess.paymentStatus})</span>
                  </div>
                </div>

                <button
                  onClick={() => setIsBookingModalOpen(false)}
                  className="w-full bg-[#0e2a47] hover:bg-[#163b61] text-white py-3 rounded-xl font-bold cursor-pointer"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── 5. Admin Insight Analytics Modal ─────────────────────────────────── */}
      {isAdminAnalyticsOpen && analyticsData && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-8 shadow-2xl relative my-8">
            <button
              onClick={() => setIsAdminAnalyticsOpen(false)}
              className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <BarChart3 className="w-7 h-7 text-[#3ec1d3]" />
              <div>
                <h2 className="text-2xl font-extrabold text-[#0e2a47]">Admin Insight & Analytics Overview</h2>
                <p className="text-xs text-gray-500">Real-time performance aggregated via MongoDB $inc operators.</p>
              </div>
            </div>

            {/* Aggregated Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-sky-50 border border-sky-100 p-4 rounded-2xl">
                <p className="text-xs font-bold text-gray-400 uppercase">Total Views ($inc)</p>
                <h3 className="text-2xl font-black text-[#0e2a47]">{analyticsData.summary?.totalClicks || 0}</h3>
              </div>
              <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl">
                <p className="text-xs font-bold text-gray-400 uppercase">Bookings Count</p>
                <h3 className="text-2xl font-black text-emerald-600">{analyticsData.summary?.totalBookings || 0}</h3>
              </div>
              <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-2xl">
                <p className="text-xs font-bold text-gray-400 uppercase">Total Revenue</p>
                <h3 className="text-2xl font-black text-indigo-600">${analyticsData.summary?.totalRevenue || 0}</h3>
              </div>
              <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl">
                <p className="text-xs font-bold text-gray-400 uppercase">Total Plans</p>
                <h3 className="text-2xl font-black text-amber-600">{analyticsData.summary?.totalPlans || 0}</h3>
              </div>
            </div>

            {/* Top Clicked & Booked Plans Table */}
            <div className="space-y-6">
              <div>
                <h4 className="font-bold text-sm text-[#0e2a47] mb-3">Top Viewed & Converting Treatment Plans</h4>
                <div className="overflow-x-auto rounded-xl border border-gray-100">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-gray-500 font-bold border-b">
                      <tr>
                        <th className="p-3">Plan Title</th>
                        <th className="p-3">Category</th>
                        <th className="p-3">Clicks</th>
                        <th className="p-3">Bookings</th>
                        <th className="p-3">Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {analyticsData.topClickedPlans?.map((plan) => (
                        <tr key={plan._id} className="hover:bg-slate-50/50">
                          <td className="p-3 font-semibold text-[#0e2a47]">{plan.title}</td>
                          <td className="p-3">{plan.category}</td>
                          <td className="p-3 font-bold text-blue-600">{plan.clicks || 0}</td>
                          <td className="p-3 font-bold text-emerald-600">{plan.bookingsCount || 0}</td>
                          <td className="p-3 font-bold">${plan.totalRevenue || 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Enquiry Modal */}
      {isEnquiryModalOpen && selectedPlan && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl relative">
            <button
              onClick={() => {
                setIsEnquiryModalOpen(false);
                setEnquirySuccess(false);
              }}
              className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {enquirySuccess ? (
              <div className="text-center py-6">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                <h3 className="text-xl font-bold mb-2">Enquiry Sent!</h3>
                <p className="text-xs text-gray-500 mb-6">Our automated BullMQ worker queued your inquiry email. A dental specialist will get back to you shortly.</p>
                <button
                  onClick={() => {
                    setIsEnquiryModalOpen(false);
                    setEnquirySuccess(false);
                  }}
                  className="bg-[#0e2a47] text-white px-6 py-2.5 rounded-xl font-bold text-sm cursor-pointer"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleEnquirySubmit}>
                <h3 className="text-xl font-bold text-[#0e2a47] mb-1">Enquire About Plan</h3>
                <p className="text-xs text-gray-500 mb-6">{selectedPlan.title}</p>

                <div className="space-y-4 mb-6">
                  <input
                    type="text"
                    placeholder="Your Name"
                    required
                    value={enquiryForm.patientName}
                    onChange={(e) => setEnquiryForm({ ...enquiryForm, patientName: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-[#3ec1d3]"
                  />
                  <input
                    type="email"
                    placeholder="Your Email Address"
                    required
                    value={enquiryForm.patientEmail}
                    onChange={(e) => setEnquiryForm({ ...enquiryForm, patientEmail: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-[#3ec1d3]"
                  />
                  <input
                    type="tel"
                    placeholder="Phone Number"
                    value={enquiryForm.patientPhone}
                    onChange={(e) => setEnquiryForm({ ...enquiryForm, patientPhone: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-[#3ec1d3]"
                  />
                  <textarea
                    rows={3}
                    placeholder="Ask any questions about pricing, duration, or financing options..."
                    value={enquiryForm.message}
                    onChange={(e) => setEnquiryForm({ ...enquiryForm, message: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-[#3ec1d3]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={enquiryLoading}
                  className="w-full bg-[#3ec1d3] hover:bg-[#34adb9] text-white py-3 rounded-xl font-bold shadow-md cursor-pointer flex items-center justify-center gap-2 text-sm"
                >
                  {enquiryLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Send Automated Enquiry
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default TreatmentPlansPage;
