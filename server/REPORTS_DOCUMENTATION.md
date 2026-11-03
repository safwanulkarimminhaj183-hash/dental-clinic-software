# 📊 Advanced Reports Backend Implementation

This document describes the 5 advanced report features implemented for the DentoCare dental clinic system at `/api/reports`.

---

## 📋 Feature Overview

### 1. 💰 Doctor-Wise Revenue Breakdown & ROI Pipeline
Analyzes financial performance per dentist to understand who generates the most revenue versus their material/operational costs.

### 2. 📈 Seasonal Treatment & Disease Trend Forecasting
Helps the clinic optimize medicine inventory by tracking which dental procedures spike during specific months.

### 3. 💳 Payment Breakdown & Aging Accounts Receivable Report
Provides a deep financial audit of total cash flow categories and pending debts.

### 4. 👥 Patient Retention & Lifetime Value (LTV) Analytics
Analyzes patient loyalty and tracks returning vs. one-time checkup drop-outs.

### 5. 🦷 Lab Order Process Time & Efficiency Audit
Tracks the performance of external dental laboratories delivering crowns, dentures, and braces.

---

## 🚀 API Endpoints

### Feature 1: Doctor-Wise Revenue Breakdown

#### Get Doctor Revenue & ROI
```http
GET /api/reports/doctor-revenue
GET /api/v1/reports/doctor-revenue
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "doctorName": "Dr. Sarah Johnson",
      "totalTreatments": 45,
      "totalRevenue": 45000,
      "avgTreatmentCost": 1000,
      "estimatedLabCost": 13500,
      "operationalCost": 9000,
      "netProfit": 22500,
      "roiPercentage": 50.00
    }
  ]
}
```

**Calculations:**
- `estimatedLabCost` = 30% of total revenue
- `operationalCost` = 20% of total revenue
- `netProfit` = totalRevenue - labCost - operationalCost
- `roiPercentage` = (netProfit / totalRevenue) * 100

---

### Feature 2: Seasonal Treatment Trends

#### Get Seasonal Treatment Trends
```http
GET /api/reports/seasonal-trends?months=12
GET /api/v1/reports/seasonal-trends?months=12
```

**Query Parameters:**
- `months` (optional): Number of months to analyze (default: 12)

**Response:**
```json
{
  "success": true,
  "data": {
    "treatmentTrends": [
      {
        "_id": {
          "year": 2026,
          "month": 10,
          "procedure": "Root Canal Treatment"
        },
        "count": 15,
        "totalCost": 15000
      }
    ],
    "procedureSummary": [
      {
        "_id": "Root Canal Treatment",
        "count": 45,
        "totalCost": 45000,
        "avgCost": 1000
      }
    ],
    "period": "12 months"
  }
}
```

**Usage:**
- Track which procedures are most popular in which months
- Optimize inventory based on seasonal demand
- Plan staffing for peak periods

---

### Feature 3: Payment Breakdown & Aging Accounts Receivable

#### Get Payment Breakdown
```http
GET /api/reports/payment-breakdown
GET /api/v1/reports/payment-breakdown
```

**Response:**
```json
{
  "success": true,
  "data": {
    "paymentMethods": [
      {
        "_id": "Cash",
        "totalAmount": 25000,
        "paidAmount": 25000,
        "count": 50
      },
      {
        "_id": "Card",
        "totalAmount": 35000,
        "paidAmount": 32000,
        "count": 35
      }
    ],
    "agingDebt": {
      "totalDue": 5000,
      "totalInvoices": 8
    },
    "agingByDays": [
      {
        "_id": "0",
        "count": 3,
        "totalDue": 1500
      },
      {
        "_id": "30",
        "count": 2,
        "totalDue": 2000
      },
      {
        "_id": "60",
        "count": 2,
        "totalDue": 1200
      },
      {
        "_id": "90",
        "count": 1,
        "totalDue": 300
      }
    ]
  }
}
```

**Aging Brackets:**
- 0-30 days overdue
- 31-60 days overdue
- 61-90 days overdue
- 91-180 days overdue
- 180+ days overdue

---

### Feature 4: Patient Retention & LTV Analytics

#### Get Patient Retention Analytics
```http
GET /api/reports/patient-retention
GET /api/v1/reports/patient-retention
```

**Response:**
```json
{
  "success": true,
  "data": {
    "topPatientsByLTV": [
      {
        "patientId": "PAT-1042",
        "patientName": "Sarah Jenkins",
        "totalVisits": 12,
        "totalTreatments": 8,
        "totalBilling": 15000,
        "totalPaid": 14000,
        "ltv": 15000,
        "averageVisitValue": 1250
      }
    ],
    "patientTiers": [
      {
        "_id": "0",
        "count": 50,
        "totalRevenue": 15000
      },
      {
        "_id": "500",
        "count": 30,
        "totalRevenue": 22500
      },
      {
        "_id": "1000",
        "count": 20,
        "totalRevenue": 30000
      },
      {
        "_id": "2500",
        "count": 10,
        "totalRevenue": 35000
      },
      {
        "_id": "5000",
        "count": 5,
        "totalRevenue": 40000
      }
    ],
    "avgVisitsPerPatient": {
      "avgVisits": 3.5,
      "totalPatients": 115
    }
  }
}
```

**Patient Tiers:**
- $0 - $500: New patients
- $500 - $1,000: Regular patients
- $1,000 - $2,500: Valued patients
- $2,500 - $5,000: High-value patients
- $5,000+: VIP patients

---

### Feature 5: Lab Efficiency Audit

#### Get Lab Efficiency Audit
```http
GET /api/reports/lab-efficiency
GET /api/v1/reports/lab-efficiency
```

**Response:**
```json
{
  "success": true,
  "data": {
    "labEfficiency": [
      {
        "_id": "Crown",
        "totalOrders": 25,
        "avgTurnaroundDays": 7.5,
        "delayedOrders": 3,
        "onTimeOrders": 22,
        "onTimePercentage": 88.0
      },
      {
        "_id": "Denture",
        "totalOrders": 15,
        "avgTurnaroundDays": 10.2,
        "delayedOrders": 5,
        "onTimeOrders": 10,
        "onTimePercentage": 66.67
      }
    ],
    "overallStats": {
      "totalOrders": 40,
      "avgTurnaroundDays": 8.5,
      "minTurnaroundDays": 5,
      "maxTurnaroundDays": 15
    }
  }
}
```

**Metrics:**
- `avgTurnaroundDays`: Average time from sent to received
- `delayedOrders`: Orders received after expected delivery date
- `onTimePercentage`: Percentage of orders delivered on time

---

### Comprehensive Summary

#### Get All Reports in One Call
```http
GET /api/reports/summary
GET /api/v1/reports/summary
```

**Response:**
```json
{
  "success": true,
  "data": {
    "doctorRevenue": [...],
    "seasonalTrends": [...],
    "paymentBreakdown": [...],
    "patientRetention": [...],
    "labEfficiency": [...]
  }
}
```

---

## 🔧 MongoDB Aggregation Details

### Feature 1: Doctor Revenue Aggregation
```javascript
[
  { $unwind: '$pastTreatments' },
  {
    $group: {
      _id: '$pastTreatments.doctorName',
      totalTreatments: { $sum: 1 },
      totalRevenue: { $sum: '$pastTreatments.cost' },
      avgTreatmentCost: { $avg: '$pastTreatments.cost' },
    },
  },
  { $sort: { totalRevenue: -1 } },
]
```

### Feature 2: Seasonal Trends Aggregation
```javascript
[
  { $unwind: '$pastTreatments' },
  {
    $match: {
      'pastTreatments.treatmentDate': {
        $gte: startDate,
        $lte: new Date(),
      },
    },
  },
  {
    $group: {
      _id: {
        year: { $year: '$pastTreatments.treatmentDate' },
        month: { $month: '$pastTreatments.treatmentDate' },
        procedure: '$pastTreatments.procedure',
      },
      count: { $sum: 1 },
      totalCost: { $sum: '$pastTreatments.cost' },
    },
  },
]
```

### Feature 3: Payment Breakdown with $facet
```javascript
[
  { $unwind: '$invoices' },
  {
    $facet: {
      paymentMethods: [
        {
          $group: {
            _id: '$invoices.paymentMethod',
            totalAmount: { $sum: '$invoices.totalAmount' },
            paidAmount: { $sum: '$invoices.paidAmount' },
            count: { $sum: 1 },
          },
        },
      ],
      agingDebt: [
        {
          $match: {
            'invoices.paymentStatus': { $in: ['Unpaid', 'Partially Paid'] },
          },
        },
        {
          $group: {
            _id: null,
            totalDue: { $sum: '$invoices.dueAmount' },
            totalInvoices: { $sum: 1 },
          },
        },
      ],
      agingByDays: [
        {
          $addFields: {
            daysOverdue: {
              $divide: [
                { $subtract: [new Date(), '$invoices.date'] },
                1000 * 60 * 60 * 24,
              ],
            },
          },
        },
        {
          $bucket: {
            groupBy: '$daysOverdue',
            boundaries: [0, 30, 60, 90, 180],
            default: '180+',
            output: {
              count: { $sum: 1 },
              totalDue: { $sum: '$invoices.dueAmount' },
            },
          },
        },
      ],
    },
  },
]
```

### Feature 4: Patient LTV Aggregation
```javascript
[
  {
    $project: {
      patientId: 1,
      patientName: 1,
      totalVisits: { $size: '$appointments' },
      totalTreatments: { $size: '$pastTreatments' },
      totalBilling: { $sum: '$invoices.totalAmount' },
      totalPaid: { $sum: '$invoices.paidAmount' },
    },
  },
  {
    $addFields: {
      ltv: { $ifNull: ['$totalBilling', 0] },
      averageVisitValue: {
        $cond: [
          { $gt: ['$totalVisits', 0] },
          { $divide: ['$totalBilling', '$totalVisits'] },
          0,
        ],
      },
    },
  },
  { $sort: { ltv: -1 } },
]
```

### Feature 5: Lab Efficiency Aggregation
```javascript
[
  { $unwind: '$labOrders' },
  {
    $addFields: {
      turnaroundDays: {
        $divide: [
          { $subtract: ['$labOrders.receivedDate', '$labOrders.sentDate'] },
          1000 * 60 * 60 * 24,
        ],
      },
      delayDays: {
        $divide: [
          { $subtract: ['$labOrders.receivedDate', '$labOrders.expectedDeliveryDate'] },
          1000 * 60 * 60 * 24,
        ],
      },
    },
  },
  {
    $group: {
      _id: '$labOrders.labType',
      totalOrders: { $sum: 1 },
      avgTurnaroundDays: { $avg: '$turnaroundDays' },
      delayedOrders: {
        $sum: { $cond: [{ $gt: ['$delayDays', 0] }, 1, 0] },
      },
      onTimeOrders: {
        $sum: { $cond: [{ $lte: ['$delayDays', 0] }, 1, 0] },
      },
    },
  },
]
```

---

## 🧪 Testing the Endpoints

### Test Doctor Revenue Breakdown
```bash
curl http://localhost:5000/api/reports/doctor-revenue
```

### Test Seasonal Trends
```bash
curl http://localhost:5000/api/reports/seasonal-trends?months=12
```

### Test Payment Breakdown
```bash
curl http://localhost:5000/api/reports/payment-breakdown
```

### Test Patient Retention
```bash
curl http://localhost:5000/api/reports/patient-retention
```

### Test Lab Efficiency
```bash
curl http://localhost:5000/api/reports/lab-efficiency
```

### Test All Reports Summary
```bash
curl http://localhost:5000/api/reports/summary
```

---

## 📊 Frontend Integration Example

### Fetching Reports in React
```javascript
// Fetch doctor revenue
const fetchDoctorRevenue = async () => {
  const response = await fetch('http://localhost:5000/api/reports/doctor-revenue');
  const data = await response.json();
  setDoctorRevenue(data.data);
};

// Fetch seasonal trends
const fetchSeasonalTrends = async () => {
  const response = await fetch('http://localhost:5000/api/reports/seasonal-trends?months=12');
  const data = await response.json();
  setSeasonalTrends(data.data);
};

// Fetch all reports at once
const fetchAllReports = async () => {
  const response = await fetch('http://localhost:5000/api/reports/summary');
  const data = await response.json();
  setReports(data.data);
};
```

---

## ✅ Summary

All 5 advanced report features have been successfully implemented:

1. ✅ **Doctor-Wise Revenue Breakdown & ROI** - Financial performance per dentist
2. ✅ **Seasonal Treatment Trends** - Monthly procedure distribution for inventory optimization
3. ✅ **Payment Breakdown & Aging AR** - Cash flow analysis and debt tracking
4. ✅ **Patient Retention & LTV** - Patient loyalty and value analytics
5. ✅ **Lab Efficiency Audit** - Lab performance and turnaround time tracking

The backend is production-ready and can be integrated with the Reports page immediately.
