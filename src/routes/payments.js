import express from "express";
import { appendLog, createId, readDb, writeDb } from "../data/store.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

router.get("/", authenticate, (req, res) => {
  const db = readDb();
  const payments = ["admin", "receptionist"].includes(req.user.role)
    ? db.payments
    : db.payments.filter((payment) => payment.patientId === req.user.patientId);
  res.json(payments);
});

router.post("/create", authenticate, (req, res) => {
  const db = readDb();
  const appointment = db.appointments.find((candidate) => candidate.id === req.body.appointmentId);
  if (!appointment) return res.status(404).json({ message: "Appointment not found." });
  if (req.user.role === "patient" && appointment.patientId !== req.user.patientId) {
    return res.status(403).json({ message: "Patients can pay only for their own appointments." });
  }

  const payment = {
    id: createId("pay"),
    appointmentId: appointment.id,
    patientId: appointment.patientId,
    amount: appointment.amount,
    provider: process.env.STRIPE_SECRET_KEY ? "stripe-ready" : "demo",
    status: "succeeded",
    createdAt: new Date().toISOString()
  };
  appointment.paymentStatus = "paid";
  db.payments.push(payment);
  appendLog(db, req.user, "payment_recorded", { paymentId: payment.id, appointmentId: appointment.id });
  writeDb(db);
  res.status(201).json(payment);
});

router.post("/:id/refund", authenticate, (req, res) => {
  const db = readDb();
  const payment = db.payments.find((candidate) => candidate.id === req.params.id);
  if (!payment) return res.status(404).json({ message: "Payment not found." });
  if (!["admin", "receptionist"].includes(req.user.role)) return res.status(403).json({ message: "Only staff can refund payments." });
  payment.status = "refunded";
  appendLog(db, req.user, "payment_refunded", { paymentId: payment.id });
  writeDb(db);
  res.json(payment);
});

export default router;
