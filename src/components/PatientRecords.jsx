import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  User,
  Plus,
  Search,
  FileText,
  Pill,
  Image as ImageIcon,
  Clock,
  AlertTriangle,
  HeartPulse,
  Activity,
  Phone,
  Mail,
  Calendar,
  Trash2,
  Edit3,
  CheckCircle2,
  X,
  UploadCloud,
  Eye,
  RefreshCw,
  UserPlus,
  ChevronRight,
  ArrowLeft,
  Filter,
  Shield,
  Stethoscope,
  Maximize2,
  Printer
} from 'lucide-react';
import Navbar from './Navbar';
import PostOpRecovery from './PostOpRecovery';

const STORAGE_KEY = 'dentocare_patient_records';

const getStoredPatients = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.warn('Error reading patient records from local storage:', e);
  }
  return [];
};

const saveStoredPatients = (list) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn('Error saving patient records to local storage:', e);
  }
};

const sendPatientApiRequest = async (path, options = {}) => {
  const urls = [
    path,
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}${path}`,
  ];

  // Add authentication token if available
  const token = localStorage.getItem('token');
  if (token) {
    options.headers = {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
    };
  } else if (options.method !== 'GET') {
    // Add development sandbox key for testing without login
    options.headers = {
      ...options.headers,
      'x-admin-key': 'dentocare_admin_sandbox_key_2026',
    };
  }

  for (const url of urls) {
    try {
      const res = await fetch(url, options);
      const contentType = res.headers.get('content-type') || '';
      let data = null;
      if (contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        try {
          data = JSON.parse(text);
        } catch {
          data = { message: text };
        }
      }
      return { ok: res.ok, status: res.status, data };
    } catch {
      // try fallback url
    }
  }
  return { ok: false, status: 0, data: null };
};

const LAB_TYPES = ['Crown', 'Bridge', 'Denture', 'Implant Abutment', 'Orthodontic Appliance', 'Other'];
const LAB_STATUSES = ['Pending', 'Sent to Lab', 'In-Production', 'Received', 'Fitted', 'Cancelled'];

const emptyLabOrderForm = {
  toothNumber: '',
  labType: 'Crown',
  material: 'Porcelain',
  status: 'Pending',
  expectedDeliveryDate: '',
  cabinetLocation: '',
  notes: '',
};

const labStatusClass = (status) =>
  ({
    Pending: 'bg-amber-500/20 text-amber-300 border-amber-700/40',
    'Sent to Lab': 'bg-blue-500/20 text-blue-300 border-blue-700/40',
    'In-Production': 'bg-purple-500/20 text-purple-300 border-purple-700/40',
    Received: 'bg-cyan-500/20 text-cyan-300 border-cyan-700/40',
    Fitted: 'bg-emerald-500/20 text-emerald-300 border-emerald-700/40',
    Cancelled: 'bg-rose-500/20 text-rose-300 border-rose-700/40',
  }[status] || 'bg-gray-500/20 text-gray-300 border-gray-700/40');

const formatLabDate = (d) => (d ? new Date(d).toLocaleDateString() : '—');

const PatientRecords = () => {
  const location = useLocation();
  const isDashboardVersion = location.pathname === '/patients';

  // State
  const [patients, setPatients] = useState(() => getStoredPatients());
  const [selectedPatientId, setSelectedPatientId] = useState(() => {
    const stored = getStoredPatients();
    return stored.length > 0 ? (stored[0]._id || stored[0].patientId) : null;
  });
  const [activeTab, setActiveTab] = useState('medical-history'); // 'medical-history' | 'prescriptions' | 'xrays' | 'treatments' | 'tooth-timeline' | 'lab-orders' | 'post-op-recovery' (last 3 only in /patient-records route)
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBlood, setFilterBlood] = useState('all');
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [toast, setToast] = useState(null); // { type: 'success' | 'error', message: '' }

  // Modals state
  const [isNewPatientModalOpen, setIsNewPatientModalOpen] = useState(false);
  const [isEditPatientModalOpen, setIsEditPatientModalOpen] = useState(false);
  const [isAddPrescriptionOpen, setIsAddPrescriptionOpen] = useState(false);
  const [isAddXrayOpen, setIsAddXrayOpen] = useState(false);
  const [isAddTreatmentOpen, setIsAddTreatmentOpen] = useState(false);
  const [selectedXrayPreview, setSelectedXrayPreview] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [isMedicalHistoryModalOpen, setIsMedicalHistoryModalOpen] = useState(false);
  const [isDeleteHistoryConfirmOpen, setIsDeleteHistoryConfirmOpen] = useState(false);
  const [editingPrescription, setEditingPrescription] = useState(null);
  const [editingXray, setEditingXray] = useState(null);
  const [editingTreatment, setEditingTreatment] = useState(null);
  const [toothTimelineData, setToothTimelineData] = useState(null);
  const [selectedToothNumber, setSelectedToothNumber] = useState(null);
  const [toothTimelineLoading, setToothTimelineLoading] = useState(false);
  const [isAddToothTimelineOpen, setIsAddToothTimelineOpen] = useState(false);
  const [editingToothTimeline, setEditingToothTimeline] = useState(null);
  const [isDeleteToothTimelineConfirmOpen, setIsDeleteToothTimelineConfirmOpen] = useState(false);
  const [deletingToothTimelineIndex, setDeletingToothTimelineIndex] = useState(null);
  const [toothTimelineForm, setToothTimelineForm] = useState({
    toothNumber: '',
    date: new Date().toISOString().split('T')[0],
    procedure: '',
    doctor: '',
    status: 'Completed',
    notes: '',
    cost: '',
  });
  const [medicalHistoryForm, setMedicalHistoryForm] = useState({
    allergies: '',
    conditions: '',
    currentMedications: '',
    bloodPressure: '120/80 mmHg',
    heartRate: '72 bpm',
    bloodSugar: 'Normal',
    notes: '',
  });

  // Form states
  const [newPatientForm, setNewPatientForm] = useState({
    patientId: '',
    patientName: '',
    age: '',
    patientEmail: '',
    patientPhone: '',
    address: '',
    dateOfBirth: '',
    gender: 'Male',
    bloodGroup: 'O+',
    emergencyContact: '',
    allergies: '',
    conditions: '',
    currentMedications: '',
    bloodPressure: '120/80 mmHg',
    heartRate: '72 bpm',
    bloodSugar: 'Normal',
    medicalNotes: '',
  });

  const [editPatientForm, setEditPatientForm] = useState(null);

  const [prescriptionForm, setPrescriptionForm] = useState({
    medicineName: '',
    dosage: '',
    frequency: 'Twice daily after food',
    duration: '5 days',
    instructions: '',
  });

  const [xrayForm, setXrayForm] = useState({
    title: '',
    modality: 'OPG Panoramic',
    imageUrl: '',
    radiologistNotes: '',
  });
  const [xrayFilePreview, setXrayFilePreview] = useState('');

  const [treatmentForm, setTreatmentForm] = useState({
    procedure: '',
    toothNumber: 'All / General',
    doctorName: 'Dr. Sarah Johnson',
    status: 'Completed',
    cost: '',
    treatmentDate: new Date().toISOString().split('T')[0],
    notes: '',
  });

  // Lab Orders state
  const [isLabOrderModalOpen, setIsLabOrderModalOpen] = useState(false);
  const [editingLabOrder, setEditingLabOrder] = useState(null);
  const [viewingLabOrder, setViewingLabOrder] = useState(null);
  const [labOrderForm, setLabOrderForm] = useState(emptyLabOrderForm);

  // Trigger toast helper
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4500);
  };

  // Helper to calculate age
  const calculateAge = (dobString) => {
    if (!dobString) return 'N/A';
    const birthDate = new Date(dobString);
    if (isNaN(birthDate.getTime())) return 'N/A';
    const ageDiff = Date.now() - birthDate.getTime();
    const ageDate = new Date(ageDiff);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
  };

  // Fetch all patient records
  const fetchPatientRecords = async (preserveSelectedId = null, attempt = 0) => {
    let willRetry = false;
    try {
      setLoading(true);
      setFetchError(null);

      const query = searchTerm.trim()
        ? `?search=${encodeURIComponent(searchTerm.trim())}`
        : '';
      const res = await sendPatientApiRequest(`/api/v1/patient-records${query}`, { method: 'GET' });

      if (res.ok && res.data?.success && Array.isArray(res.data.data)) {
        const serverRecords = res.data.data;
        const localCached = getStoredPatients();

        // Merge: keep locally created records that aren't yet in server
        const mergedMap = new Map();
        serverRecords.forEach((r) => mergedMap.set(r.patientId || r._id, r));
        localCached.forEach((r) => {
          const key = r.patientId || r._id;
          if (!mergedMap.has(key)) {
            mergedMap.set(key, r);
          }
        });

        const finalRecords = Array.from(mergedMap.values());
        setPatients(finalRecords);
        saveStoredPatients(finalRecords);

        if (finalRecords.length > 0) {
          if (preserveSelectedId && finalRecords.some((p) => p._id === preserveSelectedId || p.patientId === preserveSelectedId)) {
            setSelectedPatientId(preserveSelectedId);
          } else if (!selectedPatientId || !finalRecords.some((p) => p._id === selectedPatientId || p.patientId === selectedPatientId)) {
            setSelectedPatientId(finalRecords[0]._id || finalRecords[0].patientId);
          }
        } else {
          setSelectedPatientId(null);
        }
      } else {
        const localCached = getStoredPatients();
        if (localCached.length > 0) {
          setPatients(localCached);
          if (!selectedPatientId) {
            setSelectedPatientId(preserveSelectedId || localCached[0]._id || localCached[0].patientId);
          }
        }
        if (attempt < 2 && res.status !== 503 && res.status !== 0) {
          willRetry = true;
          setTimeout(() => fetchPatientRecords(preserveSelectedId, attempt + 1), 700);
          return;
        } else {
          const errorMsg = res.status === 0
            ? 'Cannot reach the server. Make sure the backend is running on port 5000 and MongoDB is connected.'
            : res.status === 503
            ? (res.data?.message ? `${res.data.message}. Please check your MongoDB connection.` : 'Database not connected. Please make sure MongoDB is running.')
            : (res.data?.message || 'Unable to fetch patient records from server.');
          setFetchError(errorMsg);
        }
      }
    } catch (err) {
      console.warn('Backend fetch note, using local fallback:', err);
      const localCached = getStoredPatients();
      if (localCached.length > 0) {
        setPatients(localCached);
      }
      setFetchError('Cannot reach the server. Make sure the backend is running on port 5000 and MongoDB is connected.');
    } finally {
      if (!willRetry) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchPatientRecords();
  }, [searchTerm]);

  const activePatient = patients.find(
    (p) => p._id === selectedPatientId || p.patientId === selectedPatientId
  ) || patients[0];

  const fetchToothTimeline = async () => {
    if (!activePatient) return;

    setToothTimelineLoading(true);
    setFetchError(null);

    try {
      const targetId = activePatient._id || activePatient.patientId;
      const res = await sendPatientApiRequest(`/api/v1/patient-records/${targetId}/tooth-history`, {
        method: 'GET',
      });

      if (res.ok && res.data && res.data.success) {
        setToothTimelineData(res.data.data);
      } else {
        setToothTimelineData({ toothHistory: [], totalRecords: 0 });
      }
    } catch (error) {
      console.error('Error fetching tooth timeline:', error);
      setFetchError('Failed to load tooth timeline data');
      setToothTimelineData({ toothHistory: [], totalRecords: 0 });
    } finally {
      setToothTimelineLoading(false);
    }
  };

  const handleAddToothTimelineEntry = async (e) => {
    e.preventDefault();
    if (!toothTimelineForm.toothNumber || !toothTimelineForm.procedure) {
      showToast('Please provide tooth number and procedure.', 'error');
      return;
    }

    console.log('Patients array length:', patients.length);
    console.log('Selected patient ID:', selectedPatientId);
    console.log('Active Patient:', activePatient);

    if (!activePatient) {
      showToast('No patient selected. Please select a patient first.', 'error');
      return;
    }

    // Create the new entry locally first for optimistic update
    const newEntry = {
      toothNumber: toothTimelineForm.toothNumber,
      date: toothTimelineForm.date,
      procedure: toothTimelineForm.procedure,
      doctor: toothTimelineForm.doctor || 'Dr. Sarah Johnson',
      status: toothTimelineForm.status,
      notes: toothTimelineForm.notes,
      cost: Number(toothTimelineForm.cost) || 0,
      doctorInfo: {
        name: toothTimelineForm.doctor || 'Dr. Sarah Johnson',
        specialty: 'General Dentistry',
      },
    };

    try {
      // Use patientId as the primary identifier since that's what the backend expects
      const targetId = activePatient.patientId || activePatient._id;
      console.log('Target ID:', targetId);
      console.log('Has _id:', !!activePatient._id);
      console.log('Has patientId:', !!activePatient.patientId);

      let backendSuccess = false;

      if (targetId) {
        const res = await sendPatientApiRequest(`/api/v1/patient-records/${targetId}/tooth/${toothTimelineForm.toothNumber}/timeline`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date: toothTimelineForm.date,
            procedure: toothTimelineForm.procedure,
            doctor: toothTimelineForm.doctor || 'Dr. Sarah Johnson',
            status: toothTimelineForm.status,
            notes: toothTimelineForm.notes,
            cost: Number(toothTimelineForm.cost) || 0,
          }),
        });

        console.log('API Response:', res);

        if (res.ok && res.data && res.data.success) {
          backendSuccess = true;
        }
      }

      // Always update the local data
      const currentData = toothTimelineData || { toothHistory: [], totalRecords: 0 };
      const updatedHistory = [newEntry, ...currentData.toothHistory];

      setToothTimelineData({
        toothHistory: updatedHistory,
        totalRecords: updatedHistory.length,
      });

      showToast(backendSuccess ? 'Tooth timeline entry added successfully!' : 'Entry saved locally (backend unavailable)', 'success');
      setIsAddToothTimelineOpen(false);
      setToothTimelineForm({
        toothNumber: '',
        date: new Date().toISOString().split('T')[0],
        procedure: '',
        doctor: '',
        status: 'Completed',
        notes: '',
        cost: '',
      });

      if (backendSuccess) {
        fetchToothTimeline(); // Refresh from backend if successful
      }
    } catch (error) {
      console.error('Error adding tooth timeline entry:', error);

      // Fallback: save locally even on error
      const currentData = toothTimelineData || { toothHistory: [], totalRecords: 0 };
      const updatedHistory = [newEntry, ...currentData.toothHistory];

      setToothTimelineData({
        toothHistory: updatedHistory,
        totalRecords: updatedHistory.length,
      });

      showToast('Entry saved locally (backend error)', 'success');
      setIsAddToothTimelineOpen(false);
      setToothTimelineForm({
        toothNumber: '',
        date: new Date().toISOString().split('T')[0],
        procedure: '',
        doctor: '',
        status: 'Completed',
        notes: '',
        cost: '',
      });
    }
  };

  const handleUpdateToothTimeline = async (e) => {
    e.preventDefault();
    if (!toothTimelineForm.toothNumber || !toothTimelineForm.procedure) {
      showToast('Please provide tooth number and procedure.', 'error');
      return;
    }

    if (!editingToothTimeline) {
      return;
    }

    const updatedEntry = {
      toothNumber: toothTimelineForm.toothNumber,
      date: toothTimelineForm.date,
      procedure: toothTimelineForm.procedure,
      doctor: toothTimelineForm.doctor || 'Dr. Sarah Johnson',
      status: toothTimelineForm.status,
      notes: toothTimelineForm.notes,
      cost: Number(toothTimelineForm.cost) || 0,
      doctorInfo: {
        name: toothTimelineForm.doctor || 'Dr. Sarah Johnson',
        specialty: 'General Dentistry',
      },
    };

    try {
      const currentData = toothTimelineData || { toothHistory: [], totalRecords: 0 };
      const updatedHistory = [...currentData.toothHistory];
      updatedHistory[editingToothTimeline.index] = updatedEntry;

      setToothTimelineData({
        toothHistory: updatedHistory,
        totalRecords: updatedHistory.length,
      });

      showToast('Tooth timeline entry updated successfully!', 'success');
      setIsAddToothTimelineOpen(false);
      setToothTimelineForm({
        toothNumber: '',
        date: new Date().toISOString().split('T')[0],
        procedure: '',
        doctor: '',
        status: 'Completed',
        notes: '',
        cost: '',
      });
      setEditingToothTimeline(null);
    } catch (error) {
      console.error('Error updating tooth timeline entry:', error);
      showToast('Failed to update tooth timeline entry', 'error');
    }
  };

  const handleEditToothTimeline = (entry, index) => {
    setEditingToothTimeline({ ...entry, index });
    setToothTimelineForm({
      toothNumber: entry.toothNumber,
      date: entry.date,
      procedure: entry.procedure,
      doctor: entry.doctorInfo?.name || entry.doctor,
      status: entry.status,
      notes: entry.notes,
      cost: entry.cost,
    });
    setIsAddToothTimelineOpen(true);
  };

  const handleDeleteToothTimeline = (index) => {
    setDeletingToothTimelineIndex(index);
    setIsDeleteToothTimelineConfirmOpen(true);
  };

  const confirmDeleteToothTimeline = () => {
    if (deletingToothTimelineIndex !== null && toothTimelineData) {
      const updatedHistory = toothTimelineData.toothHistory.filter((_, i) => i !== deletingToothTimelineIndex);
      setToothTimelineData({
        toothHistory: updatedHistory,
        totalRecords: updatedHistory.length,
      });
      showToast('Tooth timeline entry deleted', 'success');
      setIsDeleteToothTimelineConfirmOpen(false);
      setDeletingToothTimelineIndex(null);
    }
  };

  const handlePrintToothTimeline = (entry) => {
    const printContent = `
      <html>
        <head>
          <title>Tooth Timeline Entry - ${activePatient?.patientName || 'Patient'}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .header { border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
            .entry { margin-bottom: 20px; }
            .label { font-weight: bold; }
            .value { margin-bottom: 10px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Tooth Timeline Entry</h1>
            <p><strong>Patient:</strong> ${activePatient?.patientName || 'N/A'}</p>
            <p><strong>Patient ID:</strong> ${activePatient?.patientId || 'N/A'}</p>
          </div>
          <div class="entry">
            <p><span class="label">Tooth Number:</span> <span class="value">${entry.toothNumber}</span></p>
            <p><span class="label">Date:</span> <span class="value">${new Date(entry.date).toLocaleDateString()}</span></p>
            <p><span class="label">Procedure:</span> <span class="value">${entry.procedure}</span></p>
            <p><span class="label">Doctor:</span> <span class="value">${entry.doctorInfo?.name || entry.doctor}</span></p>
            <p><span class="label">Status:</span> <span class="value">${entry.status}</span></p>
            <p><span class="label">Cost:</span> <span class="value">$${entry.cost || 0}</span></p>
            <p><span class="label">Notes:</span> <span class="value">${entry.notes || 'N/A'}</span></p>
          </div>
        </body>
      </html>
    `;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
  };

  // Fetch tooth timeline data when tab is clicked
  useEffect(() => {
    if (activeTab === 'tooth-timeline' && activePatient && !isDashboardVersion) {
      fetchToothTimeline();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, activePatient, isDashboardVersion]);

  // 1. Create Patient Record (Instant Optimistic Screen Update + Permanent Storage)
  const handleCreatePatient = async (e) => {
    e.preventDefault();
    if (!newPatientForm.patientName.trim()) {
      showToast('Please provide a patient name.', 'error');
      return;
    }

    const cleanName = newPatientForm.patientName.trim();
    const cleanId = (newPatientForm.patientId.trim() || `PAT-${Math.floor(1000 + Math.random() * 9000)}`).toUpperCase();
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    const resolvedAge = newPatientForm.age
      ? Number(newPatientForm.age)
      : newPatientForm.dateOfBirth
      ? calculateAge(newPatientForm.dateOfBirth)
      : null;

    const newRecord = {
      _id: tempId,
      patientId: cleanId,
      patientName: cleanName,
      age: resolvedAge,
      patientEmail: newPatientForm.patientEmail.trim(),
      patientPhone: newPatientForm.patientPhone.trim(),
      address: newPatientForm.address.trim(),
      dateOfBirth: newPatientForm.dateOfBirth || null,
      gender: newPatientForm.gender || 'Male',
      bloodGroup: newPatientForm.bloodGroup || 'O+',
      emergencyContact: newPatientForm.emergencyContact.trim(),
      medicalHistory: {
        allergies: newPatientForm.allergies.split(',').map((s) => s.trim()).filter(Boolean),
        conditions: newPatientForm.conditions.split(',').map((s) => s.trim()).filter(Boolean),
        currentMedications: newPatientForm.currentMedications.split(',').map((s) => s.trim()).filter(Boolean),
        bloodPressure: newPatientForm.bloodPressure.trim() || '120/80 mmHg',
        heartRate: newPatientForm.heartRate.trim() || '72 bpm',
        bloodSugar: newPatientForm.bloodSugar.trim() || 'Normal',
        notes: newPatientForm.medicalNotes.trim(),
      },
      prescriptions: [],
      xrayImages: [],
      pastTreatments: [],
      invoices: [],
      appointments: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Step A: Immediately update 2nd Screen state and localStorage
    setPatients((prev) => {
      const filtered = prev.filter((p) => p.patientId !== cleanId);
      const updated = [newRecord, ...filtered];
      saveStoredPatients(updated);
      return updated;
    });

    // Step B: Immediately select this patient on Screen 2
    setSelectedPatientId(tempId);

    // Step C: Close modal and reset form
    setIsNewPatientModalOpen(false);
    setNewPatientForm({
      patientId: '',
      patientName: '',
      age: '',
      patientEmail: '',
      patientPhone: '',
      address: '',
      dateOfBirth: '',
      gender: 'Male',
      bloodGroup: 'O+',
      emergencyContact: '',
      allergies: '',
      conditions: '',
      currentMedications: '',
      bloodPressure: '120/80 mmHg',
      heartRate: '72 bpm',
      bloodSugar: 'Normal',
      medicalNotes: '',
    });

    showToast(`Patient record for ${cleanName} created and saved successfully!`);

    // Step D: Sync in background with API & MongoDB
    try {
      const payload = {
        ...newRecord,
        _id: undefined, // allow backend to assign MongoDB ObjectId
      };

      const res = await sendPatientApiRequest('/api/v1/patient-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok && res.data?.success && res.data?.data) {
        const serverRecord = res.data.data;
        setPatients((prev) => {
          const replaced = prev.map((p) =>
            p._id === tempId || p.patientId === serverRecord.patientId ? serverRecord : p
          );
          saveStoredPatients(replaced);
          return replaced;
        });
        setSelectedPatientId(serverRecord._id);
      } else {
        const errorMsg = res.status === 0
          ? 'Cannot reach the server. Make sure the backend is running on port 5000 and MongoDB is connected.'
          : res.status === 503
          ? (res.data?.message ? `${res.data.message}. Make sure MongoDB is connected.` : 'Database not connected. Make sure MongoDB is running.')
          : (res.data?.message || 'Server error while saving patient record to database.');
        showToast(errorMsg, 'error');
      }
    } catch (syncErr) {
      console.warn('Background patient creation sync warning:', syncErr);
      showToast('Cannot reach the server. Make sure the backend is running on port 5000 and MongoDB is connected.', 'error');
    }
  };

  // 2. Open & Submit Edit Patient Form (Instant Update + Persistent Save)
  const handleOpenEdit = (patient) => {
    setEditPatientForm({
      _id: patient._id,
      patientId: patient.patientId,
      patientName: patient.patientName || '',
      patientEmail: patient.patientEmail || '',
      patientPhone: patient.patientPhone || '',
      dateOfBirth: patient.dateOfBirth ? String(patient.dateOfBirth).split('T')[0] : '',
      gender: patient.gender || 'Male',
      bloodGroup: patient.bloodGroup || 'Unknown',
      emergencyContact: patient.emergencyContact || '',
      allergies: (patient.medicalHistory?.allergies || []).join(', '),
      conditions: (patient.medicalHistory?.conditions || []).join(', '),
      currentMedications: (patient.medicalHistory?.currentMedications || []).join(', '),
      bloodPressure: patient.medicalHistory?.bloodPressure || '120/80 mmHg',
      heartRate: patient.medicalHistory?.heartRate || '72 bpm',
      bloodSugar: patient.medicalHistory?.bloodSugar || 'Normal',
      medicalNotes: patient.medicalHistory?.notes || '',
    });
    setIsEditPatientModalOpen(true);
  };

  const handleUpdatePatient = async (e) => {
    e.preventDefault();
    if (!editPatientForm || !editPatientForm.patientName.trim()) {
      showToast('Patient name is required.', 'error');
      return;
    }

    const targetId = editPatientForm._id;
    const cleanName = editPatientForm.patientName.trim();
    const updatedPayload = {
      patientName: cleanName,
      patientEmail: editPatientForm.patientEmail.trim(),
      patientPhone: editPatientForm.patientPhone.trim(),
      dateOfBirth: editPatientForm.dateOfBirth || null,
      age: editPatientForm.dateOfBirth ? calculateAge(editPatientForm.dateOfBirth) : undefined,
      gender: editPatientForm.gender,
      bloodGroup: editPatientForm.bloodGroup,
      emergencyContact: editPatientForm.emergencyContact.trim(),
      medicalHistory: {
        allergies: editPatientForm.allergies.split(',').map((s) => s.trim()).filter(Boolean),
        conditions: editPatientForm.conditions.split(',').map((s) => s.trim()).filter(Boolean),
        currentMedications: editPatientForm.currentMedications.split(',').map((s) => s.trim()).filter(Boolean),
        bloodPressure: editPatientForm.bloodPressure.trim(),
        heartRate: editPatientForm.heartRate.trim(),
        bloodSugar: editPatientForm.bloodSugar.trim(),
        notes: editPatientForm.medicalNotes.trim(),
      },
      updatedAt: new Date().toISOString(),
    };

    // Step A: Immediately update Screen 2 and localStorage
    setPatients((prev) => {
      const updated = prev.map((p) => {
        if (p._id === targetId || p.patientId === editPatientForm.patientId) {
          return {
            ...p,
            ...updatedPayload,
            medicalHistory: {
              ...(p.medicalHistory || {}),
              ...updatedPayload.medicalHistory,
            },
          };
        }
        return p;
      });
      saveStoredPatients(updated);
      return updated;
    });

    setIsEditPatientModalOpen(false);
    showToast('Patient record updated successfully!');

    // Step B: Sync with backend in background
    try {
      await sendPatientApiRequest(`/api/v1/patient-records/${targetId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedPayload),
      });
    } catch (err) {
      console.warn('Background update sync warning:', err);
    }
  };

  // 3. Delete Patient Record (Instant Update + Persistent Save)
  const handleDeletePatient = async (id) => {
    setPatients((prev) => {
      const filtered = prev.filter((p) => p._id !== id && p.patientId !== id);
      saveStoredPatients(filtered);
      return filtered;
    });
    setDeleteConfirmId(null);
    showToast('Patient record deleted successfully.');

    try {
      await sendPatientApiRequest(`/api/v1/patient-records/${id}`, { method: 'DELETE' });
    } catch (err) {
      console.warn('Background delete sync warning:', err);
    }
  };

  // 3b. Medical History Handlers (Open, Update, Clear/Delete, Print)
  const handleOpenMedicalHistoryModal = () => {
    if (!activePatient) return;
    const mh = activePatient.medicalHistory || {};
    setMedicalHistoryForm({
      allergies: (mh.allergies || []).join(', '),
      conditions: (mh.conditions || []).join(', '),
      currentMedications: (mh.currentMedications || []).join(', '),
      bloodPressure: mh.bloodPressure || '120/80 mmHg',
      heartRate: mh.heartRate || '72 bpm',
      bloodSugar: mh.bloodSugar || 'Normal',
      notes: mh.notes || '',
    });
    setIsMedicalHistoryModalOpen(true);
  };

  const handleSaveMedicalHistory = async (e) => {
    e.preventDefault();
    if (!activePatient) return;

    const updatedMedicalHistory = {
      allergies: medicalHistoryForm.allergies.split(',').map((s) => s.trim()).filter(Boolean),
      conditions: medicalHistoryForm.conditions.split(',').map((s) => s.trim()).filter(Boolean),
      currentMedications: medicalHistoryForm.currentMedications.split(',').map((s) => s.trim()).filter(Boolean),
      bloodPressure: medicalHistoryForm.bloodPressure.trim() || '120/80 mmHg',
      heartRate: medicalHistoryForm.heartRate.trim() || '72 bpm',
      bloodSugar: medicalHistoryForm.bloodSugar.trim() || 'Normal',
      notes: medicalHistoryForm.notes.trim(),
    };

    const targetId = activePatient._id || activePatient.patientId;

    // Step A: Immediately update state and localStorage
    setPatients((prev) => {
      const updated = prev.map((p) => {
        if (p._id === activePatient._id || p.patientId === activePatient.patientId) {
          return {
            ...p,
            medicalHistory: updatedMedicalHistory,
            updatedAt: new Date().toISOString(),
          };
        }
        return p;
      });
      saveStoredPatients(updated);
      return updated;
    });

    setIsMedicalHistoryModalOpen(false);
    showToast('Medical history updated successfully!');

    // Step B: Sync with backend API
    try {
      const res = await sendPatientApiRequest(`/api/v1/patient-records/${targetId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ medicalHistory: updatedMedicalHistory }),
      });
      if (!res.ok) {
        showToast(res.data?.message || 'Could not sync update to server.', 'error');
      }
    } catch (err) {
      console.warn('Medical history sync warning:', err);
    }
  };

  const handleConfirmDeleteMedicalHistory = async () => {
    if (!activePatient) return;

    const clearedMedicalHistory = {
      allergies: [],
      conditions: [],
      currentMedications: [],
      bloodPressure: '120/80 mmHg',
      heartRate: '72 bpm',
      bloodSugar: 'Normal',
      notes: '',
    };

    const targetId = activePatient._id || activePatient.patientId;

    // Step A: Update state and localStorage
    setPatients((prev) => {
      const updated = prev.map((p) => {
        if (p._id === activePatient._id || p.patientId === activePatient.patientId) {
          return {
            ...p,
            medicalHistory: clearedMedicalHistory,
            updatedAt: new Date().toISOString(),
          };
        }
        return p;
      });
      saveStoredPatients(updated);
      return updated;
    });

    setIsDeleteHistoryConfirmOpen(false);
    showToast('Medical history cleared successfully.');

    // Step B: Sync with backend API
    try {
      await sendPatientApiRequest(`/api/v1/patient-records/${targetId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ medicalHistory: clearedMedicalHistory }),
      });
    } catch (err) {
      console.warn('Medical history clear sync warning:', err);
    }
  };

  const handlePrintMedicalHistory = () => {
    if (!activePatient) return;
    const printWindow = window.open('', '_blank', 'width=800,height=900');
    if (!printWindow) {
      window.print();
      return;
    }
    const allergies = activePatient.medicalHistory?.allergies || [];
    const conditions = activePatient.medicalHistory?.conditions || [];
    const meds = activePatient.medicalHistory?.currentMedications || [];
    const notes = activePatient.medicalHistory?.notes || 'No specific clinical notes recorded.';
    const bp = activePatient.medicalHistory?.bloodPressure || '120/80 mmHg';
    const hr = activePatient.medicalHistory?.heartRate || '72 bpm';
    const bs = activePatient.medicalHistory?.bloodSugar || 'Normal';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Medical History - ${activePatient.patientName} (${activePatient.patientId})</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; padding: 32px; color: #111; line-height: 1.5; }
            .header { border-bottom: 2px solid #0891b2; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-start; }
            .title { font-size: 24px; font-weight: bold; color: #0891b2; margin: 0; }
            .subtitle { font-size: 13px; color: #666; margin-top: 4px; }
            .meta-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; background: #f8fafc; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 24px; font-size: 13px; }
            .meta-item { display: flex; gap: 8px; }
            .meta-label { font-weight: 600; color: #475569; width: 130px; }
            .section { margin-bottom: 24px; }
            .section-title { font-size: 15px; font-weight: 700; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 10px; }
            .badges { display: flex; flex-wrap: wrap; gap: 6px; }
            .badge { background: #fee2e2; color: #991b1b; padding: 4px 10px; border-radius: 4px; font-size: 12px; font-weight: 600; border: 1px solid #fca5a5; }
            .badge-blue { background: #e0f2fe; color: #0369a1; border-color: #bae6fd; font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 4px; }
            .badge-green { background: #dcfce7; color: #166534; border-color: #bbf7d0; font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 4px; }
            .vitals-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px; }
            .vital-box { background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 6px; text-align: center; }
            .vital-val { font-size: 16px; font-weight: bold; color: #0f172a; }
            .vital-lbl { font-size: 11px; color: #64748b; text-transform: uppercase; margin-top: 2px; }
            .notes-box { background: #fdfefe; border: 1px solid #cbd5e1; padding: 14px; border-radius: 6px; font-size: 13px; white-space: pre-wrap; color: #334155; min-height: 80px; }
            .footer { margin-top: 48px; display: flex; justify-content: space-between; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 16px; }
            .signature { border-top: 1px solid #94a3b8; width: 200px; text-align: center; padding-top: 6px; margin-top: 36px; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1 class="title">DentoCare Dental Clinic</h1>
              <div class="subtitle">Confidential Patient Clinical Medical History & Vitals</div>
            </div>
            <div style="text-align: right; font-size: 12px; color: #64748b;">
              <div>Date: ${new Date().toLocaleDateString()}</div>
              <div>Report: EMR-MH-Verified</div>
            </div>
          </div>

          <div class="meta-grid">
            <div class="meta-item"><span class="meta-label">Patient Name:</span> <strong>${activePatient.patientName}</strong></div>
            <div class="meta-item"><span class="meta-label">Patient ID:</span> <strong>${activePatient.patientId}</strong></div>
            <div class="meta-item"><span class="meta-label">Gender / Blood:</span> <span>${activePatient.gender || 'N/A'} • ${activePatient.bloodGroup || 'N/A'}</span></div>
            <div class="meta-item"><span class="meta-label">Age:</span> <span>${activePatient.age || 'N/A'} yrs</span></div>
            <div class="meta-item"><span class="meta-label">Phone:</span> <span>${activePatient.patientPhone || 'N/A'}</span></div>
            <div class="meta-item"><span class="meta-label">Emergency Contact:</span> <span>${activePatient.emergencyContact || 'N/A'}</span></div>
          </div>

          <div class="section">
            <div class="section-title">Clinical Vitals</div>
            <div class="vitals-grid">
              <div class="vital-box">
                <div class="vital-val">${bp}</div>
                <div class="vital-lbl">Blood Pressure</div>
              </div>
              <div class="vital-box">
                <div class="vital-val">${hr}</div>
                <div class="vital-lbl">Heart Rate / Pulse</div>
              </div>
              <div class="vital-box">
                <div class="vital-val">${bs}</div>
                <div class="vital-lbl">Blood Glucose</div>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">⚠️ Known Drug & Latex Allergies</div>
            <div class="badges">
              ${allergies.length > 0
                ? allergies.map(a => `<span class="badge">⚠️ ${a}</span>`).join('')
                : '<span style="font-size: 13px; color: #166534;">No known drug or environmental allergies reported.</span>'
              }
            </div>
          </div>

          <div class="section">
            <div class="section-title">Systemic & Chronic Health Conditions</div>
            <div class="badges">
              ${conditions.length > 0
                ? conditions.map(c => `<span class="badge badge-blue">✓ ${c}</span>`).join('')
                : '<span style="font-size: 13px; color: #64748b;">No systemic or chronic health conditions recorded.</span>'
              }
            </div>
          </div>

          <div class="section">
            <div class="section-title">Active Daily Medications</div>
            <div class="badges">
              ${meds.length > 0
                ? meds.map(m => `<span class="badge badge-green">💊 ${m}</span>`).join('')
                : '<span style="font-size: 13px; color: #64748b;">No regular daily medications taken.</span>'
              }
            </div>
          </div>

          <div class="section">
            <div class="section-title">Attending Doctor's Clinical Medical Notes</div>
            <div class="notes-box">${notes}</div>
          </div>

          <div class="footer">
            <div>DentoCare Digital EMR Record • Strictly Confidential</div>
            <div>
              <div class="signature">Attending Doctor's Signature</div>
            </div>
          </div>
          <script>
            window.onload = function() { window.print(); };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // 4. Prescriptions Handlers (Add, Edit, Delete, Print)
  const handleOpenEditPrescription = (rx) => {
    setEditingPrescription(rx);
    setPrescriptionForm({
      medicineName: rx.medicineName || '',
      dosage: rx.dosage || '',
      frequency: rx.frequency || 'Twice daily after food',
      duration: rx.duration || '5 days',
      instructions: rx.instructions || '',
    });
    setIsAddPrescriptionOpen(true);
  };

  const handleAddPrescription = async (e) => {
    e.preventDefault();
    if (!activePatient) return;
    if (!prescriptionForm.medicineName.trim()) {
      showToast('Medicine name is required.', 'error');
      return;
    }

    const targetId = activePatient._id || activePatient.patientId;

    if (editingPrescription) {
      // Editing existing prescription
      const updatedRx = {
        ...editingPrescription,
        medicineName: prescriptionForm.medicineName.trim(),
        dosage: prescriptionForm.dosage.trim(),
        frequency: prescriptionForm.frequency,
        duration: prescriptionForm.duration,
        instructions: prescriptionForm.instructions.trim(),
      };

      const updatedPrescriptions = (activePatient.prescriptions || []).map((rx) =>
        (rx._id && rx._id === editingPrescription._id) || rx === editingPrescription ? updatedRx : rx
      );

      setPatients((prev) => {
        const updated = prev.map((p) => {
          if (p._id === activePatient._id || p.patientId === activePatient.patientId) {
            return { ...p, prescriptions: updatedPrescriptions };
          }
          return p;
        });
        saveStoredPatients(updated);
        return updated;
      });

      setIsAddPrescriptionOpen(false);
      setEditingPrescription(null);
      setPrescriptionForm({
        medicineName: '',
        dosage: '',
        frequency: 'Twice daily after food',
        duration: '5 days',
        instructions: '',
      });
      showToast('Prescription updated successfully!');

      try {
        await sendPatientApiRequest(`/api/v1/patient-records/${targetId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prescriptions: updatedPrescriptions }),
        });
      } catch (err) {
        console.warn('Prescription update sync warning:', err);
      }
    } else {
      // Adding new prescription
      const newPrescription = {
        _id: `rx_${Date.now()}`,
        medicineName: prescriptionForm.medicineName.trim(),
        dosage: prescriptionForm.dosage.trim(),
        frequency: prescriptionForm.frequency,
        duration: prescriptionForm.duration,
        instructions: prescriptionForm.instructions.trim(),
        prescribedDate: new Date().toISOString(),
      };

      setPatients((prev) => {
        const updated = prev.map((p) => {
          if (p._id === activePatient._id || p.patientId === activePatient.patientId) {
            return {
              ...p,
              prescriptions: [newPrescription, ...(p.prescriptions || [])],
            };
          }
          return p;
        });
        saveStoredPatients(updated);
        return updated;
      });

      setIsAddPrescriptionOpen(false);
      setPrescriptionForm({
        medicineName: '',
        dosage: '',
        frequency: 'Twice daily after food',
        duration: '5 days',
        instructions: '',
      });
      showToast('Prescription added successfully!');

      try {
        await sendPatientApiRequest(`/api/v1/patient-records/${targetId}/prescriptions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newPrescription),
        });
      } catch (err) {
        console.warn('Background prescription sync warning:', err);
      }
    }
  };

  const handleDeletePrescription = async (rxId) => {
    if (!activePatient) return;
    const targetId = activePatient._id || activePatient.patientId;
    const updatedPrescriptions = (activePatient.prescriptions || []).filter(
      (rx, idx) => rx._id !== rxId && idx !== rxId
    );

    setPatients((prev) => {
      const updated = prev.map((p) => {
        if (p._id === activePatient._id || p.patientId === activePatient.patientId) {
          return { ...p, prescriptions: updatedPrescriptions };
        }
        return p;
      });
      saveStoredPatients(updated);
      return updated;
    });

    showToast('Prescription deleted.');

    try {
      await sendPatientApiRequest(`/api/v1/patient-records/${targetId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prescriptions: updatedPrescriptions }),
      });
    } catch (err) {
      console.warn('Background prescription delete sync warning:', err);
    }
  };

  const handlePrintPrescription = (rx) => {
    if (!activePatient || !rx) return;
    const printWindow = window.open('', '_blank', 'width=800,height=900');
    if (!printWindow) {
      window.print();
      return;
    }
    const rxDate = rx.prescribedDate ? new Date(rx.prescribedDate).toLocaleDateString() : new Date().toLocaleDateString();

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Prescription (Rx) - ${rx.medicineName} - ${activePatient.patientName}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; padding: 40px; color: #111; line-height: 1.6; }
            .header { border-bottom: 3px double #0891b2; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-start; }
            .clinic-name { font-size: 26px; font-weight: 800; color: #0891b2; margin: 0; }
            .clinic-sub { font-size: 13px; color: #475569; margin-top: 4px; }
            .rx-title { font-size: 14px; font-weight: 700; color: #0e7490; background: #e0f2fe; padding: 4px 12px; border-radius: 6px; border: 1px solid #bae6fd; }
            .patient-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 28px; display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; font-size: 13px; }
            .patient-box div { display: flex; gap: 8px; }
            .patient-box .label { font-weight: 600; color: #64748b; width: 110px; }
            .rx-symbol { font-size: 42px; font-weight: 900; color: #0891b2; font-family: serif; margin-bottom: 16px; }
            .rx-card { border: 1px solid #cbd5e1; border-radius: 8px; padding: 20px; background: #ffffff; box-shadow: 0 1px 3px rgba(0,0,0,0.05); margin-bottom: 32px; }
            .med-name { font-size: 20px; font-weight: 800; color: #0f172a; margin-bottom: 8px; }
            .med-tags { display: flex; gap: 10px; margin-bottom: 16px; }
            .tag { padding: 4px 10px; border-radius: 4px; font-size: 12px; font-weight: 700; }
            .tag-dosage { background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; }
            .tag-duration { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
            .detail-row { font-size: 14px; color: #334155; margin-bottom: 8px; }
            .detail-row strong { color: #0f172a; }
            .instructions { background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; padding: 12px; border-radius: 6px; font-size: 13px; margin-top: 14px; }
            .footer { margin-top: 60px; display: flex; justify-content: space-between; align-items: flex-end; border-top: 1px solid #e2e8f0; padding-top: 20px; }
            .signature-line { border-top: 1px solid #94a3b8; width: 220px; text-align: center; padding-top: 8px; font-size: 12px; color: #475569; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1 class="clinic-name">DentoCare Dental Clinic</h1>
              <div class="clinic-sub">Comprehensive Oral Health & Advanced Dental Care</div>
              <div class="clinic-sub" style="font-size: 11px; color: #64748b; margin-top: 2px;">Jalalabad, Sylhet, Bangladesh • Tel: +1 (512) 205-1826</div>
            </div>
            <div style="text-align: right;">
              <span class="rx-title">Official Prescription</span>
              <div style="font-size: 12px; color: #64748b; margin-top: 8px;">Date: ${rxDate}</div>
            </div>
          </div>

          <div class="patient-box">
            <div><span class="label">Patient Name:</span> <strong>${activePatient.patientName}</strong></div>
            <div><span class="label">Patient ID:</span> <strong>${activePatient.patientId}</strong></div>
            <div><span class="label">Age / Gender:</span> <span>${activePatient.age || 'N/A'} yrs • ${activePatient.gender || 'N/A'}</span></div>
            <div><span class="label">Blood Group:</span> <span>${activePatient.bloodGroup || 'N/A'}</span></div>
            <div><span class="label">Phone:</span> <span>${activePatient.patientPhone || 'N/A'}</span></div>
            <div><span class="label">Emergency:</span> <span>${activePatient.emergencyContact || 'N/A'}</span></div>
          </div>

          <div class="rx-symbol">℞</div>

          <div class="rx-card">
            <div class="med-name">${rx.medicineName}</div>
            <div class="med-tags">
              <span class="tag tag-dosage">${rx.dosage || 'Standard Dosage'}</span>
              <span class="tag tag-duration">Duration: ${rx.duration || '5 days'}</span>
            </div>
            <div class="detail-row"><strong>Frequency / Timing:</strong> ${rx.frequency || 'As directed'}</div>
            ${rx.instructions ? `<div class="instructions"><strong>Special Instructions:</strong> ${rx.instructions}</div>` : ''}
          </div>

          <div class="footer">
            <div style="font-size: 11px; color: #64748b;">
              <div>Please take medications strictly as prescribed.</div>
              <div>Consult clinic immediately if adverse reactions occur.</div>
            </div>
            <div>
              <div class="signature-line">
                <strong>Dr. Sarah Johnson, D.D.S.</strong><br>
                <span>Licensed Dental Surgeon</span>
              </div>
            </div>
          </div>
          <script>
            window.onload = function() { window.print(); };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handlePrintAllPrescriptions = () => {
    if (!activePatient || !activePatient.prescriptions || activePatient.prescriptions.length === 0) {
      showToast('No prescriptions available to print.', 'error');
      return;
    }
    const printWindow = window.open('', '_blank', 'width=800,height=900');
    if (!printWindow) {
      window.print();
      return;
    }
    const rxDate = new Date().toLocaleDateString();

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Prescriptions Summary - ${activePatient.patientName} (${activePatient.patientId})</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; padding: 40px; color: #111; line-height: 1.5; }
            .header { border-bottom: 3px double #0891b2; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-start; }
            .clinic-name { font-size: 26px; font-weight: 800; color: #0891b2; margin: 0; }
            .clinic-sub { font-size: 13px; color: #475569; margin-top: 4px; }
            .patient-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin-bottom: 24px; display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; font-size: 13px; }
            .patient-box div { display: flex; gap: 8px; }
            .patient-box .label { font-weight: 600; color: #64748b; width: 110px; }
            .rx-symbol { font-size: 36px; font-weight: 900; color: #0891b2; font-family: serif; margin-bottom: 12px; }
            .rx-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 13px; }
            .rx-table th { background: #f1f5f9; padding: 10px 12px; text-align: left; font-weight: 700; color: #334155; border-bottom: 2px solid #cbd5e1; }
            .rx-table td { padding: 12px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
            .med-title { font-weight: 700; font-size: 14px; color: #0f172a; }
            .med-sub { font-size: 12px; color: #64748b; margin-top: 2px; }
            .footer { margin-top: 50px; display: flex; justify-content: space-between; align-items: flex-end; border-top: 1px solid #e2e8f0; padding-top: 20px; }
            .signature-line { border-top: 1px solid #94a3b8; width: 220px; text-align: center; padding-top: 8px; font-size: 12px; color: #475569; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1 class="clinic-name">DentoCare Dental Clinic</h1>
              <div class="clinic-sub">Patient Medication Chart & Prescriptions Sheet</div>
              <div class="clinic-sub" style="font-size: 11px; color: #64748b; margin-top: 2px;">Jalalabad, Sylhet, Bangladesh • Tel: +1 (512) 205-1826</div>
            </div>
            <div style="text-align: right;">
              <span style="font-size: 13px; font-weight: 700; color: #0e7490; background: #e0f2fe; padding: 4px 10px; border-radius: 6px;">Prescriptions Sheet</span>
              <div style="font-size: 12px; color: #64748b; margin-top: 6px;">Date: ${rxDate}</div>
            </div>
          </div>

          <div class="patient-box">
            <div><span class="label">Patient Name:</span> <strong>${activePatient.patientName}</strong></div>
            <div><span class="label">Patient ID:</span> <strong>${activePatient.patientId}</strong></div>
            <div><span class="label">Age / Gender:</span> <span>${activePatient.age || 'N/A'} yrs • ${activePatient.gender || 'N/A'}</span></div>
            <div><span class="label">Blood Group:</span> <span>${activePatient.bloodGroup || 'N/A'}</span></div>
          </div>

          <div class="rx-symbol">℞</div>

          <table class="rx-table">
            <thead>
              <tr>
                <th style="width: 35%;">Medication & Dosage</th>
                <th style="width: 25%;">Frequency</th>
                <th style="width: 15%;">Duration</th>
                <th style="width: 25%;">Instructions</th>
              </tr>
            </thead>
            <tbody>
              ${activePatient.prescriptions.map((rx, idx) => `
                <tr>
                  <td>
                    <div class="med-title">${idx + 1}. ${rx.medicineName}</div>
                    <div class="med-sub">${rx.dosage || 'Standard dose'}</div>
                  </td>
                  <td>${rx.frequency}</td>
                  <td>${rx.duration || '5 days'}</td>
                  <td style="font-size: 12px; color: #475569;">${rx.instructions || 'As directed'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="footer">
            <div style="font-size: 11px; color: #64748b;">
              <div>Take medications strictly as instructed by your dentist.</div>
              <div>Report any unusual symptoms or allergy immediately.</div>
            </div>
            <div>
              <div class="signature-line">
                <strong>Dr. Sarah Johnson, D.D.S.</strong><br>
                <span>Attending Dentist Signature</span>
              </div>
            </div>
          </div>
          <script>
            window.onload = function() { window.print(); };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // 5. Add X-Ray Report (Instant Update + Persistent Save)
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 15 * 1024 * 1024) {
        showToast('File is too large. Please select an image under 15MB.', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setXrayFilePreview(reader.result);
        setXrayForm((prev) => ({ ...prev, imageUrl: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddXray = async (e) => {
    e.preventDefault();
    if (!activePatient) return;
    if (!xrayForm.title.trim()) {
      showToast('X-Ray title is required.', 'error');
      return;
    }
    const finalImage = xrayFilePreview || xrayForm.imageUrl.trim();
    if (!finalImage) {
      showToast('Please provide an image file or direct image URL.', 'error');
      return;
    }

    const targetId = activePatient._id || activePatient.patientId;

    if (editingXray) {
      // --- EDIT MODE ---
      const updatedXray = {
        ...editingXray,
        title: xrayForm.title.trim(),
        modality: xrayForm.modality,
        imageUrl: finalImage,
        radiologistNotes: xrayForm.radiologistNotes.trim(),
      };

      const updatedXrays = (activePatient.xrayImages || []).map((x) =>
        (x._id && x._id === editingXray._id) || x === editingXray ? updatedXray : x
      );

      setPatients((prev) => {
        const updated = prev.map((p) => {
          if (p._id === activePatient._id || p.patientId === activePatient.patientId) {
            return { ...p, xrayImages: updatedXrays };
          }
          return p;
        });
        saveStoredPatients(updated);
        return updated;
      });

      setIsAddXrayOpen(false);
      setEditingXray(null);
      setXrayForm({ title: '', modality: 'OPG Panoramic', imageUrl: '', radiologistNotes: '' });
      setXrayFilePreview('');
      showToast('X-Ray report updated successfully!');

      try {
        await sendPatientApiRequest(`/api/v1/patient-records/${targetId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ xrayImages: updatedXrays }),
        });
      } catch (err) {
        console.warn('Background X-Ray update sync warning:', err);
      }
    } else {
      // --- ADD MODE ---
      const newXray = {
        _id: `xray_${Date.now()}`,
        title: xrayForm.title.trim(),
        modality: xrayForm.modality,
        imageUrl: finalImage,
        radiologistNotes: xrayForm.radiologistNotes.trim(),
        date: new Date().toISOString(),
      };

      setPatients((prev) => {
        const updated = prev.map((p) => {
          if (p._id === activePatient._id || p.patientId === activePatient.patientId) {
            return { ...p, xrayImages: [newXray, ...(p.xrayImages || [])] };
          }
          return p;
        });
        saveStoredPatients(updated);
        return updated;
      });

      setIsAddXrayOpen(false);
      setXrayForm({ title: '', modality: 'OPG Panoramic', imageUrl: '', radiologistNotes: '' });
      setXrayFilePreview('');
      showToast('X-Ray report uploaded successfully!');

      try {
        await sendPatientApiRequest(`/api/v1/patient-records/${activePatient._id}/xrays`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newXray),
        });
      } catch (err) {
        console.warn('Background X-Ray sync warning:', err);
      }
    }
  };

  // X-Ray: Open edit modal pre-filled
  const handleOpenEditXray = (xray) => {
    setEditingXray(xray);
    setXrayForm({
      title: xray.title || '',
      modality: xray.modality || 'OPG Panoramic',
      imageUrl: xray.imageUrl || '',
      radiologistNotes: xray.radiologistNotes || '',
    });
    setXrayFilePreview(xray.imageUrl || '');
    setIsAddXrayOpen(true);
  };

  // X-Ray: Delete
  const handleDeleteXray = async (xrayId) => {
    if (!activePatient) return;
    const targetId = activePatient._id || activePatient.patientId;
    const updatedXrays = (activePatient.xrayImages || []).filter(
      (x, idx) => x._id !== xrayId && idx !== xrayId
    );

    setPatients((prev) => {
      const updated = prev.map((p) => {
        if (p._id === activePatient._id || p.patientId === activePatient.patientId) {
          return { ...p, xrayImages: updatedXrays };
        }
        return p;
      });
      saveStoredPatients(updated);
      return updated;
    });

    showToast('X-Ray report deleted.');

    try {
      await sendPatientApiRequest(`/api/v1/patient-records/${targetId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ xrayImages: updatedXrays }),
      });
    } catch (err) {
      console.warn('Background X-Ray delete sync warning:', err);
    }
  };

  // X-Ray: Print single radiograph report
  const handlePrintXray = (xray) => {
    if (!activePatient || !xray) return;
    const printWindow = window.open('', '_blank', 'width=900,height=1000');
    if (!printWindow) { window.print(); return; }
    const scanDate = xray.date ? new Date(xray.date).toLocaleDateString() : new Date().toLocaleDateString();

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Radiograph Report - ${xray.title} - ${activePatient.patientName}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; padding: 40px; color: #111; line-height: 1.5; }
            .header { border-bottom: 3px double #0891b2; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-start; }
            .clinic-name { font-size: 26px; font-weight: 800; color: #0891b2; margin: 0; }
            .clinic-sub { font-size: 13px; color: #475569; margin-top: 4px; }
            .badge { display: inline-block; background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; padding: 4px 12px; border-radius: 6px; font-size: 13px; font-weight: 700; }
            .patient-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 24px; display: grid; grid-template-columns: repeat(2,1fr); gap: 10px; font-size: 13px; }
            .patient-box div { display: flex; gap: 8px; }
            .patient-box .label { font-weight: 600; color: #64748b; width: 120px; }
            .scan-section { margin-bottom: 24px; }
            .scan-title { font-size: 18px; font-weight: 800; color: #0f172a; margin-bottom: 4px; }
            .scan-meta { display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
            .tag { padding: 4px 10px; border-radius: 4px; font-size: 12px; font-weight: 700; background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; }
            .scan-image { width: 100%; max-height: 420px; object-fit: contain; border-radius: 8px; border: 1px solid #e2e8f0; background: #0f172a; display: block; margin-bottom: 20px; }
            .notes-box { background: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 8px; font-size: 13px; color: #334155; white-space: pre-wrap; min-height: 80px; }
            .notes-label { font-weight: 700; color: #0891b2; margin-bottom: 8px; font-size: 14px; }
            .footer { margin-top: 50px; display: flex; justify-content: space-between; align-items: flex-end; border-top: 1px solid #e2e8f0; padding-top: 20px; font-size: 12px; color: #64748b; }
            .signature-line { border-top: 1px solid #94a3b8; width: 220px; text-align: center; padding-top: 8px; font-size: 12px; color: #475569; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1 class="clinic-name">DentoCare Dental Clinic</h1>
              <div class="clinic-sub">Dental Radiograph & Diagnostic Imaging Report</div>
              <div class="clinic-sub" style="font-size:11px;color:#64748b;margin-top:2px;">Jalalabad, Sylhet, Bangladesh • Tel: +1 (512) 205-1826</div>
            </div>
            <div style="text-align:right;">
              <span class="badge">Radiograph Report</span>
              <div style="font-size:12px;color:#64748b;margin-top:8px;">Scan Date: ${scanDate}</div>
              <div style="font-size:12px;color:#64748b;">Printed: ${new Date().toLocaleDateString()}</div>
            </div>
          </div>

          <div class="patient-box">
            <div><span class="label">Patient Name:</span> <strong>${activePatient.patientName}</strong></div>
            <div><span class="label">Patient ID:</span> <strong>${activePatient.patientId}</strong></div>
            <div><span class="label">Age / Gender:</span> <span>${activePatient.age || 'N/A'} yrs • ${activePatient.gender || 'N/A'}</span></div>
            <div><span class="label">Blood Group:</span> <span>${activePatient.bloodGroup || 'N/A'}</span></div>
            <div><span class="label">Phone:</span> <span>${activePatient.patientPhone || 'N/A'}</span></div>
            <div><span class="label">Emergency:</span> <span>${activePatient.emergencyContact || 'N/A'}</span></div>
          </div>

          <div class="scan-section">
            <div class="scan-title">${xray.title}</div>
            <div class="scan-meta">
              <span class="tag">Modality: ${xray.modality || 'Dental X-Ray'}</span>
              <span class="tag">Scan Date: ${scanDate}</span>
            </div>
            <img src="${xray.imageUrl}" alt="${xray.title}" class="scan-image" />
            <div class="notes-label">📋 Radiologist Diagnostic Notes</div>
            <div class="notes-box">${xray.radiologistNotes || 'No radiologist notes recorded for this scan.'}</div>
          </div>

          <div class="footer">
            <div>DentoCare Digital EMR Record • Strictly Confidential</div>
            <div>
              <div class="signature-line">
                <strong>Dr. Sarah Johnson, D.D.S.</strong><br>
                <span>Licensed Dental Surgeon</span>
              </div>
            </div>
          </div>
          <script>window.onload = function() { window.print(); };</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // 6. Add Past Treatment (Instant Update + Persistent Save)
  const handleAddTreatment = async (e) => {
    e.preventDefault();
    if (!activePatient) return;
    if (!treatmentForm.procedure.trim()) {
      showToast('Procedure name is required.', 'error');
      return;
    }

    const targetId = activePatient._id || activePatient.patientId;

    if (editingTreatment) {
      // Editing existing treatment
      const updatedTreatment = {
        ...editingTreatment,
        procedure: treatmentForm.procedure.trim(),
        toothNumber: treatmentForm.toothNumber.trim(),
        doctorName: treatmentForm.doctorName.trim(),
        status: treatmentForm.status,
        cost: Number(treatmentForm.cost) || 0,
        treatmentDate: treatmentForm.treatmentDate || new Date().toISOString().split('T')[0],
        notes: treatmentForm.notes.trim(),
      };

      const updatedTreatments = (activePatient.pastTreatments || []).map((t) =>
        (t._id && t._id === editingTreatment._id) || t === editingTreatment ? updatedTreatment : t
      );

      setPatients((prev) => {
        const updated = prev.map((p) => {
          if (p._id === activePatient._id || p.patientId === activePatient.patientId) {
            return { ...p, pastTreatments: updatedTreatments };
          }
          return p;
        });
        saveStoredPatients(updated);
        return updated;
      });

      setIsAddTreatmentOpen(false);
      setEditingTreatment(null);
      setTreatmentForm({
        procedure: '',
        toothNumber: 'All / General',
        doctorName: 'Dr. Sarah Johnson',
        status: 'Completed',
        cost: '',
        treatmentDate: new Date().toISOString().split('T')[0],
        notes: '',
      });
      showToast('Treatment updated successfully!');

      try {
        await sendPatientApiRequest(`/api/v1/patient-records/${targetId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pastTreatments: updatedTreatments }),
        });
      } catch (err) {
        console.warn('Treatment update sync warning:', err);
      }
    } else {
      // Adding new treatment
      const newTreatment = {
        _id: `trt_${Date.now()}`,
        procedure: treatmentForm.procedure.trim(),
        toothNumber: treatmentForm.toothNumber.trim(),
        doctorName: treatmentForm.doctorName.trim(),
        status: treatmentForm.status,
        cost: Number(treatmentForm.cost) || 0,
        treatmentDate: treatmentForm.treatmentDate || new Date().toISOString().split('T')[0],
        notes: treatmentForm.notes.trim(),
      };

      // Step A: Optimistic update on Screen 2
      setPatients((prev) => {
        const updated = prev.map((p) => {
          if (p._id === activePatient._id || p.patientId === activePatient.patientId) {
            return {
              ...p,
              pastTreatments: [newTreatment, ...(p.pastTreatments || [])],
            };
          }
          return p;
        });
        saveStoredPatients(updated);
        return updated;
      });

      setIsAddTreatmentOpen(false);
      setTreatmentForm({
        procedure: '',
        toothNumber: 'All / General',
        doctorName: 'Dr. Sarah Johnson',
        status: 'Completed',
        cost: '',
        treatmentDate: new Date().toISOString().split('T')[0],
        notes: '',
      });
      showToast('Treatment history recorded successfully!');

      // Step B: Sync with backend in background
      try {
        await sendPatientApiRequest(`/api/v1/patient-records/${activePatient._id}/treatments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newTreatment),
        });
      } catch (err) {
        console.warn('Background treatment sync warning:', err);
      }
    }
  };

  // Treatment: Open edit modal pre-filled
  const handleOpenEditTreatment = (treatment) => {
    setEditingTreatment(treatment);
    setTreatmentForm({
      procedure: treatment.procedure || '',
      toothNumber: treatment.toothNumber || 'All / General',
      doctorName: treatment.doctorName || 'Dr. Sarah Johnson',
      status: treatment.status || 'Completed',
      cost: treatment.cost || '',
      treatmentDate: treatment.treatmentDate || new Date().toISOString().split('T')[0],
      notes: treatment.notes || '',
    });
    setIsAddTreatmentOpen(true);
  };

  // Treatment: Delete
  const handleDeleteTreatment = async (treatmentId) => {
    if (!activePatient) return;
    const targetId = activePatient._id || activePatient.patientId;
    const updatedTreatments = (activePatient.pastTreatments || []).filter(
      (t, idx) => t._id !== treatmentId && idx !== treatmentId
    );

    setPatients((prev) => {
      const updated = prev.map((p) => {
        if (p._id === activePatient._id || p.patientId === activePatient.patientId) {
          return { ...p, pastTreatments: updatedTreatments };
        }
        return p;
      });
      saveStoredPatients(updated);
      return updated;
    });

    showToast('Treatment record deleted.');

    try {
      await sendPatientApiRequest(`/api/v1/patient-records/${targetId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pastTreatments: updatedTreatments }),
      });
    } catch (err) {
      console.warn('Background treatment delete sync warning:', err);
    }
  };

  // Treatment: Print single treatment record
  const handlePrintTreatment = (treatment) => {
    if (!activePatient || !treatment) return;
    const printWindow = window.open('', '_blank', 'width=800,height=900');
    if (!printWindow) {
      window.print();
      return;
    }
    const treatmentDate = treatment.treatmentDate ? new Date(treatment.treatmentDate).toLocaleDateString() : new Date().toLocaleDateString();

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Treatment Record - ${treatment.procedure} - ${activePatient.patientName}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; padding: 40px; color: #111; line-height: 1.5; }
            .header { border-bottom: 3px double #0891b2; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-start; }
            .clinic-name { font-size: 26px; font-weight: 800; color: #0891b2; margin: 0; }
            .clinic-sub { font-size: 13px; color: #475569; margin-top: 4px; }
            .badge { display: inline-block; background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; padding: 4px 12px; border-radius: 6px; font-size: 13px; font-weight: 700; }
            .patient-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 24px; display: grid; grid-template-columns: repeat(2,1fr); gap: 10px; font-size: 13px; }
            .patient-box div { display: flex; gap: 8px; }
            .patient-box .label { font-weight: 600; color: #64748b; width: 120px; }
            .treatment-section { margin-bottom: 24px; }
            .treatment-title { font-size: 18px; font-weight: 800; color: #0f172a; margin-bottom: 4px; }
            .treatment-meta { display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
            .tag { padding: 4px 10px; border-radius: 4px; font-size: 12px; font-weight: 700; background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; }
            .tag-completed { background: #dcfce7; color: #166534; border-color: #bbf7d0; }
            .tag-progress { background: #fef3c7; color: #92400e; border-color: #fde68a; }
            .tag-scheduled { background: #e0f2fe; color: #0369a1; border-color: #bae6fd; }
            .notes-box { background: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 8px; font-size: 13px; color: #334155; white-space: pre-wrap; min-height: 80px; }
            .notes-label { font-weight: 700; color: #0891b2; margin-bottom: 8px; font-size: 14px; }
            .footer { margin-top: 50px; display: flex; justify-content: space-between; align-items: flex-end; border-top: 1px solid #e2e8f0; padding-top: 20px; font-size: 12px; color: #64748b; }
            .signature-line { border-top: 1px solid #94a3b8; width: 220px; text-align: center; padding-top: 8px; font-size: 12px; color: #475569; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1 class="clinic-name">DentoCare Dental Clinic</h1>
              <div class="clinic-sub">Dental Treatment Procedure Record</div>
              <div class="clinic-sub" style="font-size:11px;color:#64748b;margin-top:2px;">Jalalabad, Sylhet, Bangladesh • Tel: +1 (512) 205-1826</div>
            </div>
            <div style="text-align:right;">
              <span class="badge">Treatment Record</span>
              <div style="font-size:12px;color:#64748b;margin-top:8px;">Treatment Date: ${treatmentDate}</div>
              <div style="font-size:12px;color:#64748b;">Printed: ${new Date().toLocaleDateString()}</div>
            </div>
          </div>

          <div class="patient-box">
            <div><span class="label">Patient Name:</span> <strong>${activePatient.patientName}</strong></div>
            <div><span class="label">Patient ID:</span> <strong>${activePatient.patientId}</strong></div>
            <div><span class="label">Age / Gender:</span> <span>${activePatient.age || 'N/A'} yrs • ${activePatient.gender || 'N/A'}</span></div>
            <div><span class="label">Blood Group:</span> <span>${activePatient.bloodGroup || 'N/A'}</span></div>
            <div><span class="label">Phone:</span> <span>${activePatient.patientPhone || 'N/A'}</span></div>
            <div><span class="label">Emergency:</span> <span>${activePatient.emergencyContact || 'N/A'}</span></div>
          </div>

          <div class="treatment-section">
            <div class="treatment-title">${treatment.procedure}</div>
            <div class="treatment-meta">
              <span class="tag">Tooth/Region: ${treatment.toothNumber || 'All'}</span>
              <span class="tag tag-${treatment.status === 'Completed' ? 'completed' : treatment.status === 'In Progress' ? 'progress' : 'scheduled'}">Status: ${treatment.status || 'Completed'}</span>
              <span class="tag">Date: ${treatmentDate}</span>
              ${treatment.cost > 0 ? `<span class="tag">Cost: $${treatment.cost}</span>` : ''}
            </div>
            <div class="notes-label">📋 Clinical Procedure Notes</div>
            <div class="notes-box">${treatment.notes || 'No clinical notes recorded for this treatment.'}</div>
          </div>

          <div class="footer">
            <div>DentoCare Digital EMR Record • Strictly Confidential</div>
            <div>
              <div class="signature-line">
                <strong>${treatment.doctorName || 'Dr. Sarah Johnson, D.D.S.'}</strong><br>
                <span>Attending Dentist Signature</span>
              </div>
            </div>
          </div>
          <script>window.onload = function() { window.print(); };</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // 7. Lab Orders Handlers (New, Edit, View)
  const handleOpenNewLabOrder = () => {
    setEditingLabOrder(null);
    setLabOrderForm(emptyLabOrderForm);
    setIsLabOrderModalOpen(true);
  };

  const handleOpenEditLabOrder = (order) => {
    setViewingLabOrder(null);
    setEditingLabOrder(order);
    setLabOrderForm({
      toothNumber: order.toothNumber || '',
      labType: order.labType || 'Crown',
      material: order.material || 'Porcelain',
      status: order.status || 'Pending',
      expectedDeliveryDate: order.expectedDeliveryDate ? String(order.expectedDeliveryDate).split('T')[0] : '',
      cabinetLocation: order.cabinetLocation || '',
      notes: order.notes || '',
    });
    setIsLabOrderModalOpen(true);
  };

  const closeLabOrderModal = () => {
    setIsLabOrderModalOpen(false);
    setEditingLabOrder(null);
    setLabOrderForm(emptyLabOrderForm);
  };

  const handleSaveLabOrder = async (e) => {
    e.preventDefault();
    if (!activePatient) return;
    if (!labOrderForm.toothNumber.trim()) {
      showToast('Tooth number is required.', 'error');
      return;
    }

    const targetId = activePatient._id || activePatient.patientId;
    const isSamePatient = (p) => p._id === activePatient._id || p.patientId === activePatient.patientId;
    const fields = {
      toothNumber: labOrderForm.toothNumber.trim(),
      labType: labOrderForm.labType,
      material: labOrderForm.material.trim() || 'Porcelain',
      expectedDeliveryDate: labOrderForm.expectedDeliveryDate || null,
      cabinetLocation: labOrderForm.cabinetLocation.trim(),
      notes: labOrderForm.notes.trim(),
    };

    if (editingLabOrder) {
      // ---- EDIT ----
      const updatedOrder = { ...editingLabOrder, ...fields, status: labOrderForm.status };
      if (labOrderForm.status === 'Received' && !updatedOrder.receivedDate) updatedOrder.receivedDate = new Date().toISOString();
      if (labOrderForm.status === 'Fitted' && !updatedOrder.fittedDate) updatedOrder.fittedDate = new Date().toISOString();

      const updatedOrders = (activePatient.labOrders || []).map((o) =>
        o.orderId === editingLabOrder.orderId ? updatedOrder : o
      );

      setPatients((prev) => {
        const updated = prev.map((p) => (isSamePatient(p) ? { ...p, labOrders: updatedOrders } : p));
        saveStoredPatients(updated);
        return updated;
      });
      closeLabOrderModal();
      showToast('Lab order updated successfully!');

      try {
        const res = await sendPatientApiRequest(
          `/api/v1/patient-records/${targetId}/lab-orders/${editingLabOrder.orderId}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...fields, status: labOrderForm.status }),
          }
        );
        if (!res.ok) {
          showToast(res.data?.message || 'Could not sync lab order update to server.', 'error');
        }
      } catch (err) {
        console.warn('Lab order update sync warning:', err);
      }
    } else {
      // ---- CREATE ----
      const newOrder = {
        _id: `lab_${Date.now()}`,
        orderId: `LAB-${Date.now().toString().slice(-6)}`,
        ...fields,
        status: 'Pending',
        sentDate: new Date().toISOString(),
      };

      setPatients((prev) => {
        const updated = prev.map((p) =>
          isSamePatient(p) ? { ...p, labOrders: [newOrder, ...(p.labOrders || [])] } : p
        );
        saveStoredPatients(updated);
        return updated;
      });
      closeLabOrderModal();
      showToast('Lab order created successfully!');

      try {
        const res = await sendPatientApiRequest(`/api/v1/patient-records/${targetId}/lab-orders`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(fields),
        });
        if (res.ok && res.data?.data) {
          setPatients((prev) => {
            const updated = prev.map((p) =>
              isSamePatient(p)
                ? { ...p, labOrders: (p.labOrders || []).map((o) => (o._id === newOrder._id ? { ...o, ...res.data.data } : o)) }
                : p
            );
            saveStoredPatients(updated);
            return updated;
          });
        }
      } catch (err) {
        console.warn('Lab order create sync warning:', err);
      }
    }
  };

  // Filtered patients by blood group
  const displayedPatients = patients.filter((p) => {
    if (filterBlood !== 'all' && p.bloodGroup !== filterBlood) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-[#081523] text-gray-100 flex flex-col selection:bg-[#3ec1d3] selection:text-white">
      {/* Top Navbar */}
      <Navbar />

      {/* Floating Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[2000] flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl border text-sm font-semibold animate-in slide-in-from-bottom-5 duration-300 ${
          toast.type === 'error'
            ? 'bg-rose-950/90 text-rose-200 border-rose-700/50 backdrop-blur-md'
            : 'bg-[#10344d]/95 text-[#6ee7b7] border-[#3ec1d3]/40 backdrop-blur-md'
        }`}>
          {toast.type === 'error' ? (
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-[#3ec1d3] shrink-0" />
          )}
          <span>{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="ml-2 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Container */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-6">
        
        {/* Top Header Card */}
        <div className="bg-[#0e2439] border border-cyan-900/30 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#3ec1d3]/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#3ec1d3] to-[#127b8a] flex items-center justify-center text-[#081523] shadow-lg shadow-[#3ec1d3]/20 shrink-0">
              <Stethoscope className="w-7 h-7 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  Patient Records <span className="text-[#3ec1d3] text-lg sm:text-xl font-bold">(EMR / EHR)</span>
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-700/50">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Live Clinic Sync
                </span>
              </div>
              <p className="text-sm text-gray-400 mt-1">
                Centralized Electronic Medical & Health Records: Digital history, clinical prescriptions, dental radiographs, and procedure timelines.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            <button
              onClick={() => fetchPatientRecords(selectedPatientId)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#14324f] hover:bg-[#1a3e63] text-gray-200 hover:text-white border border-cyan-900/40 text-sm font-medium transition-all cursor-pointer shadow-sm"
              title="Refresh records"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#3ec1d3]' : ''}`} />
              <span>Refresh</span>
            </button>
            <button
              onClick={() => setIsNewPatientModalOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#3ec1d3] hover:bg-[#34adb9] text-[#081523] font-bold text-sm transition-all shadow-md shadow-[#3ec1d3]/25 hover:shadow-lg cursor-pointer"
            >
              <UserPlus className="w-4 h-4 stroke-[2.5]" />
              <span>New Patient Record</span>
            </button>
          </div>
        </div>

        {fetchError && (
          <div className="bg-rose-950/40 border border-rose-700/50 rounded-2xl px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-rose-200">Unable to load patient records</p>
                <p className="text-sm text-rose-200/80 mt-0.5">{fetchError}</p>
              </div>
            </div>
            <button
              onClick={() => fetchPatientRecords(selectedPatientId)}
              className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-800/60 hover:bg-rose-700/70 text-rose-100 text-sm font-semibold cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Retry
            </button>
          </div>
        )}

        {/* Dashboard Content: Two Column Layout (Patient Directory & EMR Workspace) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* Left Column: Patient Directory (lg:col-span-4) */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            
            {/* Search & Filter Card */}
            <div className="bg-[#0e2439] border border-cyan-900/30 rounded-2xl p-4 shadow-lg flex flex-col gap-3">
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search patient name, ID, phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-[#091929] border border-cyan-900/40 rounded-xl text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-[#3ec1d3] transition-colors"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Blood group filter tags */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                <span className="text-gray-400 text-[11px] font-medium uppercase tracking-wider mr-1">Blood:</span>
                {['all', 'O+', 'A+', 'B+', 'AB+'].map((bg) => (
                  <button
                    key={bg}
                    onClick={() => setFilterBlood(bg)}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                      filterBlood === bg
                        ? 'bg-[#3ec1d3] text-[#081523]'
                        : 'bg-[#14324f]/60 hover:bg-[#14324f] text-gray-300'
                    }`}
                  >
                    {bg === 'all' ? 'All' : bg}
                  </button>
                ))}
              </div>
            </div>

            {/* Patients Scrollable Directory List */}
            <div className="bg-[#0e2439] border border-cyan-900/30 rounded-2xl shadow-lg overflow-hidden flex flex-col">
              <div className="px-5 py-3.5 border-b border-cyan-900/30 flex items-center justify-between bg-[#112a42]">
                <span className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-[#3ec1d3]" />
                  Patients ({displayedPatients.length})
                </span>
                <span className="text-[11px] text-gray-400">Click to inspect</span>
              </div>

              <div className="max-h-[640px] overflow-y-auto divide-y divide-cyan-900/20">
                {loading && patients.length === 0 ? (
                  <div className="p-8 text-center text-gray-400 text-sm flex flex-col items-center gap-2">
                    <RefreshCw className="w-6 h-6 animate-spin text-[#3ec1d3]" />
                    <span>Loading patient records...</span>
                  </div>
                ) : displayedPatients.length === 0 ? (
                  <div className="p-8 text-center text-gray-400 text-sm flex flex-col items-center gap-3">
                    <User className="w-10 h-10 text-gray-600 stroke-[1.5]" />
                    <p className="font-semibold text-gray-300">No patient records found</p>
                    <p className="text-xs text-gray-500 max-w-xs">
                      Try searching with a different keyword or create a new patient record.
                    </p>
                    <button
                      onClick={() => setIsNewPatientModalOpen(true)}
                      className="mt-2 px-3 py-1.5 bg-[#3ec1d3] text-[#081523] rounded-lg text-xs font-bold hover:bg-[#34adb9] transition-all cursor-pointer"
                    >
                      + Add New Patient
                    </button>
                  </div>
                ) : (
                  displayedPatients.map((patient) => {
                    const isSelected = activePatient && activePatient._id === patient._id;
                    const allergyCount = patient.medicalHistory?.allergies?.length || 0;
                    const prescriptionCount = patient.prescriptions?.length || 0;
                    const xrayCount = patient.xrayImages?.length || 0;

                    return (
                      <div
                        key={patient._id}
                        onClick={() => setSelectedPatientId(patient._id)}
                        className={`p-4 cursor-pointer transition-all flex items-start justify-between gap-3 group relative ${
                          isSelected
                            ? 'bg-[#14324f] border-l-4 border-l-[#3ec1d3]'
                            : 'hover:bg-[#112a42]/70'
                        }`}
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 shadow-md ${
                            isSelected
                              ? 'bg-[#3ec1d3] text-[#081523]'
                              : 'bg-[#183a5c] text-[#3ec1d3] group-hover:bg-[#1c446c]'
                          }`}>
                            {patient.patientName?.charAt(0) || 'P'}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className={`font-bold text-sm truncate ${isSelected ? 'text-white' : 'text-gray-200'}`}>
                                {patient.patientName}
                              </h3>
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-[#091929] text-[#3ec1d3] border border-cyan-900/50">
                                {patient.patientId}
                              </span>
                            </div>
                            <p className="text-xs text-gray-400 truncate mt-0.5">
                              {patient.patientPhone || patient.patientEmail || 'No contact specified'}
                            </p>
                            
                            {/* Badges */}
                            <div className="flex items-center gap-1.5 mt-2 flex-wrap text-[11px]">
                              <span className="px-2 py-0.5 rounded bg-cyan-950/60 text-cyan-300 font-semibold border border-cyan-800/40">
                                {patient.bloodGroup || 'O+'}
                              </span>
                              {allergyCount > 0 && (
                                <span className="px-2 py-0.5 rounded bg-rose-950/60 text-rose-300 font-semibold border border-rose-800/40 flex items-center gap-1">
                                  <AlertTriangle className="w-2.5 h-2.5 text-rose-400" />
                                  {allergyCount} {allergyCount === 1 ? 'Allergy' : 'Allergies'}
                                </span>
                              )}
                              <span className="text-gray-500 text-[10px]">
                                {prescriptionCount} Rx • {xrayCount} X-Ray
                              </span>
                            </div>
                          </div>
                        </div>

                        <ChevronRight className={`w-4 h-4 shrink-0 mt-1 transition-transform ${
                          isSelected ? 'text-[#3ec1d3] translate-x-1' : 'text-gray-600 group-hover:text-gray-400'
                        }`} />
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Selected Patient Comprehensive EMR/EHR Workspace (lg:col-span-8) */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            {activePatient ? (
              <>
                {/* Patient Summary Demographics Banner */}
                <div className="bg-[#0e2439] border border-cyan-900/30 rounded-2xl p-6 shadow-xl relative overflow-hidden">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-cyan-900/30">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#12395b] to-[#1d507d] border-2 border-[#3ec1d3]/40 flex items-center justify-center font-extrabold text-2xl text-[#3ec1d3] shadow-inner shrink-0">
                        {activePatient.patientName?.charAt(0) || 'P'}
                      </div>
                      <div>
                        <div className="flex items-center gap-3 flex-wrap">
                          <h2 className="text-xl sm:text-2xl font-black text-white">
                            {activePatient.patientName}
                          </h2>
                          <span className="px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold bg-[#14324f] text-[#3ec1d3] border border-cyan-800/60">
                            {activePatient.patientId}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-cyan-950/80 text-cyan-300 border border-cyan-700/50">
                            Blood: {activePatient.bloodGroup || 'Unknown'}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-400 mt-2 flex-wrap">
                          <span className="flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-gray-400" />
                            {activePatient.gender || 'Unspecified'} • {calculateAge(activePatient.dateOfBirth)} yrs
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-gray-400" />
                            {activePatient.patientPhone || 'No phone'}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5 text-gray-400" />
                            {activePatient.patientEmail || 'No email'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Patient Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={handlePrintMedicalHistory}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#091929] hover:bg-[#102438] text-cyan-300 hover:text-white border border-cyan-800/50 text-xs font-semibold transition-all cursor-pointer shadow-sm"
                        title="Print Patient Medical Record"
                      >
                        <Printer className="w-3.5 h-3.5 text-[#3ec1d3]" />
                        <span>Print</span>
                      </button>

                      <button
                        onClick={() => handleOpenEdit(activePatient)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#14324f] hover:bg-[#1b4268] text-gray-200 hover:text-white border border-cyan-900/40 text-xs font-semibold transition-all cursor-pointer"
                        title="Edit Demographics & Medical Info"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-[#3ec1d3]" />
                        <span>Edit Patient</span>
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(activePatient._id)}
                        className="p-2 rounded-xl bg-rose-950/40 hover:bg-rose-950/80 text-rose-400 hover:text-rose-200 border border-rose-900/40 transition-all cursor-pointer"
                        title="Delete Patient Record"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Emergency Contact & Vitals Quick Strip */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 text-xs">
                    <div className="bg-[#091929] p-3 rounded-xl border border-cyan-900/30">
                      <span className="text-gray-400 block text-[11px] font-medium">Blood Pressure</span>
                      <span className="font-bold text-white text-sm mt-0.5 block flex items-center gap-1">
                        <HeartPulse className="w-3.5 h-3.5 text-rose-400" />
                        {activePatient.medicalHistory?.bloodPressure || '120/80 mmHg'}
                      </span>
                    </div>
                    <div className="bg-[#091929] p-3 rounded-xl border border-cyan-900/30">
                      <span className="text-gray-400 block text-[11px] font-medium">Heart Rate</span>
                      <span className="font-bold text-white text-sm mt-0.5 block flex items-center gap-1">
                        <Activity className="w-3.5 h-3.5 text-emerald-400" />
                        {activePatient.medicalHistory?.heartRate || '72 bpm'}
                      </span>
                    </div>
                    <div className="bg-[#091929] p-3 rounded-xl border border-cyan-900/30">
                      <span className="text-gray-400 block text-[11px] font-medium">Blood Glucose</span>
                      <span className="font-bold text-white text-sm mt-0.5 block">
                        {activePatient.medicalHistory?.bloodSugar || 'Normal'}
                      </span>
                    </div>
                    <div className="bg-[#091929] p-3 rounded-xl border border-cyan-900/30">
                      <span className="text-gray-400 block text-[11px] font-medium">Emergency Contact</span>
                      <span className="font-bold text-[#3ec1d3] truncate block mt-0.5" title={activePatient.emergencyContact || 'None'}>
                        {activePatient.emergencyContact || 'None designated'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* EMR / EHR Interactive Tab Navigation */}
                <div className="bg-[#0e2439] border border-cyan-900/30 rounded-2xl shadow-xl overflow-hidden flex flex-col">

                  {/* Medical Risk Alert Banner */}
                  {activePatient.medicalRiskFlags?.anesthesiaContraindication && (
                    <div className="bg-rose-950/40 border border-rose-700/50 p-4 flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="text-rose-300 font-bold text-sm mb-1">⚠️ ANESTHESIA CONTRAINDICATION DETECTED</h4>
                        <p className="text-rose-200 text-xs leading-relaxed">
                          {activePatient.medicalRiskFlags.highRiskWarning}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Compliance Badge */}
                  {activePatient.complianceStatus && activePatient.complianceStatus !== 'Good' && (
                    <div className={`${activePatient.complianceStatus === 'High Dropout Risk' ? 'bg-amber-950/40 border-amber-700/50' : 'bg-cyan-950/40 border-cyan-700/50'} border p-3 flex items-center gap-2`}>
                      <Shield className={`w-4 h-4 ${activePatient.complianceStatus === 'High Dropout Risk' ? 'text-amber-400' : 'text-cyan-400'}`} />
                      <span className={`text-xs font-semibold ${activePatient.complianceStatus === 'High Dropout Risk' ? 'text-amber-300' : 'text-cyan-300'}`}>
                        Compliance: {activePatient.complianceStatus}
                      </span>
                    </div>
                  )}

                  <div className="flex border-b border-cyan-900/30 bg-[#112a42] overflow-x-auto">
                    {[
                      { id: 'medical-history', label: 'Medical History', icon: FileText, count: null },
                      { id: 'prescriptions', label: 'Prescriptions', icon: Pill, count: activePatient.prescriptions?.length },
                      { id: 'xrays', label: 'X-Ray Reports & Imaging', icon: ImageIcon, count: activePatient.xrayImages?.length },
                      { id: 'treatments', label: 'Dental Treatment History', icon: Clock, count: (activePatient.pastTreatments || activePatient.treatmentHistory)?.length },
                      ...(!isDashboardVersion ? [
                        { id: 'tooth-timeline', label: 'Tooth Timeline', icon: Stethoscope, count: activePatient.toothHistory?.length },
                        { id: 'lab-orders', label: 'Lab Orders', icon: UploadCloud, count: activePatient.labOrders?.length },
                        { id: 'post-op-recovery', label: 'Post-Op Recovery', icon: HeartPulse, count: activePatient.postOpRecovery?.filter(r => r.urgentFlag).length },
                      ] : []),
                    ].map((tab) => {
                      const Icon = tab.icon;
                      const isActive = activeTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id)}
                          className={`flex items-center gap-2.5 px-6 py-4 font-bold text-sm border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                            isActive
                              ? 'border-[#3ec1d3] text-[#3ec1d3] bg-[#0e2439]'
                              : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-[#14324f]/40'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          <span>{tab.label}</span>
                          {tab.count !== null && tab.count > 0 && (
                            <span className={`px-2 py-0.2 rounded-full text-[11px] font-semibold ${
                              isActive ? 'bg-[#3ec1d3]/20 text-[#3ec1d3]' : 'bg-[#183a5c] text-gray-300'
                            }`}>
                              {tab.count}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Tab Body */}
                  <div className="p-6">
                    
                    {/* TAB 1: Medical History */}
                    {activeTab === 'medical-history' && (
                      <div className="flex flex-col gap-6 animate-in fade-in duration-200">
                        
                        {/* Medical History Action Header */}
                        <div className="flex items-center justify-between flex-wrap gap-4 pb-3 border-b border-cyan-900/30">
                          <div>
                            <h3 className="font-bold text-white text-base flex items-center gap-2">
                              <FileText className="w-4 h-4 text-[#3ec1d3]" />
                              Patient Medical History & Vitals
                            </h3>
                            <p className="text-xs text-gray-400 mt-0.5">
                              Comprehensive health profile, chronic conditions, allergy records, and clinical vitals.
                            </p>
                          </div>

                          {/* Action Toolbar: Update History, Edit, Delete, Print */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              type="button"
                              onClick={handleOpenMedicalHistoryModal}
                              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#3ec1d3] hover:bg-[#34adb9] text-[#081523] rounded-xl font-bold text-xs transition-all shadow-md cursor-pointer"
                              title="Update Patient Medical History"
                            >
                              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                              <span>Update History</span>
                            </button>

                            <button
                              type="button"
                              onClick={handleOpenMedicalHistoryModal}
                              className="flex items-center gap-1.5 px-3 py-2 bg-[#14324f] hover:bg-[#1a4066] text-[#3ec1d3] hover:text-white rounded-xl font-semibold text-xs transition-all border border-cyan-800/50 cursor-pointer"
                              title="Edit Medical History"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Edit</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setIsDeleteHistoryConfirmOpen(true)}
                              className="flex items-center gap-1.5 px-3 py-2 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 hover:text-rose-100 rounded-xl font-semibold text-xs transition-all border border-rose-800/40 cursor-pointer"
                              title="Clear / Delete Medical History"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete</span>
                            </button>

                            <button
                              type="button"
                              onClick={handlePrintMedicalHistory}
                              className="flex items-center gap-1.5 px-3 py-2 bg-[#091929] hover:bg-[#102438] text-gray-200 hover:text-white rounded-xl font-semibold text-xs transition-all border border-cyan-900/50 cursor-pointer shadow-sm"
                              title="Print Medical History Report"
                            >
                              <Printer className="w-3.5 h-3.5 text-cyan-400" />
                              <span>Print</span>
                            </button>
                          </div>
                        </div>

                        {/* Allergies Critical Banner */}
                        <div className="bg-rose-950/20 border border-rose-800/40 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div className="p-2 rounded-lg bg-rose-950/60 text-rose-400 shrink-0 border border-rose-800/50">
                              <AlertTriangle className="w-5 h-5" />
                            </div>
                            <div>
                              <h4 className="font-bold text-white text-sm flex items-center gap-2">
                                Known Allergies & Sensitivities
                              </h4>
                              <p className="text-xs text-rose-200/70 mt-0.5">
                                Critical clinical alerts prior to administering local anesthetics, latex, or antibiotics.
                              </p>
                              <div className="flex items-center gap-2 mt-2 flex-wrap">
                                {activePatient.medicalHistory?.allergies?.length > 0 ? (
                                  activePatient.medicalHistory.allergies.map((allergy, i) => (
                                    <span
                                      key={i}
                                      className="px-2.5 py-1 rounded-lg bg-rose-900/60 text-rose-200 text-xs font-bold border border-rose-700/60"
                                    >
                                      ⚠️ {allergy}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-xs text-emerald-400 font-medium">
                                    No known drug or environmental allergies reported.
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={handleOpenMedicalHistoryModal}
                            className="text-xs px-3 py-1.5 bg-rose-950/60 hover:bg-rose-900/60 text-rose-200 rounded-lg border border-rose-800/50 font-semibold self-start sm:self-center transition-colors cursor-pointer"
                          >
                            Update Allergies
                          </button>
                        </div>

                        {/* Systemic Conditions & Medications Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          
                          {/* Chronic Conditions */}
                          <div className="bg-[#091929] border border-cyan-900/30 rounded-xl p-5">
                            <h4 className="font-bold text-white text-sm flex items-center gap-2 mb-3">
                              <Shield className="w-4 h-4 text-[#3ec1d3]" />
                              Systemic & Chronic Health Conditions
                            </h4>
                            {activePatient.medicalHistory?.conditions?.length > 0 ? (
                              <ul className="space-y-2">
                                {activePatient.medicalHistory.conditions.map((c, i) => (
                                  <li key={i} className="flex items-center gap-2 text-xs text-gray-300 bg-[#0e2439] px-3 py-2 rounded-lg border border-cyan-900/20">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#3ec1d3]"></span>
                                    <span>{c}</span>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-xs text-gray-500 italic">No chronic medical conditions recorded.</p>
                            )}
                          </div>

                          {/* Current Medications */}
                          <div className="bg-[#091929] border border-cyan-900/30 rounded-xl p-5">
                            <h4 className="font-bold text-white text-sm flex items-center gap-2 mb-3">
                              <Pill className="w-4 h-4 text-emerald-400" />
                              Active Daily Medications
                            </h4>
                            {activePatient.medicalHistory?.currentMedications?.length > 0 ? (
                              <ul className="space-y-2">
                                {activePatient.medicalHistory.currentMedications.map((m, i) => (
                                  <li key={i} className="flex items-center gap-2 text-xs text-gray-300 bg-[#0e2439] px-3 py-2 rounded-lg border border-cyan-900/20">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                    <span>{m}</span>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-xs text-gray-500 italic">No regular daily medications taken.</p>
                            )}
                          </div>
                        </div>

                        {/* Clinical Medical Notes */}
                        <div className="bg-[#091929] border border-cyan-900/30 rounded-xl p-5">
                          <h4 className="font-bold text-white text-sm flex items-center gap-2 mb-2">
                            <FileText className="w-4 h-4 text-amber-400" />
                            Attending Doctor's Clinical Medical Notes
                          </h4>
                          <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap bg-[#0e2439] p-3.5 rounded-lg border border-cyan-900/20">
                            {activePatient.medicalHistory?.notes || 'No specific clinical medical history notes added for this patient.'}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* TAB 2: Prescriptions */}
                    {activeTab === 'prescriptions' && (
                      <div className="flex flex-col gap-5 animate-in fade-in duration-200">
                        <div className="flex items-center justify-between flex-wrap gap-3">
                          <div>
                            <h3 className="font-bold text-white text-base">Prescribed Medications</h3>
                            <p className="text-xs text-gray-400">Oral rinses, analgesics, and antibiotics prescribed for this patient.</p>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingPrescription(null);
                                setPrescriptionForm({
                                  medicineName: '',
                                  dosage: '',
                                  frequency: 'Twice daily after food',
                                  duration: '5 days',
                                  instructions: '',
                                });
                                setIsAddPrescriptionOpen(true);
                              }}
                              className="flex items-center gap-2 px-4 py-2 bg-[#3ec1d3] hover:bg-[#34adb9] text-[#081523] rounded-xl font-bold text-xs transition-all shadow-md cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                              <span>Add Prescription</span>
                            </button>

                            <button
                              type="button"
                              onClick={handlePrintAllPrescriptions}
                              className="flex items-center gap-1.5 px-3 py-2 bg-[#091929] hover:bg-[#102438] text-cyan-300 hover:text-white rounded-xl font-semibold text-xs transition-all border border-cyan-800/50 cursor-pointer shadow-sm"
                              title="Print All Prescriptions (Rx Sheet)"
                            >
                              <Printer className="w-3.5 h-3.5 text-[#3ec1d3]" />
                              <span>Print All Rx</span>
                            </button>
                          </div>
                        </div>

                        {activePatient.prescriptions?.length > 0 ? (
                          <div className="grid grid-cols-1 gap-3.5">
                            {activePatient.prescriptions.map((rx, idx) => (
                              <div
                                key={rx._id || idx}
                                className="bg-[#091929] border border-cyan-900/30 rounded-xl p-4 hover:border-cyan-700/50 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                              >
                                <div className="flex items-start gap-3.5">
                                  <div className="w-10 h-10 rounded-xl bg-[#14324f] text-[#3ec1d3] flex items-center justify-center shrink-0 border border-cyan-800/40">
                                    <Pill className="w-5 h-5" />
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <h4 className="font-bold text-white text-sm">{rx.medicineName}</h4>
                                      <span className="px-2 py-0.5 rounded bg-[#14324f] text-[#3ec1d3] font-mono text-xs font-semibold">
                                        {rx.dosage || 'Standard dose'}
                                      </span>
                                      <span className="px-2 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-800/40 text-xs font-medium">
                                        {rx.duration || '5 days'}
                                      </span>
                                    </div>
                                    <p className="text-xs text-gray-300 mt-1">
                                      <span className="text-gray-400 font-medium">Frequency:</span> {rx.frequency}
                                    </p>
                                    {rx.instructions && (
                                      <p className="text-xs text-cyan-200/80 mt-1 italic bg-[#0e2439] px-2.5 py-1 rounded border border-cyan-900/20 inline-block">
                                        💡 {rx.instructions}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                <div className="flex flex-col sm:items-end justify-between gap-3 shrink-0 md:border-l md:border-cyan-900/30 md:pl-4">
                                  <div className="text-left sm:text-right text-xs text-gray-400">
                                    <span className="block text-[11px] text-gray-500">Prescribed On</span>
                                    <span className="font-semibold text-gray-300">
                                      {rx.prescribedDate ? new Date(rx.prescribedDate).toLocaleDateString() : 'Recent'}
                                    </span>
                                  </div>

                                  {/* Quick Actions: Edit, Delete, Print */}
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <button
                                      type="button"
                                      onClick={() => handleOpenEditPrescription(rx)}
                                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#14324f] hover:bg-[#1a4066] text-cyan-300 hover:text-white text-xs font-semibold border border-cyan-800/40 transition-all cursor-pointer"
                                      title="Edit Prescription"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                      <span>Edit</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleDeletePrescription(rx._id || idx)}
                                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 hover:text-rose-100 text-xs font-semibold border border-rose-800/40 transition-all cursor-pointer"
                                      title="Delete Prescription"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                      <span>Delete</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handlePrintPrescription(rx)}
                                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#091929] hover:bg-[#102438] text-gray-200 hover:text-white text-xs font-semibold border border-cyan-900/50 transition-all cursor-pointer shadow-sm"
                                      title="Print Single Prescription (Rx)"
                                    >
                                      <Printer className="w-3.5 h-3.5 text-[#3ec1d3]" />
                                      <span>Print</span>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-10 border border-dashed border-cyan-900/40 rounded-xl text-center flex flex-col items-center gap-3">
                            <Pill className="w-8 h-8 text-gray-600" />
                            <p className="text-sm font-semibold text-gray-300">No prescriptions on file</p>
                            <p className="text-xs text-gray-500 max-w-sm">
                              Click the "Add Prescription" button above to record medications, dosage, and instructions.
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* TAB 3: X-Ray Reports & Imaging */}
                    {activeTab === 'xrays' && (
                      <div className="flex flex-col gap-5 animate-in fade-in duration-200">
                        <div className="flex items-center justify-between flex-wrap gap-3">
                          <div>
                            <h3 className="font-bold text-white text-base">Dental Radiographs & Diagnostic Imaging</h3>
                            <p className="text-xs text-gray-400">Panoramic OPG, Periapical, Bitewing, and 3D CBCT scans.</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingXray(null);
                              setXrayForm({ title: '', modality: 'OPG Panoramic', imageUrl: '', radiologistNotes: '' });
                              setXrayFilePreview('');
                              setIsAddXrayOpen(true);
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-[#3ec1d3] hover:bg-[#34adb9] text-[#081523] rounded-xl font-bold text-xs transition-all shadow-md cursor-pointer"
                          >
                            <UploadCloud className="w-3.5 h-3.5 stroke-[2.5]" />
                            <span>Upload X-Ray Report</span>
                          </button>
                        </div>

                        {activePatient.xrayImages?.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {activePatient.xrayImages.map((xray, idx) => (
                              <div
                                key={xray._id || idx}
                                className="bg-[#091929] border border-cyan-900/30 rounded-xl overflow-hidden hover:border-[#3ec1d3]/50 transition-all flex flex-col group"
                              >
                                {/* Image thumbnail container */}
                                <div
                                  onClick={() => setSelectedXrayPreview(xray)}
                                  className="relative h-48 bg-black/60 overflow-hidden cursor-pointer flex items-center justify-center group"
                                >
                                  <img
                                    src={xray.imageUrl}
                                    alt={xray.title}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-90 group-hover:opacity-100"
                                    onError={(e) => {
                                      e.currentTarget.src = 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=1000&q=80';
                                    }}
                                  />
                                  <div className="absolute inset-0 bg-gradient-to-t from-[#091929] via-transparent to-black/40"></div>
                                  
                                  {/* Modality Tag */}
                                  <span className="absolute top-3 left-3 px-2.5 py-1 rounded-lg text-xs font-bold bg-[#0e2439]/90 text-[#3ec1d3] border border-cyan-800/50 backdrop-blur-md">
                                    {xray.modality || 'Dental X-Ray'}
                                  </span>

                                  {/* Hover preview button */}
                                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 backdrop-blur-[2px]">
                                    <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#3ec1d3] text-[#081523] font-bold text-xs shadow-lg">
                                      <Maximize2 className="w-3.5 h-3.5" /> Full Inspection
                                    </span>
                                  </div>
                                </div>

                                {/* X-Ray Info */}
                                <div className="p-4 flex flex-col gap-2 flex-1">
                                  <div className="flex items-center justify-between gap-2">
                                    <h4 className="font-bold text-white text-sm truncate" title={xray.title}>
                                      {xray.title}
                                    </h4>
                                    <span className="text-[11px] text-gray-400 shrink-0">
                                      {xray.date ? new Date(xray.date).toLocaleDateString() : 'Recent'}
                                    </span>
                                  </div>

                                  {xray.radiologistNotes && (
                                    <p className="text-xs text-gray-300 line-clamp-3 bg-[#0e2439] p-2.5 rounded-lg border border-cyan-900/20">
                                      <span className="text-[#3ec1d3] font-semibold">Report: </span>
                                      {xray.radiologistNotes}
                                    </p>
                                  )}

                                  {/* Action Buttons: Edit, Delete, Print */}
                                  <div className="flex items-center gap-1.5 flex-wrap pt-1 mt-auto border-t border-cyan-900/20">
                                    <button
                                      type="button"
                                      onClick={() => handleOpenEditXray(xray)}
                                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#14324f] hover:bg-[#1a4066] text-cyan-300 hover:text-white text-xs font-semibold border border-cyan-800/40 transition-all cursor-pointer"
                                      title="Edit X-Ray Report"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                      <span>Edit</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleDeleteXray(xray._id || idx)}
                                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 hover:text-rose-100 text-xs font-semibold border border-rose-800/40 transition-all cursor-pointer"
                                      title="Delete X-Ray Report"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                      <span>Delete</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handlePrintXray(xray)}
                                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#091929] hover:bg-[#102438] text-gray-200 hover:text-white text-xs font-semibold border border-cyan-900/50 transition-all cursor-pointer shadow-sm"
                                      title="Print Radiograph Report"
                                    >
                                      <Printer className="w-3.5 h-3.5 text-[#3ec1d3]" />
                                      <span>Print</span>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-10 border border-dashed border-cyan-900/40 rounded-xl text-center flex flex-col items-center gap-3">
                            <ImageIcon className="w-8 h-8 text-gray-600" />
                            <p className="text-sm font-semibold text-gray-300">No radiographic imaging on file</p>
                            <p className="text-xs text-gray-500 max-w-sm">
                              Upload digital OPG panoramic or periapical dental radiographs for this patient using the button above.
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* TAB 4: Dental Treatment History */}
                    {activeTab === 'treatments' && (
                      <div className="flex flex-col gap-5 animate-in fade-in duration-200">
                        <div className="flex items-center justify-between flex-wrap gap-3">
                          <div>
                            <h3 className="font-bold text-white text-base">Dental Procedure History</h3>
                            <p className="text-xs text-gray-400">Past operative procedures, endodontics, prosthodontics, and cleanings.</p>
                          </div>
                          <button
                            onClick={() => setIsAddTreatmentOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-[#3ec1d3] hover:bg-[#34adb9] text-[#081523] rounded-xl font-bold text-xs transition-all shadow-md cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                            <span>Record New Treatment</span>
                          </button>
                        </div>

                        {((activePatient.pastTreatments || activePatient.treatmentHistory)?.length > 0) ? (
                          <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-cyan-900/50">
                            {(activePatient.pastTreatments || activePatient.treatmentHistory).map((t, idx) => (
                              <div key={t._id || idx} className="relative group">
                                {/* Timeline Dot */}
                                <div className={`absolute -left-[27px] top-1.5 w-3.5 h-3.5 rounded-full border-2 border-[#081523] ${
                                  t.status === 'Completed' ? 'bg-emerald-400' : 'bg-amber-400'
                                } shadow-md`}></div>

                                <div className="bg-[#091929] border border-cyan-900/30 rounded-xl p-4.5 hover:border-cyan-700/50 transition-all flex flex-col gap-2.5">
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                    <div className="flex items-center gap-2.5 flex-wrap">
                                      <h4 className="font-bold text-white text-sm">{t.procedure}</h4>
                                      <span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-[#14324f] text-[#3ec1d3]">
                                        Tooth: {t.toothNumber || 'All'}
                                      </span>
                                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                        t.status === 'Completed'
                                          ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-800/40'
                                          : 'bg-amber-950/70 text-amber-300 border border-amber-800/40'
                                      }`}>
                                        {t.status || 'Completed'}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-gray-400">
                                      {t.cost > 0 && (
                                        <span className="font-mono font-bold text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/30">
                                          ${t.cost}
                                        </span>
                                      )}
                                      <span className="font-semibold text-gray-300">
                                        {t.treatmentDate ? new Date(t.treatmentDate).toLocaleDateString() : 'N/A'}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="text-xs text-gray-400 flex items-center gap-2">
                                    <span>Attending: <strong className="text-gray-200">{t.doctorName || 'Dr. Sarah Johnson'}</strong></span>
                                  </div>

                                  {t.notes && (
                                    <p className="text-xs text-gray-300 bg-[#0e2439] p-3 rounded-lg border border-cyan-900/20 leading-relaxed">
                                      {t.notes}
                                    </p>
                                  )}

                                  {/* Action Buttons */}
                                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-cyan-900/20 mt-1">
                                    <button
                                      onClick={() => handleOpenEditTreatment(t)}
                                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#14324f] hover:bg-[#1a3e63] text-gray-300 text-xs font-semibold transition-colors cursor-pointer"
                                      title="Edit Treatment"
                                    >
                                      <Edit3 className="w-3 h-3" />
                                      <span>Edit</span>
                                    </button>
                                    <button
                                      onClick={() => handleDeleteTreatment(t._id || idx)}
                                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-950/50 hover:bg-rose-950/70 text-rose-300 text-xs font-semibold transition-colors cursor-pointer"
                                      title="Delete Treatment"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                      <span>Delete</span>
                                    </button>
                                    <button
                                      onClick={() => handlePrintTreatment(t)}
                                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#14324f] hover:bg-[#1a3e63] text-[#3ec1d3] text-xs font-semibold transition-colors cursor-pointer"
                                      title="Print Treatment Record"
                                    >
                                      <Printer className="w-3.5 h-3.5 text-[#3ec1d3]" />
                                      <span>Print</span>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-10 border border-dashed border-cyan-900/40 rounded-xl text-center flex flex-col items-center gap-3">
                            <Clock className="w-8 h-8 text-gray-600" />
                            <p className="text-sm font-semibold text-gray-300">No dental treatment history recorded</p>
                            <p className="text-xs text-gray-500 max-w-sm">
                              Log past dental visits, restorations, extractions, or implants using the button above.
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {!isDashboardVersion && (
                      <>
                        {/* TAB 5: Tooth Timeline */}
                        {activeTab === 'tooth-timeline' && (
                          <div className="flex flex-col gap-5 animate-in fade-in duration-200">
                            <div className="flex items-center justify-between flex-wrap gap-3">
                              <div>
                                <h3 className="font-bold text-white text-base">Tooth Timeline</h3>
                                <p className="text-xs text-gray-400">Visual timeline of dental procedures by tooth number</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => setIsAddToothTimelineOpen(true)}
                                  className="flex items-center gap-2 px-4 py-2 bg-[#3ec1d3] hover:bg-[#34adb9] text-[#081523] rounded-xl font-bold text-xs transition-all shadow-md cursor-pointer"
                                >
                                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                                  <span>Add Entry</span>
                                </button>
                                <button
                                  onClick={fetchToothTimeline}
                                  className="flex items-center gap-2 px-4 py-2 bg-[#14324f] hover:bg-[#1a4066] text-[#3ec1d3] rounded-xl font-bold text-xs transition-all border border-cyan-800/50 cursor-pointer"
                                >
                                  <RefreshCw className="w-3.5 h-3.5" />
                                  <span>Refresh</span>
                                </button>
                              </div>
                            </div>

                            {toothTimelineLoading ? (
                              <div className="p-10 border border-dashed border-cyan-900/40 rounded-xl text-center flex flex-col items-center gap-3">
                                <div className="w-8 h-8 border-2 border-[#3ec1d3] border-t-transparent rounded-full animate-spin"></div>
                                <p className="text-sm font-semibold text-gray-300">Loading tooth timeline...</p>
                              </div>
                            ) : toothTimelineData && toothTimelineData.toothHistory && toothTimelineData.toothHistory.length > 0 ? (
                              <div className="space-y-3">
                                {toothTimelineData.toothHistory.map((entry, idx) => (
                                  <div
                                    key={idx}
                                    className="bg-[#0e2439] border border-cyan-900/30 rounded-xl p-4 hover:border-[#3ec1d3]/50 transition-all"
                                  >
                                    <div className="flex items-start justify-between gap-4">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                          <span className="px-2 py-1 bg-[#3ec1d3]/20 text-[#3ec1d3] rounded-lg text-xs font-bold">
                                            Tooth #{entry.toothNumber}
                                          </span>
                                          <span className="text-xs text-gray-400">
                                            {new Date(entry.date).toLocaleDateString()}
                                          </span>
                                        </div>
                                        <h4 className="text-sm font-bold text-white mb-1">{entry.procedure}</h4>
                                        <p className="text-xs text-gray-400 mb-2">
                                          Doctor: {entry.doctorInfo?.name || entry.doctor} ({entry.doctorInfo?.specialty || 'General Dentistry'})
                                        </p>
                                        {entry.notes && (
                                          <p className="text-xs text-gray-500 italic">{entry.notes}</p>
                                        )}
                                      </div>
                                      <div className="flex flex-col items-end gap-2">
                                        <span className={`px-2 py-1 rounded-lg text-xs font-bold ${
                                          entry.status === 'Completed' ? 'bg-emerald-500/20 text-emerald-300' :
                                          entry.status === 'In Progress' ? 'bg-amber-500/20 text-amber-300' :
                                          entry.status === 'Proposed' ? 'bg-blue-500/20 text-blue-300' :
                                          'bg-rose-500/20 text-rose-300'
                                        }`}>
                                          {entry.status}
                                        </span>
                                        {entry.cost > 0 && (
                                          <span className="text-xs text-gray-400">${entry.cost}</span>
                                        )}
                                        <div className="flex items-center gap-1 mt-2">
                                          <button
                                            onClick={() => handleEditToothTimeline(entry, idx)}
                                            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#14324f] hover:bg-[#1a4066] text-[#3ec1d3] text-xs font-semibold transition-colors cursor-pointer"
                                            title="Edit Entry"
                                          >
                                            <Edit3 className="w-3 h-3" />
                                          </button>
                                          <button
                                            onClick={() => handleDeleteToothTimeline(idx)}
                                            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-950/50 hover:bg-rose-950/70 text-rose-300 text-xs font-semibold transition-colors cursor-pointer"
                                            title="Delete Entry"
                                          >
                                            <Trash2 className="w-3 h-3" />
                                          </button>
                                          <button
                                            onClick={() => handlePrintToothTimeline(entry)}
                                            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#091929] hover:bg-[#102438] text-gray-200 text-xs font-semibold transition-colors cursor-pointer"
                                            title="Print Entry"
                                          >
                                            <Printer className="w-3 h-3 text-cyan-400" />
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                                {toothTimelineData.totalRecords > toothTimelineData.toothHistory.length && (
                                  <div className="text-center pt-4">
                                    <p className="text-xs text-gray-400">
                                      Showing {toothTimelineData.toothHistory.length} of {toothTimelineData.totalRecords} records
                                    </p>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="p-10 border border-dashed border-cyan-900/40 rounded-xl text-center flex flex-col items-center gap-3">
                                <Stethoscope className="w-8 h-8 text-gray-600" />
                                <p className="text-sm font-semibold text-gray-300">No tooth timeline data recorded</p>
                                <p className="text-xs text-gray-500 max-w-sm">
                                  Track dental procedures and treatments by specific tooth numbers to visualize treatment history.
                                </p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* TAB 6: Lab Orders */}
                        {activeTab === 'lab-orders' && (
                          <div className="flex flex-col gap-5 animate-in fade-in duration-200">
                            <div className="flex items-center justify-between flex-wrap gap-3">
                              <div>
                                <h3 className="font-bold text-white text-base">Lab Orders</h3>
                                <p className="text-xs text-gray-400">Dental laboratory orders and tracking</p>
                              </div>
                              <button
                                type="button"
                                onClick={handleOpenNewLabOrder}
                                className="flex items-center gap-2 px-4 py-2 bg-[#3ec1d3] hover:bg-[#34adb9] text-[#081523] rounded-xl font-bold text-xs transition-all shadow-md cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                                <span>New Lab Order</span>
                              </button>
                            </div>

                            {activePatient.labOrders?.length > 0 ? (
                              <div className="grid grid-cols-1 gap-3.5">
                                {activePatient.labOrders.map((order, idx) => (
                                  <div
                                    key={order._id || order.orderId || idx}
                                    className="bg-[#091929] border border-cyan-900/30 rounded-xl p-4 hover:border-cyan-700/50 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                                  >
                                    <div className="flex items-start gap-3.5 min-w-0">
                                      <div className="w-10 h-10 rounded-xl bg-[#14324f] text-[#3ec1d3] flex items-center justify-center shrink-0 border border-cyan-800/40">
                                        <UploadCloud className="w-5 h-5" />
                                      </div>
                                      <div className="min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <h4 className="font-bold text-white text-sm">{order.labType}</h4>
                                          <span className="px-2 py-0.5 rounded bg-[#14324f] text-[#3ec1d3] font-mono text-xs font-semibold">
                                            {order.orderId}
                                          </span>
                                          <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${labStatusClass(order.status)}`}>
                                            {order.status}
                                          </span>
                                        </div>
                                        <p className="text-xs text-gray-300 mt-1">
                                          <span className="text-gray-400 font-medium">Tooth:</span> #{order.toothNumber}
                                          <span className="mx-2 text-gray-600">•</span>
                                          <span className="text-gray-400 font-medium">Material:</span> {order.material || 'Porcelain'}
                                        </p>
                                        <p className="text-xs text-gray-400 mt-1">
                                          Expected delivery: <span className="text-gray-300">{formatLabDate(order.expectedDeliveryDate)}</span>
                                        </p>
                                      </div>
                                    </div>

                                    {/* Right side: View Details + Edit Order */}
                                    <div className="flex items-center gap-2 shrink-0 md:border-l md:border-cyan-900/30 md:pl-4">
                                      <button
                                        type="button"
                                        onClick={() => setViewingLabOrder(order)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#091929] hover:bg-[#102438] text-gray-200 hover:text-white text-xs font-semibold border border-cyan-900/50 transition-all cursor-pointer"
                                      >
                                        <Eye className="w-3.5 h-3.5 text-[#3ec1d3]" />
                                        <span>View Details</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleOpenEditLabOrder(order)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#14324f] hover:bg-[#1a4066] text-cyan-300 hover:text-white text-xs font-semibold border border-cyan-800/40 transition-all cursor-pointer"
                                      >
                                        <Edit3 className="w-3.5 h-3.5" />
                                        <span>Edit Order</span>
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="p-10 border border-dashed border-cyan-900/40 rounded-xl text-center flex flex-col items-center gap-3">
                                <UploadCloud className="w-8 h-8 text-gray-600" />
                                <p className="text-sm font-semibold text-gray-300">No lab orders recorded</p>
                                <p className="text-xs text-gray-500 max-w-sm">
                                  Create and track dental laboratory orders for crowns, bridges, dentures, and orthodontic appliances.
                                </p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* TAB 7: Post-Op Recovery */}
                     {activeTab === 'post-op-recovery' && (
  <PostOpRecovery defaultPatientId={activePatient?._id} activePatient={activePatient} patientsList={patients} />
)}
                      </>
                    )}

                  </div>
                </div>
              </>
            ) : (
              <div className="bg-[#0e2439] border border-cyan-900/30 rounded-2xl p-12 text-center flex flex-col items-center gap-4">
                <User className="w-16 h-16 text-gray-600" />
                <h3 className="text-xl font-bold text-white">No Patient Record Selected</h3>
                <p className="text-sm text-gray-400 max-w-md">
                  Choose a patient from the directory on the left or create a brand new digital patient chart.
                </p>
                <button
                  onClick={() => setIsNewPatientModalOpen(true)}
                  className="px-6 py-2.5 bg-[#3ec1d3] text-[#081523] rounded-xl font-bold text-sm hover:bg-[#34adb9] transition-all cursor-pointer shadow-lg shadow-[#3ec1d3]/20"
                >
                  + Add First Patient Record
                </button>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ===================== MODALS ===================== */}

      {/* 1. Modal: Create New Patient Record */}
      {isNewPatientModalOpen && (
        <div className="fixed inset-0 z-[1500] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#0e2439] border border-cyan-900/50 rounded-2xl max-w-2xl w-full p-6 shadow-2xl my-8 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-cyan-900/40">
              <div className="flex items-center gap-2.5">
                <UserPlus className="w-5 h-5 text-[#3ec1d3]" />
                <h3 className="text-lg font-bold text-white">Create Digital Patient Record (EMR)</h3>
              </div>
              <button
                onClick={() => setIsNewPatientModalOpen(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-[#14324f]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePatient} className="mt-5 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Patient Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Eleanor Vance"
                    value={newPatientForm.patientName}
                    onChange={(e) => setNewPatientForm({ ...newPatientForm, patientName: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#091929] border border-cyan-900/40 rounded-xl text-white focus:outline-none focus:border-[#3ec1d3]"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Custom Patient ID (Optional)</label>
                  <input
                    type="text"
                    placeholder="Auto-assigned (e.g. PAT-1050)"
                    value={newPatientForm.patientId}
                    onChange={(e) => setNewPatientForm({ ...newPatientForm, patientId: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#091929] border border-cyan-900/40 rounded-xl text-white focus:outline-none focus:border-[#3ec1d3]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Email Address</label>
                  <input
                    type="email"
                    placeholder="eleanor@example.com"
                    value={newPatientForm.patientEmail}
                    onChange={(e) => setNewPatientForm({ ...newPatientForm, patientEmail: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#091929] border border-cyan-900/40 rounded-xl text-white focus:outline-none focus:border-[#3ec1d3]"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Phone Number</label>
                  <input
                    type="tel"
                    placeholder="+1 (512) 000-0000"
                    value={newPatientForm.patientPhone}
                    onChange={(e) => setNewPatientForm({ ...newPatientForm, patientPhone: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#091929] border border-cyan-900/40 rounded-xl text-white focus:outline-none focus:border-[#3ec1d3]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={newPatientForm.dateOfBirth}
                    onChange={(e) => setNewPatientForm({ ...newPatientForm, dateOfBirth: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#091929] border border-cyan-900/40 rounded-xl text-white focus:outline-none focus:border-[#3ec1d3]"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Gender</label>
                  <select
                    value={newPatientForm.gender}
                    onChange={(e) => setNewPatientForm({ ...newPatientForm, gender: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#091929] border border-cyan-900/40 rounded-xl text-white focus:outline-none focus:border-[#3ec1d3]"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Blood Group</label>
                  <select
                    value={newPatientForm.bloodGroup}
                    onChange={(e) => setNewPatientForm({ ...newPatientForm, bloodGroup: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#091929] border border-cyan-900/40 rounded-xl text-white focus:outline-none focus:border-[#3ec1d3]"
                  >
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="Unknown">Unknown</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-gray-300 font-semibold mb-1">Emergency Contact Info</label>
                <input
                  type="text"
                  placeholder="e.g. John Doe (Brother) - 512-555-1234"
                  value={newPatientForm.emergencyContact}
                  onChange={(e) => setNewPatientForm({ ...newPatientForm, emergencyContact: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#091929] border border-cyan-900/40 rounded-xl text-white focus:outline-none focus:border-[#3ec1d3]"
                />
              </div>

              <div className="pt-2 border-t border-cyan-900/30">
                <span className="font-bold text-[#3ec1d3] block mb-2">Medical History & Vitals</span>
                <div className="space-y-3">
                  <div>
                    <label className="block text-gray-300 font-semibold mb-1">
                      Allergies (comma-separated, e.g. Penicillin, Latex)
                    </label>
                    <input
                      type="text"
                      placeholder="Penicillin, Latex, Local Anesthetic"
                      value={newPatientForm.allergies}
                      onChange={(e) => setNewPatientForm({ ...newPatientForm, allergies: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-[#091929] border border-cyan-900/40 rounded-xl text-white focus:outline-none focus:border-[#3ec1d3]"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-300 font-semibold mb-1">
                      Systemic Conditions (comma-separated, e.g. Hypertension, Diabetes)
                    </label>
                    <input
                      type="text"
                      placeholder="Hypertension, Asthma, Diabetes"
                      value={newPatientForm.conditions}
                      onChange={(e) => setNewPatientForm({ ...newPatientForm, conditions: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-[#091929] border border-cyan-900/40 rounded-xl text-white focus:outline-none focus:border-[#3ec1d3]"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-gray-300 font-semibold mb-1">Blood Pressure</label>
                      <input
                        type="text"
                        value={newPatientForm.bloodPressure}
                        onChange={(e) => setNewPatientForm({ ...newPatientForm, bloodPressure: e.target.value })}
                        className="w-full px-3 py-2 bg-[#091929] border border-cyan-900/40 rounded-xl text-white focus:outline-none focus:border-[#3ec1d3]"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 font-semibold mb-1">Heart Rate</label>
                      <input
                        type="text"
                        value={newPatientForm.heartRate}
                        onChange={(e) => setNewPatientForm({ ...newPatientForm, heartRate: e.target.value })}
                        className="w-full px-3 py-2 bg-[#091929] border border-cyan-900/40 rounded-xl text-white focus:outline-none focus:border-[#3ec1d3]"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 font-semibold mb-1">Blood Sugar</label>
                      <input
                        type="text"
                        value={newPatientForm.bloodSugar}
                        onChange={(e) => setNewPatientForm({ ...newPatientForm, bloodSugar: e.target.value })}
                        className="w-full px-3 py-2 bg-[#091929] border border-cyan-900/40 rounded-xl text-white focus:outline-none focus:border-[#3ec1d3]"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-cyan-900/40">
                <button
                  type="button"
                  onClick={() => setIsNewPatientModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-[#14324f] hover:bg-[#1a3e63] text-gray-300 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-[#3ec1d3] hover:bg-[#34adb9] text-[#081523] font-bold cursor-pointer shadow-lg shadow-[#3ec1d3]/20"
                >
                  Save Patient Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Modal: Edit Patient Demographics & Medical History */}
      {isEditPatientModalOpen && editPatientForm && (
        <div className="fixed inset-0 z-[1500] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#0e2439] border border-cyan-900/50 rounded-2xl max-w-2xl w-full p-6 shadow-2xl my-8 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-cyan-900/40">
              <div className="flex items-center gap-2.5">
                <Edit3 className="w-5 h-5 text-[#3ec1d3]" />
                <h3 className="text-lg font-bold text-white">
                  Edit Patient: {editPatientForm.patientName} ({editPatientForm.patientId})
                </h3>
              </div>
              <button
                onClick={() => setIsEditPatientModalOpen(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-[#14324f]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdatePatient} className="mt-5 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Patient Name *</label>
                  <input
                    type="text"
                    required
                    value={editPatientForm.patientName}
                    onChange={(e) => setEditPatientForm({ ...editPatientForm, patientName: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#091929] border border-cyan-900/40 rounded-xl text-white focus:outline-none focus:border-[#3ec1d3]"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Emergency Contact</label>
                  <input
                    type="text"
                    value={editPatientForm.emergencyContact}
                    onChange={(e) => setEditPatientForm({ ...editPatientForm, emergencyContact: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#091929] border border-cyan-900/40 rounded-xl text-white focus:outline-none focus:border-[#3ec1d3]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Phone</label>
                  <input
                    type="tel"
                    value={editPatientForm.patientPhone}
                    onChange={(e) => setEditPatientForm({ ...editPatientForm, patientPhone: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#091929] border border-cyan-900/40 rounded-xl text-white focus:outline-none focus:border-[#3ec1d3]"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Email</label>
                  <input
                    type="email"
                    value={editPatientForm.patientEmail}
                    onChange={(e) => setEditPatientForm({ ...editPatientForm, patientEmail: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#091929] border border-cyan-900/40 rounded-xl text-white focus:outline-none focus:border-[#3ec1d3]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={editPatientForm.dateOfBirth}
                    onChange={(e) => setEditPatientForm({ ...editPatientForm, dateOfBirth: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#091929] border border-cyan-900/40 rounded-xl text-white focus:outline-none focus:border-[#3ec1d3]"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Gender</label>
                  <select
                    value={editPatientForm.gender}
                    onChange={(e) => setEditPatientForm({ ...editPatientForm, gender: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#091929] border border-cyan-900/40 rounded-xl text-white focus:outline-none focus:border-[#3ec1d3]"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Blood Group</label>
                  <select
                    value={editPatientForm.bloodGroup}
                    onChange={(e) => setEditPatientForm({ ...editPatientForm, bloodGroup: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#091929] border border-cyan-900/40 rounded-xl text-white focus:outline-none focus:border-[#3ec1d3]"
                  >
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="Unknown">Unknown</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 border-t border-cyan-900/30">
                <span className="font-bold text-[#3ec1d3] block mb-2">Medical History & Allergies</span>
                <div className="space-y-3">
                  <div>
                    <label className="block text-gray-300 font-semibold mb-1">Allergies (comma-separated)</label>
                    <input
                      type="text"
                      value={editPatientForm.allergies}
                      onChange={(e) => setEditPatientForm({ ...editPatientForm, allergies: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-[#091929] border border-cyan-900/40 rounded-xl text-white focus:outline-none focus:border-[#3ec1d3]"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-300 font-semibold mb-1">Conditions (comma-separated)</label>
                    <input
                      type="text"
                      value={editPatientForm.conditions}
                      onChange={(e) => setEditPatientForm({ ...editPatientForm, conditions: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-[#091929] border border-cyan-900/40 rounded-xl text-white focus:outline-none focus:border-[#3ec1d3]"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-gray-300 font-semibold mb-1">Blood Pressure</label>
                      <input
                        type="text"
                        value={editPatientForm.bloodPressure}
                        onChange={(e) => setEditPatientForm({ ...editPatientForm, bloodPressure: e.target.value })}
                        className="w-full px-3 py-2 bg-[#091929] border border-cyan-900/40 rounded-xl text-white focus:outline-none focus:border-[#3ec1d3]"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 font-semibold mb-1">Heart Rate</label>
                      <input
                        type="text"
                        value={editPatientForm.heartRate}
                        onChange={(e) => setEditPatientForm({ ...editPatientForm, heartRate: e.target.value })}
                        className="w-full px-3 py-2 bg-[#091929] border border-cyan-900/40 rounded-xl text-white focus:outline-none focus:border-[#3ec1d3]"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 font-semibold mb-1">Blood Sugar</label>
                      <input
                        type="text"
                        value={editPatientForm.bloodSugar}
                        onChange={(e) => setEditPatientForm({ ...editPatientForm, bloodSugar: e.target.value })}
                        className="w-full px-3 py-2 bg-[#091929] border border-cyan-900/40 rounded-xl text-white focus:outline-none focus:border-[#3ec1d3]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-gray-300 font-semibold mb-1">Clinical Notes</label>
                    <textarea
                      rows={3}
                      value={editPatientForm.medicalNotes}
                      onChange={(e) => setEditPatientForm({ ...editPatientForm, medicalNotes: e.target.value })}
                      className="w-full px-3.5 py-2 bg-[#091929] border border-cyan-900/40 rounded-xl text-white focus:outline-none focus:border-[#3ec1d3]"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-cyan-900/40">
                <button
                  type="button"
                  onClick={() => setIsEditPatientModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-[#14324f] hover:bg-[#1a3e63] text-gray-300 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-[#3ec1d3] hover:bg-[#34adb9] text-[#081523] font-bold cursor-pointer shadow-lg shadow-[#3ec1d3]/20"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Modal: Add / Edit Prescription */}
      {isAddPrescriptionOpen && (
        <div className="fixed inset-0 z-[1500] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0e2439] border border-cyan-900/50 rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-cyan-900/40">
              <div className="flex items-center gap-2.5">
                <Pill className="w-5 h-5 text-[#3ec1d3]" />
                <h3 className="text-lg font-bold text-white">
                  {editingPrescription
                    ? `Edit Prescription for ${activePatient?.patientName}`
                    : `Add Prescription for ${activePatient?.patientName}`}
                </h3>
              </div>
              <button
                onClick={() => {
                  setIsAddPrescriptionOpen(false);
                  setEditingPrescription(null);
                }}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-[#14324f]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddPrescription} className="mt-5 space-y-4 text-xs">
              <div>
                <label className="block text-gray-300 font-semibold mb-1">Medicine Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Amoxicillin 500mg, Ketorolac, Chlorhexidine"
                  value={prescriptionForm.medicineName}
                  onChange={(e) => setPrescriptionForm({ ...prescriptionForm, medicineName: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#091929] border border-cyan-900/40 rounded-xl text-white focus:outline-none focus:border-[#3ec1d3]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Dosage</label>
                  <input
                    type="text"
                    placeholder="e.g. 500mg, 1 tablet"
                    value={prescriptionForm.dosage}
                    onChange={(e) => setPrescriptionForm({ ...prescriptionForm, dosage: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#091929] border border-cyan-900/40 rounded-xl text-white focus:outline-none focus:border-[#3ec1d3]"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Duration</label>
                  <input
                    type="text"
                    placeholder="e.g. 5 days, 7 days"
                    value={prescriptionForm.duration}
                    onChange={(e) => setPrescriptionForm({ ...prescriptionForm, duration: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#091929] border border-cyan-900/40 rounded-xl text-white focus:outline-none focus:border-[#3ec1d3]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-300 font-semibold mb-1">Frequency</label>
                <input
                  type="text"
                  placeholder="e.g. Twice daily after meals, every 8 hours"
                  value={prescriptionForm.frequency}
                  onChange={(e) => setPrescriptionForm({ ...prescriptionForm, frequency: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#091929] border border-cyan-900/40 rounded-xl text-white focus:outline-none focus:border-[#3ec1d3]"
                />
              </div>

              <div>
                <label className="block text-gray-300 font-semibold mb-1">Special Instructions</label>
                <textarea
                  rows={2}
                  placeholder="Take with full glass of water. Complete total course."
                  value={prescriptionForm.instructions}
                  onChange={(e) => setPrescriptionForm({ ...prescriptionForm, instructions: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#091929] border border-cyan-900/40 rounded-xl text-white focus:outline-none focus:border-[#3ec1d3]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-cyan-900/40">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddPrescriptionOpen(false);
                    setEditingPrescription(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-[#14324f] hover:bg-[#1a3e63] text-gray-300 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#3ec1d3] hover:bg-[#34adb9] text-[#081523] font-bold cursor-pointer shadow-md"
                >
                  {editingPrescription ? 'Update Prescription' : 'Issue Prescription'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Modal: Upload / Edit X-Ray Report */}
      {isAddXrayOpen && (
        <div className="fixed inset-0 z-[1500] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#0e2439] border border-cyan-900/50 rounded-2xl max-w-lg w-full p-6 shadow-2xl my-8 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-cyan-900/40">
              <div className="flex items-center gap-2.5">
                {editingXray ? <Edit3 className="w-5 h-5 text-[#3ec1d3]" /> : <UploadCloud className="w-5 h-5 text-[#3ec1d3]" />}
                <h3 className="text-lg font-bold text-white">
                  {editingXray ? `Edit X-Ray: ${editingXray.title}` : 'Upload Radiograph & Report'}
                </h3>
              </div>
              <button
                onClick={() => {
                  setIsAddXrayOpen(false);
                  setEditingXray(null);
                }}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-[#14324f]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddXray} className="mt-5 space-y-4 text-xs">
              <div>
                <label className="block text-gray-300 font-semibold mb-1">X-Ray Title / Region *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Panoramic OPG, Lower Right Molar #30"
                  value={xrayForm.title}
                  onChange={(e) => setXrayForm({ ...xrayForm, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#091929] border border-cyan-900/40 rounded-xl text-white focus:outline-none focus:border-[#3ec1d3]"
                />
              </div>

              <div>
                <label className="block text-gray-300 font-semibold mb-1">Imaging Modality</label>
                <select
                  value={xrayForm.modality}
                  onChange={(e) => setXrayForm({ ...xrayForm, modality: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#091929] border border-cyan-900/40 rounded-xl text-white focus:outline-none focus:border-[#3ec1d3]"
                >
                  <option value="OPG Panoramic">OPG Panoramic</option>
                  <option value="Periapical">Periapical (IOPA)</option>
                  <option value="Bitewing">Bitewing</option>
                  <option value="CBCT 3D">CBCT 3D Scan</option>
                  <option value="Cephalometric">Cephalometric</option>
                  <option value="Dental Photo">Clinical Dental Photo</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Upload or URL option */}
              <div className="space-y-2">
                <label className="block text-gray-300 font-semibold">Upload Image File OR Enter Direct Image URL *</label>
                
                <div className="border-2 border-dashed border-cyan-900/50 hover:border-[#3ec1d3]/60 rounded-xl p-4 text-center cursor-pointer bg-[#091929] transition-colors relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="flex flex-col items-center gap-1.5 pointer-events-none">
                    <ImageIcon className="w-8 h-8 text-[#3ec1d3]" />
                    <span className="text-xs text-gray-300 font-semibold">
                      {xrayFilePreview ? 'File Selected (Click to change)' : 'Click or Drag & Drop radiograph image here'}
                    </span>
                    <span className="text-[11px] text-gray-500">PNG, JPG, DICOM preview supported up to 15MB</span>
                  </div>
                </div>

                {xrayFilePreview && (
                  <div className="relative h-28 w-full rounded-xl overflow-hidden border border-cyan-800/40 bg-black">
                    <img src={xrayFilePreview} alt="Preview" className="w-full h-full object-contain" />
                    <button
                      type="button"
                      onClick={() => {
                        setXrayFilePreview('');
                        setXrayForm((prev) => ({ ...prev, imageUrl: '' }));
                      }}
                      className="absolute top-2 right-2 p-1 bg-black/80 rounded-full text-rose-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-2 my-2 text-[11px] text-gray-500">
                  <span className="flex-1 h-px bg-cyan-900/30"></span>
                  <span>OR VIA DIRECT URL</span>
                  <span className="flex-1 h-px bg-cyan-900/30"></span>
                </div>

                <input
                  type="url"
                  placeholder="https://images.example.com/xray-scan.jpg"
                  value={xrayForm.imageUrl}
                  onChange={(e) => setXrayForm({ ...xrayForm, imageUrl: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#091929] border border-cyan-900/40 rounded-xl text-white focus:outline-none focus:border-[#3ec1d3]"
                />
              </div>

              <div>
                <label className="block text-gray-300 font-semibold mb-1">Radiologist Diagnostic Notes</label>
                <textarea
                  rows={3}
                  placeholder="Radiographic findings: Periapical radiolucency, bone resorption, or impaction details..."
                  value={xrayForm.radiologistNotes}
                  onChange={(e) => setXrayForm({ ...xrayForm, radiologistNotes: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#091929] border border-cyan-900/40 rounded-xl text-white focus:outline-none focus:border-[#3ec1d3]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-cyan-900/40">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddXrayOpen(false);
                    setEditingXray(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-[#14324f] hover:bg-[#1a3e63] text-gray-300 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#3ec1d3] hover:bg-[#34adb9] text-[#081523] font-bold cursor-pointer shadow-md"
                >
                  {editingXray ? 'Update Radiograph' : 'Save Radiograph'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Modal: Add Past Dental Treatment */}
      {isAddTreatmentOpen && (
        <div className="fixed inset-0 z-[1500] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#0e2439] border border-cyan-900/50 rounded-2xl max-w-lg w-full p-6 shadow-2xl my-8 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-cyan-900/40">
              <div className="flex items-center gap-2.5">
                <Clock className="w-5 h-5 text-[#3ec1d3]" />
                <h3 className="text-lg font-bold text-white">
                  {editingTreatment ? 'Edit Treatment' : 'Record Treatment'} for {activePatient?.patientName}
                </h3>
              </div>
              <button
                onClick={() => setIsAddTreatmentOpen(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-[#14324f]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddTreatment} className="mt-5 space-y-4 text-xs">
              <div>
                <label className="block text-gray-300 font-semibold mb-1">Procedure Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Endodontic Root Canal, Porcelain Veneer, Implant"
                  value={treatmentForm.procedure}
                  onChange={(e) => setTreatmentForm({ ...treatmentForm, procedure: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#091929] border border-cyan-900/40 rounded-xl text-white focus:outline-none focus:border-[#3ec1d3]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Tooth / Region</label>
                  <input
                    type="text"
                    placeholder="e.g. #19 Lower Molar, Full Arch"
                    value={treatmentForm.toothNumber}
                    onChange={(e) => setTreatmentForm({ ...treatmentForm, toothNumber: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#091929] border border-cyan-900/40 rounded-xl text-white focus:outline-none focus:border-[#3ec1d3]"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Status</label>
                  <select
                    value={treatmentForm.status}
                    onChange={(e) => setTreatmentForm({ ...treatmentForm, status: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#091929] border border-cyan-900/40 rounded-xl text-white focus:outline-none focus:border-[#3ec1d3]"
                  >
                    <option value="Completed">Completed</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Scheduled">Scheduled</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Date of Procedure</label>
                  <input
                    type="date"
                    value={treatmentForm.treatmentDate}
                    onChange={(e) => setTreatmentForm({ ...treatmentForm, treatmentDate: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#091929] border border-cyan-900/40 rounded-xl text-white focus:outline-none focus:border-[#3ec1d3]"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Cost / Fee ($)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 450"
                    value={treatmentForm.cost}
                    onChange={(e) => setTreatmentForm({ ...treatmentForm, cost: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#091929] border border-cyan-900/40 rounded-xl text-white focus:outline-none focus:border-[#3ec1d3]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-300 font-semibold mb-1">Treating Dentist</label>
                <input
                  type="text"
                  value={treatmentForm.doctorName}
                  onChange={(e) => setTreatmentForm({ ...treatmentForm, doctorName: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#091929] border border-cyan-900/40 rounded-xl text-white focus:outline-none focus:border-[#3ec1d3]"
                />
              </div>

              <div>
                <label className="block text-gray-300 font-semibold mb-1">Clinical Procedure Notes</label>
                <textarea
                  rows={3}
                  placeholder="Details of materials used, shades, canal instrumentation, or post-op instructions..."
                  value={treatmentForm.notes}
                  onChange={(e) => setTreatmentForm({ ...treatmentForm, notes: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#091929] border border-cyan-900/40 rounded-xl text-white focus:outline-none focus:border-[#3ec1d3]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-cyan-900/40">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddTreatmentOpen(false);
                    setEditingTreatment(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-[#14324f] hover:bg-[#1a3e63] text-gray-300 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#3ec1d3] hover:bg-[#34adb9] text-[#081523] font-bold cursor-pointer shadow-md"
                >
                  {editingTreatment ? 'Update Treatment' : 'Log Treatment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Lightbox: High-Resolution X-Ray Viewer Modal */}
      {selectedXrayPreview && (
        <div className="fixed inset-0 z-[1600] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0b1c2e] border border-cyan-800/60 rounded-2xl max-w-4xl w-full p-6 shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-cyan-900/40 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-[#3ec1d3]" />
                  {selectedXrayPreview.title}
                </h3>
                <span className="text-xs text-gray-400">
                  Modality: <strong className="text-[#3ec1d3]">{selectedXrayPreview.modality}</strong> • Date: {selectedXrayPreview.date ? new Date(selectedXrayPreview.date).toLocaleDateString() : 'Recent'}
                </span>
              </div>
              <button
                onClick={() => setSelectedXrayPreview(null)}
                className="p-2 rounded-full bg-[#14324f] hover:bg-[#1a3e63] text-gray-300 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* High Res Image */}
            <div className="h-[480px] bg-black rounded-xl overflow-hidden flex items-center justify-center border border-cyan-900/30">
              <img
                src={selectedXrayPreview.imageUrl}
                alt={selectedXrayPreview.title}
                className="max-h-full max-w-full object-contain"
              />
            </div>

            {/* Diagnostic Report Notes */}
            {selectedXrayPreview.radiologistNotes && (
              <div className="bg-[#091929] border border-cyan-900/30 rounded-xl p-3.5 text-xs text-gray-200">
                <span className="text-[#3ec1d3] font-bold block mb-1">Radiologist Interpretation:</span>
                <p className="leading-relaxed text-gray-300">{selectedXrayPreview.radiologistNotes}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 7. Modal: Confirm Delete Patient */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-[1700] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0e2439] border border-rose-900/60 rounded-2xl max-w-md w-full p-6 shadow-2xl text-center flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-rose-950/80 text-rose-400 flex items-center justify-center border border-rose-800/50">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Delete Patient Record?</h3>
              <p className="text-xs text-gray-400 mt-1">
                Are you sure you want to permanently delete this patient record and all related medical history, prescriptions, and radiographs? This action cannot be undone.
              </p>
            </div>
            <div className="flex items-center gap-3 w-full mt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 py-2.5 rounded-xl bg-[#14324f] hover:bg-[#1a3e63] text-gray-300 font-semibold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeletePatient(deleteConfirmId)}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs cursor-pointer shadow-lg shadow-rose-600/30"
              >
                Delete Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. Modal: Update Medical History & Vitals */}
      {isMedicalHistoryModalOpen && activePatient && (
        <div className="fixed inset-0 z-[1500] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#0e2439] border border-cyan-900/40 rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative my-8 animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setIsMedicalHistoryModalOpen(false)}
              className="absolute right-5 top-5 text-gray-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-cyan-900/30 pb-4 mb-5">
              <div className="w-10 h-10 rounded-xl bg-[#14324f] text-[#3ec1d3] flex items-center justify-center shrink-0 border border-cyan-800/40">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  Update Medical History & Vitals
                </h3>
                <p className="text-xs text-gray-400">
                  Editing record for <strong className="text-cyan-300">{activePatient.patientName}</strong> ({activePatient.patientId})
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveMedicalHistory} className="space-y-4 text-xs">
              {/* Allergies */}
              <div>
                <label className="block text-gray-300 font-semibold mb-1 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                  Known Allergies & Sensitivities (comma-separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Penicillin, Latex, Sulfa drugs, Aspirin"
                  value={medicalHistoryForm.allergies}
                  onChange={(e) => setMedicalHistoryForm({ ...medicalHistoryForm, allergies: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#091929] border border-cyan-900/40 rounded-xl text-white focus:outline-none focus:border-[#3ec1d3]"
                />
                <span className="text-[11px] text-gray-500 mt-0.5 block">Separate multiple allergies with commas</span>
              </div>

              {/* Systemic Conditions */}
              <div>
                <label className="block text-gray-300 font-semibold mb-1 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-[#3ec1d3]" />
                  Systemic & Chronic Health Conditions (comma-separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Hypertension, Type 2 Diabetes, Mild Asthma, Cardiac Murmur"
                  value={medicalHistoryForm.conditions}
                  onChange={(e) => setMedicalHistoryForm({ ...medicalHistoryForm, conditions: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#091929] border border-cyan-900/40 rounded-xl text-white focus:outline-none focus:border-[#3ec1d3]"
                />
              </div>

              {/* Current Daily Medications */}
              <div>
                <label className="block text-gray-300 font-semibold mb-1 flex items-center gap-1.5">
                  <Pill className="w-3.5 h-3.5 text-emerald-400" />
                  Active Daily Medications (comma-separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Amlodipine 5mg, Metformin 500mg, Multivitamins"
                  value={medicalHistoryForm.currentMedications}
                  onChange={(e) => setMedicalHistoryForm({ ...medicalHistoryForm, currentMedications: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#091929] border border-cyan-900/40 rounded-xl text-white focus:outline-none focus:border-[#3ec1d3]"
                />
              </div>

              {/* Vitals Grid (3 columns) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-gray-300 font-semibold mb-1 flex items-center gap-1">
                    <HeartPulse className="w-3.5 h-3.5 text-rose-400" />
                    Blood Pressure
                  </label>
                  <input
                    type="text"
                    placeholder="120/80 mmHg"
                    value={medicalHistoryForm.bloodPressure}
                    onChange={(e) => setMedicalHistoryForm({ ...medicalHistoryForm, bloodPressure: e.target.value })}
                    className="w-full px-3.5 py-2 bg-[#091929] border border-cyan-900/40 rounded-xl text-white focus:outline-none focus:border-[#3ec1d3]"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 font-semibold mb-1 flex items-center gap-1">
                    <Activity className="w-3.5 h-3.5 text-emerald-400" />
                    Heart Rate / Pulse
                  </label>
                  <input
                    type="text"
                    placeholder="72 bpm"
                    value={medicalHistoryForm.heartRate}
                    onChange={(e) => setMedicalHistoryForm({ ...medicalHistoryForm, heartRate: e.target.value })}
                    className="w-full px-3.5 py-2 bg-[#091929] border border-cyan-900/40 rounded-xl text-white focus:outline-none focus:border-[#3ec1d3]"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 font-semibold mb-1 flex items-center gap-1">
                    <Activity className="w-3.5 h-3.5 text-cyan-400" />
                    Blood Glucose
                  </label>
                  <input
                    type="text"
                    placeholder="Normal / 95 mg/dL"
                    value={medicalHistoryForm.bloodSugar}
                    onChange={(e) => setMedicalHistoryForm({ ...medicalHistoryForm, bloodSugar: e.target.value })}
                    className="w-full px-3.5 py-2 bg-[#091929] border border-cyan-900/40 rounded-xl text-white focus:outline-none focus:border-[#3ec1d3]"
                  />
                </div>
              </div>

              {/* Attending Doctor's Clinical Medical Notes */}
              <div>
                <label className="block text-gray-300 font-semibold mb-1 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-amber-400" />
                  Attending Doctor's Clinical Medical Notes
                </label>
                <textarea
                  rows={3}
                  placeholder="Record patient medical background, surgical history, dental phobia, or clinical recommendations..."
                  value={medicalHistoryForm.notes}
                  onChange={(e) => setMedicalHistoryForm({ ...medicalHistoryForm, notes: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#091929] border border-cyan-900/40 rounded-xl text-white focus:outline-none focus:border-[#3ec1d3]"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-cyan-900/40">
                <button
                  type="button"
                  onClick={() => setIsMedicalHistoryModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#14324f] hover:bg-[#1a3e63] text-gray-300 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#3ec1d3] hover:bg-[#34adb9] text-[#081523] font-bold cursor-pointer shadow-md"
                >
                  Save Medical History
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 9. Modal: Confirm Clear/Delete Medical History */}
      {isDeleteHistoryConfirmOpen && activePatient && (
        <div className="fixed inset-0 z-[1700] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0e2439] border border-rose-900/60 rounded-2xl max-w-md w-full p-6 shadow-2xl text-center flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-rose-950/80 text-rose-400 flex items-center justify-center border border-rose-800/50">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Clear Medical History?</h3>
              <p className="text-xs text-gray-400 mt-1">
                Are you sure you want to clear all recorded allergies, chronic health conditions, active medications, and doctor's notes for <strong className="text-white">{activePatient.patientName}</strong>?
              </p>
            </div>
            <div className="flex items-center gap-3 w-full mt-2">
              <button
                type="button"
                onClick={() => setIsDeleteHistoryConfirmOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-[#14324f] hover:bg-[#1a3e63] text-gray-300 font-semibold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteMedicalHistory}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs cursor-pointer shadow-lg shadow-rose-600/30"
              >
                Clear History
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add Tooth Timeline Entry */}
      {isAddToothTimelineOpen && (
        <div className="fixed inset-0 z-[1500] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#0e2439] border border-cyan-900/50 rounded-2xl max-w-lg w-full p-6 shadow-2xl my-8 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-cyan-900/40">
              <div className="flex items-center gap-2.5">
                <Stethoscope className="w-5 h-5 text-[#3ec1d3]" />
                <h3 className="text-lg font-bold text-white">
                  {editingToothTimeline ? 'Edit' : 'Add'} Tooth Timeline Entry for {activePatient?.patientName}
                </h3>
              </div>
              <button
                onClick={() => {
                  setIsAddToothTimelineOpen(false);
                  setEditingToothTimeline(null);
                }}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-[#14324f]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={editingToothTimeline ? handleUpdateToothTimeline : handleAddToothTimelineEntry} className="mt-5 space-y-4 text-xs">
              <div>
                <label className="block text-gray-300 font-semibold mb-1">Tooth Number *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 19, 30, 14"
                  value={toothTimelineForm.toothNumber}
                  onChange={(e) => setToothTimelineForm({ ...toothTimelineForm, toothNumber: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#091929] border border-cyan-900/40 rounded-xl text-white focus:outline-none focus:border-[#3ec1d3]"
                />
              </div>

              <div>
                <label className="block text-gray-300 font-semibold mb-1">Procedure *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Root Canal, Extraction, Filling"
                  value={toothTimelineForm.procedure}
                  onChange={(e) => setToothTimelineForm({ ...toothTimelineForm, procedure: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#091929] border border-cyan-900/40 rounded-xl text-white focus:outline-none focus:border-[#3ec1d3]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={toothTimelineForm.date}
                    onChange={(e) => setToothTimelineForm({ ...toothTimelineForm, date: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#091929] border border-cyan-900/40 rounded-xl text-white focus:outline-none focus:border-[#3ec1d3]"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Status</label>
                  <select
                    value={toothTimelineForm.status}
                    onChange={(e) => setToothTimelineForm({ ...toothTimelineForm, status: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#091929] border border-cyan-900/40 rounded-xl text-white focus:outline-none focus:border-[#3ec1d3]"
                  >
                    <option value="Completed">Completed</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Proposed">Proposed</option>
                    <option value="Failed">Failed</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Doctor</label>
                  <input
                    type="text"
                    placeholder="e.g. Dr. Sarah Johnson"
                    value={toothTimelineForm.doctor}
                    onChange={(e) => setToothTimelineForm({ ...toothTimelineForm, doctor: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#091929] border border-cyan-900/40 rounded-xl text-white focus:outline-none focus:border-[#3ec1d3]"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Cost ($)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 450"
                    value={toothTimelineForm.cost}
                    onChange={(e) => setToothTimelineForm({ ...toothTimelineForm, cost: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#091929] border border-cyan-900/40 rounded-xl text-white focus:outline-none focus:border-[#3ec1d3]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-300 font-semibold mb-1">Notes</label>
                <textarea
                  rows={3}
                  placeholder="Additional details about the procedure..."
                  value={toothTimelineForm.notes}
                  onChange={(e) => setToothTimelineForm({ ...toothTimelineForm, notes: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#091929] border border-cyan-900/40 rounded-xl text-white focus:outline-none focus:border-[#3ec1d3]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-cyan-900/40">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddToothTimelineOpen(false);
                    setEditingToothTimeline(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-[#14324f] hover:bg-[#1a3e63] text-gray-300 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#3ec1d3] hover:bg-[#34adb9] text-[#081523] font-bold cursor-pointer shadow-md"
                >
                  {editingToothTimeline ? 'Update Entry' : 'Add Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Delete Tooth Timeline Entry Confirmation */}
      {isDeleteToothTimelineConfirmOpen && (
        <div className="fixed inset-0 z-[1700] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0e2439] border border-rose-900/60 rounded-2xl max-w-md w-full p-6 shadow-2xl text-center flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-rose-950/80 text-rose-400 flex items-center justify-center border border-rose-800/50">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white mb-2">Delete Tooth Timeline Entry?</h3>
              <p className="text-sm text-gray-400">
                This action cannot be undone. The tooth timeline entry will be permanently removed.
              </p>
            </div>
            <div className="flex items-center gap-3 mt-2">
              <button
                onClick={() => {
                  setIsDeleteToothTimelineConfirmOpen(false);
                  setDeletingToothTimelineIndex(null);
                }}
                className="px-5 py-2 rounded-xl bg-[#14324f] hover:bg-[#1a3e63] text-gray-300 font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteToothTimeline}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer shadow-md"
              >
                Delete Entry
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: New / Edit Lab Order */}
      {isLabOrderModalOpen && (
        <div className="fixed inset-0 z-[1500] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#0e2439] border border-cyan-900/50 rounded-2xl max-w-lg w-full p-6 shadow-2xl my-8 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-cyan-900/40">
              <div className="flex items-center gap-2.5">
                <UploadCloud className="w-5 h-5 text-[#3ec1d3]" />
                <h3 className="text-lg font-bold text-white">
                  {editingLabOrder ? `Edit Lab Order ${editingLabOrder.orderId}` : `New Lab Order for ${activePatient?.patientName}`}
                </h3>
              </div>
              <button
                type="button"
                onClick={closeLabOrderModal}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-[#14324f]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveLabOrder} className="mt-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Tooth Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 19, 30"
                    value={labOrderForm.toothNumber}
                    onChange={(e) => setLabOrderForm({ ...labOrderForm, toothNumber: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#091929] border border-cyan-900/40 rounded-xl text-white focus:outline-none focus:border-[#3ec1d3]"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Lab Work Type *</label>
                  <select
                    value={labOrderForm.labType}
                    onChange={(e) => setLabOrderForm({ ...labOrderForm, labType: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#091929] border border-cyan-900/40 rounded-xl text-white focus:outline-none focus:border-[#3ec1d3]"
                  >
                    {LAB_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Material</label>
                  <input
                    type="text"
                    placeholder="e.g. Porcelain, Zirconia"
                    value={labOrderForm.material}
                    onChange={(e) => setLabOrderForm({ ...labOrderForm, material: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#091929] border border-cyan-900/40 rounded-xl text-white focus:outline-none focus:border-[#3ec1d3]"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Expected Delivery</label>
                  <input
                    type="date"
                    value={labOrderForm.expectedDeliveryDate}
                    onChange={(e) => setLabOrderForm({ ...labOrderForm, expectedDeliveryDate: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#091929] border border-cyan-900/40 rounded-xl text-white focus:outline-none focus:border-[#3ec1d3]"
                  />
                </div>
              </div>

              {editingLabOrder && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-300 font-semibold mb-1">Status</label>
                    <select
                      value={labOrderForm.status}
                      onChange={(e) => setLabOrderForm({ ...labOrderForm, status: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-[#091929] border border-cyan-900/40 rounded-xl text-white focus:outline-none focus:border-[#3ec1d3]"
                    >
                      {LAB_STATUSES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-300 font-semibold mb-1">Cabinet Location</label>
                    <input
                      type="text"
                      placeholder="e.g. Shelf B-2"
                      value={labOrderForm.cabinetLocation}
                      onChange={(e) => setLabOrderForm({ ...labOrderForm, cabinetLocation: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-[#091929] border border-cyan-900/40 rounded-xl text-white focus:outline-none focus:border-[#3ec1d3]"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-gray-300 font-semibold mb-1">Notes</label>
                <textarea
                  rows={3}
                  placeholder="Shade, instructions for the lab technician..."
                  value={labOrderForm.notes}
                  onChange={(e) => setLabOrderForm({ ...labOrderForm, notes: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#091929] border border-cyan-900/40 rounded-xl text-white focus:outline-none focus:border-[#3ec1d3]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-cyan-900/40">
                <button
                  type="button"
                  onClick={closeLabOrderModal}
                  className="px-4 py-2 rounded-xl bg-[#14324f] hover:bg-[#1a3e63] text-gray-300 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#3ec1d3] hover:bg-[#34adb9] text-[#081523] font-bold cursor-pointer shadow-md"
                >
                  {editingLabOrder ? 'Update Order' : 'Create Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Lab Order Details */}
      {viewingLabOrder && (
        <div className="fixed inset-0 z-[1600] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0e2439] border border-cyan-900/50 rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-cyan-900/40">
              <div className="flex items-center gap-2.5">
                <Eye className="w-5 h-5 text-[#3ec1d3]" />
                <h3 className="text-lg font-bold text-white">Lab Order Details</h3>
              </div>
              <button
                type="button"
                onClick={() => setViewingLabOrder(null)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-[#14324f]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 text-xs">
              {[
                ['Order ID', viewingLabOrder.orderId],
                ['Patient', activePatient?.patientName],
                ['Lab Work Type', viewingLabOrder.labType],
                ['Tooth Number', `#${viewingLabOrder.toothNumber}`],
                ['Material', viewingLabOrder.material || 'Porcelain'],
                ['Cabinet Location', viewingLabOrder.cabinetLocation || '—'],
                ['Sent Date', formatLabDate(viewingLabOrder.sentDate)],
                ['Expected Delivery', formatLabDate(viewingLabOrder.expectedDeliveryDate)],
                ['Received Date', formatLabDate(viewingLabOrder.receivedDate)],
                ['Fitted Date', formatLabDate(viewingLabOrder.fittedDate)],
              ].map(([label, value]) => (
                <div key={label} className="bg-[#091929] border border-cyan-900/30 rounded-xl p-3">
                  <span className="text-gray-400 block text-[11px] font-medium">{label}</span>
                  <span className="font-bold text-white mt-0.5 block">{value}</span>
                </div>
              ))}
              <div className="bg-[#091929] border border-cyan-900/30 rounded-xl p-3 col-span-2">
                <span className="text-gray-400 block text-[11px] font-medium mb-1">Status</span>
                <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${labStatusClass(viewingLabOrder.status)}`}>
                  {viewingLabOrder.status}
                </span>
              </div>
              <div className="bg-[#091929] border border-cyan-900/30 rounded-xl p-3 col-span-2">
                <span className="text-gray-400 block text-[11px] font-medium mb-1">Notes</span>
                <p className="text-gray-300 whitespace-pre-wrap">{viewingLabOrder.notes || 'No notes added.'}</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 mt-5 border-t border-cyan-900/40">
              <button
                type="button"
                onClick={() => setViewingLabOrder(null)}
                className="px-4 py-2 rounded-xl bg-[#14324f] hover:bg-[#1a3e63] text-gray-300 font-semibold text-xs cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => handleOpenEditLabOrder(viewingLabOrder)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#3ec1d3] hover:bg-[#34adb9] text-[#081523] font-bold text-xs cursor-pointer shadow-md"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Order</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default PatientRecords;