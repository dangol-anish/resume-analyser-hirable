"use client";
import React, { useState } from "react";
import axios from "axios";

const FileUpload = () => {
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState<string>("");

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setFile(event.target.files[0]);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (file) {
      const formData = new FormData();
      formData.append("file", file);

      try {
        const response = await axios.post(
          "http://localhost:5000/upload",
          formData,
          { headers: { "Content-Type": "multipart/form-data" } }
        );
        setText(response.data.text);
      } catch (error) {
        console.error("Error uploading file", error);
      }
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <input type="file" onChange={handleFileChange} />
        <button type="submit">Upload File</button>
      </form>
      {text && (
        <div>
          <h3>Extracted Text:</h3>
          <pre>{text}</pre>
        </div>
      )}
    </div>
  );
};

export default FileUpload;
