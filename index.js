import express from "express";
import cors from "cors";
import Paynow from "paynow";

const app = express();

/* ---------------- BASIC MIDDLEWARE ---------------- */
app.use(cors());
app.use(express.json());

/* ---------------- ENV CHECK ---------------- */
const hasEnv = {
  PAYNOW_INTEGRATION_ID: !!process.env.PAYNOW_INTEGRATION_ID,
  PAYNOW_INTEGRATION_KEY: !!process.env.PAYNOW_INTEGRATION_KEY,
  RELAY_SECRET: !!process.env.RELAY_SECRET,
};

console.log("ENV CHECK:", hasEnv);

if (!hasEnv.PAYNOW_INTEGRATION_ID || !hasEnv.PAYNOW_INTEGRATION_KEY) {
  console.error("❌ PAYNOW ENV VARS MISSING");
}

/* ---------------- PAYNOW INIT ---------------- */
let paynow = null;

try {
  paynow = new Paynow(
    process.env.PAYNOW_INTEGRATION_ID,
    process.env.PAYNOW_INTEGRATION_KEY
  );
  console.log("✅ Paynow initialized");
} catch (err) {
  console.error("❌ Paynow init failed:", err.message);
}

/* ---------------- HEALTH CHECK ---------------- */
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "paynow-relay",
    paynowReady: !!paynow,
    timestamp: new Date().toISOString(),
  });
});

/* ---------------- CREATE PAYMENT ---------------- */
app.post("/create-payment", async (req, res) => {
  try {
    const secret = req.headers["x-relay-secret"];
    if (secret !== process.env.RELAY_SECRET) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!paynow) {
