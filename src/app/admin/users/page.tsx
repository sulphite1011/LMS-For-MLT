"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2, Users as UsersIcon, Shield, ShieldCheck, Copy, Check } from "lucide-react";
import toast from "react-hot-toast";
import { useAuthState } from "@/contexts/AuthContext";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { TableSkeleton } from "@/components/ui/Skeleton";

interface User {
  _id: string;
  clerkId: string;
  username: string;
  role: "superAdmin" | "admin";
  createdAt: string;
}

export default function UsersPage() {
  const { userRole } = useAuthState();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [username, setUsername] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [newUserInfo, setNewUserInfo] = useState<{
    username: string;
    tempPassword: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch {
      toast.error("Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userRole === "superAdmin") {
      fetchUsers();
    } else {
      setLoading(false);
    }
  }, [userRole]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;

    setSaving(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim() }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }

      const data = await res.json();
      setNewUserInfo({
        username: data.username,
        tempPassword: data.tempPassword,
      });
      setUsername("");
      setShowForm(false);
      fetchUsers();
      toast.success("Admin user created!");
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create user"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/users/${deleteId}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      toast.success("User deleted");
      setDeleteId(null);
      fetchUsers();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete user"
      );
    } finally {
      setDeleting(false);
    }
  };

  const copyCredentials = () => {
    if (!newUserInfo) return;
    navigator.clipboard.writeText(
      `Username: ${newUserInfo.username}\nTemporary Password: ${newUserInfo.tempPassword}`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (userRole !== "superAdmin") {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Shield className="w-16 h-16 text-gray-300 mb-4" />
        <h2 className="text-xl font-semibold text-gray-700 mb-2">
          Super Admin Only
        </h2>
        <p className="text-gray-400">
          Only super admins can manage users.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1e293b]">User Management</h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage admin users (Super Admin only)
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-[#14b8a6] hover:bg-[#0d9488] text-white px-5 py-2.5 rounded-xl font-medium transition-colors shadow-md"
        >
          <Plus className="w-4 h-4" />
          Add Admin
        </motion.button>
      </div>

      {/* New user credentials display */}
      {newUserInfo && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-green-50 border border-green-200 rounded-2xl p-6"
        >
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-green-800 mb-2">
                New Admin Created
              </h3>
              <p className="text-sm text-green-700 mb-3">
                Share these credentials securely with the new admin:
              </p>
              <div className="bg-white rounded-xl p-4 space-y-1 font-mono text-sm">
                <p>
                  <span className="text-gray-500">Username:</span>{" "}
                  <span className="font-semibold">{newUserInfo.username}</span>
                </p>
                <p>
                  <span className="text-gray-500">Password:</span>{" "}
                  <span className="font-semibold">
                    {newUserInfo.tempPassword}
                  </span>
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={copyCredentials}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 transition-colors"
              >
                {copied ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
                {copied ? "Copied!" : "Copy"}
              </button>
              <button
                onClick={() => setNewUserInfo(null)}
                className="p-2 hover:bg-green-100 rounded-lg"
              >
                <span className="text-green-600 text-sm">Dismiss</span>
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Create form */}
      {showForm && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
        >
          <h2 className="font-semibold text-[#1e293b] mb-4">
            Create New Admin
          </h2>
          <form onSubmit={handleCreateUser} className="flex gap-3">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl focus:border-[#14b8a6] focus:ring-2 focus:ring-[#14b8a6]/20 focus:outline-none text-sm"
              required
            />
            <button
              type="submit"
              disabled={saving}
              className="bg-[#14b8a6] hover:bg-[#0d9488] text-white px-5 py-2.5 rounded-xl font-medium transition-colors disabled:opacity-50"
            >
              {saving ? "Creating..." : "Create"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2.5 rounded-xl font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
          </form>
          <p className="text-xs text-gray-400 mt-2">
            A temporary password will be auto-generated. Share it securely with the new admin.
          </p>
        </motion.div>
      )}

      {/* Users Table */}
      {loading ? (
        <TableSkeleton />
      ) : users.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 shadow-sm text-center">
          <UsersIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="font-semibold text-gray-700">No admin users</h3>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                  Role
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">
                  Created
                </th>
                <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {users.map((user, i) => (
                <motion.tr
                  key={user._id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-[#0A1929] rounded-full flex items-center justify-center text-white font-semibold text-sm">
                        {user.username[0]?.toUpperCase()}
                      </div>
                      <span className="font-medium text-[#1e293b]">
                        {user.username}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 hidden sm:table-cell">
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
                        user.role === "superAdmin"
                          ? "bg-purple-50 text-purple-600"
                          : "bg-blue-50 text-blue-600"
                      }`}
                    >
                      {user.role === "superAdmin" ? (
                        <ShieldCheck className="w-3.5 h-3.5" />
                      ) : (
                        <Shield className="w-3.5 h-3.5" />
                      )}
                      {user.role === "superAdmin" ? "Super Admin" : "Admin"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 hidden md:table-cell">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      {user.role !== "superAdmin" && (
                        <button
                          onClick={() => setDeleteId(user._id)}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Admin User"
        message="Are you sure you want to delete this admin user? They will lose all access."
        loading={deleting}
      />
    </div>
  );
}
