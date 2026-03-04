"use client";

import Link from "next/link";
import { BookOpen, Mail, MessageCircle, Instagram, Facebook, Linkedin, Twitter } from "lucide-react";
import { motion } from "framer-motion";

const SOCIAL_LINKS = [
  {
    name: "Instagram",
    url: "https://www.instagram.com/hamadkhadim474?igsh=bGt0MTg5dTFkZXNp",
    icon: <Instagram className="w-5 h-5" />,
    color: "hover:text-pink-500",
  },
  {
    name: "Facebook",
    url: "https://www.facebook.com/hamad.khadim.380178?mibextid=ZbWKwL",
    icon: <Facebook className="w-5 h-5" />,
    color: "hover:text-blue-600",
  },
  {
    name: "LinkedIn",
    url: "https://www.linkedin.com/in/hamad-khadim-a12b74374",
    icon: <Linkedin className="w-5 h-5" />,
    color: "hover:text-blue-700",
  },
  {
    name: "X (Twitter)",
    url: "https://x.com/hamadkhadim474",
    icon: <Twitter className="w-5 h-5" />, // Lucide Twitter icon is often used for X
    color: "hover:text-gray-200",
  },
  {
    name: "WhatsApp",
    url: "https://whatsapp.com/channel/0029Vaz6E6t5Ui2QHmhDpi45",
    icon: <MessageCircle className="w-5 h-5" />,
    color: "hover:text-green-500",
  },
];

export function Footer() {
  return (
    <footer className="bg-navy border-t border-white/5 pt-16 pb-8 text-gray-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          {/* Brand Column */}
          <div className="space-y-6">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-10 h-10 bg-teal rounded-xl flex items-center justify-center shadow-lg shadow-teal/20">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <span className="font-bold text-xl text-white tracking-tight">
                Hamad&apos;s <span className="text-teal">LMS</span>
              </span>
            </Link>
            <p className="text-sm leading-relaxed max-w-xs">
              Providing free, high-quality Medical Laboratory Technology (MLT) resources to empower students and professionals worldwide.
            </p>
            <div className="flex items-center gap-4">
              {SOCIAL_LINKS.map((social) => (
                <motion.a
                  key={social.name}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ y: -3 }}
                  className={`transition-colors p-2 bg-white/5 rounded-lg border border-white/5 ${social.color}`}
                  aria-label={social.name}
                >
                  {social.icon}
                </motion.a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white font-semibold mb-6">Explore</h3>
            <ul className="space-y-4 text-sm">
              <li>
                <Link href="/" className="hover:text-teal transition-colors">Browse Resources</Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-teal transition-colors">My Profile</Link>
              </li>
              <li>
                <Link href="/admin/claim" className="hover:text-teal transition-colors">Become an Admin</Link>
              </li>
              <li>
                <a href="#resources" className="hover:text-teal transition-colors">Search Content</a>
              </li>
            </ul>
          </div>

          {/* Community Section */}
          <div>
            <h3 className="text-white font-semibold mb-6">Community</h3>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-green-500/10 rounded-full flex items-center justify-center text-green-500">
                  <MessageCircle className="w-4 h-4" />
                </div>
                <span className="text-sm text-white font-medium">WhatsApp Channel</span>
              </div>
              <p className="text-xs text-gray-400">
                Join our "UHS Semester Saviours" channel for the latest updates and resources.
              </p>
              <a
                href="https://whatsapp.com/channel/0029Vaz6E6t5Ui2QHmhDpi45"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-center bg-green-600 hover:bg-green-700 text-white text-xs font-semibold py-2 rounded-lg transition-all"
              >
                Join Now
              </a>
            </div>
          </div>

          {/* Contact Section */}
          <div>
            <h3 className="text-white font-semibold mb-6">Contact</h3>
            <div className="space-y-4">
              <a
                href="mailto:hamadkhadimdgkmc@gmail.com"
                className="flex items-center gap-3 group"
              >
                <div className="w-10 h-10 bg-teal/10 rounded-xl flex items-center justify-center text-teal group-hover:bg-teal group-hover:text-white transition-all">
                  <Mail className="w-5 h-5" />
                </div>
                <div className="text-sm">
                  <p className="text-gray-500 text-xs">Email us at</p>
                  <p className="text-white group-hover:text-teal transition-colors">hamadkhadimdgkmc@gmail.com</p>
                </div>
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-gray-500">
          <p>© {new Date().getFullYear()} Hamad&apos;s MLT Study Hub. All rights reserved.</p>
          <p className="flex items-center gap-1.5">
            Designed with <span className="text-red-500">❤️</span> by{" "}
            <span className="text-white font-medium">Hamad Khadim</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
