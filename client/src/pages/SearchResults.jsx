import React, { useState, useEffect } from 'react';

const PAGE_SIZE = 25;

export default function SearchResults() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [rollNumber, setRollNumber] = useState('');
  const [name, setName] = useState('');
  const [board, setBoard] = useState('');
  const [year, setYear] = useState('');
  const [classNum, setClassNum] = useState('');

  const fetchResults = async (page = 1) => {
    setLoading(true);

    const params = new URLSearchParams();
    params.append("page", page);
    params.append("page_size", PAGE_SIZE);

    if (rollNumber.trim()) params.append("roll_number", rollNumber.trim());
    if (name.trim()) params.append("name", name.trim());
    if (board.trim()) params.append("board", board.trim());
    if (year) params.append("year", year);
    if (classNum) params.append("class_num", classNum);

    try {
      const res = await fetch(`http://localhost:8000/api/results?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.detail || "Failed to fetch results");

      setResults(data.data || []);
      setTotalCount(data.total_count || 0);
      setCurrentPage(data.page || 1);
    } catch (err) {
      alert("Error fetching records: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults(1);
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchResults(1);
  };

  const handleReset = () => {
    setRollNumber('');
    setName('');
    setBoard('');
    setYear('');
    setClassNum('');
    fetchResults(1);
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;

  return (
    <div className="table-container">
      <h2>2. Search Student Gazette Records</h2>

      {/* Filter Form */}
      <form onSubmit={handleSearchSubmit} className="search-bar">
        <input
          placeholder="Roll Number"
          type="number"
          value={rollNumber}
          onChange={(e) => setRollNumber(e.target.value)}
          className="input-field"
        />
        <input
          placeholder="Student Name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="input-field"
        />
        <input
          placeholder="Board (e.g. Lahore)"
          type="text"
          value={board}
          onChange={(e) => setBoard(e.target.value)}
          className="input-field"
        />
        <input
          placeholder="Class (e.g. 10)"
          type="number"
          value={classNum}
          onChange={(e) => setClassNum(e.target.value)}
          className="input-field"
          style={{ maxWidth: '110px' }}
        />
        <input
          placeholder="Year (e.g. 2026)"
          type="number"
          value={year}
          onChange={(e) => setYear(e.target.value)}
          className="input-field"
          style={{ maxWidth: '110px' }}
        />

        <button type="submit" className="btn-primary">Search</button>
        <button type="button" onClick={handleReset} className="btn-secondary">Reset</button>
      </form>

      {/* Results View */}
      {loading ? (
        <p>Loading records from server...</p>
      ) : (
        <>
          <div className="count-label">
            Found <strong>{totalCount}</strong> matching records
          </div>

          <table className="data-table">
            <thead>
              <tr>
                <th>Roll Number</th>
                <th>Student Name</th>
                <th>Marks</th>
                <th>Board</th>
                <th>Group</th>
                <th>Class</th>
                <th>Year</th>
              </tr>
            </thead>
            <tbody>
              {results.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '24px' }}>
                    No records match your criteria.
                  </td>
                </tr>
              ) : (
                results.map((row, index) => (
                  <tr key={row.id || index}>
                    <td><strong>{row.roll_number}</strong></td>
                    <td>{row.name || "—"}</td>
                    <td>{row.marks ?? "—"}</td>
                    <td>{row.board || "—"}</td>
                    <td>{row.group || "—"}</td>
                    <td>{row.class ?? "—"}</td>
                    <td>{row.year ?? "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Pagination Controls */}
          <div className="pagination-bar">
            <button
              disabled={currentPage <= 1 || loading}
              onClick={() => fetchResults(currentPage - 1)}
              className="btn-secondary"
            >
              ← Previous
            </button>

            <span>Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong></span>

            <button
              disabled={currentPage >= totalPages || loading}
              onClick={() => fetchResults(currentPage + 1)}
              className="btn-secondary"
            >
              Next →
            </button>
          </div>
        </>
      )}
    </div>
  );
}