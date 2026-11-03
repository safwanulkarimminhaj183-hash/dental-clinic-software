export const mockAnalytics = {
  totalRevenue: 24500,
  totalAppointments: 142,
  totalPatientsCount: 89,
  newPatientsThisMonth: 12,
  totalBilled: 26000,
  totalOutstanding: 1500,
  prescriptionsThisMonth: 45,
  totalTreatmentsCount: 8,
  monthlyRevenueTrend: [
    { label: "Jan", monthlyRevenue: 4000 },
    { label: "Feb", monthlyRevenue: 3000 },
    { label: "Mar", monthlyRevenue: 5000 },
    { label: "Apr", monthlyRevenue: 4500 },
    { label: "May", monthlyRevenue: 6000 },
    { label: "Jun", monthlyRevenue: 2000 }
  ],
  monthlyAppointmentTrend: [
    { label: "Jan", appointments: 40 },
    { label: "Feb", appointments: 30 },
    { label: "Mar", appointments: 50 },
    { label: "Apr", appointments: 45 },
    { label: "May", appointments: 60 },
    { label: "Jun", appointments: 20 }
  ],
  popularTreatments: [
    { _id: "Teeth Whitening", count: 45 },
    { _id: "Root Canal", count: 32 },
    { _id: "Dental Implants", count: 18 }
  ],
  paymentStatuses: [
    { _id: "Paid", count: 120, sumAmount: 24500 },
    { _id: "Pending", count: 22, sumAmount: 1500 }
  ],
  appointmentStatusStats: [
    { _id: "Completed", count: 98 },
    { _id: "Scheduled", count: 30 },
    { _id: "Cancelled", count: 14 }
  ],
  staffStats: [
    { _id: "Dr. Sarah Johnson", count: 85 },
    { _id: "Dr. Michael Chen", count: 57 }
  ]
};

export const mockFinancials = {
  billingOverview: {
    totalBilled: 26000,
    totalPaid: 24500,
    totalDue: 1500
  },
  paymentMethodBreakdown: [
    { _id: "Credit Card", count: 85 },
    { _id: "Cash", count: 20 },
    { _id: "Insurance", count: 37 }
  ],
  recentBookingInvoices: [
    { bookingReference: "INV-1001", patientName: "John Doe", treatmentPlanTitle: "Teeth Whitening", totalAmount: 150, amountPaid: 150, paymentStatus: "Paid" },
    { bookingReference: "INV-1002", patientName: "Jane Smith", treatmentPlanTitle: "Root Canal", totalAmount: 850, amountPaid: 0, paymentStatus: "Pending" },
    { bookingReference: "INV-1003", patientName: "Robert Johnson", treatmentPlanTitle: "Dental Checkup", totalAmount: 95, amountPaid: 95, paymentStatus: "Paid" }
  ]
};

export const mockAppointments = [
  { _id: "A1", name: "Alice Walker", patientName: "Alice Walker", serviceName: "Teeth Whitening", doctorName: "Dr. Sarah Johnson", date: "2026-10-04", timeSlot: "10:00 AM", status: "Scheduled", phone: "555-0101", patientPhone: "555-0101", email: "alice@example.com", patientEmail: "alice@example.com" },
  { _id: "A2", name: "Bob Martin", patientName: "Bob Martin", serviceName: "Root Canal", doctorName: "Dr. Michael Chen", date: "2026-10-04", timeSlot: "11:30 AM", status: "Completed", phone: "555-0102", patientPhone: "555-0102", email: "bob@example.com", patientEmail: "bob@example.com" },
  { _id: "A3", name: "Charlie Davis", patientName: "Charlie Davis", serviceName: "Dental Implant", doctorName: "Dr. Sarah Johnson", date: "2026-10-05", timeSlot: "02:00 PM", status: "Cancelled", phone: "555-0103", patientPhone: "555-0103", email: "charlie@example.com", patientEmail: "charlie@example.com" }
];

export const mockPrescriptions = [
  { _id: "P1", prescriptionNumber: "RX-2026-001", patientName: "Alice Walker", patientEmail: "alice@example.com", doctorName: "Dr. Sarah Johnson", diagnosis: "Gingivitis", createdAt: "2026-10-03T10:00:00Z", emailSent: true },
  { _id: "P2", prescriptionNumber: "RX-2026-002", patientName: "Bob Martin", patientEmail: "bob@example.com", doctorName: "Dr. Michael Chen", diagnosis: "Post Root Canal", createdAt: "2026-10-02T11:30:00Z", emailSent: false }
];

export const mockSchedule = {
  schedule: [
    { slot: "09:00 AM", isAvailable: true },
    { slot: "10:00 AM", isAvailable: false },
    { slot: "11:00 AM", isAvailable: true }
  ],
  availableSlots: [
    { slot: "09:00 AM" },
    { slot: "11:00 AM" }
  ]
};
