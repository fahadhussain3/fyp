import React, { useState } from 'react';

export default function UploadGazette() {
  const [file, setFile] = useState(null);
  const [board, setBoard] = useState("BISE Lahore");
  const [classNum, setClassNum] = useState(10);
  const [year, setYear] = useState(2026);

  const [includeName, setIncludeName] = useState(true);
  const [includeGroup, setIncludeGroup] = useState(false);

  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [stageText, setStageText] = useState("");
  const [statusMsg, setStatusMsg] = useState("");
  const [isError, setIsError] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!file) return alert("Please select a PDF file first.");

    setLoading(true);
    setIsError(false);
    setUploadProgress(0);
    setStageText("Uploading file to server (0%)...");
    setStatusMsg("");

    const selectedFields = ["roll_number", "marks"];
    if (includeName) selectedFields.push("name");
    if (includeGroup) selectedFields.push("group");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("board", board);
    formData.append("class_num", classNum);
    formData.append("year", year);
    formData.append("selected_fields", JSON.stringify(selectedFields));

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "http://localhost:8000/api/upload-and-parse");

    // Track upload progress
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        setUploadProgress(percent);
        if (percent < 100) {
          setStageText(`Uploading PDF (${percent}%)... (${(event.loaded / (1024 * 1024)).toFixed(1)} MB / ${(event.total / (1024 * 1024)).toFixed(1)} MB)`);
        } else {
          setStageText("Upload complete! Parsing pages and saving records to Supabase (this takes 1-2 mins)...");
        }
      }
    };

    xhr.onload = () => {
      setLoading(false);
      try {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) {
          setIsError(false);
          setStatusMsg(`Success! Processed ${data.total_pages} pages and inserted ${data.records_inserted} student records into database.`);
        } else {
          setIsError(true);
          setStatusMsg(`Error: ${typeof data.detail === "object" ? JSON.stringify(data.detail) : (data.detail || "Upload failed")}`);
        }
      } catch (err) {
        setIsError(true);
        setStatusMsg("Error parsing server response: " + xhr.responseText);
      }
    };

    xhr.onerror = () => {
      setLoading(false);
      setIsError(true);
      setStatusMsg("Network error connecting to backend server. Make sure FastAPI is running on port 8000.");
    };

    xhr.send(formData);
  };

  return (
    <div className="card-container">
      <h2>Upload Board Gazette</h2>
      <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '20px' }}>
        Select the target board and fields. The parser uses layout extraction to preserve columns and insert passed records.
      </p>

      <form onSubmit={handleSubmit} className="form-layout">
        <div>
          <label><strong>1. Gazette PDF File:</strong></label>
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => {
              setFile(e.target.files[0]);
              setUploadProgress(0);
              setStatusMsg("");
            }}
            required
            className="input-field"
            disabled={loading}
          />
          {file && (
            <span style={{ fontSize: '12px', color: '#64748b', display: 'block', marginTop: '4px' }}>
              Selected: {file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)
            </span>
          )}
        </div>

        <div className="grid-3">
          <div>
            <label><strong>Board:</strong></label>
            <select
              value={board}
              onChange={(e) => setBoard(e.target.value)}
              className="input-field"
              disabled={loading}
            >
              <option value="BISE Lahore">BISE Lahore</option>
              <option value="BISE Faisalabad">BISE Faisalabad</option>
              <option value="BISE Gujranwala">BISE Gujranwala</option>
              <option value="BISE Rawalpindi">BISE Rawalpindi</option>
              <option value="BISE Multan">BISE Multan</option>
              <option value="BISE Sargodha">BISE Sargodha</option>
              <option value="BISE Sahiwal">BISE Sahiwal</option>
              <option value="BISE Bahawalpur">BISE Bahawalpur</option>
              <option value="BISE DG Khan">BISE DG Khan</option>
              <option value="FBISE Federal">FBISE Federal</option>
            </select>
          </div>
          <div>
            <label><strong>Class:</strong></label>
            <select
              value={classNum}
              onChange={(e) => setClassNum(Number(e.target.value))}
              className="input-field"
              disabled={loading}
            >
              <option value={9}>9th Class (SSC-I)</option>
              <option value={10}>10th Class (SSC-II)</option>
              <option value={11}>11th Class (HSSC-I)</option>
              <option value={12}>12th Class (HSSC-II)</option>
            </select>
          </div>
          <div>
            <label><strong>Year:</strong></label>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              required
              className="input-field"
              disabled={loading}
            />
          </div>
        </div>

        <fieldset className="mapping-box">
          <legend><strong>2. Fields Present in this PDF</strong></legend>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input type="checkbox" checked disabled />
              <span><strong>Roll / Code Number & Marks</strong> (Mandatory)</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={includeName}
                onChange={(e) => setIncludeName(e.target.checked)}
                disabled={loading}
              />
              <span><strong>Student Name</strong></span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={includeGroup}
                onChange={(e) => setIncludeGroup(e.target.checked)}
                disabled={loading}
              />
              <span><strong>Group</strong> (e.g. Science / Arts)</span>
            </label>
          </div>
        </fieldset>

        {/* Progress Bar and Status during active load */}
        {loading && (
          <div style={{ marginTop: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
              <span>{stageText}</span>
              <span><strong>{uploadProgress}%</strong></span>
            </div>
            <div style={{ width: '100%', height: '10px', background: '#e2e8f0', borderRadius: '6px', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${uploadProgress}%`,
                  height: '100%',
                  background: uploadProgress < 100 ? '#2563eb' : '#10b981',
                  transition: 'width 0.2s ease-in-out',
                }}
              />
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="btn-primary"
          style={{ marginTop: '8px' }}
        >
          {loading ? "Processing (Please wait)..." : "Upload & Parse to Supabase"}
        </button>
      </form>

      {statusMsg && (
        <div 
          className="status-badge"
          style={{ 
            background: isError ? '#fee2e2' : '#e0f2fe',
            color: isError ? '#991b1b' : '#0369a1' 
          }}
        >
          <strong>Status:</strong> {statusMsg}
        </div>
      )}
    </div>
  );
}