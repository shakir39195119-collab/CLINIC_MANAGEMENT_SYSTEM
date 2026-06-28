import bcrypt from "bcryptjs";
import express from "express";
import jwt from "jsonwebtoken";
import { appendLog, createId, publicUser, readDb, writeDb } from "../data/store.js";
import { authenticate, issueAccessToken } from "../middleware/auth.js";
import { sendEmail } from "../services/notifications.js";

const router = express.Router();
const refreshSecret = process.env.JWT_REFRESH_SECRET || "development-clinic-refresh-secret-change-me";

function issueRefreshToken(user) {
  return jwt.sign({ sub: user.id, role: user.role, type: "refresh" }, refreshSecret, { expiresIn: "7d" });
}

router.post("/register", async (req, res) => {
  const { name, email, password, phone } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ message: "Name, email, and password are required." });
  }

  const db = readDb();
  const exists = db.users.some((user) => user.email.toLowerCase() === email.toLowerCase());
  if (exists) return res.status(409).json({ message: "An account with this email already exists." });

  const patientId = createId("pat");
  const user = {
    id: createId("user"),
    name,
    email: email.toLowerCase(),
    phone: phone || "",
    role: "patient",
    patientId,
    passwordHash: await bcrypt.hash(password, 10)
  };

  db.users.push(user);
  db.patients.push({ id: patientId, userId: user.id, name, age: "", gender: "", bloodGroup: "", allergies: "", history: [] });
  appendLog(db, user, "patient_registered", { patientId });
  writeDb(db);
  await sendEmail({ to: user.email, subject: "Welcome to MediCore Clinic", text: `Welcome ${name}. Your patient portal is ready.` });

  res.status(201).json({ user: publicUser(user), accessToken: issueAccessToken(user), refreshToken: issueRefreshToken(user) });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const db = readDb();
  const user = db.users.find((candidate) => candidate.email.toLowerCase() === String(email || "").toLowerCase());
  if (!user || !(await bcrypt.compare(password || "", user.passwordHash))) {
    return res.status(401).json({ message: "Invalid email or password." });
  }

  appendLog(db, user, "login");
  writeDb(db);
  res.json({ user: publicUser(user), accessToken: issueAccessToken(user), refreshToken: issueRefreshToken(user) });
});

router.post("/refresh", (req, res) => {
  const { refreshToken } = req.body;
  try {
    const payload = jwt.verify(refreshToken, refreshSecret);
    const db = readDb();
    const user = db.users.find((candidate) => candidate.id === payload.sub);
    if (!user) return res.status(401).json({ message: "Invalid refresh token." });
    res.json({ accessToken: issueAccessToken(user), user: publicUser(user) });
  } catch {
    res.status(401).json({ message: "Invalid refresh token." });
  }
});

router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  const db = readDb();
  const user = db.users.find((candidate) => candidate.email.toLowerCase() === String(email || "").toLowerCase());
  if (user) {
    user.resetOtp = String(Math.floor(100000 + Math.random() * 900000));
    user.resetOtpExpiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    writeDb(db);
    await sendEmail({ to: user.email, subject: "Password reset OTP", text: `Your OTP is ${user.resetOtp}. It expires in 10 minutes.` });
  }
  res.json({ message: "If the account exists, a reset OTP has been sent." });
});

router.post("/reset-password", async (req, res) => {
  const { email, otp, password } = req.body;
  const db = readDb();
  const user = db.users.find((candidate) => candidate.email.toLowerCase() === String(email || "").toLowerCase());
  const valid = user?.resetOtp === otp && new Date(user.resetOtpExpiresAt || 0).getTime() > Date.now();
  if (!valid) return res.status(400).json({ message: "Invalid or expired OTP." });

  user.passwordHash = await bcrypt.hash(password, 10);
  delete user.resetOtp;
  delete user.resetOtpExpiresAt;
  appendLog(db, user, "password_reset");
  writeDb(db);
  res.json({ message: "Password updated." });
});

router.get("/me", authenticate, (req, res) => {
  res.json({ user: req.user });
});

export default router;
