"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";
import { useDropzone } from "react-dropzone";
import toast from "react-hot-toast";
import {
  Upload,
  Link as LinkIcon,
  X,
  Plus,
  FileText,
  Image as ImageIcon,
  Youtube,
  ArrowLeft,
  Check,
  Loader2,
} from "lucide-react";
import { getYoutubeThumbnail } from "@/lib/utils";

interface FileEntry { file?: File; name: string; size?: number; id: string; isExisting?: boolean; }
interface ExternalLinkEntry { label: string; url: string; id: string; }

const resourceTypes = ["Notes", "Video", "PDF", "Reference", "Quiz"] as const;

export default function EditResourcePage() {
  const router = useRouter();
  const { id } = useParams();
  const [saving, setSaving] = useState(false);
  const [loadingResource, setLoadingResource] = useState(true);

  const [title, setTitle] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [resourceType, setResourceType] = useState<string>("");
  const [semester, setSemester] = useState<string>("");
  const [description, setDescription] = useState("");
  const [youtubeUrls, setYoutubeUrls] = useState<string[]>([""]);
  const [bannerImageUrl, setBannerImageUrl] = useState("");
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);

  const [pdfFiles, setPdfFiles] = useState<FileEntry[]>([]);
  const [externalLinks, setExternalLinks] = useState<ExternalLinkEntry[]>([]);
  const [removedFileIds, setRemovedFileIds] = useState<string[]>([]); // Optional: track removals

  useEffect(() => {
    fetch(`/api/resources/${id}`)
      .then((r) => r.json())
      .then((resData) => {
        setTitle(resData.title || "");
        setSubjectName(resData.subjectId?.name || "");
        setResourceType(resData.resourceType || "");
        setSemester(resData.semester ? String(resData.semester) : "");
        setDescription(resData.description || "");
        setYoutubeUrls(
          resData.youtubeUrls?.length > 0 ? resData.youtubeUrls : [""]
        );
        setBannerImageUrl(resData.bannerImageUrl || "");
        if (resData.bannerImageUrl) {
          setBannerPreview(resData.bannerImageUrl);
        }

        // Handle existing files
        const existing: FileEntry[] = [];
        if (resData.files && resData.files.length > 0) {
          resData.files.forEach((f: any, i: number) => {
            existing.push({
              name: f.fileName || `File ${i + 1}`,
              size: f.fileSize,
              id: `existing-${i}`,
              isExisting: true
            });
          });
        } else if (resData.fileData?.fileName) {
          existing.push({
            name: resData.fileData.fileName,
            size: resData.fileData.fileSize,
            id: "existing-0",
            isExisting: true
          });
        }
        setPdfFiles(existing);

        // Handle existing links
        if (resData.externalLinks && resData.externalLinks.length > 0) {
          setExternalLinks(resData.externalLinks.map((l: any, i: number) => ({
            ...l,
            id: l._id || `el-${i}`
          })));
        } else if (resData.fileData?.fileType === "external" && resData.fileData.externalLink) {
          setExternalLinks([{
            label: "External Link",
            url: resData.fileData.externalLink,
            id: "el-0"
          }]);
        } else {
          setExternalLinks([{ label: "", url: "", id: "el-0" }]);
        }
      })
      .catch(() => toast.error("Failed to load resource"))
      .finally(() => setLoadingResource(false));
  }, [id]);

  const onFileDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.filter(f => f.size <= 10 * 1024 * 1024)
      .map(f => ({
        file: f,
        name: f.name,
        size: f.size,
        id: `pdf-${Date.now()}-${Math.random()}`,
        isExisting: false
      }));
    if (acceptedFiles.some(f => f.size > 10 * 1024 * 1024)) toast.error("Some files exceed 10MB");
    setPdfFiles(prev => [...prev, ...newFiles]);
  }, []);

  const onBannerDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setBannerFile(acceptedFiles[0]);
      setBannerPreview(URL.createObjectURL(acceptedFiles[0]));
    }
  }, []);

  const {
    getRootProps: getFileRootProps,
    getInputProps: getFileInputProps,
    isDragActive: isFileDragActive,
  } = useDropzone({
    onDrop: onFileDrop,
    accept: {
      "application/pdf": [".pdf"],
      "image/*": [".jpg", ".jpeg", ".png"],
    },
    multiple: true,
  });

  const {
    getRootProps: getBannerRootProps,
    getInputProps: getBannerInputProps,
  } = useDropzone({
    onDrop: onBannerDrop,
    accept: { "image/*": [".jpg", ".jpeg", ".png", ".webp"] },
    maxFiles: 1,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !subjectName.trim() || !resourceType) {
      toast.error("Please fill all required fields");
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("subjectName", subjectName.trim());
      formData.append("resourceType", resourceType);
      formData.append("semester", semester);
      formData.append("description", description);
      formData.append(
        "youtubeUrls",
        JSON.stringify(youtubeUrls.filter(Boolean))
      );
      formData.append("bannerImageUrl", bannerImageUrl);

      if (bannerFile) {
        formData.append("bannerImage", bannerFile);
      }

      // Handle files: send new ones, maybe we need a way to tell the server which old ones were kept
      // For now, if no NEW files are added, the server doesn't overwrite.
      // But if any ARE added, we might want to send the full set?
      // Simple approach: if we have NEW files, send them. If we removed ALL files, send remove flag.
      const newFiles = pdfFiles.filter(f => f.file && !f.isExisting);
      newFiles.forEach(f => formData.append("files", f.file!));

      if (pdfFiles.length === 0) {
        formData.append("removeFile", "true");
      }

      const validLinks = externalLinks.filter(l => l.url.trim());
      formData.append("externalLinks", JSON.stringify(validLinks.map(l => ({
        label: l.label.trim() || "External Link",
        url: l.url.trim(),
      }))));

      const res = await fetch(`/api/resources/${id}`, {
        method: "PUT",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }

      toast.success("Resource updated!");
      router.push("/admin/resources");
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update resource"
      );
    } finally {
      setSaving(false);
    }
  };

  if (loadingResource) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-teal" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Edit Resource</h1>
          <p className="text-gray-500 text-sm mt-1">
            Update resource details
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
          <h2 className="font-semibold text-text-primary text-lg">
            Basic Information
          </h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-teal focus:ring-2 focus:ring-teal/20 focus:outline-none text-sm"
              required
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subject *
              </label>
              <input
                type="text"
                value={subjectName}
                onChange={(e) => setSubjectName(e.target.value)}
                placeholder="e.g. Mathematics, Physics..."
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-teal focus:ring-2 focus:ring-teal/20 focus:outline-none text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type *
              </label>
              <select
                value={resourceType}
                onChange={(e) => setResourceType(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-teal focus:ring-2 focus:ring-teal/20 focus:outline-none text-sm bg-white"
                required
              >
                <option value="">Select type</option>
                {resourceTypes.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Semester (Optional)
              </label>
              <select
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-teal focus:ring-2 focus:ring-teal/20 focus:outline-none text-sm bg-white"
              >
                <option value="">Select semester</option>
                {[...Array(10)].map((_, i) => (
                  <option key={i + 1} value={i + 1}>Semester {i + 1}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-teal focus:ring-2 focus:ring-teal/20 focus:outline-none text-sm resize-none"
            />
          </div>
        </div>

        {/* Banner Image */}
        <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
          <h2 className="font-semibold text-text-primary text-lg">Banner Image</h2>
          <div
            {...getBannerRootProps()}
            className="border-2 border-dashed border-gray-200 hover:border-teal rounded-xl p-6 text-center cursor-pointer transition-colors"
          >
            <input {...getBannerInputProps()} />
            {bannerPreview ? (
              <div className="relative">
                <img src={bannerPreview} alt="Banner" className="w-full h-40 object-cover rounded-lg" />
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setBannerFile(null); setBannerPreview(null); setBannerImageUrl(""); }}
                  className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <>
                <ImageIcon className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Drop banner image or click to upload</p>
              </>
            )}
          </div>
          <input
            type="url"
            value={bannerImageUrl}
            onChange={(e) => { setBannerImageUrl(e.target.value); if (e.target.value) setBannerPreview(e.target.value); }}
            placeholder="Or paste image URL"
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-teal focus:ring-2 focus:ring-teal/20 focus:outline-none text-sm"
          />
        </div>

        {/* PDF Files */}
        <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
          <h2 className="font-semibold text-text-primary text-lg flex items-center gap-2">
            <FileText className="w-5 h-5 text-teal" /> PDF/Image Files
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
              {pdfFiles.map((f) => (
                <div key={f.id} className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-2.5">
                  <FileText className={`w-5 h-5 ${f.isExisting ? "text-slate-400" : "text-teal"} shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">{f.name}</p>
                    {f.size && <p className="text-xs text-gray-400">{(f.size / 1024 / 1024).toFixed(2)} MB {f.isExisting && "(Existing)"}</p>}
                  </div>
                  <button type="button" onClick={() => setPdfFiles(prev => prev.filter(item => item.id !== f.id))} className="p-1 hover:bg-red-50 rounded-full"><X className="w-4 h-4 text-red-400" /></button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* External Links */}
        <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
          <h2 className="font-semibold text-text-primary text-lg flex items-center gap-2">
            <LinkIcon className="w-5 h-5 text-teal" /> External Links
            <span className="text-xs text-gray-400 font-normal">(Google Drive, GitHub…)</span>
          </h2>
          {externalLinks.map((link, i) => (
            <div key={link.id} className="flex gap-3 items-start">
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input type="text" value={link.label} onChange={e => {
                  const items = [...externalLinks];
                  items[i].label = e.target.value;
                  setExternalLinks(items);
                }} placeholder="Label (e.g. Study Notes)" className="px-4 py-2.5 border border-gray-200 rounded-xl focus:border-teal focus:ring-2 focus:ring-teal/20 focus:outline-none text-sm" />
                <input type="url" value={link.url} onChange={e => {
                  const items = [...externalLinks];
                  items[i].url = e.target.value;
                  setExternalLinks(items);
                }} placeholder="https://drive.google.com/…" className="sm:col-span-2 px-4 py-2.5 border border-gray-200 rounded-xl focus:border-teal focus:ring-2 focus:ring-teal/20 focus:outline-none text-sm" />
              </div>
              {externalLinks.length > 1 && (
                <button type="button" onClick={() => setExternalLinks(prev => prev.filter(l => l.id !== link.id))} className="p-2 hover:bg-red-50 rounded-lg mt-0.5"><X className="w-4 h-4 text-red-400" /></button>
              )}
            </div>
          ))}
          <button type="button" onClick={() => setExternalLinks(prev => [...prev, { label: "", url: "", id: `el-${Date.now()}` }])} className="flex items-center gap-2 text-sm text-teal hover:text-teal-dark font-medium">
            <Plus className="w-4 h-4" /> Add Another Link
          </button>
        </div>

        {/* YouTube */}
        <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
          <h2 className="font-semibold text-text-primary text-lg flex items-center gap-2">
            <Youtube className="w-5 h-5 text-red-500" />YouTube Videos
          </h2>
          {youtubeUrls.map((url, i) => (
            <div key={i} className="flex gap-3 items-start">
              <div className="flex-1">
                <input
                  type="url"
                  value={url}
                  onChange={(e) => { const u = [...youtubeUrls]; u[i] = e.target.value; setYoutubeUrls(u); }}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-teal focus:ring-2 focus:ring-teal/20 focus:outline-none text-sm"
                />
                {url && getYoutubeThumbnail(url) && (
                  <img src={getYoutubeThumbnail(url)!} alt="Thumbnail" className="mt-2 w-32 h-20 object-cover rounded-lg" />
                )}
              </div>
              {youtubeUrls.length > 1 && (
                <button type="button" onClick={() => setYoutubeUrls(youtubeUrls.filter((_, idx) => idx !== i))} className="p-2 hover:bg-red-50 rounded-lg mt-0.5">
                  <X className="w-4 h-4 text-red-400" />
                </button>
              )}
            </div>
          ))}
          <button type="button" onClick={() => setYoutubeUrls([...youtubeUrls, ""])} className="flex items-center gap-2 text-sm text-teal hover:text-teal-dark font-medium">
            <Plus className="w-4 h-4" />Add Another Video
          </button>
        </div>

        {/* Submit */}
        <div className="flex gap-3 justify-end">
          <button type="button" onClick={() => router.back()} className="px-6 py-2.5 rounded-xl font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">
            Cancel
          </button>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" disabled={saving} className="flex items-center gap-2 bg-teal hover:bg-teal-dark text-white px-8 py-2.5 rounded-xl font-medium transition-colors shadow-md disabled:opacity-50">
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Saving...</> : <><Check className="w-4 h-4" />Update Resource</>}
          </motion.button>
        </div>
      </form>
    </div>
  );
}
