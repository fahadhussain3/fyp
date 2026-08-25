import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

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

    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = supabase
      .from('student_results')
      .select('*', { count: 'exact' })
      .range(from, to)
      .order('roll_number', { ascending: true });

    if (rollNumber.trim()) query = query.eq('roll_number', parseInt(rollNumber.trim(), 10));
    if (name.trim()) query = query.ilike('name', `%${name.trim()}%`);
    if (board.trim()) query = query.ilike('board', `%${board.trim()}%`);
    if (year) query = query.eq('year', parseInt(year, 10));
    if (classNum) query = query.eq('class', parseInt(classNum, 10));

    const { data, count, error } = await query;

    if (error) {
      alert("Error fetching records: " + error.message);
    } else {
      setResults(data || []);
      setTotalCount(count || 0);
      setCurrentPage(page);
    }
    setLoading(false);
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
        <p>Loading records from database...</p>
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
                    No records found.
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