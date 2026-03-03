"use strict";
"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const LOADING_MESSAGES = [
  "Analyzing samples...",
  "Preparing lab results...",
  "Calibrating microscope...",
  "Staining slides...",
  "Sequencing DNA...",
  "Checking blood counts...",
];

const MicroscopeIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="w-16 h-16 text-purple-600 dark:text-purple-400"
  >
    <path d="M6 18h8" />
    <path d="M3 22h18" />
    <motion.path
      d="M14 22a7 7 0 1 0-14 0"
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
    />
    <motion.path
      d="M9 14h2"
      animate={{ x: [0, 2, 0] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
    />
    <path d="M12 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
    <motion.path
      d="M12 2v4"
      animate={{ y: [0, 2, 0] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
    />
  </svg>
);

const DNAIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="w-16 h-16 text-pink-600 dark:text-pink-400"
  >
    <motion.path
      d="m8 15 8-6"
      animate={{ opacity: [0.3, 1, 0.3] }}
      transition={{ duration: 2, repeat: Infinity }}
    />
    <motion.path
      d="m16 15-8-6"
      animate={{ opacity: [1, 0.3, 1] }}
      transition={{ duration: 2, repeat: Infinity }}
    />
    <motion.path
      d="M12 3a9 9 0 0 0 0 18"
      animate={{ rotateY: 360 }}
      transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
    />
    <circle cx="8" cy="15" r="1.5" fill="currentColor" />
    <circle cx="16" cy="9" r="1.5" fill="currentColor" />
    <circle cx="16" cy="15" r="1.5" fill="currentColor" />
    <circle cx="8" cy="9" r="1.5" fill="currentColor" />
  </svg>
);

const BloodDropIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="w-16 h-16 text-red-500 dark:text-red-400"
  >
    <motion.path
      d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5L12 2 8 9.5c-2 1.6-3 3.5-3 5.5a7 7 0 0 0 7 7Z"
      animate={{ scale: [1, 1.1, 1] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
    />
  </svg>
);

const TestTubeIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="w-16 h-16 text-indigo-600 dark:text-indigo-400"
  >
    <path d="M21 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v2" />
    <path d="M16 22H8a2 2 0 0 1-2-2V7h12v13a2 2 0 0 1-2 2Z" />
    <motion.rect
      x="8"
      y="12"
      width="8"
      height="10"
      fill="currentColor"
      initial={{ scaleY: 0 }}
      animate={{ scaleY: [0, 0.8, 0], originY: 1 }}
      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      className="opacity-40"
    />
    <path d="M12 12v6" />
    <path d="M9 15h6" />
  </svg>
);

export default function LoadingComponent() {
  const [index, setIndex] = useState(0);
  const Icons = [MicroscopeIcon, DNAIcon, BloodDropIcon, TestTubeIcon];
  const CurrentIcon = Icons[index % Icons.length];

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 2500);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900 dark:to-indigo-900">
      <div className="relative flex flex-col items-center justify-center w-full max-w-md p-12 space-y-8 select-none">
        {/* Main Animation Container */}
        <div className="relative">
          {/* Glow behind icon */}
          <div className="absolute inset-0 bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400 blur-[100px] rounded-full scale-150 animate-pulse" />

          {/* Icon Container */}
          <div className="relative z-10 bg-white/90 dark:bg-gray-800/90 p-10 rounded-3xl border border-purple-200/50 dark:border-purple-700/50 shadow-2xl backdrop-blur-xl">
            <AnimatePresence mode="wait">
              <motion.div
                key={index}
                initial={{ scale: 0.8, opacity: 0, rotate: -10 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                exit={{ scale: 0.8, opacity: 0, rotate: 10 }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
              >
                <CurrentIcon />
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Floating Particles */}
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 rounded-full"
              style={{
                background: i % 2 === 0 
                  ? 'linear-gradient(135deg, #c084fc, #f472b6)' 
                  : 'linear-gradient(135deg, #818cf8, #c084fc)',
                left: "50%",
                top: "50%",
              }}
              animate={{
                y: [0, -60, -120],
                x: [0, i % 2 === 0 ? 30 : -30, i % 2 === 0 ? 60 : -60],
                opacity: [0, 0.8, 0],
                scale: [0.5, 1.2, 0.5],
              }}
              transition={{
                duration: 2.5 + i * 0.2,
                repeat: Infinity,
                delay: i * 0.3,
                ease: "easeOut",
              }}
            />
          ))}
        </div>

        {/* Loading Message */}
        <div className="text-center">
          <AnimatePresence mode="wait">
            <motion.p
              key={index}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              className="text-2xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 dark:from-purple-400 dark:via-pink-400 dark:to-indigo-400 bg-clip-text text-transparent"
            >
              {LOADING_MESSAGES[index]}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* Progress Bar */}
        <div className="w-64 h-2 bg-gradient-to-r from-purple-200/50 via-pink-200/50 to-indigo-200/50 dark:from-purple-800/30 dark:via-pink-800/30 dark:to-indigo-800/30 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500"
            animate={{ x: ["-100%", "100%"] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            style={{ width: "100%" }}
          />
        </div>

        {/* Background Decorations */}
        <div className="absolute -z-10 inset-0 overflow-hidden">
          <div className="absolute top-0 left-0 w-72 h-72 bg-purple-300/20 dark:bg-purple-600/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-72 h-72 bg-pink-300/20 dark:bg-pink-600/10 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-300/20 dark:bg-indigo-600/10 rounded-full blur-3xl" />
        </div>
      </div>
    </div>
  );
}









