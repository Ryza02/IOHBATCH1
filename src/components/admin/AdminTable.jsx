// components/admin/AdminTable.jsx
"use client";

import { useState, useEffect, useCallback } from "react";

export default function AdminTable() {
  const DEFAULT_FROM = "2025-07-17";
  const DEFAULT_TO = "2025-08-01";

  const [filters, setFilters] = useState({
    site_id: "",
    sector: "",
    dateFrom: DEFAULT_FROM,
    dateTo: DEFAULT_TO,
  });

  const [pagination, setPagination] = useState({
    page: 1,
    perPage: 20,
  });

  const [data, setData] = useState([]);
  const [sites, setSites] = useState([]);
  const [sectors, setSectors] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [formData, setFormData] = useState({
    Date: "",
    Time: "",
    "eNodeB Name": "",
    "Cell Name": "",
    "Traffic GB": "",
    User: "",
    CQI: "",
    "Site ID": "",
    "Sector": "",
    EUT: "",
    PRB: "",
    "IOH_4G Rank2 %": "",
    "IOH_4G Cell Availability (%)": "",
  });

  const buildUrl = useCallback(() => {
    const params = new URLSearchParams({
      page: pagination.page,
      perPage: pagination.perPage,
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
    });
    if (filters.site_id) params.set("site_id", filters.site_id);
    if (filters.sector) params.set("sector", filters.sector);
    return `/api/admin/data?${params.toString()}`;
  }, [filters, pagination]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(buildUrl());
      if (!res.ok) throw new Error("Gagal memuat data");
      const result = await res.json();
      setData(Array.isArray(result.rows) ? result.rows : []);
      setSites(Array.isArray(result.sites) ? result.sites : []);
      setSectors(Array.isArray(result.sectors) ? result.sectors : []);
      setTotal(typeof result.total === "number" ? result.total : 0);
    } catch (err) {
      console.error("[AdminTable]", err);
      setData([]);
      setSites([]);
      setSectors([]);
      setTotal(0);
      setMsg(`❌ ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [buildUrl]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handlePerPageChange = (e) => {
    setPagination((prev) => ({ ...prev, perPage: Number(e.target.value), page: 1 }));
  };

  const goToPage = (page) => {
    const totalPages = Math.ceil(total / pagination.perPage);
    if (page < 1 || page > totalPages) return;
    setPagination((prev) => ({ ...prev, page }));
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    try {
      const fd = new FormData(e.currentTarget);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.message || "Upload gagal");
      setMsg(`✅ Sukses: ${data.inserted} baris`);
      fetchData();
    } catch (err) {
      setMsg(`❌ ${err.message}`);
    } finally {
      setBusy(false);
      e.currentTarget.reset();
    }
  };

  const handleInputChange = (e) => {
    let { name, value } = e.target;

    // ✅ Perbaiki format Time: "11:45" → "11:45:00"
    if (name === "Time" && value && value.length === 5 && !value.includes(":00")) {
      value = value + ":00";
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddOrEdit = async () => {
    setBusy(true);
    try {
      if (!editingId && (!formData.Date || !formData.Time)) {
        throw new Error("Date dan Time wajib diisi");
      }

      const url = editingId ? `/api/admin/kpi/${editingId}` : "/api/admin/kpi";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || (editingId ? "Gagal update" : "Gagal tambah"));
      }

      setMsg(editingId ? "✅ Data diupdate" : "✅ Data ditambahkan");
      setShowAddModal(false);
      setEditingId(null);
      setFormData({
        Date: "", Time: "", "eNodeB Name": "", "Cell Name": "",
        "Traffic GB": "", User: "", CQI: "",
        "Site ID": "", "Sector": "",
        EUT: "", PRB: "", "IOH_4G Rank2 %": "", "IOH_4G Cell Availability (%)": "",
      });
      fetchData();
    } catch (err) {
      setMsg(`❌ ${err.message}`);
    } finally {
      setBusy(false);
    }
  };

  const handleEdit = (row) => {
    setEditingId(row.id);
    setFormData({
      Date: row.Date || "",
      Time: row.Time || "",
      "eNodeB Name": row["eNodeB Name"] || "",
      "Cell Name": row["Cell Name"] || "",
      "Traffic GB": row["Traffic GB"]?.toString() || "",
      User: row.User?.toString() || "",
      CQI: row.CQI?.toString() || "",
      "Site ID": row["Site ID"] || "",
      "Sector": row["Sector"] || "",
      EUT: row.EUT?.toString() || "",
      PRB: row.PRB?.toString() || "",
      "IOH_4G Rank2 %": row["IOH_4G Rank2 %"]?.toString() || "",
      "IOH_4G Cell Availability (%)": row["IOH_4G Cell Availability (%)"]?.toString() || "",
    });
    setShowAddModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("Hapus data ini?")) return;
    try {
      const res = await fetch(`/api/admin/kpi/${id}`, { method: "DELETE" });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "Gagal hapus");
      }
      setMsg("✅ Data dihapus");
      fetchData();
    } catch (err) {
      setMsg(`❌ ${err.message}`);
    }
  };

  const totalPages = Math.ceil(total / pagination.perPage);

  return (
    <div className="space-y-6">
      {/* Upload */}
      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-4 md:p-6">
        <form onSubmit={handleUpload} className="flex flex-col md:flex-row gap-3 items-start md:items-end">
          <div className="flex-1">
            <label className="block text-xs text-white/70 mb-1">Upload CSV</label>
            <input
              name="file"
              type="file"
              accept=".csv"
              required
              className="file:mr-3 file:px-3 file:py-2 file:rounded-lg file:border file:border-white/10 file:bg-white/10 file:text-white w-full"
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="px-4 py-2 bg-white text-black font-semibold rounded-lg hover:bg-zinc-200 disabled:opacity-60"
          >
            {busy ? "Mengupload…" : "Upload"}
          </button>
        </form>
        {msg && <p className="mt-2 text-sm text-green-400">{msg}</p>}
      </div>

      {/* Filter */}
      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-4 md:p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Dari Tanggal</label>
            <input
              type="date"
              name="dateFrom"
              value={filters.dateFrom}
              onChange={handleFilterChange}
              className="w-full bg-white/10 border border-white/10 rounded px-3 py-2 text-white text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Sampai Tanggal</label>
            <input
              type="date"
              name="dateTo"
              value={filters.dateTo}
              onChange={handleFilterChange}
              className="w-full bg-white/10 border border-white/10 rounded px-3 py-2 text-white text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Site ID</label>
            <select
              name="site_id"
              value={filters.site_id}
              onChange={handleFilterChange}
              className="w-full bg-[#1a1c2a] border border-white/20 rounded px-3 py-2 text-white text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Semua</option>
              {sites.map((site) => (
                <option key={site.site_id} value={site.site_id}>
                  {site.site_id}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Sector</label>
            <select
              name="sector"
              value={filters.sector}
              onChange={handleFilterChange}
              className="w-full bg-[#1a1c2a] border border-white/20 rounded px-3 py-2 text-white text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Semua</option>
              {sectors.map((sec, i) => (
                <option key={`${sec}-${i}`} value={sec}>
                  {sec}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tambah Manual */}
      <div className="flex justify-end">
        <button
          onClick={() => {
            setEditingId(null);
            setFormData({
              Date: "", Time: "", "eNodeB Name": "", "Cell Name": "",
              "Traffic GB": "", User: "", CQI: "",
              "Site ID": "", "Sector": "",
              EUT: "", PRB: "", "IOH_4G Rank2 %": "", "IOH_4G Cell Availability (%)": "",
            });
            setShowAddModal(true);
          }}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500"
        >
          + Tambah Data Manual
        </button>
      </div>

      {/* Tabel */}
      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-4 md:p-6">
        {loading ? (
          <p className="text-white">Memuat data...</p>
        ) : data.length === 0 ? (
          <p className="text-gray-400">Tidak ada data</p>
        ) : (
          <>
            <div className="overflow-x-auto mb-4">
              <table className="w-full text-white text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="py-2 text-left">Date</th>
                    <th className="py-2 text-left">Time</th>
                    <th className="py-2 text-left">Site ID</th>
                    <th className="py-2 text-left">Sector</th>
                    <th className="py-2 text-left">Traffic GB</th>
                    <th className="py-2 text-left">User</th>
                    <th className="py-2 text-left">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((row) => (
                    <tr key={row.id} className="border-b border-white/5 hover:bg-white/5">
                      <td>{row.Date}</td>
                      <td>{row.Time}</td>
                      <td>{row["Site ID"]}</td>
                      <td>{row["Sector"]}</td>
                      <td>{row["Traffic GB"]}</td>
                      <td>{row.User}</td>
                      <td className="py-2 space-x-2">
                        <button
                          onClick={() => handleEdit(row)}
                          className="text-blue-400 hover:text-blue-300 text-xs"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(row.id)}
                          className="text-red-400 hover:text-red-300 text-xs"
                        >
                          Hapus
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-3 text-sm text-gray-400">
              <div>Menampilkan {data.length} dari {total} data</div>
              <div className="flex items-center gap-2">
                <span>Baris/halaman:</span>
                <select
                  value={pagination.perPage}
                  onChange={handlePerPageChange}
                  className="bg-[#1a1c2a] border border-white/20 rounded px-2 py-1 text-white"
                >
                  <option value="10">10</option>
                  <option value="20">20</option>
                  <option value="50">50</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => goToPage(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="px-3 py-1 rounded bg-white/10 text-white disabled:opacity-40"
                >
                  Sebelumnya
                </button>
                <span>Hal {pagination.page} dari {totalPages || 1}</span>
                <button
                  onClick={() => goToPage(pagination.page + 1)}
                  disabled={pagination.page >= totalPages}
                  className="px-3 py-1 rounded bg-white/10 text-white disabled:opacity-40"
                >
                  Berikutnya
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0e1021] rounded-xl border border-white/10 w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <h3 className="text-lg font-bold text-white mb-4">
              {editingId ? "Edit Data" : "Tambah Data Manual"}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(formData).map(([key, value]) => (
                <div key={key}>
                  <label className="block text-xs text-gray-400 mb-1">{key}</label>
                  <input
                    name={key}
                    value={value}
                    onChange={handleInputChange}
                    className="w-full bg-[#1a1c2a] border border-white/20 rounded px-3 py-2 text-white text-sm"
                    type={key.includes("Date") ? "date" : key.includes("Time") ? "time" : "text"}
                    step={key.includes("Time") ? "1" : undefined}
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-white bg-gray-600 rounded hover:bg-gray-500"
              >
                Batal
              </button>
              <button
                onClick={handleAddOrEdit}
                disabled={busy}
                className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-500 disabled:opacity-60"
              >
                {busy ? "Menyimpan..." : editingId ? "Update" : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        select {
          -webkit-appearance: none;
          -moz-appearance: none;
          appearance: none;
        }
        select::-ms-expand {
          display: none;
        }
      `}</style>
    </div>
  );
}