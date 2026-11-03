/**
 * Medical Rule Engine Middleware
 * 
 * This middleware analyzes patient medical data to detect:
 * 1. Drug-Drug Interactions
 * 2. Anesthesia Contraindications (Epinephrine risks)
 * 3. High-risk medical conditions for dental procedures
 */

// Medical knowledge base for drug interactions and anesthesia risks
const MEDICAL_RULES = {
  // Medications that interact dangerously with epinephrine in local anesthesia
  epinephrineContraindications: [
    'Beta Blockers',
    'Non-selective beta-blockers',
    'Propranolol',
    'Nadolol',
    'Timolol',
    'Tricyclic Antidepressants',
    'Amitriptyline',
    'Nortriptyline',
    'Imipramine',
    'MAO Inhibitors',
    'Phenelzine',
    'Tranylcypromine',
    'Cocaine',
  ],

  // Conditions that increase anesthesia risk
  highRiskConditions: [
    'Uncontrolled Hypertension',
    'Severe Hypertension',
    'Recent Myocardial Infarction',
    'Heart Failure',
    'Arrhythmia',
    'Angina',
    'Thyroid Storm',
    'Pheochromocytoma',
  ],

  // Vital signs thresholds
  vitalThresholds: {
    bloodPressure: {
      high: { systolic: 180, diastolic: 110 }, // Stage 2 Hypertension
      moderate: { systolic: 160, diastolic: 100 }, // Stage 1 Hypertension
    },
    heartRate: {
      high: 100, // Tachycardia
      low: 60, // Bradycardia
    },
  },

  // Drug interaction pairs
  drugInteractions: [
    {
      drug1: 'Warfarin',
      drug2: ['Aspirin', 'NSAIDs', 'Antibiotics'],
      severity: 'HIGH',
      warning: 'Increased bleeding risk - may require INR monitoring and dose adjustment',
    },
    {
      drug1: 'Metformin',
      drug2: ['Iodinated Contrast', 'Antibiotics'],
      severity: 'MODERATE',
      warning: 'Risk of lactic acidosis - may need to discontinue before procedures',
    },
    {
      drug1: 'Bisphosphonates',
      drug2: ['Extractions', 'Oral Surgery'],
      severity: 'HIGH',
      warning: 'Risk of osteonecrosis of the jaw - extensive precautions required',
    },
  ],
};

/**
 * Parse blood pressure string (e.g., "140/90 mmHg")
 */
const parseBloodPressure = (bpString) => {
  if (!bpString) return { systolic: 120, diastolic: 80 };
  
  const match = bpString.match(/(\d{2,3})\/(\d{2,3})/);
  if (match) {
    return {
      systolic: parseInt(match[1]),
      diastolic: parseInt(match[2]),
    };
  }
  
  return { systolic: 120, diastolic: 80 };
};

/**
 * Parse heart rate string (e.g., "72 bpm")
 */
const parseHeartRate = (hrString) => {
  if (!hrString) return 72;
  
  const match = hrString.match(/(\d{2,3})/);
  if (match) {
    return parseInt(match[1]);
  }
  
  return 72;
};

/**
 * Check for epinephrine contraindications
 */
const checkEpinephrineRisk = (medications, conditions, bloodPressure, heartRate) => {
  const warnings = [];
  const riskLevel = 'NONE';

  // Check medications
  if (medications && Array.isArray(medications)) {
    medications.forEach(med => {
      const medLower = med.toLowerCase();
      MEDICAL_RULES.epinephrineContraindications.forEach(contraindication => {
        if (medLower.includes(contraindication.toLowerCase())) {
          warnings.push({
            type: 'MEDICATION',
            medication: med,
            contraindication: contraindication,
            severity: 'HIGH',
            message: `⚠️ CONTRAINDICATION: Patient is taking ${contraindication}. DO NOT use epinephrine-containing local anesthetics. Use epinephrine-free alternatives (e.g., 3% Mepivacaine without vasoconstrictor).`,
          });
        }
      });
    });
  }

  // Check conditions
  if (conditions && Array.isArray(conditions)) {
    conditions.forEach(condition => {
      const condLower = condition.toLowerCase();
      MEDICAL_RULES.highRiskConditions.forEach(riskCondition => {
        if (condLower.includes(riskCondition.toLowerCase())) {
          warnings.push({
            type: 'CONDITION',
            condition: condition,
            severity: 'HIGH',
            message: `⚠️ HIGH RISK: Patient has ${condition}. Epinephrine may cause severe cardiovascular complications. Consult with physician before any procedure requiring anesthesia.`,
          });
        }
      });
    });
  }

  // Check blood pressure
  const bp = parseBloodPressure(bloodPressure);
  if (bp.systolic >= MEDICAL_RULES.vitalThresholds.bloodPressure.high.systolic ||
      bp.diastolic >= MEDICAL_RULES.vitalThresholds.bloodPressure.high.diastolic) {
    warnings.push({
      type: 'VITAL',
      vital: 'Blood Pressure',
      value: bloodPressure,
      severity: 'HIGH',
      message: `⚠️ HIGH BLOOD PRESSURE (${bloodPressure}): Epinephrine may further elevate BP and increase stroke risk. Consider using minimal epinephrine concentration (1:200,000) or epinephrine-free anesthetic.`,
    });
  } else if (bp.systolic >= MEDICAL_RULES.vitalThresholds.bloodPressure.moderate.systolic ||
             bp.diastolic >= MEDICAL_RULES.vitalThresholds.bloodPressure.moderate.diastolic) {
    warnings.push({
      type: 'VITAL',
      vital: 'Blood Pressure',
      value: bloodPressure,
      severity: 'MODERATE',
      message: `⚠️ ELEVATED BLOOD PRESSURE (${bloodPressure}): Use caution with epinephrine. Limit to 2 carpules maximum and monitor BP during procedure.`,
    });
  }

  // Check heart rate
  const hr = parseHeartRate(heartRate);
  if (hr > MEDICAL_RULES.vitalThresholds.heartRate.high) {
    warnings.push({
      type: 'VITAL',
      vital: 'Heart Rate',
      value: heartRate,
      severity: 'MODERATE',
      message: `⚠️ TACHYCARDIA (${heartRate}): Epinephrine may further increase heart rate. Consider epinephrine-free anesthetic or use with cardiac monitoring.`,
    });
  }

  return warnings;
};

/**
 * Check for drug-drug interactions
 */
const checkDrugInteractions = (medications) => {
  const warnings = [];

  if (!medications || !Array.isArray(medications)) return warnings;

  MEDICAL_RULES.drugInteractions.forEach(interaction => {
    const hasDrug1 = medications.some(med => 
      med.toLowerCase().includes(interaction.drug1.toLowerCase())
    );
    
    if (hasDrug1) {
      interaction.drug2.forEach(drug2 => {
        const hasDrug2 = medications.some(med => 
          med.toLowerCase().includes(drug2.toLowerCase())
        );
        
        if (hasDrug2) {
          warnings.push({
            type: 'DRUG_INTERACTION',
            drug1: interaction.drug1,
            drug2: drug2,
            severity: interaction.severity,
            message: `⚠️ ${interaction.severity} SEVERITY: ${interaction.warning}`,
          });
        }
      });
    }
  });

  return warnings;
};

/**
 * Main medical rule engine function
 * Analyzes patient data and returns risk assessment
 */
const analyzePatientRisk = (patientData) => {
  const {
    medicalHistory,
    prescriptions,
  } = patientData;

  const medications = [
    ...(medicalHistory?.currentMedications || []),
    ...(prescriptions?.map(rx => rx.medicineName) || []),
  ];

  const conditions = medicalHistory?.conditions || [];
  const bloodPressure = medicalHistory?.bloodPressure || '120/80 mmHg';
  const heartRate = medicalHistory?.heartRate || '72 bpm';

  // Run all checks
  const epinephrineWarnings = checkEpinephrineRisk(
    medications,
    conditions,
    bloodPressure,
    heartRate
  );

  const drugInteractionWarnings = checkDrugInteractions(medications);

  const allWarnings = [...epinephrineWarnings, ...drugInteractionWarnings];

  // Determine overall risk level
  let overallRisk = 'LOW';
  let highRiskWarning = '';

  const hasHighSeverity = allWarnings.some(w => w.severity === 'HIGH');
  const hasModerateSeverity = allWarnings.some(w => w.severity === 'MODERATE');

  if (hasHighSeverity) {
    overallRisk = 'HIGH';
    highRiskWarning = allWarnings
      .filter(w => w.severity === 'HIGH')
      .map(w => w.message)
      .join(' ');
  } else if (hasModerateSeverity) {
    overallRisk = 'MODERATE';
    highRiskWarning = allWarnings
      .filter(w => w.severity === 'MODERATE')
      .map(w => w.message)
      .join(' ');
  }

  return {
    overallRisk,
    anesthesiaContraindication: hasHighSeverity,
    drugInteractionRisk: drugInteractionWarnings.length > 0,
    highRiskWarning,
    warnings: allWarnings,
    lastRiskAssessment: new Date(),
  };
};

/**
 * Express middleware to automatically analyze patient risk
 * Adds medical risk flags to the response
 */
export const medicalRuleEngineMiddleware = async (req, res, next) => {
  // Only apply to GET requests for patient records
  if (req.method !== 'GET') {
    return next();
  }

  try {
    // Store original json method
    const originalJson = res.json;

    // Override res.json to inject risk analysis
    res.json = function(data) {
      if (data.success && data.data) {
        const patientData = Array.isArray(data.data) ? data.data : [data.data];
        
        const enrichedData = patientData.map(patient => {
          // Convert Mongoose documents to plain objects before spreading,
          // otherwise internals like $__, $isNew and _doc leak into the JSON.
          const plainPatient =
            patient && typeof patient.toObject === 'function'
              ? patient.toObject()
              : patient;

          const riskAnalysis = analyzePatientRisk(plainPatient);

          return {
            ...plainPatient,
            medicalRiskFlags: riskAnalysis,
          };
        });

        // Restore original data structure
        if (Array.isArray(data.data)) {
          data.data = enrichedData;
        } else {
          data.data = enrichedData[0];
        }
      }

      return originalJson.call(this, data);
    };

    next();
  } catch (error) {
    console.error('Medical Rule Engine Error:', error);
    next(); // Continue even if rule engine fails
  }
};

/**
 * Standalone function to analyze patient risk (can be called directly)
 */
export { analyzePatientRisk, checkEpinephrineRisk, checkDrugInteractions };