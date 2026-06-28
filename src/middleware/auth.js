import jwt from "jsonwebtoken";
import { readDb, publicUser } from "../data/store.js";

const jwtSecret = process.env.JWT_SECRET || "development-clinic-secret-change-me";

export function issueAccessToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, jwtSecret, { expiresIn: "2h" });
}

export function authenticate(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : req.cookies?.accessToken;

  if (!token) {
    return res.status(401).json({ message: "Authentication required." });
  }

  try {
    const payload = jwt.verify(token, jwtSecret);
    const db = readDb();
    const user = db.users.find((candidate) => candidate.id === payload.sub);
    if (!user) {
      return res.status(401).json({ message: "User no longer exists." });
    }
    req.user = publicUser(user);
    next();
  } catch {
    return res.status(401).json({ message: "Session expired. Please sign in again." });
  }
}

export function authorize(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({ message: "You do not have permission for this action." });
    }
    next();
  };
}
