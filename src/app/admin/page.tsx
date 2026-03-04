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
  totalViews: number;
  averageRating: number;
  totalRatings: number;
  users: number;
}

export default function AdminDashboard() {
  const { username, userRole } = useAuthState();
  const [stats, setStats] = useState<Stats>({
    resources: 0,
    totalViews: 0,
    averageRating: 0,
    totalRatings: 0,
    users: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [analyticRes, userRes] = await Promise.all([
          fetch("/api/admin/analytics"),
          userRole === "superAdmin" ? fetch("/api/users?limit=1") : Promise.resolve({ json: () => ({ total: 0 }) })
        ]);

        const analyticData = await analyticRes.json();
        const userData = userRole === "superAdmin" ? await (userRes as Response).json() : { total: 0 };

        setStats({
          resources: analyticData.totalResources || 0,
          totalViews: analyticData.totalViews || 0,
          averageRating: analyticData.averageRating || 0,
          totalRatings: analyticData.totalRatings || 0,
          users: userData.total || 0,
        });
      } catch (err) {
        console.error("Failed to fetch stats:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [userRole]);

  const statCards = [
    {
      label: "My Resources",
      value: stats.resources,
      icon: FileText,
      color: "bg-blue-500",
      lightColor: "bg-blue-50",
    },
    {
      label: "Total Views",
      value: stats.totalViews.toLocaleString(),
      icon: BookOpen,
      color: "bg-[#14b8a6]",
      lightColor: "bg-teal-50",
    },
    {
      label: "Avg Rating",
      value: stats.averageRating > 0 ? `${stats.averageRating}/5` : "N/A",
      icon: TrendingUp,
      color: "bg-green-500",
      lightColor: "bg-green-50",
    },
  ];

  if (userRole === "superAdmin") {
    statCards.push({
      label: "Total Users",
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
        <h1 className="text-2xl md:text-3xl font-bold text-text-primary">
          Welcome back, <span className="text-teal">{username}</span>
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
                    className={`w-6 h-6 ${stat.color === "bg-teal" ? "text-teal" : ""}`}
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
              <div className="text-2xl font-bold text-text-primary">
                {stat.value}
              </div>
              <div className="text-sm text-gray-500 mt-1">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-text-primary mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link href="/admin/resources/new">
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="bg-linear-to-br from-teal to-teal-dark text-white rounded-2xl p-6 shadow-md cursor-pointer"
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
              className="bg-white border-2 border-dashed border-gray-200 hover:border-teal rounded-2xl p-6 cursor-pointer transition-colors"
            >
              <BookOpen className="w-8 h-8 mb-3 text-gray-400" />
              <h3 className="font-semibold text-lg text-text-primary">
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
              className="bg-white border-2 border-dashed border-gray-200 hover:border-teal rounded-2xl p-6 cursor-pointer transition-colors"
            >
              <FileText className="w-8 h-8 mb-3 text-gray-400" />
              <h3 className="font-semibold text-lg text-text-primary">
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
