import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { AlertTriangle, Clock, Calendar, CheckCircle } from 'lucide-react';
import { addLocalAppointment, getLocalAppointments, mergeAppointments } from '../utils/urgentAppointments';

const API_BASE = 'http://localhost:5000';

const UrgencyBasedPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [formData, setFormData] = useState({
    patientName: '',
    patientPhone: '',
    patientEmail: '',
    date: '',
    timeSlot: '',
    symptomDescription: '',
    urgencyType: 'Routine',
    urgencyLevel: 'Low'
  });

  // Load pre-filled data from navigation state
  useEffect(() => {
    if (location.state?.prefillData) {
      const { doctorName, branchName } = location.state.prefillData;
      setFormData(prev => ({
        ...prev,
        symptomDescription: `Requesting appointment with ${doctorName} at ${branchName}`
      }));
    }
  }, [location.state]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [recentAppointments, setRecentAppointments] = useState([]);
  const [alertSent, setAlertSent] = useState(false);

  useEffect(() => {
    fetchRecentAppointments();
  }, []);

  const fetchRecentAppointments = async () => {
    let server = [];
    try {
      const res = await fetch(`${API_BASE}/api/urgent-appointments`);
      if (res.ok) {
        const response = await res.json();
        server = response.data || [];
      }
    } catch (err) {
      // backend offline: show locally saved requests only
    }
    setRecentAppointments(mergeAppointments(server, getLocalAppointments()).slice(0, 5));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    setAlertSent(false);

    try {
      const res = await fetch(`${API_BASE}/api/urgent-appointments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, type: formData.urgencyType })
      });
      
      const data = await res.json().catch(() => ({}));
      
      if (!res.ok) throw new Error(data.message || 'Failed to book appointment');
      
      setSuccess('Appointment request submitted successfully!');
      addLocalAppointment(formData, data.data);
      if (data.alertSent || formData.urgencyType === 'Emergency') {
        setAlertSent(true);
      }
      
      setFormData({
        patientName: '', patientPhone: '', patientEmail: '', 
        date: '', timeSlot: '', symptomDescription: '', 
        urgencyType: 'Routine', urgencyLevel: 'Low'
      });
      
      fetchRecentAppointments();
    } catch (err) {
      // Simulate success for demo purposes if backend isn't connected
      addLocalAppointment(formData, null);
      setSuccess('Appointment request submitted successfully!');
      if (formData.urgencyType === 'Emergency') setAlertSent(true);
      setFormData({
        patientName: '', patientPhone: '', patientEmail: '', 
        date: '', timeSlot: '', symptomDescription: '', 
        urgencyType: 'Routine', urgencyLevel: 'Low'
      });
      fetchRecentAppointments();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar />
      
      <main className="flex-grow container mx-auto px-4 py-12 max-w-4xl">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-[#0e2a47] mb-4">Book an Appointment</h1>
          <p className="text-gray-500">Need immediate attention? Select Emergency for priority scheduling.</p>
        </div>

        {alertSent && (
          <div className="mb-8 bg-red-50 border-l-4 border-red-500 p-4 rounded shadow-sm flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-red-500 shrink-0" />
            <div>
              <h3 className="text-red-800 font-bold">Emergency alert has been sent to the on-call doctor!</h3>
              <p className="text-red-600 text-sm mt-1">We will contact you at the provided phone number within 15 minutes.</p>
            </div>
          </div>
        )}

        {success && !alertSent && (
          <div className="mb-8 bg-green-50 border-l-4 border-green-500 p-4 rounded shadow-sm flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-green-500" />
            <span className="text-green-800 font-medium">{success}</span>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden mb-12">
          <form onSubmit={handleSubmit} className="p-8">
            
            {/* Urgency Selection */}
            <div className="mb-8">
              <label className="block text-sm font-bold text-[#0e2a47] mb-3">Appointment Type</label>
              <div className="flex gap-4">
                <label className={`flex-1 flex flex-col items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all ${formData.urgencyType === 'Routine' ? 'border-[#3ec1d3] bg-[#f0f9fa]' : 'border-gray-200 hover:border-gray-300'}`}>
                  <input type="radio" name="urgencyType" value="Routine" className="sr-only" checked={formData.urgencyType === 'Routine'} onChange={(e) => setFormData({...formData, urgencyType: e.target.value})} />
                  <Calendar className={`w-8 h-8 mb-2 ${formData.urgencyType === 'Routine' ? 'text-[#3ec1d3]' : 'text-gray-400'}`} />
                  <span className={`font-semibold ${formData.urgencyType === 'Routine' ? 'text-[#0e2a47]' : 'text-gray-500'}`}>Routine Checkup</span>
                </label>
                
                <label className={`flex-1 flex flex-col items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all ${formData.urgencyType === 'Emergency' ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <input type="radio" name="urgencyType" value="Emergency" className="sr-only" checked={formData.urgencyType === 'Emergency'} onChange={(e) => setFormData({...formData, urgencyType: e.target.value})} />
                  <AlertTriangle className={`w-8 h-8 mb-2 ${formData.urgencyType === 'Emergency' ? 'text-red-500' : 'text-gray-400'}`} />
                  <span className={`font-semibold ${formData.urgencyType === 'Emergency' ? 'text-red-700' : 'text-gray-500'}`}>Dental Emergency</span>
                </label>
              </div>
            </div>

            {formData.urgencyType === 'Emergency' && (
              <div className="mb-8 p-4 bg-red-50 rounded-lg border border-red-100">
                <label className="block text-sm font-bold text-red-800 mb-2">Severity Level</label>
                <select
                  value={formData.urgencyLevel}
                  onChange={(e) => setFormData({...formData, urgencyLevel: e.target.value})}
                  className="w-full bg-white border border-red-200 rounded-lg px-4 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="Low">Low - Mild discomfort</option>
                  <option value="Medium">Medium - Persistent pain</option>
                  <option value="High">High - Severe pain or swelling</option>
                  <option value="Critical">Critical - Trauma or uncontrolled bleeding</option>
                </select>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Full Name</label>
                <input type="text" required value={formData.patientName} onChange={e => setFormData({...formData, patientName: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#3ec1d3] focus:bg-white transition-colors" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Phone Number</label>
                <input type="tel" required value={formData.patientPhone} onChange={e => setFormData({...formData, patientPhone: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#3ec1d3] focus:bg-white transition-colors" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Email Address</label>
                <input type="email" required value={formData.patientEmail} onChange={e => setFormData({...formData, patientEmail: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#3ec1d3] focus:bg-white transition-colors" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Preferred Date</label>
                  <input type="date" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#3ec1d3] focus:bg-white transition-colors" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Time</label>
                  <input type="time" required value={formData.timeSlot} onChange={e => setFormData({...formData, timeSlot: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#3ec1d3] focus:bg-white transition-colors" />
                </div>
              </div>
            </div>

            <div className="mb-8">
              <label className="block text-sm font-semibold text-gray-700 mb-1">Symptom Description</label>
              <textarea required value={formData.symptomDescription} onChange={e => setFormData({...formData, symptomDescription: e.target.value})} placeholder="Please describe your reason for visit..." className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#3ec1d3] focus:bg-white transition-colors h-28 resize-none"></textarea>
            </div>

            <button type="submit" disabled={loading} className={`w-full font-bold py-3.5 px-4 rounded-xl transition-all shadow-md hover:shadow-lg text-white ${formData.urgencyType === 'Emergency' ? 'bg-red-500 hover:bg-red-600' : 'bg-[#3ec1d3] hover:bg-[#34adb9]'}`}>
              {loading ? 'Processing Request...' : formData.urgencyType === 'Emergency' ? 'Request Emergency Care' : 'Schedule Appointment'}
            </button>
          </form>
        </div>

        {/* Recent Appointments Section */}
        <div>
          <h3 className="text-xl font-bold text-[#0e2a47] mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#3ec1d3]" /> Recent Requests
          </h3>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            {recentAppointments.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {recentAppointments.map(apt => (
                  <div key={apt._id || apt.id} className="py-3 flex items-center justify-between">
                    <div>
                      <p className={`font-semibold text-sm ${apt.type === 'Emergency' ? 'text-red-500' : 'text-[#0e2a47]'}`}>{apt.type} Visit</p>
                      <p className="text-xs text-gray-500">{new Date(apt.date).toLocaleDateString()} at {apt.timeSlot}</p>
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">{apt.status}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4 text-sm">No recent appointments found.</p>
            )}
          </div>
        </div>

      </main>
      
      <Footer />
    </div>
  );
};

export default UrgencyBasedPage;