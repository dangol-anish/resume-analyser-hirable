require("dotenv").config();
const express = require("express");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const mammoth = require("mammoth");
const Tesseract = require("tesseract.js");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
const port = 5000;

app.use(cors());

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY); // 🔁 Replace with your Gemini API Key

// Multer setup
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
});

// Resume keyword matcher
function isLikelyResume(text) {
  const keywords = [
    "resume",
    "curriculum vitae",
    "experience",
    "education",
    "skills",
    "projects",
    "certifications",
    "work history",
    "contact",
    "objective",
    "summary",
  ];

  const lowerText = text.toLowerCase();
  const matches = keywords.filter((keyword) => lowerText.includes(keyword));
  return matches.length >= 3;
}

// Upload and process resume
app.post("/upload", (req, res) => {
  upload.single("file")(req, res, async (err) => {
    if (err) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ error: "File size exceeds 2MB limit." });
      }
      return res.status(500).json({ error: "File upload error." });
    }

    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded." });
      }

      let text = "";
      const mimetype = req.file.mimetype;

      if (mimetype === "application/pdf") {
        const pdfData = await pdfParse(req.file.buffer);
        text = pdfData.text;
      } else if (mimetype === "text/plain") {
        text = req.file.buffer.toString("utf-8");
      } else if (
        mimetype ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      ) {
        const result = await mammoth.extractRawText({
          buffer: req.file.buffer,
        });
        text = result.value;
      } else if (mimetype.startsWith("image/")) {
        const result = await Tesseract.recognize(req.file.buffer, "eng", {
          logger: (m) => console.log(m),
        });
        text = result.data.text;
      } else {
        return res.status(400).json({ error: "Unsupported file type." });
      }

      if (text.length < 200 || !isLikelyResume(text)) {
        return res.status(400).json({
          error: "The uploaded file doesn't seem to be a valid resume.",
        });
      }

      // === Gemini Feedback Generation ===
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const prompt = `
You are an expert **Resume Analyzer AI** that evaluates resumes for job applications. Your goal is to provide **accurate, structured, and actionable feedback** to help candidates improve their resumes.

### **Instructions**
- Always follow the structure below.
- Use clear and concise language.
- Provide specific and **actionable** feedback.
- Ensure **ATS (Applicant Tracking System) compatibility** by suggesting **keyword improvements**.
- Use **quantifiable metrics and industry best practices**.

---

## **🔍 Resume Analysis Structure**
Analyze the following resume and provide structured feedback in this format:

### **1️⃣ Overall Resume Score (0-100)**
### **2️⃣ Strengths (🔹 Bullet Points)**
### **3️⃣ Weaknesses & Areas for Improvement (⚠️ Bullet Points)**
### **4️⃣ Section-Specific Feedback**
#### 📌 Header & Contact Info
#### 📌 Summary / Professional Profile (if present)
#### 📌 Work Experience
#### 📌 Skills Section
#### 📌 Education Section
#### 📌 Formatting & Readability
### **5️⃣ ATS Optimization & Keyword Analysis**
### **6️⃣ Final Suggestions & Actionable Next Steps**

---

Here is the resume:
\`\`\`
${text}
\`\`\`
`;

      const result = await model.generateContent(prompt);
      const feedback = await result.response.text();

      res.json({ text, feedback });
    } catch (error) {
      console.error("Server Error:", error);
      res.status(500).json({ error: "Server error during processing." });
    }
  });
});

// Start server
app.listen(port, () => {
  console.log(`🚀 Server is running on http://localhost:${port}`);
});
