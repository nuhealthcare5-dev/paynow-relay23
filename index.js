import express from "express";
import Paynow from "paynow";

const app = express();
app.use(express.json());

// ==========================
// ENV CHECK
// ==========================
console.log("ENV CHECK:", {
  PAYNOW_INTEGRATION_ID: !!process.env.PAYNOW_INTEGRATION_ID,
  PAYNOW_INTEGRATION_KEY: !!process.env.PAYNOW_INTEGRATION_KEY,
  RELAY_SECRET: !!process.env.RELAY_SECRET,
});

if (
  !process.env.PAYNOW_INTEGRATION_ID ||
  !process.env.PAYNOW_INTEGRATION_KEY ||
  !process.env.RELAY_SECRET
) {
  console.error("❌ ENV VARS MISSING");
  process.exit(1);
}

// ==========================
// INIT PAYNOW
// ==========================
let paynow;
try {
  paynow = new Paynow(
    process.env.PAYNOW_INTEGRATION_ID,
    process.env.PAYNOW_INTEGRATION_KEY
  );
  console.log("✅ Paynow initialized successfully");
} catch (err) {
  console.error("❌ PAYNOW INIT FAILED", err);
  process.exit(1);
}

// ==========================
// HEALTH CHECK
// ==========================
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "paynow-relay",
    timestamp: new Date().toISOString(),
  });
});

// ==========================
// CREATE PAYMENT
// ==========================
app.post("/create-payment", async (req, res) => {
  try {
    if (req.headers["x-relay-secret"] !== process.env.RELAY_SECRET) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized",
      });
    }

    const { email, amount, reference } = req.body;

    if (!email || !amount || !reference) {
      return res.status(400).json({
        success: false,
        error: "Missing email, amount or reference",
      });
    }

    const payment = paynow.createPayment(reference, email);
    payment.add("Subscription", Number(amount));

    const response = await paynow.send(payment);

    if (!response.success) {
      return res.status(400).json({
        success: false,
        error: "Paynow rejected transaction",
      });
    }

    return res.json({
      success: true,
      redirectUrl: response.redirectUrl,
      pollUrl: response.pollUrl,
    });
  } catch (err) {
    console.error("PAYNOW ERROR:", err);
    return res.status(500).json({
      success: false,
      error: "Payment relay error",
    });
  }
});

// ==========================
// START SERVER (RAILWAY SAFE)
// ==========================
const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Paynow relay running on port ${PORT}`);
});
