import express from "express";
import { appendLog, createId, readDb, writeDb } from "../data/store.js";
import { authenticate, authorize } from "../middleware/auth.js";

const router = express.Router();

router.get("/", authenticate, (req, res) => {
  const db = readDb();
  res.json(db.messages.filter((message) => message.toRole === req.user.role || message.toUserId === req.user.id));
});

router.post("/", authenticate, authorize("admin", "doctor", "receptionist"), (req, res) => {
  const db = readDb();
  const message = {
    id: createId("msg"),
    from: req.user.name,
    toRole: req.body.toRole || "patient",
    toUserId: req.body.toUserId || "",
    body: req.body.body,
    read: false,
    createdAt: new Date().toISOString()
  };
  db.messages.unshift(message);
  appendLog(db, req.user, "message_sent", { messageId: message.id });
  writeDb(db);
  res.status(201).json(message);
});

export default router;
