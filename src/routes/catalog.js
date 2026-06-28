import express from "express";
import { appendLog, createId, readDb, writeDb } from "../data/store.js";
import { authenticate, authorize } from "../middleware/auth.js";

const router = express.Router();

router.get("/", (req, res) => {
  const db = readDb();
  res.json({
    departments: db.departments,
    doctors: db.doctors,
    services: db.services,
    blogs: db.blogs,
    faqs: db.faqs
  });
});

router.get("/doctors", (req, res) => {
  const db = readDb();
  const { department, q } = req.query;
  let doctors = db.doctors;
  if (department) doctors = doctors.filter((doctor) => doctor.departmentId === department);
  if (q) doctors = doctors.filter((doctor) => `${doctor.name} ${doctor.bio}`.toLowerCase().includes(String(q).toLowerCase()));
  res.json(doctors);
});

router.post("/doctors", authenticate, authorize("admin"), (req, res) => {
  const db = readDb();
  const doctor = { id: createId("doc"), rating: 4.8, availability: [], ...req.body };
  db.doctors.push(doctor);
  appendLog(db, req.user, "doctor_created", { doctorId: doctor.id });
  writeDb(db);
  res.status(201).json(doctor);
});

router.put("/doctors/:id", authenticate, authorize("admin", "doctor"), (req, res) => {
  const db = readDb();
  const doctor = db.doctors.find((candidate) => candidate.id === req.params.id);
  if (!doctor) return res.status(404).json({ message: "Doctor not found." });
  if (req.user.role === "doctor" && req.user.doctorId !== doctor.id) {
    return res.status(403).json({ message: "Doctors can update only their own profile." });
  }
  Object.assign(doctor, req.body, { id: doctor.id });
  appendLog(db, req.user, "doctor_updated", { doctorId: doctor.id });
  writeDb(db);
  res.json(doctor);
});

router.delete("/doctors/:id", authenticate, authorize("admin"), (req, res) => {
  const db = readDb();
  const before = db.doctors.length;
  db.doctors = db.doctors.filter((doctor) => doctor.id !== req.params.id);
  if (db.doctors.length === before) return res.status(404).json({ message: "Doctor not found." });
  appendLog(db, req.user, "doctor_deleted", { doctorId: req.params.id });
  writeDb(db);
  res.status(204).end();
});

router.post("/services", authenticate, authorize("admin"), (req, res) => {
  const db = readDb();
  const service = { id: createId("svc"), ...req.body };
  db.services.push(service);
  appendLog(db, req.user, "service_created", { serviceId: service.id });
  writeDb(db);
  res.status(201).json(service);
});

export default router;
