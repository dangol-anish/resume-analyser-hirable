const express = require("express");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const mammoth = require("mammoth");

const app = express();
const port = 5000;

app.use(cors());

// Set up multer to handle file uploads
const storage = multer.memoryStorage(); // Store files in memory
const upload = multer({ storage: storage });

// POST route to handle file upload and text extraction
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded." });
    }

    // Extract text based on file type (for PDF here)
    let text = "";

    // Check the file type (you can add more conditions for other file types)
    if (req.file.mimetype === "application/pdf") {
      const pdfData = await pdfParse(req.file.buffer);
      text = pdfData.text;
    } else if (req.file.mimetype === "text/plain") {
      text = req.file.buffer.toString("utf-8");
    } else if (
      req.file.mimetype ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      const result = await mammoth.extractRawText({ buffer: req.file.buffer });
      text = result.value;
    } else {
      return res.status(400).json({ error: "Unsupported file type." });
    }

    console.log(text);

    // Send extracted text back to the frontend
    res.json({ text: text });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error during text extraction." });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
