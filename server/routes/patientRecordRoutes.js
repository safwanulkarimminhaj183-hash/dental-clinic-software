import express from 'express';
import {
  getAllPatientRecords,
  getPatientRecordById,
  createPatientRecord,
  updatePatientRecord,
  deletePatientRecord,
  addPrescription,
  addXrayImage,
  uploadPatientXray,
  uploadStandaloneFile,
  addPastTreatment,
  addPatientAppointment,
  getPatientAppointments,
  addPatientInvoice,
  getPatientInvoices,
  getToothTimeline,
  getAllToothHistory,
  addToothTimelineEntry,
} from '../controllers/patientRecordController.js';
import { patientFileUpload } from '../middlewares/patientFileUpload.js';
import { checkDbConnection } from '../config/db.js';
import advancedDentalFeaturesRouter from './advancedDentalFeaturesRoutes.js';
import { medicalRuleEngineMiddleware } from '../middleware/medicalRuleEngine.js';
import { verifyToken, isDoctor } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Middleware: return 503 Database not connected if MongoDB is not connected
router.use(checkDbConnection);

// Apply Medical Rule Engine to GET requests for automatic risk analysis
router.get('/', medicalRuleEngineMiddleware, getAllPatientRecords);
router.get('/:id', medicalRuleEngineMiddleware, getPatientRecordById);

// Primary CRUD routes
router.post('/', createPatientRecord);

// Standalone File Upload (Multer)
router.post('/upload', patientFileUpload.single('file'), uploadStandaloneFile);

router.put('/:id', updatePatientRecord);
router.delete('/:id', deletePatientRecord);

// Direct sub-document endpoints
router.post('/:id/prescriptions', addPrescription);
router.post('/:id/treatments', addPastTreatment);

// Appointments History & Scheduling
router.get('/:id/appointments', getPatientAppointments);
router.post('/:id/appointments', addPatientAppointment);

// Billing & Invoices
router.get('/:id/invoices', getPatientInvoices);
router.post('/:id/invoices', addPatientInvoice);

// X-Rays & Imaging (JSON URL/Base64 or Multer file upload)
router.post('/:id/xrays', addXrayImage);
router.post('/:id/xrays/upload', patientFileUpload.single('file'), uploadPatientXray);

// Tooth Timeline Endpoints
router.get('/:id/tooth/:toothNumber', verifyToken, getToothTimeline);
router.get('/:id/tooth-history', verifyToken, getAllToothHistory);
router.post('/:id/tooth/:toothNumber/timeline', verifyToken, isDoctor, addToothTimelineEntry);

// Mount Advanced Dental Features Routes
router.use('/', advancedDentalFeaturesRouter);

export default router;
