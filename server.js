import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// ===============================
// Serve Frontend
// ===============================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static("frontend"));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "frontend", "index.html"));
});

// ===============================
// Analyze API
// ===============================
app.post("/analyze", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || message.trim() === "") {
      return res.json({
        result: "Please enter a message to analyze."
      });
    }

    // ===============================
    // 🔐 LAYER 1: RULE-BASED DETECTION
    // ===============================
    const text = message.toLowerCase();

    const highRiskKeywords = [
      "bank account",
      "blocked",
      "otp",
      "click here",
      "verify now",
      "urgent",
      "kyc",
      "suspended",
      "prize",
      "won",
      "free money",
      "limited time",
      "account suspended",
      "update details"
    ];

    const isHighRisk = highRiskKeywords.some(keyword =>
      text.includes(keyword)
    );

    if (isHighRisk) {
      return res.json({
        result: `
Risk Level: HIGH

Reason:
This message contains urgency or sensitive keywords commonly used in phishing and scam attacks.

Safety Advice:
• Do NOT click on any links.
• Do NOT share OTP, PIN, or bank details.
• Contact the organization directly using official contact details.
`
      });
    }

  
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          temperature: 0.3,
          messages: [
            {
              role: "system",
              content:
                "You are a cyber security expert. Detect scams and online fraud."
            },
            {
              role: "user",
              content: `
Analyze the following message and respond EXACTLY in this format:

Risk Level:
Reason:
Safety Advice:

Message: "${message}"
`
            }
          ]
        })
      }
    );

    const data = await response.json();

    // Debug log (optional – remove in production)
    console.log("Groq Response:", JSON.stringify(data, null, 2));

    if (data.error) {
      return res.json({
        result: `
Risk Level: UNKNOWN

Reason:
AI service returned an error.

Safety Advice:
Avoid interacting with suspicious messages.
`
      });
    }

    if (!data.choices || !data.choices.length) {
      return res.json({
        result: `
Risk Level: UNKNOWN

Reason:
AI service temporarily unavailable.

Safety Advice:
Avoid clicking links or sharing personal details.
`
      });
    }

    return res.json({
      result: data.choices[0].message.content
    });

  } catch (error) {
    return res.json({
      result: `
Risk Level: UNKNOWN

Reason:
Internal server error occurred.

Safety Advice:
Avoid interacting with suspicious messages.
`
    });
  }
});

app.listen(5000, () => {
  console.log("Cyber Guardian backend running on port 5000");
});
