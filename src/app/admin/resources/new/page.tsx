"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
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

interface Subject {
  _id: string;
  name: string;
}

const resourceTypes = ["Notes", "Video", "PDF", "Reference", "Quiz"] as const;

export default function NewResourcePage() {
  const router = useRouter();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Form state
  const [title, setTitle] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [resourceType, setResourceType] = useState<string>("");
  const [description, setDescription] = useState("");
  const [youtubeUrls, setYoutubeUrls] = useState<string[]>([""]);
  const [bannerImageUrl, setBannerImageUrl] = useState("");
  const [fileMode, setFileMode] = useState<"upload" | "external">("upload");
  const [externalLink, setExternalLink] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/subjects")
      .then((r) => r.json())
      .then(setSubjects)
      .catch(() => toast.error("Failed to load subjects"));
  }, []);

  const onFileDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const f = acceptedFiles[0];
      if (f.size > 10 * 1024 * 1024) {
        toast.error("File must be under 10MB");
        return;
      }
      setFile(f);
    }
  }, []);

  const onBannerDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const f = acceptedFiles[0];
      setBannerFile(f);
      setBannerPreview(URL.createObjectURL(f));
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
    maxFiles: 1,
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
    if (!title || !subjectId || !resourceType) {
      toast.error("Please fill all required fields");
      return;
    }

    setSaving(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("subjectId", subjectId);
      formData.append("resourceType", resourceType);
      formData.append("description", description);
      formData.append(
        "youtubeUrls",
        JSON.stringify(youtubeUrls.filter(Boolean))
      );
      formData.append("bannerImageUrl", bannerImageUrl);

      if (bannerFile) {
        formData.append("bannerImage", bannerFile);
      }

      if (fileMode === "upload" && file) {
        formData.append("file", file);
      } else if (fileMode === "external" && externalLink) {
        formData.append("externalLink", externalLink);
      }

      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const res = await fetch("/api/resources", {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }

      toast.success("Resource created successfully! 🎉");
      router.push("/admin/resources");
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create resource"
      );
    } finally {
      setSaving(false);
      setUploadProgress(0);
    }
  };

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
          <h1 className="text-2xl font-bold text-[#1e293b]">
            Add New Resource
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Upload study material for students
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-6 shadow-sm space-y-4"
        >
          <h2 className="font-semibold text-[#1e293b] text-lg">
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
              placeholder="Enter resource title"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-[#14b8a6] focus:ring-2 focus:ring-[#14b8a6]/20 focus:outline-none text-sm"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subject *
              </label>
              <select
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-[#14b8a6] focus:ring-2 focus:ring-[#14b8a6]/20 focus:outline-none text-sm bg-white"
                required
              >
                <option value="">Select a subject</option>
                {subjects.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type *
              </label>
              <select
                value={resourceType}
                onChange={(e) => setResourceType(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-[#14b8a6] focus:ring-2 focus:ring-[#14b8a6]/20 focus:outline-none text-sm bg-white"
                required
              >
                <option value="">Select type</option>
                {resourceTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
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
              placeholder="Brief description of this resource..."
              rows={3}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-[#14b8a6] focus:ring-2 focus:ring-[#14b8a6]/20 focus:outline-none text-sm resize-none"
            />
          </div>
        </motion.div>

        {/* Banner Image */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl p-6 shadow-sm space-y-4"
        >
          <h2 className="font-semibold text-[#1e293b] text-lg">
            Banner Image
          </h2>

          <div
            {...getBannerRootProps()}
            className="border-2 border-dashed border-gray-200 hover:border-[#14b8a6] rounded-xl p-6 text-center cursor-pointer transition-colors"
          >
            <input {...getBannerInputProps()} />
            {bannerPreview ? (
              <div className="relative">
                <img
                  src={bannerPreview}
                  alt="Banner preview"
                  className="w-full h-40 object-cover rounded-lg"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setBannerFile(null);
                    setBannerPreview(null);
                  }}
                  className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <>
                <ImageIcon className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">
                  Drop banner image here or click to upload
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  JPG, PNG, WebP
                </p>
              </>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Or paste image URL
            </label>
            <input
              type="url"
              value={bannerImageUrl}
              onChange={(e) => setBannerImageUrl(e.target.value)}
              placeholder="https://example.com/image.jpg"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-[#14b8a6] focus:ring-2 focus:ring-[#14b8a6]/20 focus:outline-none text-sm"
            />
          </div>
        </motion.div>

        {/* File Upload */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl p-6 shadow-sm space-y-4"
        >
          <h2 className="font-semibold text-[#1e293b] text-lg">
            Resource File
          </h2>

          {/* Toggle */}
          <div className="flex bg-gray-100 rounded-xl p-1">
            <button
              type="button"
              onClick={() => setFileMode("upload")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
                fileMode === "upload"
                  ? "bg-white text-[#1e293b] shadow-sm"
                  : "text-gray-500"
              }`}
            >
              <Upload className="w-4 h-4" />
              Upload PDF
            </button>
            <button
              type="button"
              onClick={() => setFileMode("external")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
                fileMode === "external"
                  ? "bg-white text-[#1e293b] shadow-sm"
                  : "text-gray-500"
              }`}
            >
              <LinkIcon className="w-4 h-4" />
              External Link
            </button>
          </div>

          {fileMode === "upload" ? (
            <div
              {...getFileRootProps()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                isFileDragActive
                  ? "border-[#14b8a6] bg-teal-50/50"
                  : "border-gray-200 hover:border-[#14b8a6]"
              }`}
            >
              <input {...getFileInputProps()} />
              {file ? (
                <div className="flex items-center justify-center gap-3">
                  <FileText className="w-8 h-8 text-[#14b8a6]" />
                  <div className="text-left">
                    <p className="font-medium text-[#1e293b] text-sm">
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-400">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                    }}
                    className="p-1 hover:bg-red-50 rounded-full"
                  >
                    <X className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              ) : (
                <>
                  <Upload className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">
                    {isFileDragActive
                      ? "Drop file here..."
                      : "Drag & drop a file here, or click to browse"}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    PDF, JPG, PNG (max 10MB)
                  </p>
                </>
              )}
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                External Link (Google Drive, GitHub, etc.)
              </label>
              <input
                type="url"
                value={externalLink}
                onChange={(e) => setExternalLink(e.target.value)}
                placeholder="https://drive.google.com/... or https://github.com/..."
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-[#14b8a6] focus:ring-2 focus:ring-[#14b8a6]/20 focus:outline-none text-sm"
              />
            </div>
          )}

          {/* Upload progress */}
          {saving && uploadProgress > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-2"
            >
              <div className="flex justify-between text-xs text-gray-500">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <motion.div
                  className="bg-[#14b8a6] h-2 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${uploadProgress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* YouTube URLs */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl p-6 shadow-sm space-y-4"
        >
          <h2 className="font-semibold text-[#1e293b] text-lg flex items-center gap-2">
            <Youtube className="w-5 h-5 text-red-500" />
            YouTube Videos
          </h2>

          {youtubeUrls.map((url, i) => (
            <div key={i} className="flex gap-3 items-start">
              <div className="flex-1">
                <input
                  type="url"
                  value={url}
                  onChange={(e) => {
                    const updated = [...youtubeUrls];
                    updated[i] = e.target.value;
                    setYoutubeUrls(updated);
                  }}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-[#14b8a6] focus:ring-2 focus:ring-[#14b8a6]/20 focus:outline-none text-sm"
                />
                {url && getYoutubeThumbnail(url) && (
                  <img
                    src={getYoutubeThumbnail(url)!}
                    alt="Thumbnail"
                    className="mt-2 w-32 h-20 object-cover rounded-lg"
                  />
                )}
              </div>
              {youtubeUrls.length > 1 && (
                <button
                  type="button"
                  onClick={() =>
                    setYoutubeUrls(youtubeUrls.filter((_, idx) => idx !== i))
                  }
                  className="p-2 hover:bg-red-50 rounded-lg mt-0.5"
                >
                  <X className="w-4 h-4 text-red-400" />
                </button>
              )}
            </div>
          ))}

          <button
            type="button"
            onClick={() => setYoutubeUrls([...youtubeUrls, ""])}
            className="flex items-center gap-2 text-sm text-[#14b8a6] hover:text-[#0d9488] font-medium"
          >
            <Plus className="w-4 h-4" />
            Add Another Video
          </button>
        </motion.div>

        {/* Submit */}
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2.5 rounded-xl font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-[#14b8a6] hover:bg-[#0d9488] text-white px-8 py-2.5 rounded-xl font-medium transition-colors shadow-md disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Create Resource
              </>
            )}
          </motion.button>
        </div>
      </form>
    </div>
  );
}
