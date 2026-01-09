'use client';
import { useState, useEffect } from 'react';
import {
    IoAddCircle,
    IoChatbubblesOutline,
    IoChevronBackCircle,
    IoCodeSlash,
    IoExtensionPuzzleOutline,
    IoPersonCircle,
    IoSearch,
    IoLogOutOutline,
    IoChatboxEllipsesOutline,
    IoTimeOutline
} from 'react-icons/io5';
import { LoginPopup } from './auth/LoginPopup';
import { useChatHistory } from '../hooks/useChatHistory';

// 2. สร้าง Interface สำหรับ Props ที่รับมา
interface SidebarProps {
  isExpanded: boolean;
  toggleSidebar: () => void;
  expandSidebar: () => void; // ฟังก์ชันสำหรับ Search bar
}

interface UserData {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'user';
}

// 3. รับ props มาจากไฟล์แม่
export const Sidebar = ({ isExpanded, toggleSidebar, expandSidebar }: SidebarProps) => {
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [user, setUser] = useState<UserData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // ใช้ useChatHistory เพื่อดึงประวัติการสนทนา
  const { sessions, isLoading, search, resetFilter } = useChatHistory();

  // ตรวจสอบว่ามี user ใน localStorage หรือไม่
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);
  
  // ค้นหาเมื่อ searchQuery เปลี่ยน
  useEffect(() => {
    if (searchQuery.trim()) {
      search(searchQuery);
    } else {
      resetFilter();
    }
  }, [searchQuery, search, resetFilter]);

  const handleLoginSuccess = (userData: UserData) => {
    setUser(userData);
    // รีเฟรชหน้าเว็บเพื่ออัปเดต Sidebar และโหลดประวัติการสนทนา
    window.location.reload();
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      setUser(null);
      // รีเฟรชหน้าเว็บเพื่ออัปเดต Sidebar และล้างข้อมูล
      window.location.reload();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

    return (
        <>
            {/* * 5. *** นี่คือส่วนที่เปลี่ยนแปลงหลัก ***
             * - absolute md:relative = ลอยทับบนมือถือ / เป็นส่วนหนึ่งของหน้าบนเดสก์ท็อป
             * - z-20 = ทำให้ลอยอยู่เหนือ Backdrop
             * - ${isExpanded ? 'w-64' : 'w-0 md:w-20'}
             * - ตอนขยาย (isExpanded = true): กว้าง w-64 (ทั้งมือถือและเดสก์ท็อป)
             * - ตอนหด (isExpanded = false):
             * - มือถือ: w-0 (ซ่อนสมบูรณ์)
             * - เดสก์ท็อป: md:w-20 (แสดงเป็นแถบ "Rail")
             */}
            <div className={`
              h-screen flex flex-col justify-between 
              bg-[#faf8f3da] shadow-orange-100 shadow-lg 
              transition-all duration-300 ease-in-out 
              overflow-hidden z-20
              absolute md:relative 
              ${isExpanded ? 'w-64' : 'w-0 md:w-20'}
            `}>

                {/* === ส่วนบนและเมนูหลัก === */}
                <div>
                    {/* Header: Logo + Toggle Button */}
                    <div className={`flex items-center ${isExpanded ? 'justify-between' : 'justify-center'} p-4 mb-4`}>
                        <div className={`flex items-center gap-5 ${isExpanded ? 'block' : 'hidden'}`}>
                            <img src="https://s.imgz.io/2025/11/17/S__16498692-_1_-removebg-preview-removebg-preview6a198be1c3042511.png" alt="Logo 2" className="h-12" />
                        </div>
                     
                        <button
                            onClick={toggleSidebar}
                            className="p-1 text-[#eb6f45f1] rounded-full hover:bg-orange-200/50 transition-colors duration-200 hidden md:block" // <-- เพิ่ม hidden md:block
                            aria-label="Toggle sidebar"
                        >
                            <IoChevronBackCircle
                                size={32}
                                className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                            />
                        </button>
                    </div>

                    {/* Navigation Links (โค้ดส่วนนี้เหมือนเดิมเกือบทั้งหมด) */}
                    <nav className="flex flex-col space-y-2 px-2">
                        {/* New Chat Button */}
                        <button onClick={
                            () => window.location.href = '/'
                        } className={`flex items-center p-3 rounded-md bg-[#eb6f45f1] hover:bg-[#f56e41] text-white transition-all duration-200 hover:scale-105 ${isExpanded ? 'space-x-3' : 'justify-center'}`}>
                            <IoAddCircle size={28} className="shrink-0" />
                            <span className={`font-bold whitespace-nowrap ${isExpanded ? 'block' : 'hidden'}`}>New Chat</span>
                        </button>

                        {/* Other Menu Items */}
                        <button onClick={
                            () => window.location.href = '/history_chat'
                        } className={`flex items-center p-3 w-full rounded-md hover:bg-gray-200 cursor-pointer transition-colors duration-200 ${isExpanded ? 'space-x-3' : 'justify-center'}`}>
                            <IoChatbubblesOutline size={24} className="text-gray-600 shrink-0" />
                            <span className={`font-bold text-gray-600 whitespace-nowrap ${isExpanded ? 'block' : 'hidden'}`}>All Chats</span>
                        </button>
                        {/* <button onClick={
                            () => window.location.href = '/project'
                        } className={`flex items-center p-3 w-full rounded-md hover:bg-gray-200 cursor-pointer transition-colors duration-200 ${isExpanded ? 'space-x-3' : 'justify-center'}`}>
                            <IoExtensionPuzzleOutline size={24} className="text-gray-600 shrink-0" />
                            <span className={`font-bold text-gray-600 whitespace-nowrap ${isExpanded ? 'block' : 'hidden'}`}>Project</span>
                        </button> */}
                        
                        {/* Admin Menu - แสดงเฉพาะ admin */}
                        {user?.role === 'admin' && (
                            <button onClick={
                                () => window.location.href = '/admin'
                            } className={`flex items-center p-3 w-full rounded-md hover:bg-orange-100 cursor-pointer transition-colors duration-200 border border-orange-200 ${isExpanded ? 'space-x-3' : 'justify-center'}`}>
                                <IoCodeSlash size={24} className="text-orange-600 shrink-0" />
                                <span className={`font-bold text-orange-600 whitespace-nowrap ${isExpanded ? 'block' : 'hidden'}`}>Admin</span>
                            </button>
                        )}
                        
                        {/* Search Bar */}
                        <div 
                            onClick={expandSidebar} 
                            className={`flex items-center p-2 rounded-md bg-gray-200/50 border border-gray-300 ${isExpanded ? 'w-full space-x-3' : 'w-auto justify-center'} cursor-pointer`}
                        >
                            <IoSearch size={24} className={'text-gray-600 shrink-0'} />
                            <input
                                type="text"
                                placeholder="ค้นหาการสนทนา..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                readOnly={!isExpanded} 
                                className={`bg-transparent outline-none w-full text-gray-700 ${isExpanded ? 'block' : 'hidden'}`}
                            />
                        </div>
                    </nav>
                    
                    {/* Chat History Section */}
                    {isExpanded && (
                        <div className="mt-4 px-2">
                            <div className="flex items-center space-x-2 px-2 mb-2">
                                <IoTimeOutline size={18} className="text-gray-500" />
                                <h3 className="text-sm font-semibold text-gray-600">ประวัติการสนทนา</h3>
                            </div>
                            <div className="space-y-1 max-h-[calc(100vh-400px)] overflow-y-auto">
                                {isLoading ? (
                                    <div className="text-center py-4 text-gray-500 text-sm">
                                        กำลังโหลด...
                                    </div>
                                ) : sessions.length === 0 ? (
                                    <div className="text-center py-4 text-gray-500 text-sm">
                                        {searchQuery ? 'ไม่พบผลลัพธ์' : 'ยังไม่มีประวัติการสนทนา'}
                                    </div>
                                ) : (
                                    sessions.slice(0, 10).map((session) => (
                                        <button
                                            key={session.id}
                                            onClick={() => window.location.href = `/?session=${session.id}`}
                                            className="w-full text-left p-2 rounded-md hover:bg-orange-50 transition-colors group"
                                        >
                                            <div className="flex items-start space-x-2">
                                                <IoChatboxEllipsesOutline 
                                                    size={16} 
                                                    className="text-gray-400 group-hover:text-orange-500 shrink-0 mt-0.5" 
                                                />
                                                <div className="flex-2 min-w-0">
                                                    <p className="text-sm font-medium text-gray-800 truncate group-hover:text-orange-600">
                                                        {session.title}
                                                    </p>
                                                    <p className="text-xs text-gray-600 truncate">
                                                        {session.preview}
                                                    </p>
                                                    <p className="text-xs text-gray-600 mt-0.5">
                                                        {new Date(session.updatedAt).toLocaleDateString('th-TH', {
                                                            day: 'numeric',
                                                            month: 'short',
                                                            year: 'numeric'
                                                        })}
                                                    </p>
                                                </div>
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                            {sessions.length > 10 && (
                                <button
                                    onClick={() => window.location.href = '/history_chat'}
                                    className="w-full mt-2 text-center text-sm text-orange-600 hover:text-orange-700 py-2"
                                >
                                    ดูทั้งหมด ({sessions.length})
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* === ส่วนล่าง: Profile === */}
                <div className="px-2 pb-4">
                    {user ? (
                        // แสดงข้อมูล User เมื่อ Login แล้ว
                        <div className={`${isExpanded ? 'p-3' : 'p-2'} bg-linear-to-r from-orange-50 to-orange-100 rounded-lg border border-orange-200`}>
                            <div className={`flex items-center ${isExpanded ? 'space-x-3' : 'justify-center'}`}>
                                <div className="shrink-0">
                                    <div className="w-10 h-10 bg-linear-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center">
                                        <IoPersonCircle size={24} className="text-white" />
                                    </div>
                                </div>
                                {isExpanded && (
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-semibold text-gray-800 truncate">
                                                {user.name}
                                            </p>
                                            {user.role === 'admin' && (
                                                <span className="px-2 py-0.5 text-xs font-bold bg-orange-500 text-white rounded">
                                                    ADMIN
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-500 truncate">
                                            {user.email}
                                        </p>
                                    </div>
                                )}
                            </div>
                            {isExpanded && (
                                <button
                                    onClick={handleLogout}
                                    className="mt-2 w-full flex items-center justify-center space-x-2 px-3 py-2 bg-white text-orange-600 rounded-md hover:bg-orange-50 transition-colors text-sm font-medium"
                                >
                                    <IoLogOutOutline size={18} />
                                    <span>ออกจากระบบ</span>
                                </button>
                            )}
                        </div>
                    ) : (
                        // แสดงปุ่ม Login เมื่อยังไม่ได้ Login
                        <button
                            onClick={() => setIsLoginOpen(true)}
                            className={`flex items-center w-full p-3 rounded-lg bg-linear-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700 transition-all duration-200 shadow-lg hover:shadow-xl ${isExpanded ? 'space-x-3' : 'justify-center'}`}
                        >
                            <IoPersonCircle size={24} className="shrink-0" />
                            <span className={`font-semibold ${isExpanded ? 'block' : 'hidden'}`}>
                                เข้าสู่ระบบ
                            </span>
                        </button>
                    )}
                </div>

            </div>

            {/* Login Popup */}
            <LoginPopup
                isOpen={isLoginOpen}
                onClose={() => setIsLoginOpen(false)}
                onLoginSuccess={handleLoginSuccess}
            />
        </>
    );
};