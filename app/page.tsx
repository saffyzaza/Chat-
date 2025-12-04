'use client'; // จำเป็นต้องใช้ Client Component เพราะมี useState
import { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { MobileHeader } from './components/MobileHeader';
import { ChatInterface } from './components/chat/ChatInterface';

// 1. Import Component ทั้ง 3 ส่วน


export default function Home() {
  
  // 2. ย้าย State มาไว้ที่นี่
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // 3. สร้างฟังก์ชันควบคุม State ไว้ที่นี่
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const expandSidebar = () => {
    setIsSidebarOpen(true);
  };

  return (
    <>
      {/* 4. ใช้ Layout ที่เรารออกแบบไว้ (เหมือนใน App.tsx) */}
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
          <ChatInterface />
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
    </>
  );
}