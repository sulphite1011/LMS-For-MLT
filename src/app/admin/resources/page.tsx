"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Plus, Pencil, Trash2, FileText, Eye } from "lucide-react";
import toast from "react-hot-toast";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { RESOURCE_TYPE_BG, type ResourceType } from "@/types";

interface Resource {
  _id: string;
  title: string;
  resourceType: ResourceType;
  subjectId: { _id: string; name: string };
  createdAt: string;
  fileData?: { fileType: string };
}

export default function ResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchResources = async () => {
    try {
      const res = await fetch("/api/resources?limit=100");
      const data = await res.json();
      setResources(data.resources || []);
    } catch {
      toast.error("Failed to fetch resources");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResources();
  }, []);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/resources/${deleteId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      toast.success("Resource deleted");
      setDeleteId(null);
      fetchResources();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete resource"
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1e293b]">Resources</h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage all learning resources
          </p>
        </div>
        <Link href="/admin/resources/new">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-2 bg-[#14b8a6] hover:bg-[#0d9488] text-white px-5 py-2.5 rounded-xl font-medium transition-colors shadow-md"
          >
            <Plus className="w-4 h-4" />
            Add Resource
          </motion.button>
        </Link>
      </div>

      {loading ? (
        <TableSkeleton rows={8} />
      ) : resources.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 shadow-sm text-center">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="font-semibold text-gray-700">No resources yet</h3>
          <p className="text-gray-400 text-sm mt-1">
            Create your first resource to get started.
          </p>
          <Link
            href="/admin/resources/new"
            className="inline-flex items-center gap-2 bg-[#14b8a6] text-white px-5 py-2.5 rounded-xl font-medium mt-4 hover:bg-[#0d9488] transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Resource
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Title
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">
                    Subject
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                    Type
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                    Created
                  </th>
                  <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {resources.map((resource, i) => (
                  <motion.tr
                    key={resource._id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <span className="font-medium text-[#1e293b] line-clamp-1">
                        {resource.title}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 hidden md:table-cell">
                      {resource.subjectId?.name || "—"}
                    </td>
                    <td className="px-6 py-4 hidden sm:table-cell">
                      <span
                        className={`${RESOURCE_TYPE_BG[resource.resourceType]} text-white text-xs font-medium px-2.5 py-1 rounded-full`}
                      >
                        {resource.resourceType}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 hidden lg:table-cell">
                      {new Date(resource.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/resource/${resource._id}`}
                          className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <Link
                          href={`/admin/resources/${resource._id}/edit`}
                          className="p-2 text-gray-400 hover:text-[#14b8a6] hover:bg-teal-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => setDeleteId(resource._id)}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Resource"
        message="Are you sure you want to delete this resource? This will also remove any uploaded files. This action cannot be undone."
        loading={deleting}
      />
    </div>
  );
}
