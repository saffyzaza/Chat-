'use client';
import { useState, Suspense } from 'react';
import { Sidebar } from './components/Sidebar';
import { MobileHeader } from './components/MobileHeader';
import { ChatInterface } from './components/chat/ChatInterface';

export default function HomeClient() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => setIsSidebarOpen((v) => !v);
  const expandSidebar = () => setIsSidebarOpen(true);

  return (
    <div className="relative flex h-screen bg-gray-100">
      <Sidebar
        isExpanded={isSidebarOpen}
        toggleSidebar={toggleSidebar}
        expandSidebar={expandSidebar}
      />

      <div className="flex-1 flex flex-col h-screen overflow-y-auto">
        <MobileHeader toggleSidebar={toggleSidebar} />

        <Suspense fallback={<div className="flex-1 flex items-center justify-center">Loading...</div>}>
          <ChatInterface />
        </Suspense>
      </div>

      {isSidebarOpen && (
        <div
          onClick={toggleSidebar}
          className="md:hidden fixed inset-0 bg-black/50 z-10"
          aria-label="Close sidebar"
        />
      )}
    </div>
  );
}
