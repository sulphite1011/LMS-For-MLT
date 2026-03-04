"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  BookOpen,
  FileText,
  Users,
  TrendingUp,
  Plus,
  ArrowRight,
  Bell,
} from "lucide-react";
import Link from "next/link";
import { useAuthState } from "@/contexts/AuthContext";
import { CardSkeleton } from "@/components/ui/Skeleton";

interface Stats {
  resources: number;
  subjects: number;
  users: number;
}

export default function AdminDashboard() {
  const { username, userRole } = useAuthState();
  const [stats, setStats] = useState<Stats>({
    resources: 0,
    subjects: 0,
    users: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [resRes, subRes] = await Promise.all([
          fetch("/api/resources?limit=1"),
          fetch("/api/subjects"),
        ]);
        const resData = await resRes.json();
        const subData = await subRes.json();
        setStats({
          resources: resData.total || 0,
          subjects: subData.length || 0,
          users: 0,
        });
      } catch (err) {
        console.error("Failed to fetch stats:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const statCards = [
    {
      label: "Total Resources",
      value: stats.resources,
      icon: FileText,
      color: "bg-blue-500",
      lightColor: "bg-blue-50",
    },
    {
      label: "Subjects",
      value: stats.subjects,
      icon: BookOpen,
      color: "bg-[#14b8a6]",
      lightColor: "bg-teal-50",
    },
    {
      label: "Growth",
      value: "+12%",
      icon: TrendingUp,
      color: "bg-green-500",
      lightColor: "bg-green-50",
    },
  ];

  if (userRole === "superAdmin") {
    statCards.push({
      label: "Admin Users",
      value: stats.users,
      icon: Users,
      color: "bg-purple-500",
      lightColor: "bg-purple-50",
    });
  }

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl md:text-3xl font-bold text-[#1e293b]">
          Welcome back, <span className="text-[#14b8a6]">{username}</span>
        </h1>
        <p className="text-gray-500 mt-1">
          Here&apos;s an overview of your LMS.
        </p>
      </motion.div>

      {/* Stats Cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-4">
                <div
                  className={`w-12 h-12 ${stat.lightColor} rounded-xl flex items-center justify-center`}
                >
                  <stat.icon
                    className={`w-6 h-6 ${stat.color === "bg-[#14b8a6]" ? "text-[#14b8a6]" : ""}`}
                    style={{
                      color:
                        stat.color === "bg-blue-500"
                          ? "#3b82f6"
                          : stat.color === "bg-green-500"
                            ? "#10b981"
                            : stat.color === "bg-purple-500"
                              ? "#8b5cf6"
                              : undefined,
                    }}
                  />
                </div>
              </div>
              <div className="text-2xl font-bold text-[#1e293b]">
                {stat.value}
              </div>
              <div className="text-sm text-gray-500 mt-1">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-[#1e293b] mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link href="/admin/resources/new">
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="bg-gradient-to-br from-[#14b8a6] to-[#0d9488] text-white rounded-2xl p-6 shadow-md cursor-pointer"
            >
              <Plus className="w-8 h-8 mb-3" />
              <h3 className="font-semibold text-lg">Add Resource</h3>
              <p className="text-white/80 text-sm mt-1">
                Upload new study material
              </p>
              <ArrowRight className="w-5 h-5 mt-4" />
            </motion.div>
          </Link>

          <Link href="/admin/broadcast">
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="bg-indigo-600 text-white rounded-2xl p-6 shadow-md cursor-pointer"
            >
              <Bell className="w-8 h-8 mb-3" />
              <h3 className="font-semibold text-lg">Broadcast Alert</h3>
              <p className="text-white/80 text-sm mt-1">
                Send manual push notifications
              </p>
              <ArrowRight className="w-5 h-5 mt-4" />
            </motion.div>
          </Link>

          <Link href="/admin/subjects">
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="bg-white border-2 border-dashed border-gray-200 hover:border-[#14b8a6] rounded-2xl p-6 cursor-pointer transition-colors"
            >
              <BookOpen className="w-8 h-8 mb-3 text-gray-400" />
              <h3 className="font-semibold text-lg text-[#1e293b]">
                Manage Subjects
              </h3>
              <p className="text-gray-500 text-sm mt-1">
                Add or edit subject categories
              </p>
              <ArrowRight className="w-5 h-5 mt-4 text-gray-400" />
            </motion.div>
          </Link>

          <Link href="/admin/resources">
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="bg-white border-2 border-dashed border-gray-200 hover:border-[#14b8a6] rounded-2xl p-6 cursor-pointer transition-colors"
            >
              <FileText className="w-8 h-8 mb-3 text-gray-400" />
              <h3 className="font-semibold text-lg text-[#1e293b]">
                All Resources
              </h3>
              <p className="text-gray-500 text-sm mt-1">
                View and manage all resources
              </p>
              <ArrowRight className="w-5 h-5 mt-4 text-gray-400" />
            </motion.div>
          </Link>
        </div>
      </div>
    </div>
  );
}
