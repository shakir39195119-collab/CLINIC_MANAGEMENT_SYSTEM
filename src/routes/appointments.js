import express from "express";
import { appendLog, createId, readDb, writeDb } from "../data/store.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { sendEmail, sendSms } from "../services/notifications.js";

const router = express.Router();

function visibleAppointments(db, user) {
  if (["admin", "receptionist"].includes(user.role)) return db.appointments;
  if (user.role === "doctor") return db.appointments.filter((appointment) => appointment.doctorId === user.doctorId);
  return db.appointments.filter((appointment) => appointment.patientId === user.patientId);
}

router.get("/", authenticate, (req, res) => {
  const db = readDb();
  res.json(visibleAppointments(db, req.user));
});

router.post("/", authenticate, async (req, res) => {
  const db = readDb();
  const doctor = db.doctors.find((candidate) => candidate.id === req.body.doctorId);
  const patient = req.user.role === "patient"
    ? db.patients.find((candidate) => candidate.id === req.user.patientId)
    : db.patients.find((candidate) => candidate.id === req.body.patientId);

  if (!doctor || !patient || !req.body.date || !req.body.time) {
    return res.status(400).json({ message: "Doctor, patient, date, and time are required." });
  }

  const appointment = {
    id: createId("apt"),
    patientId: patient.id,
    patientName: patient.name,
    doctorId: doctor.id,
    departmentId: doctor.departmentId,
    date: req.body.date,
    time: req.body.time,
    symptoms: req.body.symptoms || "",
    reportName: req.body.reportName || "",
    amount: doctor.fee,
    status: req.user.role === "patient" ? "pending" : "approved",
    paymentStatus: "unpaid",
    createdAt: new Date().toISOString()
  };

  db.appointments.push(appointment);
  appendLog(db, req.user, "appointment_booked", { appointmentId: appointment.id });
  writeDb(db);

  const account = db.users.find((user) => user.patientId === patient.id);
  if (account?.email) {
    await sendEmail({ to: account.email, subject: "Appointment request received", text: `Your appointment with ${doctor.name} is scheduled for ${appointment.date} at ${appointment.time}.` });
  }
  if (account?.phone) {
    await sendSms({ to: account.phone, body: `Appointment request received for ${appointment.date} ${appointment.time}.` });
  }

  res.status(201).json(appointment);
});

router.patch("/:id/status", authenticate, authorize("admin", "doctor", "receptionist"), async (req, res) => {
  const { status } = req.body;
  if (!["pending", "approved", "rejected", "completed", "cancelled"].includes(status)) {
    return res.status(400).json({ message: "Invalid appointment status." });
  }

  const db = readDb();
  const appointment = db.appointments.find((candidate) => candidate.id === req.params.id);
  if (!appointment) return res.status(404).json({ message: "Appointment not found." });
  if (req.user.role === "doctor" && appointment.doctorId !== req.user.doctorId) {
    return res.status(403).json({ message: "Doctors can update only their own appointments." });
  }

  appointment.status = status;
  appendLog(db, req.user, "appointment_status_changed", { appointmentId: appointment.id, status });
  writeDb(db);
  res.json(appointment);
});

router.post("/:id/prescription", authenticate, authorize("doctor"), (req, res) => {
  const db = readDb();
  const appointment = db.appointments.find((candidate) => candidate.id === req.params.id);
  if (!appointment) return res.status(404).json({ message: "Appointment not found." });
  if (appointment.doctorId !== req.user.doctorId) return res.status(403).json({ message: "Not your appointment." });

  const prescription = {
    id: createId("rx"),
    appointmentId: appointment.id,
    patientId: appointment.patientId,
    doctorId: appointment.doctorId,
    medicines: req.body.medicines || [],
    labTests: req.body.labTests || [],
    diagnosis: req.body.diagnosis || "",
    notes: req.body.notes || "",
    createdAt: new Date().toISOString()
  };
  db.prescriptions.push(prescription);
  appendLog(db, req.user, "prescription_created", { appointmentId: appointment.id });
  writeDb(db);
  res.status(201).json(prescription);
});

router.delete("/:id", authenticate, (req, res) => {
  const db = readDb();
  const appointment = db.appointments.find((candidate) => candidate.id === req.params.id);
  if (!appointment) return res.status(404).json({ message: "Appointment not found." });
  if (req.user.role === "patient" && appointment.patientId !== req.user.patientId) {
    return res.status(403).json({ message: "Patients can cancel only their own appointments." });
  }
  appointment.status = "cancelled";
  appendLog(db, req.user, "appointment_cancelled", { appointmentId: appointment.id });
  writeDb(db);
  res.json(appointment);
});

export default router;
