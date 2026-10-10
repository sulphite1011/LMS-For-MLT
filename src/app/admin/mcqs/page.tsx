"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Plus, Pencil, Trash2, X, Check, Shield, ListChecks, GraduationCap,
  Upload, Link2, ExternalLink, FileX, FileCode,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuthState } from "@/contexts/AuthContext";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { TableSkeleton } from "@/components/ui/Skeleton";

const MAX_HTML_BYTES = 4_000_000; // keep in sync with MCQ_HTML_MAX_BYTES on the server

interface Specialty {
  _id: string;
  name: string;
  slug: string;
  fullName?: string;
  description?: string;
  semesterCount: number;
  subjectCount: number;
  pageCount: number;
}

interface Subject {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  semester: number;
  updatedAt?: string;
}

interface Unit {
  _id: string;
  subjectId: string;
  name: string;
  slug: string;
  description?: string;
  hasPage: boolean;
  htmlFileName?: string;
  htmlSize?: number;
  updatedAt?: string;
}

type Confirm =
  | { kind: "specialty"; id: string; label: string }
  | { kind: "subject"; id: string; label: string }
  | { kind: "unit"; id: string; label: string }
  | { kind: "html"; id: string; label: string }
  | null;

const inputClass =
  "w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-teal focus:ring-2 focus:ring-teal/20 focus:outline-none text-sm transition-all";

async function request(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

function formatSize(bytes?: number) {
  if (!bytes) return "";
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function AdminMcqsPage() {
  const { userRole } = useAuthState();

  // ---- specialties ----
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSpecialtyForm, setShowSpecialtyForm] = useState(false);
  const [editingSpecialtyId, setEditingSpecialtyId] = useState<string | null>(null);
  const [spName, setSpName] = useState("");
  const [spFullName, setSpFullName] = useState("");
  const [spDescription, setSpDescription] = useState("");
  const [spSemesters, setSpSemesters] = useState(8);
  const [savingSpecialty, setSavingSpecialty] = useState(false);

  // ---- subjects ----
  const [specialtyId, setSpecialtyId] = useState("");
  const [semester, setSemester] = useState(1);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [showSubjectForm, setShowSubjectForm] = useState(false);
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
  const [subName, setSubName] = useState("");
  const [subDescription, setSubDescription] = useState("");
  const [savingSubject, setSavingSubject] = useState(false);

  // ---- units (of the currently opened subject) ----
  const [openSubjectId, setOpenSubjectId] = useState<string | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loadingUnits, setLoadingUnits] = useState(false);
  const [showUnitForm, setShowUnitForm] = useState(false);
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null);
  const [unitName, setUnitName] = useState("");
  const [unitDescription, setUnitDescription] = useState("");
  const [unitFile, setUnitFile] = useState<File | null>(null);
  const [savingUnit, setSavingUnit] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const replaceTargetRef = useRef<string | null>(null);

  const [confirm, setConfirm] = useState<Confirm>(null);
  const [confirming, setConfirming] = useState(false);

  const selected = specialties.find((s) => s._id === specialtyId) || null;

  const loadSpecialties = useCallback(async () => {
    try {
      const data: Specialty[] = await request("/api/mcq/specialties", { cache: "no-store" });
      setSpecialties(data);
      setSpecialtyId((current) => (current && data.some((s) => s._id === current) ? current : data[0]?._id || ""));
    } catch {
      toast.error("Failed to load specialties");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSubjects = useCallback(async () => {
    if (!specialtyId) {
      setSubjects([]);
      return;
    }
    setLoadingSubjects(true);
    try {
      const data: Subject[] = await request(`/api/mcq/subjects?specialtyId=${specialtyId}&semester=${semester}`, {
        cache: "no-store",
      });
      setSubjects(data);
    } catch {
      toast.error("Failed to load subjects");
    } finally {
      setLoadingSubjects(false);
    }
  }, [specialtyId, semester]);

  const loadUnits = useCallback(async (subjectId: string | null) => {
    if (!subjectId) {
      setUnits([]);
      return;
    }
    setLoadingUnits(true);
    try {
      const data: Unit[] = await request(`/api/mcq/units?subjectId=${subjectId}`, { cache: "no-store" });
      setUnits(data);
    } catch {
      toast.error("Failed to load units");
    } finally {
      setLoadingUnits(false);
    }
  }, []);

  useEffect(() => {
    if (userRole === "superAdmin") loadSpecialties();
  }, [userRole, loadSpecialties]);

  useEffect(() => {
    if (userRole === "superAdmin") loadSubjects();
  }, [userRole, loadSubjects]);

  // ---------------- specialties ----------------
  const resetSpecialtyForm = () => {
    setShowSpecialtyForm(false);
    setEditingSpecialtyId(null);
    setSpName("");
    setSpFullName("");
    setSpDescription("");
    setSpSemesters(8);
  };

  const startEditSpecialty = (s: Specialty) => {
    setEditingSpecialtyId(s._id);
    setSpName(s.name);
    setSpFullName(s.fullName || "");
    setSpDescription(s.description || "");
    setSpSemesters(s.semesterCount);
    setShowSpecialtyForm(true);
  };

  const saveSpecialty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!spName.trim()) return;
    setSavingSpecialty(true);
    try {
      await request(editingSpecialtyId ? `/api/mcq/specialties/${editingSpecialtyId}` : "/api/mcq/specialties", {
        method: editingSpecialtyId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: spName.trim(),
          fullName: spFullName.trim(),
          description: spDescription.trim(),
          semesterCount: spSemesters,
        }),
      });
      toast.success(editingSpecialtyId ? "Specialty updated!" : "Specialty created!");
      resetSpecialtyForm();
      loadSpecialties();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save specialty");
    } finally {
      setSavingSpecialty(false);
    }
  };

  // ---------------- subjects ----------------
  const resetSubjectForm = () => {
    setShowSubjectForm(false);
    setEditingSubjectId(null);
    setSubName("");
    setSubDescription("");
  };

  const startEditSubject = (s: Subject) => {
    setEditingSubjectId(s._id);
    setSubName(s.name);
    setSubDescription(s.description || "");
    setShowSubjectForm(true);
  };

  const pickFile = (file: File | null, onValid: (f: File) => void) => {
    if (!file) return;
    if (!/\.html?$/i.test(file.name)) {
      toast.error("Please choose an .html file");
      return;
    }
    if (file.size > MAX_HTML_BYTES) {
      toast.error("HTML file is too large (max 4 MB)");
      return;
    }
    onValid(file);
  };

  const saveSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subName.trim() || !specialtyId) return;
    setSavingSubject(true);
    try {
      const form = new FormData();
      form.append("name", subName.trim());
      form.append("description", subDescription.trim());
      if (!editingSubjectId) {
        form.append("specialtyId", specialtyId);
        form.append("semester", String(semester));
      }
      await request(editingSubjectId ? `/api/mcq/subjects/${editingSubjectId}` : "/api/mcq/subjects", {
        method: editingSubjectId ? "PUT" : "POST",
        body: form,
      });
      toast.success(editingSubjectId ? "Subject updated!" : "Subject created!");
      resetSubjectForm();
      loadSubjects();
      loadSpecialties();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save subject");
    } finally {
      setSavingSubject(false);
    }
  };

  // ---------------- units ----------------
  const toggleSubject = (subjectId: string) => {
    resetUnitForm();
    if (openSubjectId === subjectId) {
      setOpenSubjectId(null);
      setUnits([]);
    } else {
      setOpenSubjectId(subjectId);
      loadUnits(subjectId);
    }
  };

  const resetUnitForm = () => {
    setShowUnitForm(false);
    setEditingUnitId(null);
    setUnitName("");
    setUnitDescription("");
    setUnitFile(null);
  };

  const startEditUnit = (u: Unit) => {
    setEditingUnitId(u._id);
    setUnitName(u.name);
    setUnitDescription(u.description || "");
    setUnitFile(null);
    setShowUnitForm(true);
  };

  const saveUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unitName.trim() || !openSubjectId) return;
    setSavingUnit(true);
    try {
      const form = new FormData();
      form.append("name", unitName.trim());
      form.append("description", unitDescription.trim());
      if (unitFile) form.append("file", unitFile);
      if (!editingUnitId) form.append("subjectId", openSubjectId);
      await request(editingUnitId ? `/api/mcq/units/${editingUnitId}` : "/api/mcq/units", {
        method: editingUnitId ? "PUT" : "POST",
        body: form,
      });
      toast.success(editingUnitId ? "Unit updated!" : "Unit created!");
      resetUnitForm();
      loadUnits(openSubjectId);
      loadSpecialties();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save unit");
    } finally {
      setSavingUnit(false);
    }
  };

  const replaceHtml = async (unitId: string, file: File) => {
    setUploadingId(unitId);
    try {
      const form = new FormData();
      form.append("file", file);
      await request(`/api/mcq/units/${unitId}`, { method: "PUT", body: form });
      toast.success("MCQ page uploaded!");
      loadUnits(openSubjectId);
      loadSpecialties();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingId(null);
    }
  };

  const copyLink = async (subject: Subject, unit?: Unit) => {
    if (!selected) return;
    const url = `${window.location.origin}/mcqs/${selected.slug}/${semester}/${subject.slug}${unit ? `/${unit.slug}` : ""}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    } catch {
      toast.error("Couldn't copy the link");
    }
  };

  // ---------------- confirm actions ----------------
  const runConfirm = async () => {
    if (!confirm) return;
    setConfirming(true);
    try {
      if (confirm.kind === "specialty") {
        await request(`/api/mcq/specialties/${confirm.id}`, { method: "DELETE" });
        toast.success("Specialty deleted");
        loadSpecialties();
      } else if (confirm.kind === "subject") {
        await request(`/api/mcq/subjects/${confirm.id}`, { method: "DELETE" });
        toast.success("Subject deleted");
        if (openSubjectId === confirm.id) { setOpenSubjectId(null); setUnits([]); }
        loadSubjects();
        loadSpecialties();
      } else if (confirm.kind === "unit") {
        await request(`/api/mcq/units/${confirm.id}`, { method: "DELETE" });
        toast.success("Unit deleted");
        loadUnits(openSubjectId);
        loadSpecialties();
      } else {
        const form = new FormData();
        form.append("removeFile", "true");
        await request(`/api/mcq/units/${confirm.id}`, { method: "PUT", body: form });
        toast.success("MCQ page removed");
        loadUnits(openSubjectId);
        loadSpecialties();
      }
      setConfirm(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    } finally {
      setConfirming(false);
    }
  };

  if (userRole !== "superAdmin") {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Shield className="w-16 h-16 text-gray-300 mb-4" />
        <h2 className="text-xl font-semibold text-gray-700 mb-2">Super Admin Only</h2>
        <p className="text-gray-400">Only super admins can manage MCQs.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">MCQs</h1>
        <p className="text-gray-500 text-sm mt-1">
          Manage specialties, semesters, subjects and units, and upload one HTML page of MCQs per unit.
        </p>
      </div>

      {/* ---------------- Specialties ---------------- */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-primary">Specialties</h2>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => { resetSpecialtyForm(); setShowSpecialtyForm(true); }}
            className="flex items-center gap-2 bg-teal hover:bg-teal-dark text-white px-5 py-2.5 rounded-xl font-medium transition-colors shadow-md"
          >
            <Plus className="w-4 h-4" />
            Add Specialty
          </motion.button>
        </div>

        {showSpecialtyForm && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-text-primary">{editingSpecialtyId ? "Edit Specialty" : "New Specialty"}</h3>
              <button onClick={resetSpecialtyForm} className="p-1 hover:bg-gray-100 rounded-full transition-colors" aria-label="Close">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <form onSubmit={saveSpecialty} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Short name *</label>
                  <input className={inputClass} value={spName} onChange={(e) => setSpName(e.target.value)} placeholder="e.g., MLT" maxLength={40} required />
                  {!editingSpecialtyId && <p className="text-xs text-gray-400 mt-1">Used for the page link (e.g. /mcqs/mlt). The link never changes later.</p>}
                </div>
                <div className="sm:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full name</label>
                  <input className={inputClass} value={spFullName} onChange={(e) => setSpFullName(e.target.value)} placeholder="e.g., Medical Laboratory Technology" maxLength={120} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Semesters *</label>
                  <input type="number" min={1} max={12} className={inputClass} value={spSemesters} onChange={(e) => setSpSemesters(Number(e.target.value))} required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea className={inputClass} rows={2} value={spDescription} onChange={(e) => setSpDescription(e.target.value)} placeholder="Optional description..." maxLength={500} />
              </div>
              <div className="flex gap-3">
                <button type="submit" disabled={savingSpecialty} className="flex items-center gap-2 bg-teal hover:bg-teal-dark text-white px-5 py-2.5 rounded-xl font-medium transition-colors disabled:opacity-50">
                  <Check className="w-4 h-4" />
                  {savingSpecialty ? "Saving..." : editingSpecialtyId ? "Update" : "Create"}
                </button>
                <button type="button" onClick={resetSpecialtyForm} className="px-5 py-2.5 rounded-xl font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {loading ? (
          <TableSkeleton />
        ) : specialties.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 shadow-sm text-center">
            <GraduationCap className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="font-semibold text-gray-700">No specialties yet</h3>
            <p className="text-gray-400 text-sm mt-1">Add MLT, MIT, OTT… to get started.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-100">
            {specialties.map((s) => (
              <div key={s._id} className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
                <div className="min-w-0">
                  <p className="font-medium text-text-primary">
                    {s.name}
                    {s.fullName && <span className="text-gray-400 font-normal"> — {s.fullName}</span>}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    /mcqs/{s.slug} · {s.semesterCount} semesters · {s.subjectCount} subjects · {s.pageCount} MCQ pages (units)
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <a href={`/mcqs/${s.slug}`} target="_blank" rel="noopener noreferrer" className="p-2 text-gray-400 hover:text-teal hover:bg-teal/5 rounded-lg transition-colors" aria-label={`Open ${s.name}`}>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                  <button onClick={() => startEditSpecialty(s)} className="p-2 text-gray-400 hover:text-teal hover:bg-teal/5 rounded-lg transition-colors" aria-label={`Edit ${s.name}`}>
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => setConfirm({ kind: "specialty", id: s._id, label: s.name })} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" aria-label={`Delete ${s.name}`}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ---------------- Subjects, units & MCQ pages ---------------- */}
      {specialties.length > 0 && selected && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Specialty</label>
                <select className={inputClass} value={specialtyId} onChange={(e) => { setSpecialtyId(e.target.value); setSemester(1); resetSubjectForm(); setOpenSubjectId(null); setUnits([]); }}>
                  {specialties.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Semester</label>
                <select className={inputClass} value={semester} onChange={(e) => { setSemester(Number(e.target.value)); resetSubjectForm(); setOpenSubjectId(null); setUnits([]); }}>
                  {Array.from({ length: selected.semesterCount }, (_, i) => i + 1).map((n) => <option key={n} value={n}>Semester {n}</option>)}
                </select>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => { resetSubjectForm(); setShowSubjectForm(true); }}
              className="flex items-center gap-2 bg-teal hover:bg-teal-dark text-white px-5 py-2.5 rounded-xl font-medium transition-colors shadow-md"
            >
              <Plus className="w-4 h-4" />
              Add Subject
            </motion.button>
          </div>

          {showSubjectForm && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-text-primary">
                  {editingSubjectId ? "Edit Subject" : `New Subject — ${selected.name}, Semester ${semester}`}
                </h3>
                <button onClick={resetSubjectForm} className="p-1 hover:bg-gray-100 rounded-full transition-colors" aria-label="Close">
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
              <form onSubmit={saveSubject} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subject name *</label>
                  <input className={inputClass} value={subName} onChange={(e) => setSubName(e.target.value)} placeholder="e.g., Clinical Chemistry" maxLength={120} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea className={inputClass} rows={2} value={subDescription} onChange={(e) => setSubDescription(e.target.value)} placeholder="Optional description..." maxLength={500} />
                </div>
                <div className="flex gap-3">
                  <button type="submit" disabled={savingSubject} className="flex items-center gap-2 bg-teal hover:bg-teal-dark text-white px-5 py-2.5 rounded-xl font-medium transition-colors disabled:opacity-50">
                    <Check className="w-4 h-4" />
                    {savingSubject ? "Saving..." : editingSubjectId ? "Update" : "Create"}
                  </button>
                  <button type="button" onClick={resetSubjectForm} className="px-5 py-2.5 rounded-xl font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {/* hidden input used by the per-row "Upload / Replace" buttons */}
          <input
            ref={replaceInputRef}
            type="file"
            accept=".html,.htm,text/html"
            className="hidden"
            onChange={(e) => {
              const target = replaceTargetRef.current;
              const file = e.target.files?.[0] ?? null;
              e.target.value = "";
              if (target) pickFile(file, (f) => replaceHtml(target, f));
            }}
          />

          {loadingSubjects ? (
            <TableSkeleton />
          ) : subjects.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 shadow-sm text-center">
              <ListChecks className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-700">No subjects in this semester</h3>
              <p className="text-gray-400 text-sm mt-1">Add a subject, then add its units and upload each unit&apos;s MCQ page.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-100">
              {subjects.map((subject) => (
                <div key={subject._id}>
                  <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
                    <div className="min-w-0">
                      <p className="font-medium text-text-primary">{subject.name}</p>
                      <p className="text-xs mt-0.5 text-gray-400">/mcqs/{selected.slug}/{semester}/{subject.slug}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => toggleSubject(subject._id)}
                        className={`flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg transition-colors ${openSubjectId === subject._id ? "bg-teal text-white" : "text-teal hover:bg-teal/5"}`}
                      >
                        <ListChecks className="w-4 h-4" />
                        {openSubjectId === subject._id ? "Hide units" : "Units"}
                      </button>
                      <button onClick={() => copyLink(subject)} className="p-2 text-gray-400 hover:text-teal hover:bg-teal/5 rounded-lg transition-colors" aria-label={`Copy link to ${subject.name}`}>
                        <Link2 className="w-4 h-4" />
                      </button>
                      <a href={`/mcqs/${selected.slug}/${semester}/${subject.slug}`} target="_blank" rel="noopener noreferrer" className="p-2 text-gray-400 hover:text-teal hover:bg-teal/5 rounded-lg transition-colors" aria-label={`Open ${subject.name}`}>
                        <ExternalLink className="w-4 h-4" />
                      </a>
                      <button onClick={() => startEditSubject(subject)} className="p-2 text-gray-400 hover:text-teal hover:bg-teal/5 rounded-lg transition-colors" aria-label={`Edit ${subject.name}`}>
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => setConfirm({ kind: "subject", id: subject._id, label: subject.name })} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" aria-label={`Delete ${subject.name}`}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {openSubjectId === subject._id && (
                    <div className="bg-gray-50/60 border-t border-gray-100 px-6 py-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-text-primary">Units of {subject.name}</h4>
                        <button
                          onClick={() => { resetUnitForm(); setShowUnitForm(true); }}
                          className="flex items-center gap-1.5 bg-teal hover:bg-teal-dark text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                          Add Unit
                        </button>
                      </div>

                      {showUnitForm && (
                        <form onSubmit={saveUnit} className="bg-white rounded-xl p-4 border border-gray-100 space-y-3">
                          <div className="flex items-center justify-between">
                            <h5 className="font-medium text-text-primary text-sm">{editingUnitId ? "Edit Unit" : "New Unit"}</h5>
                            <button type="button" onClick={resetUnitForm} className="p-1 hover:bg-gray-100 rounded-full transition-colors" aria-label="Close">
                              <X className="w-4 h-4 text-gray-400" />
                            </button>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Unit name *</label>
                            <input className={inputClass} value={unitName} onChange={(e) => setUnitName(e.target.value)} placeholder="e.g., Unit 1 — Carbohydrates" maxLength={120} required />
                            {!editingUnitId && <p className="text-xs text-gray-400 mt-1">Used for the page link. The link never changes later.</p>}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                            <textarea className={inputClass} rows={2} value={unitDescription} onChange={(e) => setUnitDescription(e.target.value)} placeholder="Optional description..." maxLength={500} />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              MCQ page (single .html file, max 4 MB){editingUnitId ? " — leave empty to keep the current page" : ""}
                            </label>
                            <input
                              type="file"
                              accept=".html,.htm,text/html"
                              onChange={(e) => pickFile(e.target.files?.[0] ?? null, setUnitFile)}
                              className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-teal/10 file:text-teal hover:file:bg-teal/20"
                            />
                            {unitFile && <p className="text-xs text-gray-500 mt-1">{unitFile.name} · {formatSize(unitFile.size)}</p>}
                          </div>
                          <div className="flex gap-3">
                            <button type="submit" disabled={savingUnit} className="flex items-center gap-2 bg-teal hover:bg-teal-dark text-white px-5 py-2.5 rounded-xl font-medium transition-colors disabled:opacity-50">
                              <Check className="w-4 h-4" />
                              {savingUnit ? "Saving..." : editingUnitId ? "Update" : "Create"}
                            </button>
                            <button type="button" onClick={resetUnitForm} className="px-5 py-2.5 rounded-xl font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">
                              Cancel
                            </button>
                          </div>
                        </form>
                      )}

                      {loadingUnits ? (
                        <p className="text-sm text-gray-400 py-4 text-center">Loading units...</p>
                      ) : units.length === 0 ? (
                        <p className="text-sm text-gray-400 py-4 text-center">No units yet. Add a unit, then upload its MCQ page.</p>
                      ) : (
                        <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-100">
                          {units.map((unit) => (
                            <div key={unit._id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                              <div className="min-w-0">
                                <p className="font-medium text-text-primary text-sm">{unit.name}</p>
                                <p className="text-xs mt-0.5 flex items-center gap-1.5">
                                  {unit.hasPage ? (
                                    <span className="inline-flex items-center gap-1 text-teal">
                                      <FileCode className="w-3.5 h-3.5" />
                                      {unit.htmlFileName || "MCQ page"}{unit.htmlSize ? ` · ${formatSize(unit.htmlSize)}` : ""}
                                    </span>
                                  ) : (
                                    <span className="text-gray-400">No MCQ page uploaded yet</span>
                                  )}
                                </p>
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => { replaceTargetRef.current = unit._id; replaceInputRef.current?.click(); }}
                                  disabled={uploadingId === unit._id}
                                  className="flex items-center gap-1.5 text-sm text-teal hover:bg-teal/5 px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
                                >
                                  <Upload className="w-4 h-4" />
                                  {uploadingId === unit._id ? "Uploading..." : unit.hasPage ? "Replace" : "Upload"}
                                </button>
                                {unit.hasPage && (
                                  <button onClick={() => setConfirm({ kind: "html", id: unit._id, label: unit.name })} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" aria-label={`Remove MCQ page of ${unit.name}`}>
                                    <FileX className="w-4 h-4" />
                                  </button>
                                )}
                                <button onClick={() => copyLink(subject, unit)} className="p-2 text-gray-400 hover:text-teal hover:bg-teal/5 rounded-lg transition-colors" aria-label={`Copy link to ${unit.name}`}>
                                  <Link2 className="w-4 h-4" />
                                </button>
                                <a href={`/mcqs/${selected.slug}/${semester}/${subject.slug}/${unit.slug}`} target="_blank" rel="noopener noreferrer" className="p-2 text-gray-400 hover:text-teal hover:bg-teal/5 rounded-lg transition-colors" aria-label={`Open ${unit.name}`}>
                                  <ExternalLink className="w-4 h-4" />
                                </a>
                                <button onClick={() => startEditUnit(unit)} className="p-2 text-gray-400 hover:text-teal hover:bg-teal/5 rounded-lg transition-colors" aria-label={`Edit ${unit.name}`}>
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button onClick={() => setConfirm({ kind: "unit", id: unit._id, label: unit.name })} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" aria-label={`Delete ${unit.name}`}>
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <ConfirmModal
        isOpen={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={runConfirm}
        loading={confirming}
        title={
          confirm?.kind === "specialty" ? "Delete specialty?" : confirm?.kind === "subject" ? "Delete subject?" : confirm?.kind === "unit" ? "Delete unit?" : "Remove MCQ page?"
        }
        message={
          confirm?.kind === "specialty"
            ? `Delete "${confirm.label}"? This only works when it has no subjects.`
            : confirm?.kind === "subject"
              ? `Delete "${confirm.label}"? This only works when it has no units.`
              : confirm?.kind === "unit"
                ? `Delete "${confirm.label}" and its MCQ page? This cannot be undone.`
                : `Remove the uploaded MCQ page of "${confirm?.label}"? The unit stays, marked "coming soon".`
        }
        confirmText={confirm?.kind === "html" ? "Remove" : "Delete"}
        variant={confirm?.kind === "html" ? "warning" : "danger"}
      />
    </div>
  );
}
