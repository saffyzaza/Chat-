'use client';

import { useState } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "../globals.css";
import { Sidebar } from "../components/Sidebar";
import { MobileHeader } from "../components/MobileHeader";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function HistoryChatLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const expandSidebar = () => {
    setIsSidebarOpen(true);
  };
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
              <div className="relative flex h-screen bg-gray-100">
                
                {/* 5. ส่ง State และฟังก์ชันลงไปเป็น props */}
                <Sidebar 
                  isExpanded={isSidebarOpen} 
                  toggleSidebar={toggleSidebar}
                  expandSidebar={expandSidebar}
                />
        
                {/* 6. ส่วนเนื้อหาหลัก */}
                <div className="flex-1 flex flex-col h-screen overflow-y-auto">
                  
                  {/* 7. Header สำหรับมือถือ (รับฟังก์ชัน toggle) */}
                  <MobileHeader toggleSidebar={toggleSidebar} />
        
                  {/* 8. หน้าแชท */}
                {children}
                </div>
        
                {/* 9. Backdrop (พื้นหลังมืดๆ ตอนเปิดบนมือถือ) */}
                {isSidebarOpen && (
                  <div 
                    onClick={toggleSidebar}
                    className="md:hidden fixed inset-0 bg-black/50 z-10"
                    aria-label="Close sidebar"
                  />
                )}
              </div>
        
      </body>
    </html>
  );
}
