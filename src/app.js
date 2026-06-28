import "dotenv/config";
import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ensureSeedData } from "./data/store.js";
import authRoutes from "./routes/auth.js";
import appointmentRoutes from "./routes/appointments.js";
import catalogRoutes from "./routes/catalog.js";
import dashboardRoutes from "./routes/dashboard.js";
import messageRoutes from "./routes/messages.js";
import paymentRoutes from "./routes/payments.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

export function createApp() {
  ensureSeedData();

  const app = express();
  const allowedOrigin = process.env.APP_URL || true;

  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "https://fonts.googleapis.com", "'unsafe-inline'"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"]
      }
    }
  }));
  app.use(cors({ origin: allowedOrigin, credentials: true }));
  app.use(compression());
  app.use(cookieParser());
  app.use(express.json({ limit: "4mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 600, standardHeaders: true }));

  app.use("/api/auth", authRoutes);
  app.use("/api/appointments", appointmentRoutes);
  app.use("/api/catalog", catalogRoutes);
  app.use("/api/dashboard", dashboardRoutes);
  app.use("/api/messages", messageRoutes);
  app.use("/api/payments", paymentRoutes);

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", service: "clinic-management-system", time: new Date().toISOString() });
  });

  app.use(express.static(path.join(projectRoot, "public"), { maxAge: "1h" }));
  app.get("*", (req, res) => {
    res.sendFile(path.join(projectRoot, "public", "index.html"));
  });

  app.use((err, req, res, next) => {
    console.error(err);
    res.status(err.status || 500).json({
      message: err.publicMessage || "Something went wrong. Please try again."
    });
  });

  return app;
}
