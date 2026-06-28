import bcrypt from "bcryptjs";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { v4 as uuid } from "uuid";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const defaultDataFile = path.join(__dirname, "clinic-db.json");
const dataFile = path.resolve(process.env.DATA_FILE || defaultDataFile);

const departments = [
  { id: "general", name: "General Physician", icon: "stethoscope", price: 65, duration: "30 min" },
  { id: "cardiology", name: "Cardiology", icon: "heart", price: 125, duration: "45 min" },
  { id: "dermatology", name: "Dermatology", icon: "sparkles", price: 90, duration: "30 min" },
  { id: "pediatrics", name: "Pediatrics", icon: "baby", price: 75, duration: "30 min" },
  { id: "orthopedic", name: "Orthopedic", icon: "bone", price: 110, duration: "45 min" },
  { id: "laboratory", name: "Laboratory", icon: "test-tube", price: 45, duration: "20 min" }
];

const doctors = [
  {
    id: "doc-amara",
    name: "Dr. Amara Khan",
    departmentId: "general",
    qualification: "MBBS, FCPS",
    experience: 12,
    rating: 4.9,
    languages: ["English", "Urdu"],
    fee: 65,
    availability: ["Mon 09:00-13:00", "Wed 10:00-15:00", "Fri 09:00-13:00"],
    bio: "Primary care physician focused on preventive medicine and chronic care planning.",
    image: "/assets/doctor-amara.svg"
  },
  {
    id: "doc-leo",
    name: "Dr. Leo Martin",
    departmentId: "cardiology",
    qualification: "MD Cardiology",
    experience: 15,
    rating: 4.8,
    languages: ["English", "Arabic"],
    fee: 125,
    availability: ["Tue 11:00-17:00", "Thu 09:00-14:00"],
    bio: "Cardiologist specializing in non-invasive diagnostics and long-term heart health.",
    image: "/assets/doctor-leo.svg"
  },
  {
    id: "doc-sana",
    name: "Dr. Sana Rafiq",
    departmentId: "dermatology",
    qualification: "MBBS, DDerm",
    experience: 9,
    rating: 4.7,
    languages: ["English", "Urdu", "Punjabi"],
    fee: 90,
    availability: ["Mon 14:00-18:00", "Thu 12:00-18:00", "Sat 09:00-13:00"],
    bio: "Dermatologist providing medical skin care, acne treatment, and cosmetic consults.",
    image: "/assets/doctor-sana.svg"
  },
  {
    id: "doc-noor",
    name: "Dr. Noor Sheikh",
    departmentId: "pediatrics",
    qualification: "DCH, FCPS Pediatrics",
    experience: 11,
    rating: 4.9,
    languages: ["English", "Urdu"],
    fee: 75,
    availability: ["Tue 09:00-13:00", "Wed 15:00-19:00", "Sat 10:00-14:00"],
    bio: "Pediatrician supporting newborn care, vaccination, and childhood wellness.",
    image: "/assets/doctor-noor.svg"
  }
];

const services = departments.map((department) => ({
  id: department.id,
  name: department.name,
  description: `${department.name} consultations with diagnosis, treatment planning, and follow-up guidance.`,
  duration: department.duration,
  price: department.price,
  doctorId: doctors.find((doctor) => doctor.departmentId === department.id)?.id || doctors[0].id
}));

const now = new Date();
const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

function initialData() {
  const adminPassword = bcrypt.hashSync("Admin@12345", 10);
  const doctorPassword = bcrypt.hashSync("Doctor@12345", 10);
  const patientPassword = bcrypt.hashSync("Patient@12345", 10);
  const receptionistPassword = bcrypt.hashSync("Reception@12345", 10);

  const users = [
    { id: "user-admin", name: "Clinic Admin", email: "admin@clinic.test", passwordHash: adminPassword, role: "admin", phone: "+1 555 0100" },
    { id: "user-doctor", name: "Dr. Amara Khan", email: "doctor@clinic.test", passwordHash: doctorPassword, role: "doctor", doctorId: "doc-amara", phone: "+1 555 0101" },
    { id: "user-reception", name: "Front Desk", email: "reception@clinic.test", passwordHash: receptionistPassword, role: "receptionist", phone: "+1 555 0102" },
    { id: "user-patient", name: "Sample Patient", email: "patient@clinic.test", passwordHash: patientPassword, role: "patient", patientId: "pat-sample", phone: "+1 555 0103" }
  ];

  return {
    users,
    departments,
    doctors,
    services,
    patients: [
      {
        id: "pat-sample",
        userId: "user-patient",
        name: "Sample Patient",
        age: 34,
        gender: "Female",
        bloodGroup: "O+",
        allergies: "Penicillin",
        history: ["Annual checkup completed", "Vitamin D deficiency monitored"]
      }
    ],
    appointments: [
      {
        id: "apt-1001",
        patientId: "pat-sample",
        patientName: "Sample Patient",
        doctorId: "doc-amara",
        departmentId: "general",
        date: tomorrow,
        time: "10:30",
        symptoms: "Follow-up consultation and mild fatigue.",
        status: "approved",
        paymentStatus: "paid",
        amount: 65,
        createdAt: now.toISOString()
      },
      {
        id: "apt-1002",
        patientId: "pat-sample",
        patientName: "Sample Patient",
        doctorId: "doc-sana",
        departmentId: "dermatology",
        date: nextWeek,
        time: "15:00",
        symptoms: "Skin irritation review.",
        status: "pending",
        paymentStatus: "unpaid",
        amount: 90,
        createdAt: now.toISOString()
      }
    ],
    payments: [
      { id: "pay-1001", appointmentId: "apt-1001", patientId: "pat-sample", amount: 65, provider: "demo", status: "succeeded", createdAt: now.toISOString() }
    ],
    prescriptions: [
      { id: "rx-1001", appointmentId: "apt-1001", patientId: "pat-sample", doctorId: "doc-amara", medicines: ["Vitamin D3 weekly"], notes: "Hydration, sleep tracking, follow up in 4 weeks.", createdAt: now.toISOString() }
    ],
    messages: [
      { id: "msg-1001", from: "Clinic Admin", toRole: "patient", body: "Your appointment reminder is active.", createdAt: now.toISOString(), read: false }
    ],
    blogs: [
      { id: "blog-1", title: "Five signs your checkup should not wait", category: "Preventive Care", excerpt: "Simple symptoms can deserve early attention when they persist.", date: now.toISOString().slice(0, 10) },
      { id: "blog-2", title: "Preparing children for vaccination day", category: "Pediatrics", excerpt: "Small steps make the visit calmer for parents and children.", date: now.toISOString().slice(0, 10) }
    ],
    faqs: [
      { id: "faq-1", question: "Can I reschedule an appointment?", answer: "Yes. Patients can cancel or reschedule from the dashboard before the visit starts." },
      { id: "faq-2", question: "Do you support online payments?", answer: "Yes. Demo payments work immediately, and Stripe or PayPal credentials can be connected for production." }
    ],
    activityLogs: []
  };
}

export function ensureSeedData() {
  fs.mkdirSync(path.dirname(dataFile), { recursive: true });
  if (!fs.existsSync(dataFile)) {
    fs.writeFileSync(dataFile, JSON.stringify(initialData(), null, 2));
  }
}

export function readDb() {
  ensureSeedData();
  return JSON.parse(fs.readFileSync(dataFile, "utf8"));
}

export function writeDb(db) {
  fs.writeFileSync(dataFile, JSON.stringify(db, null, 2));
  return db;
}

export function publicUser(user) {
  if (!user) return null;
  const { passwordHash, ...safe } = user;
  return safe;
}

export function appendLog(db, actor, action, details = {}) {
  db.activityLogs.unshift({
    id: uuid(),
    actor: actor?.email || "system",
    role: actor?.role || "system",
    action,
    details,
    createdAt: new Date().toISOString()
  });
  db.activityLogs = db.activityLogs.slice(0, 300);
}

export function createId(prefix) {
  return `${prefix}-${uuid().slice(0, 8)}`;
}
