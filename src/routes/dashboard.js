import express from "express";
import { readDb } from "../data/store.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

router.get("/", authenticate, (req, res) => {
  const db = readDb();
  const appointments = ["admin", "receptionist"].includes(req.user.role)
    ? db.appointments
    : req.user.role === "doctor"
      ? db.appointments.filter((appointment) => appointment.doctorId === req.user.doctorId)
      : db.appointments.filter((appointment) => appointment.patientId === req.user.patientId);

  const revenue = db.payments.filter((payment) => payment.status === "succeeded").reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const upcoming = appointments.filter((appointment) => ["pending", "approved"].includes(appointment.status));
  const completed = appointments.filter((appointment) => appointment.status === "completed");

  res.json({
    stats: {
      doctors: db.doctors.length,
      patients: db.patients.length,
      appointments: appointments.length,
      upcoming: upcoming.length,
      completed: completed.length,
      revenue
    },
    appointments,
    prescriptions: db.prescriptions.filter((prescription) => appointments.some((appointment) => appointment.id === prescription.appointmentId)),
    payments: db.payments.filter((payment) => req.user.role !== "patient" || payment.patientId === req.user.patientId),
    activityLogs: ["admin", "receptionist"].includes(req.user.role) ? db.activityLogs.slice(0, 40) : [],
    charts: {
      status: ["pending", "approved", "completed", "cancelled", "rejected"].map((status) => ({
        label: status,
        value: appointments.filter((appointment) => appointment.status === status).length
      })),
      departments: db.departments.map((department) => ({
        label: department.name,
        value: appointments.filter((appointment) => appointment.departmentId === department.id).length
      }))
    }
  });
});

export default router;
