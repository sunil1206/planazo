"use client";
/**
 * /dashboard/guests — WeddingWire-style guest list manager
 * Add guests, A/B list, RSVP tracking, meal preference, group/side
 * Import contacts from CSV or vCard (.vcf) files
 */
import { useState, useEffect, useRef } from "react";
import { Upload, FileText, Users, X } from "lucide-react";

type Guest = {
  id: string;
  name: string;
  email: string;
  phone: string;
  side: "bride" | "groom" | "mutual";
  group: string;
  list: "A" | "B";
  rsvp: "pending" | "yes" | "no" | "maybe";
  meal: "veg" | "non-veg" | "vegan" | "jain" | "";
  dietary: string;
  plus_one: boolean;
  notes: string;
};

const STORAGE_KEY = "snapshare_guests";

function load(): Guest[] {
  try { const d = localStorage.getItem(STORAGE_KEY); return d ? JSON.parse(d) : []; }
  catch { return []; }
}

const EMPTY: Omit<Guest, "id"> = {
  name: "", email: "", phone: "", side: "mutual", group: "",
  list: "A", rsvp: "pending", meal: "", dietary: "", plus_one: false, notes: "",
};

const RSVP_COLORS: Record<string, string> = {
  pending: "bg-gray-100 text-gray-500",
  yes:     "bg-green-100 text-green-700",
  no:      "bg-red-100 text-red-500",
  maybe:   "bg-amber-100 text-amber-600",
};

const inp = "w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-rose-300 bg-white";

export default function GuestsPage() {
  const [guests,    setGuests]    = useState<Guest[]>([]);
  const [showForm,  setShowForm]  = useState(false);
  const [editId,    setEditId]    = useState<string | null>(null);
  const [form,      setForm]      = useState<Omit<Guest, "id">>(EMPTY);
  const [search,    setSearch]    = useState("");
  const [filterRSVP,setFilterRSVP]= useState("all");
  const [filterSide,setFilterSide]= useState("all");
  const [importTxt, setImportTxt]   = useState("");
  const [showImport,setShowImport]  = useState(false);
  const [importTab, setImportTab]   = useState<"csv" | "vcf">("csv");
  const [importPreview, setImportPreview] = useState<Omit<Guest, "id">[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setGuests(load()); }, []);
  useEffect(() => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(guests)); } catch {} }, [guests]);

  const openNew = () => {
    setEditId(null); setForm(EMPTY); setShowForm(true);
  };
  const openEdit = (g: Guest) => {
    setEditId(g.id);
    setForm({ name: g.name, email: g.email, phone: g.phone, side: g.side, group: g.group, list: g.list, rsvp: g.rsvp, meal: g.meal, dietary: g.dietary, plus_one: g.plus_one, notes: g.notes });
    setShowForm(true);
  };

  const save = () => {
    if (!form.name.trim()) return;
    const entry: Guest = { id: editId || `g-${Date.now()}`, ...form };
    if (editId) setGuests(gs => gs.map(g => g.id === editId ? entry : g));
    else        setGuests(gs => [...gs, entry]);
    setShowForm(false);
  };

  const del = (id: string) => { if (confirm("Remove this guest?")) setGuests(gs => gs.filter(g => g.id !== id)); };

  const updateRSVP = (id: string, rsvp: Guest["rsvp"]) =>
    setGuests(gs => gs.map(g => g.id === id ? { ...g, rsvp } : g));

  // ── CSV import ──────────────────────────────────────────────────────────
  const parseCSV = (text: string): Omit<Guest, "id">[] => {
    const lines = text.split("\n").filter(l => l.trim());
    return lines.map(line => {
      const [name, email, phone] = line.split(",").map(s => s.trim());
      return { name: name || "", email: email || "", phone: phone || "",
        side: "mutual" as const, group: "", list: "A" as const,
        rsvp: "pending" as const, meal: "" as const, dietary: "", plus_one: false, notes: "" };
    }).filter(g => g.name);
  };

  // ── vCard (.vcf) parser ─────────────────────────────────────────────────
  const parseVCard = (text: string): Omit<Guest, "id">[] => {
    const cards = text.split("BEGIN:VCARD").slice(1);
    return cards.map(card => {
      const get = (field: string) => {
        const match = card.match(new RegExp(`^${field}[^:]*:(.+)$`, "mi"));
        return match ? match[1].trim() : "";
      };
      const fnLine = get("FN");
      const nLine  = get("N");
      // Construct name: FN preferred, fallback N (Last;First;Middle;Prefix;Suffix)
      let name = fnLine || (() => {
        const parts = nLine.split(";");
        return [parts[1], parts[0]].filter(Boolean).join(" ");
      })();
      const email = get("EMAIL");
      // TEL can have type qualifiers: TEL;TYPE=CELL:+91...
      const telMatch = card.match(/^TEL[^:]*:(.+)$/mi);
      const phone = telMatch ? telMatch[1].trim() : "";
      return { name, email, phone,
        side: "mutual" as const, group: "", list: "A" as const,
        rsvp: "pending" as const, meal: "" as const, dietary: "", plus_one: false, notes: "" };
    }).filter(g => g.name.trim());
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const text = ev.target?.result as string;
      const parsed = file.name.toLowerCase().endsWith(".vcf")
        ? parseVCard(text)
        : parseCSV(text);
      setImportPreview(parsed);
    };
    reader.readAsText(file);
    e.target.value = ""; // allow re-upload same file
  };

  const importGuests = () => {
    let parsed: Omit<Guest, "id">[] = [];
    if (importTab === "vcf") {
      parsed = importPreview;
    } else {
      parsed = parseCSV(importTxt);
    }
    const newGuests: Guest[] = parsed.map((g, i) => ({ ...g, id: `import-${Date.now()}-${i}` }));
    setGuests(gs => [...gs, ...newGuests]);
    setImportTxt(""); setImportPreview([]); setShowImport(false);
  };

  // Filter
  const filtered = guests.filter(g => {
    const matchSearch = !search || g.name.toLowerCase().includes(search.toLowerCase()) || g.email.toLowerCase().includes(search.toLowerCase());
    const matchRSVP   = filterRSVP === "all" || g.rsvp === filterRSVP;
    const matchSide   = filterSide === "all" || g.side === filterSide;
    return matchSearch && matchRSVP && matchSide;
  });

  // Stats
  const stats = {
    total:   guests.length,
    attending: guests.filter(g => g.rsvp === "yes").length,
    declined:  guests.filter(g => g.rsvp === "no").length,
    pending:   guests.filter(g => g.rsvp === "pending").length,
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">👥 Guest List</h1>
          <p className="text-sm text-gray-400">{stats.total} guests · {stats.attending} attending · {stats.pending} pending</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => { setShowImport(true); setImportPreview([]); setImportTxt(""); }}
            className="px-3 sm:px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 flex items-center gap-1.5">
            <Upload size={14} /><span className="hidden sm:inline">Import Contacts</span>
          </button>
          <button onClick={openNew}
            className="px-4 py-2 rounded-xl bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700">
            + Add Guest
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
        {[
          { label: "Total Invited",  value: stats.total,     color: "#6b7280" },
          { label: "Attending",      value: stats.attending, color: "#10b981" },
          { label: "Declined",       value: stats.declined,  color: "#ef4444" },
          { label: "Awaiting RSVP",  value: stats.pending,   color: "#f59e0b" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm text-center">
            <p className="text-2xl font-bold" style={{ color }}>{value}</p>
            <p className="text-xs text-gray-400 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <input placeholder="Search guests…" value={search} onChange={e => setSearch(e.target.value)}
          className="flex-1 min-w-40 px-4 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-rose-300" />
        <select value={filterRSVP} onChange={e => setFilterRSVP(e.target.value)}
          className="px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none">
          <option value="all">All RSVPs</option>
          <option value="pending">Pending</option>
          <option value="yes">Attending</option>
          <option value="no">Declined</option>
          <option value="maybe">Maybe</option>
        </select>
        <select value={filterSide} onChange={e => setFilterSide(e.target.value)}
          className="px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none">
          <option value="all">All Sides</option>
          <option value="bride">Bride's Side</option>
          <option value="groom">Groom's Side</option>
          <option value="mutual">Mutual</option>
        </select>
      </div>

      {/* Guest list */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <div className="text-4xl mb-3">👥</div>
          <p className="text-gray-400">{guests.length === 0 ? "No guests yet. Start adding!" : "No guests match this filter."}</p>
        </div>
      ) : (
        <>
          {/* ── Mobile cards ─────────────────────────────────────────────── */}
          <div className="md:hidden space-y-3">
            {filtered.map(g => (
              <div key={g.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center text-sm font-bold text-rose-600 flex-shrink-0">
                      {g.name[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">{g.name}{g.plus_one && <span className="ml-1 text-xs text-gray-400">+1</span>}</p>
                      <p className="text-xs text-gray-400">{g.email || g.phone || "—"}</p>
                    </div>
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    <button onClick={() => openEdit(g)} className="text-xs text-blue-500 px-2 py-1 rounded-lg hover:bg-blue-50">Edit</button>
                    <button onClick={() => del(g.id)} className="text-xs text-red-400 px-2 py-1 rounded-lg hover:bg-red-50">Del</button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${g.list === "A" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                    {g.list}-List
                  </span>
                  <span className="text-xs text-gray-500 capitalize bg-gray-50 px-2 py-0.5 rounded-full">{g.side}</span>
                  {g.meal && <span className="text-xs text-gray-500 capitalize bg-gray-50 px-2 py-0.5 rounded-full">{g.meal}</span>}
                  <select value={g.rsvp}
                    onChange={e => updateRSVP(g.id, e.target.value as Guest["rsvp"])}
                    className={`px-2 py-0.5 rounded-full text-xs font-medium border-0 outline-none cursor-pointer ${RSVP_COLORS[g.rsvp]}`}>
                    <option value="pending">Pending</option>
                    <option value="yes">Attending ✓</option>
                    <option value="no">Declined ✗</option>
                    <option value="maybe">Maybe</option>
                  </select>
                </div>
              </div>
            ))}
          </div>

          {/* ── Desktop table ─────────────────────────────────────────────── */}
          <div className="hidden md:block bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {["Name", "Contact", "Side", "Group", "List", "RSVP", "Meal", ""].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(g => (
                  <tr key={g.id} className="hover:bg-gray-50 group">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center text-xs font-bold text-rose-600 flex-shrink-0">
                          {g.name[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">{g.name}</p>
                          {g.plus_one && <span className="text-xs text-gray-400">+1</span>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-gray-600 text-xs">{g.email}</p>
                      <p className="text-gray-400 text-xs">{g.phone}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 capitalize">{g.side}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{g.group || "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${g.list === "A" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                        {g.list}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <select value={g.rsvp}
                        onChange={e => updateRSVP(g.id, e.target.value as Guest["rsvp"])}
                        className={`px-2 py-1 rounded-full text-xs font-medium border-0 outline-none cursor-pointer ${RSVP_COLORS[g.rsvp]}`}>
                        <option value="pending">Pending</option>
                        <option value="yes">Attending ✓</option>
                        <option value="no">Declined ✗</option>
                        <option value="maybe">Maybe</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 capitalize">{g.meal || "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition">
                        <button onClick={() => openEdit(g)} className="text-xs text-blue-500">Edit</button>
                        <button onClick={() => del(g.id)}   className="text-xs text-red-400">Del</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl p-6 sm:p-7 w-full sm:max-w-lg shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between mb-5">
              <h3 className="text-lg font-bold">{editId ? "Edit Guest" : "Add Guest"}</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 text-2xl">×</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">Full Name *</label>
                <input placeholder="e.g. Rahul Sharma" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} className={inp} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">Email</label>
                  <input type="email" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} className={inp} />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">Phone</label>
                  <input value={form.phone} onChange={e => setForm(f => ({...f, phone: e.target.value}))} className={inp} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">Side</label>
                  <select value={form.side} onChange={e => setForm(f => ({...f, side: e.target.value as any}))} className={inp}>
                    <option value="bride">Bride's Side</option>
                    <option value="groom">Groom's Side</option>
                    <option value="mutual">Mutual</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">Group / Family</label>
                  <input placeholder="e.g. Sharma Family" value={form.group} onChange={e => setForm(f => ({...f, group: e.target.value}))} className={inp} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">List</label>
                  <select value={form.list} onChange={e => setForm(f => ({...f, list: e.target.value as "A" | "B"}))} className={inp}>
                    <option value="A">A-List (Priority)</option>
                    <option value="B">B-List</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">Meal Pref</label>
                  <select value={form.meal} onChange={e => setForm(f => ({...f, meal: e.target.value as any}))} className={inp}>
                    <option value="">—</option>
                    <option value="veg">Veg</option>
                    <option value="non-veg">Non-Veg</option>
                    <option value="vegan">Vegan</option>
                    <option value="jain">Jain</option>
                  </select>
                </div>
                <div className="flex items-end pb-0.5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.plus_one} onChange={e => setForm(f => ({...f, plus_one: e.target.checked}))} className="w-4 h-4 accent-rose-600" />
                    <span className="text-sm text-gray-600">+1 Guest</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">Notes / Dietary restrictions</label>
                <input placeholder="Allergies, special requirements…" value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} className={inp} />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowForm(false)} className="flex-1 py-3 rounded-xl border text-sm text-gray-500">Cancel</button>
              <button onClick={save} className="flex-1 py-3 rounded-xl bg-rose-600 text-white text-sm font-semibold">
                {editId ? "Save Changes" : "Add Guest"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImport && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl p-6 sm:p-7 w-full sm:max-w-lg shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Users size={18} className="text-rose-500" /> Import Contacts
              </h3>
              <button onClick={() => setShowImport(false)}
                className="p-1.5 rounded-full bg-gray-100 text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            {/* Tab switcher */}
            <div className="flex gap-2 mb-5 bg-slate-100 p-1 rounded-xl">
              {(["csv", "vcf"] as const).map(t => (
                <button key={t} onClick={() => { setImportTab(t); setImportPreview([]); }}
                  className={`flex-1 py-2 rounded-lg text-sm font-bold transition ${
                    importTab === t ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"
                  }`}>
                  {t === "csv" ? "📋 CSV / Text" : "📱 vCard (.vcf)"}
                </button>
              ))}
            </div>

            {importTab === "csv" && (
              <>
                <p className="text-xs text-gray-400 mb-3">
                  Paste one guest per line:{" "}
                  <code className="bg-gray-100 px-1.5 py-0.5 rounded font-mono">Name, Email, Phone</code>
                </p>
                <textarea
                  rows={7}
                  className={`${inp} font-mono text-xs resize-none`}
                  placeholder={"Rahul Sharma, rahul@email.com, 9876543210\nPriya Mehta, priya@email.com, 9876543211\nAnju Verma, anju@email.com, 9876543212"}
                  value={importTxt}
                  onChange={e => setImportTxt(e.target.value)}
                />
                {importTxt.trim() && (
                  <p className="text-xs text-emerald-600 font-semibold mt-2">
                    ✓ {parseCSV(importTxt).length} contacts detected
                  </p>
                )}
              </>
            )}

            {importTab === "vcf" && (
              <>
                <p className="text-xs text-gray-400 mb-4">
                  Upload a <strong>.vcf</strong> file exported from your phone contacts (Google Contacts, iPhone, WhatsApp, etc.)
                </p>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".vcf,.vcard,text/vcard"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <button onClick={() => fileRef.current?.click()}
                  className="w-full py-10 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center gap-3 hover:border-rose-300 hover:bg-rose-50 transition group cursor-pointer">
                  <FileText size={32} className="text-slate-300 group-hover:text-rose-400 transition" />
                  <span className="text-sm font-bold text-slate-500 group-hover:text-rose-500">
                    Click to upload .vcf file
                  </span>
                  <span className="text-xs text-slate-400">Supports Google Contacts, iPhone, Android exports</span>
                </button>

                {importPreview.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs text-emerald-600 font-bold mb-3">
                      ✓ {importPreview.length} contacts ready to import
                    </p>
                    <div className="max-h-40 overflow-y-auto space-y-1.5 rounded-xl bg-slate-50 p-3">
                      {importPreview.slice(0, 10).map((g, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          <div className="w-6 h-6 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 font-bold flex-shrink-0">
                            {g.name[0]?.toUpperCase()}
                          </div>
                          <span className="font-semibold text-slate-700">{g.name}</span>
                          {g.email && <span className="text-slate-400 truncate">{g.email}</span>}
                          {g.phone && <span className="text-slate-400">{g.phone}</span>}
                        </div>
                      ))}
                      {importPreview.length > 10 && (
                        <p className="text-xs text-slate-400 text-center pt-1">
                          …and {importPreview.length - 10} more
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowImport(false)}
                className="flex-1 py-3 rounded-xl border border-slate-200 text-sm text-slate-500 hover:bg-slate-50 font-semibold">
                Cancel
              </button>
              <button
                onClick={importGuests}
                disabled={importTab === "csv" ? !importTxt.trim() : importPreview.length === 0}
                className="flex-1 py-3 rounded-xl bg-rose-600 text-white text-sm font-black hover:bg-rose-700 transition disabled:opacity-40 disabled:cursor-not-allowed">
                Import {importTab === "csv"
                  ? (importTxt.trim() ? `${parseCSV(importTxt).length} guests` : "")
                  : (importPreview.length > 0 ? `${importPreview.length} guests` : "")
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
