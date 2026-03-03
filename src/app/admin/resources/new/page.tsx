"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useDropzone } from "react-dropzone";
import toast from "react-hot-toast";
import {
  Upload, Link as LinkIcon, X, Plus, FileText, Image as ImageIcon,
  Youtube, ArrowLeft, Check, Loader2, Globe, ChevronDown,
} from "lucide-react";
import { getYoutubeThumbnail } from "@/lib/utils";

const resourceTypes = ["Notes", "Video", "PDF", "Reference", "Quiz"] as const;

interface FileEntry { file: File; id: string; }
interface ExternalLinkEntry { label: string; url: string; id: string; }
interface Subject { _id: string; name: string; }

export default function NewResourcePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  const [title, setTitle] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [subjectName, setSubjectName] = useState(""); // for display
  const [semester, setSemester] = useState("");
  const [resourceType, setResourceType] = useState("");
  const [description, setDescription] = useState("");
  const [youtubeUrls, setYoutubeUrls] = useState<string[]>([""]);
  const [bannerImageUrl, setBannerImageUrl] = useState("");
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [pdfFiles, setPdfFiles] = useState<FileEntry[]>([]);
  const [externalLinks, setExternalLinks] = useState<ExternalLinkEntry[]>([{ label: "", url: "", id: "el-0" }]);

  useEffect(() => {
    fetch("/api/subjects").then(r => r.json()).then(data => {
      if (Array.isArray(data)) setSubjects(data);
    });
  }, []);

  const onFileDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.filter(f => f.size <= 10 * 1024 * 1024)
      .map(f => ({ file: f, id: `pdf-${Date.now()}-${Math.random()}` }));
    if (acceptedFiles.some(f => f.size > 10 * 1024 * 1024)) toast.error("Some files exceed 10MB and were skipped");
    setPdfFiles(prev => [...prev, ...newFiles]);
  }, []);

  const onBannerDrop = useCallback((acceptedFiles: File[]) => {
    const f = acceptedFiles[0];
    if (!f) return;
    setBannerFile(f);
    setBannerPreview(URL.createObjectURL(f));
  }, []);

  const { getRootProps: getFileRootProps, getInputProps: getFileInputProps, isDragActive: isFileDragActive } = useDropzone({
    onDrop: onFileDrop,
    accept: { "application/pdf": [".pdf"], "image/*": [".jpg", ".jpeg", ".png"] },
    multiple: true,
  });

  const { getRootProps: getBannerRootProps, getInputProps: getBannerInputProps } = useDropzone({
    onDrop: onBannerDrop,
    accept: { "image/*": [".jpg", ".jpeg", ".png", ".webp"] },
    maxFiles: 1,
  });

  const handleSubjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === "__new__") {
      // Prompt for new subject name
      const name = window.prompt("Enter new subject name:");
      if (name?.trim()) {
        setSubjectId("__new__");
        setSubjectName(name.trim());
      }
    } else {
      const selected = subjects.find(s => s._id === val);
      setSubjectId(val);
      setSubjectName(selected?.name || "");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !subjectName || !resourceType) {
      toast.error("Please fill all required fields");
      return;
    }
    setSaving(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("subjectName", subjectName);
      formData.append("resourceType", resourceType);
      formData.append("semester", semester);
      formData.append("description", description);
      formData.append("youtubeUrls", JSON.stringify(youtubeUrls.filter(Boolean)));
      formData.append("bannerImageUrl", bannerImageUrl);
      if (bannerFile) formData.append("bannerImage", bannerFile);

      pdfFiles.forEach(({ file }) => formData.append("files", file));

      const validLinks = externalLinks.filter(l => l.url.trim());
      if (validLinks.length > 0) {
        formData.append("externalLinks", JSON.stringify(validLinks.map(l => ({
          label: l.label.trim() || "External Link",
          url: l.url.trim(),
        }))));
      }

      const progressInterval = setInterval(() => {
        setUploadProgress(prev => prev >= 90 ? 90 : prev + 10);
      }, 200);

      const res = await fetch("/api/resources", { method: "POST", body: formData });
      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      toast.success("Resource created! 🎉");
      router.push("/admin/resources");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create resource");
    } finally {
      setSaving(false);
      setUploadProgress(0);
    }
  };

  const addExternalLink = () => setExternalLinks(prev => [...prev, { label: "", url: "", id: `el-${Date.now()}` }]);
  const updateExternalLink = (id: string, field: "label" | "url", value: string) =>
    setExternalLinks(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l));
  const removeExternalLink = (id: string) => setExternalLinks(prev => prev.filter(l => l.id !== id));

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-[#1e293b]">Add New Resource</h1>
          <p className="text-gray-500 text-sm mt-1">Upload study material for students</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
          <h2 className="font-semibold text-[#1e293b] text-lg">Basic Information</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Enter resource title" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-teal focus:ring-2 focus:ring-teal/20 focus:outline-none text-sm" required />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
              <div className="relative">
                <select
                  value={subjectId}
                  onChange={handleSubjectChange}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-teal focus:ring-2 focus:ring-teal/20 focus:outline-none text-sm bg-white appearance-none pr-10"
                  required
                >
                  <option value="">Select subject...</option>
                  {subjects.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                  <option value="__new__">+ Create new subject...</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
              {subjectId === "__new__" && subjectName && (
                <p className="text-xs text-teal mt-1">New subject: "{subjectName}"</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
              <select value={resourceType} onChange={e => setResourceType(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-teal focus:ring-2 focus:ring-teal/20 focus:outline-none text-sm bg-white" required>
                <option value="">Select type</option>
                {resourceTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Semester (Optional)</label>
              <select value={semester} onChange={e => setSemester(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-teal focus:ring-2 focus:ring-teal/20 focus:outline-none text-sm bg-white">
                <option value="">Select semester</option>
                {[...Array(10)].map((_, i) => (
                  <option key={i + 1} value={i + 1}>Semester {i + 1}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief description of this resource..." rows={3} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-teal focus:ring-2 focus:ring-teal/20 focus:outline-none text-sm resize-none" />
          </div>
        </motion.div>

        {/* Banner Image */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
          <h2 className="font-semibold text-[#1e293b] text-lg">Banner Image</h2>
          <div {...getBannerRootProps()} className="border-2 border-dashed border-gray-200 hover:border-teal rounded-xl p-6 text-center cursor-pointer transition-colors">
            <input {...getBannerInputProps()} />
            {bannerPreview ? (
              <div className="relative">
                <img src={bannerPreview} alt="Banner preview" className="w-full h-40 object-cover rounded-lg" />
                <button type="button" onClick={e => { e.stopPropagation(); setBannerFile(null); setBannerPreview(null); }} className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full"><X className="w-4 h-4" /></button>
              </div>
            ) : (<>
              <ImageIcon className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">Drop banner image here or click</p>
            </>)}
          </div>
          <input type="url" value={bannerImageUrl} onChange={e => setBannerImageUrl(e.target.value)} placeholder="Or paste image URL" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-teal focus:ring-2 focus:ring-teal/20 focus:outline-none text-sm" />
        </motion.div>

        {/* PDF Files */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
          <h2 className="font-semibold text-[#1e293b] text-lg flex items-center gap-2">
            <FileText className="w-5 h-5 text-teal" /> PDF Files
            <span className="text-xs text-gray-400 font-normal">(up to 5 files, 10MB each)</span>
          </h2>
          <div {...getFileRootProps()} className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${isFileDragActive ? "border-teal bg-teal/5" : "border-gray-200 hover:border-teal"}`}>
            <input {...getFileInputProps()} />
            <Upload className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">{isFileDragActive ? "Drop files here..." : "Drag & drop PDFs or click to browse"}</p>
            <p className="text-xs text-gray-400 mt-1">PDF, JPG, PNG · Multiple files allowed</p>
          </div>
          {pdfFiles.length > 0 && (
            <div className="space-y-2">
              {pdfFiles.map(({ file, id }) => (
                <div key={id} className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-2.5">
                  <FileText className="w-5 h-5 text-teal shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">{file.name}</p>
                    <p className="text-xs text-gray-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                  <button type="button" onClick={() => setPdfFiles(prev => prev.filter(f => f.id !== id))} className="p-1 hover:bg-red-50 rounded-full"><X className="w-4 h-4 text-red-400" /></button>
                </div>
              ))}
            </div>
          )}
          {saving && uploadProgress > 0 && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-gray-500"><span>Uploading...</span><span>{uploadProgress}%</span></div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <motion.div className="bg-teal h-2 rounded-full" initial={{ width: 0 }} animate={{ width: `${uploadProgress}%` }} />
              </div>
            </div>
          )}
        </motion.div>

        {/* External Links */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
          <h2 className="font-semibold text-[#1e293b] text-lg flex items-center gap-2">
            <Globe className="w-5 h-5 text-teal" /> External Links
            <span className="text-xs text-gray-400 font-normal">(Google Drive, Slides, GitHub…)</span>
          </h2>
          {externalLinks.map(link => (
            <div key={link.id} className="flex gap-3 items-start">
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input type="text" value={link.label} onChange={e => updateExternalLink(link.id, "label", e.target.value)} placeholder="Label (e.g. Study Notes)" className="px-4 py-2.5 border border-gray-200 rounded-xl focus:border-teal focus:ring-2 focus:ring-teal/20 focus:outline-none text-sm" />
                <input type="url" value={link.url} onChange={e => updateExternalLink(link.id, "url", e.target.value)} placeholder="https://drive.google.com/…" className="sm:col-span-2 px-4 py-2.5 border border-gray-200 rounded-xl focus:border-teal focus:ring-2 focus:ring-teal/20 focus:outline-none text-sm" />
              </div>
              {externalLinks.length > 1 && (
                <button type="button" onClick={() => removeExternalLink(link.id)} className="p-2 hover:bg-red-50 rounded-lg mt-0.5"><X className="w-4 h-4 text-red-400" /></button>
              )}
            </div>
          ))}
          <button type="button" onClick={addExternalLink} className="flex items-center gap-2 text-sm text-teal hover:text-teal-dark font-medium">
            <Plus className="w-4 h-4" /> Add Another Link
          </button>
        </motion.div>

        {/* YouTube URLs */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
          <h2 className="font-semibold text-[#1e293b] text-lg flex items-center gap-2">
            <Youtube className="w-5 h-5 text-red-500" /> YouTube Videos
          </h2>
          {youtubeUrls.map((url, i) => (
            <div key={i} className="flex gap-3 items-start">
              <div className="flex-1">
                <input type="url" value={url} onChange={e => { const u = [...youtubeUrls]; u[i] = e.target.value; setYoutubeUrls(u); }} placeholder="https://www.youtube.com/watch?v=…" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-teal focus:ring-2 focus:ring-teal/20 focus:outline-none text-sm" />
                {url && getYoutubeThumbnail(url) && <img src={getYoutubeThumbnail(url)!} alt="Thumbnail" className="mt-2 w-32 h-20 object-cover rounded-lg" />}
              </div>
              {youtubeUrls.length > 1 && <button type="button" onClick={() => setYoutubeUrls(youtubeUrls.filter((_, idx) => idx !== i))} className="p-2 hover:bg-red-50 rounded-lg mt-0.5"><X className="w-4 h-4 text-red-400" /></button>}
            </div>
          ))}
          <button type="button" onClick={() => setYoutubeUrls([...youtubeUrls, ""])} className="flex items-center gap-2 text-sm text-teal hover:text-teal-dark font-medium">
            <Plus className="w-4 h-4" /> Add Another Video
          </button>
        </motion.div>

        {/* Submit */}
        <div className="flex gap-3 justify-end">
          <button type="button" onClick={() => router.back()} className="px-6 py-2.5 rounded-xl font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">Cancel</button>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" disabled={saving} className="flex items-center gap-2 bg-teal hover:bg-teal-dark text-white px-8 py-2.5 rounded-xl font-medium transition-colors shadow-md disabled:opacity-50">
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Saving...</> : <><Check className="w-4 h-4" />Create Resource</>}
          </motion.button>
        </div>
      </form>
    </div>
  );
}
