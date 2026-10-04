'use client';

import React, { useState, useRef } from 'react';
import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import PdfWorkspace from '@/components/PdfWorkspace';
import Footer from '@/components/Footer';
import ToastContainer, { ToastItem } from '@/components/ToastContainer';

export default function Home() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newToast: ToastItem = { id, message, type };

    setToasts((prev) => [...prev, newToast]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const handleOpenUpload = () => {
    const workspace = document.getElementById('workspace');
    if (workspace) {
      workspace.scrollIntoView({ behavior: 'smooth' });
    }
    setTimeout(() => {
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
    }, 300);
  };

  return (
    <div className="app-layout">
      {/* Global Toast Notifications */}
      <ToastContainer toasts={toasts} />

      {/* Navigation Bar */}
      <Navbar onOpenUpload={handleOpenUpload} onShowToast={showToast} />

      {/* Main Content */}
      <main>
        {/* Focused Hero Section */}
        <Hero onOpenUpload={handleOpenUpload} />

        {/* Dedicated PDF Ingestion & Grounded Q&A Workspace */}
        <PdfWorkspace onShowToast={showToast} fileInputRef={fileInputRef} />
      </main>

      {/* Clean Footer */}
      <Footer />
    </div>
  );
}

