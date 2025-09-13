import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

const severityOrder = { CRITICAL: 1, MEDIUM: 2, LOW: 3 };
const severityDecorated = (level) => {
  if (!level) return "";
  if (level === "CRITICAL") return "🔴 CRITICAL!!!";
  if (level === "MEDIUM") return "🟡 Medium!";
  if (level === "LOW") return "🟢 Low";
  return level;
};

export default function DoctorDashboard() {
  const [patients, setPatients] = useState([]);
  const [search, setSearch] = useState("");
  const [severity, setSeverity] = useState("");
  const [sort, setSort] = useState("severity");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [doctor, setDoctor] = useState(null);

  const fetchPatients = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (severity) params.set("severity", severity);
      if (sort) params.set("sort", sort);
      params.set("limit", String(pageSize));
      params.set("offset", String((page - 1) * pageSize));
      const res = await fetch(`/api/doctor/patients?${params.toString()}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to fetch");
      setPatients(data.patients || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, severity, sort, page]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("tricog_doctor");
      if (raw) setDoctor(JSON.parse(raw));
    } catch (_) {}
  }, []);

  const onSearchChange = (e) => {
    setPage(1);
    setSearch(e.target.value);
  };

  const onSeverityChange = (e) => {
    setPage(1);
    setSeverity(e.target.value);
  };

  const onSortChange = (e) => {
    setSort(e.target.value);
  };

  const displayed = useMemo(() => patients, [patients]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Doctor Dashboard</h1>
            {doctor && (
              <div className="text-sm text-gray-600">{doctor.name || doctor.email}</div>
            )}
          </div>
          <div className="flex items-center space-x-3">
            {/* <Link to="/" className="text-indigo-600 hover:text-indigo-800 text-sm">Home</Link> */}
            <button
              onClick={() => {
                try { localStorage.removeItem("tricog_doctor"); } catch(_) {}
                window.location.href = "/?tab=doctor";
              }}
              className="text-red-600 hover:text-red-800 text-sm"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <input
              type="text"
              value={search}
              onChange={onSearchChange}
              placeholder="Search by name or ID"
              className="border rounded px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
            />

            <select
              value={severity}
              onChange={onSeverityChange}
              className="border rounded px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Severities</option>
              <option value="CRITICAL">🔴 Critical</option>
              <option value="MEDIUM">🟡 Medium</option>
              <option value="LOW">🟢 Low</option>
            </select>

            <select
              value={sort}
              onChange={onSortChange}
              className="border rounded px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="severity">Sort by Severity</option>
              <option value="updated">Recently Updated</option>
            </select>

            <div className="flex items-center justify-end space-x-2">
              <button
                onClick={() => fetchPatients()}
                className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Symptom</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Severity</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Appointment Time</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading && (
                  <tr>
                    <td colSpan="6" className="px-4 py-6 text-center text-gray-500">Loading...</td>
                  </tr>
                )}
                {error && !loading && (
                  <tr>
                    <td colSpan="6" className="px-4 py-6 text-center text-red-600">{error}</td>
                  </tr>
                )}
                {!loading && !error && displayed.length === 0 && (
                  <tr>
                    <td colSpan="6" className="px-4 py-6 text-center text-gray-500">No patients found</td>
                  </tr>
                )}
                {!loading && !error && displayed.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">{p.id}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{p.name || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{p.email || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{p.symptom || '-'}</td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                          p.severity === 'CRITICAL'
                            ? 'bg-red-100 text-red-800'
                            : p.severity === 'MEDIUM'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-green-100 text-green-800'
                        }`}
                        title={p.severity}
                      >
                        {severityDecorated(p.severity)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{p.appointment_time ? new Date(p.appointment_time).toLocaleString() : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="px-4 py-3 bg-gray-50 flex items-center justify-between">
            <div className="text-sm text-gray-600">Page {page}</div>
            <div className="space-x-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1 border rounded"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}


