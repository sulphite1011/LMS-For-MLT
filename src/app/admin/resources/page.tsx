"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Plus, Pencil, Trash2, FileText, Eye, Star, RotateCcw, Archive } from "lucide-react";
import toast from "react-hot-toast";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { useAuthState } from "@/contexts/AuthContext";
import { RESOURCE_TYPE_BG, type ResourceType } from "@/types";
import { formatDateTime } from "@/lib/utils";

interface Resource {
  _id: string;
  title: string;
  resourceType: ResourceType;
  subjectId: { _id: string; name: string };
  createdAt: string;
  fileData?: { fileType: string };
  averageRating?: number | string;
  totalRatings?: number;
  isOrphaned?: boolean;
  formerOwnerName?: string;
  authorName?: string;
}

interface TrashItem {
  _id: string;
  title: string;
  resourceType: ResourceType;
  subjectId?: { name: string } | null;
  createdAt: string;
  deletedAt: string;
  daysLeft: number;
  isOrphaned: boolean;
  authorName: string;
  deletedByName?: string;
  formerOwnerName?: string;
}

interface AdminOption {
  _id: string;
  username: string;
}

export default function ResourcesPage() {
  const { userRole } = useAuthState();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [tab, setTab] = useState<"resources" | "trash">("resources");
  const [trash, setTrash] = useState<TrashItem[]>([]);
  const [loadingTrash, setLoadingTrash] = useState(false);
  const [purgeId, setPurgeId] = useState<string | null>(null);
  const [purging, setPurging] = useState(false);
  // Super Admin only: look at one admin's resources / recycle bin ("" = everyone).
  const [admins, setAdmins] = useState<AdminOption[]>([]);
  const [owner, setOwner] = useState("");

  const ownerQuery = userRole === "superAdmin" && owner ? `&owner=${owner}` : "";

  const fetchResources = async () => {
    try {
      const res = await fetch(`/api/resources?limit=100&admin=true${ownerQuery}`, { cache: "no-store" });
      const data = await res.json();
      setResources(data.resources || []);
    } catch {
      toast.error("Failed to fetch resources");
    } finally {
      setLoading(false);
    }
  };

  const fetchTrash = async () => {
    setLoadingTrash(true);
    try {
      const res = await fetch(`/api/resources/trash?${ownerQuery.replace(/^&/, "")}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setTrash(data.items || []);
    } catch {
      toast.error("Failed to load the recycle bin");
    } finally {
      setLoadingTrash(false);
    }
  };

  useEffect(() => {
    if (userRole !== "superAdmin") return;
    fetch("/api/users", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then((users: Array<{ _id: string; username: string; role: string; isPending?: boolean }>) =>
        setAdmins(users.filter((u) => u.role === "admin" && !u.isPending).map((u) => ({ _id: u._id, username: u.username })))
      )
      .catch(() => {});
  }, [userRole]);

  useEffect(() => {
    fetchResources();
    fetchTrash();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [owner, userRole]);

  const restoreItem = async (id: string) => {
    try {
      const res = await fetch(`/api/resources/${id}/restore`, { method: "POST" });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      toast.success("Resource restored");
      fetchTrash();
      fetchResources();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to restore");
    }
  };

  const handlePurge = async () => {
    if (!purgeId) return;
    setPurging(true);
    try {
      const res = await fetch(`/api/resources/${purgeId}/purge`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      toast.success("Deleted permanently");
      setPurgeId(null);
      fetchTrash();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setPurging(false);
    }
  };

  const claimResource = async (id: string) => {
    try {
      const res = await fetch(`/api/resources/${id}/owner`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "claim" }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      toast.success("You now own this resource");
      fetchResources();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to claim resource");
    }
  };

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
      toast.success("Moved to the recycle bin (kept for 30 days)");
      setDeleteId(null);
      fetchResources();
      fetchTrash();
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
          <h1 className="text-2xl font-bold text-text-primary">Resources</h1>
          <p className="text-gray-500 text-sm mt-1">
            {userRole === "superAdmin" ? "Manage all learning resources, or pick one admin to see their resources and recycle bin" : "Manage your learning resources"}
          </p>
        </div>
        <Link href="/admin/resources/new">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-2 bg-teal hover:bg-teal-dark text-white px-5 py-2.5 rounded-xl font-medium transition-colors shadow-md"
          >
            <Plus className="w-4 h-4" />
            Add Resource
          </motion.button>
        </Link>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex bg-gray-100 rounded-xl p-1 text-sm font-medium">
          <button
            onClick={() => setTab("resources")}
            className={`px-4 py-2 rounded-lg transition-colors ${tab === "resources" ? "bg-white text-text-primary shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
          >
            Resources
          </button>
          <button
            onClick={() => setTab("trash")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${tab === "trash" ? "bg-white text-text-primary shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
          >
            <Archive className="w-4 h-4" />
            Recycle bin
            {trash.length > 0 && <span className="bg-red-100 text-red-600 text-xs px-1.5 py-0.5 rounded-full">{trash.length}</span>}
          </button>
        </div>

        {userRole === "superAdmin" && (
          <label className="flex items-center gap-2 text-sm text-gray-600">
            Admin
            <select
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-teal focus:outline-none"
            >
              <option value="">All admins</option>
              {admins.map((a) => (
                <option key={a._id} value={a._id}>{a.username}</option>
              ))}
            </select>
          </label>
        )}
      </div>

      {tab === "trash" && (
        loadingTrash ? (
          <TableSkeleton rows={4} />
        ) : trash.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 shadow-sm text-center">
            <Archive className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="font-semibold text-gray-700">The recycle bin is empty</h3>
            <p className="text-gray-400 text-sm mt-1">Deleted resources stay here for 30 days, then are removed for good.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-100">
            {trash.map((item) => (
              <div key={item._id} className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
                <div className="min-w-0">
                  <p className="font-medium text-text-primary break-words [overflow-wrap:anywhere]">{item.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {item.subjectId?.name || "—"} · {item.resourceType} · by {item.authorName}
                    {item.isOrphaned && userRole === "superAdmin" && item.formerOwnerName ? ` (former owner: ${item.formerOwnerName})` : ""}
                  </p>
                  <p className="text-xs text-gray-400">
                    Deleted {formatDateTime(item.deletedAt)}{item.deletedByName ? ` by ${item.deletedByName}` : ""} ·{" "}
                    <span className={item.daysLeft <= 3 ? "text-red-500 font-medium" : "text-amber-600 font-medium"}>
                      {item.daysLeft} day{item.daysLeft === 1 ? "" : "s"} left
                    </span>
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => restoreItem(item._id)}
                    className="flex items-center gap-1.5 text-sm text-teal hover:bg-teal/5 px-3 py-2 rounded-lg transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Restore
                  </button>
                  <button
                    onClick={() => setPurgeId(item._id)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete forever"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {tab === "resources" && (loading ? (
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
            className="inline-flex items-center gap-2 bg-teal text-white px-5 py-2.5 rounded-xl font-medium mt-4 hover:bg-teal-dark transition-colors"
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
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Rating
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
                      <span className="font-medium text-text-primary line-clamp-1">
                        {resource.title}
                      </span>
                      {!resource.isOrphaned && resource.authorName && (
                        <span className="mt-0.5 block text-xs text-gray-400">By {resource.authorName}</span>
                      )}
                      {resource.isOrphaned && (
                        <span className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                          <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">Unknown Author</span>
                          {userRole === "superAdmin" && (
                            <>
                              <span className="text-gray-400">Former owner: {resource.formerOwnerName || "unknown"}</span>
                              <button onClick={() => claimResource(resource._id)} className="text-teal hover:underline font-medium">
                                Claim ownership
                              </button>
                            </>
                          )}
                        </span>
                      )}
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
                      {resource.totalRatings && resource.totalRatings > 0 ? (
                        <div className="flex items-center gap-1.5">
                          <div className="flex items-center gap-0.5 text-yellow-500">
                            <Star className="w-3.5 h-3.5 fill-current" />
                            <span className="font-bold text-xs">{resource.averageRating}</span>
                          </div>
                          <span className="text-[10px] text-gray-400">({resource.totalRatings})</span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-gray-300">No ratings</span>
                      )}
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
                          className="p-2 text-gray-400 hover:text-teal hover:bg-teal-50 rounded-lg transition-colors"
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
      ))}

      <ConfirmModal
        isOpen={!!purgeId}
        onClose={() => setPurgeId(null)}
        onConfirm={handlePurge}
        title="Delete forever"
        message="Delete this resource permanently, including its files and comments? This cannot be undone."
        loading={purging}
      />

      <ConfirmModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Move to Recycle Bin"
        message="Move this resource to the recycle bin? It disappears from the site now and is deleted for good after 30 days — you can restore it until then."
        loading={deleting}
      />
    </div>
  );
}
