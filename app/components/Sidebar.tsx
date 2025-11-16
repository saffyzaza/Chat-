'use client';
// 1. ลบ useState ออก
import {
    IoAddCircle,
    IoChatbubblesOutline,
    IoChevronBackCircle,
    IoCodeSlash,
    IoExtensionPuzzleOutline,
    IoPersonCircle,
    IoSearch
} from 'react-icons/io5';

// 2. สร้าง Interface สำหรับ Props ที่รับมา
interface SidebarProps {
  isExpanded: boolean;
  toggleSidebar: () => void;
  expandSidebar: () => void; // ฟังก์ชันสำหรับ Search bar
}

// 3. รับ props มาจากไฟล์แม่
export const Sidebar = ({ isExpanded, toggleSidebar, expandSidebar }: SidebarProps) => {
  // 4. ลบ State และฟังก์ชัน toggleSidebar ภายในนี้ทิ้ง

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
              bg-[#faf4e1ad] shadow-orange-100 shadow-lg 
              transition-all duration-300 ease-in-out 
              overflow-hidden z-20
              absolute md:relative 
              ${isExpanded ? 'w-64' : 'w-0 md:w-20'}
            `}>

                {/* === ส่วนบนและเมนูหลัก === */}
                <div>
                    {/* Header: Logo + Toggle Button */}
                    <div className={`flex items-center ${isExpanded ? 'justify-between' : 'justify-center'} p-4 mb-4`}>
                        <img src="https://www.thaihealth.or.th/wp-content/uploads/2023/08/Logo-thaihealth.png" alt="Logo" className={`h-8 ${isExpanded ? 'block' : 'hidden'}`} />
                        
                        {/* 6. ซ่อนปุ่ม Toggle นี้บนมือถือ (md:block) */}
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
                        <button className={`flex items-center p-3 rounded-md bg-[#eb6f45f1] hover:bg-[#f56e41] text-white transition-all duration-200 hover:scale-105 ${isExpanded ? 'space-x-3' : 'justify-center'}`}>
                            <IoAddCircle size={28} className="flex-shrink-0" />
                            <span className={`font-bold whitespace-nowrap ${isExpanded ? 'block' : 'hidden'}`}>New Chat</span>
                        </button>

                        {/* Other Menu Items */}
                        <button className={`flex items-center p-3 w-full rounded-md hover:bg-gray-200 cursor-pointer transition-colors duration-200 ${isExpanded ? 'space-x-3' : 'justify-center'}`}>
                            <IoChatbubblesOutline size={24} className="text-gray-600 flex-shrink-0" />
                            <span className={`font-bold text-gray-600 whitespace-nowrap ${isExpanded ? 'block' : 'hidden'}`}>All Chats</span>
                        </button>
                        <button className={`flex items-center p-3 w-full rounded-md hover:bg-gray-200 cursor-pointer transition-colors duration-200 ${isExpanded ? 'space-x-3' : 'justify-center'}`}>
                            <IoExtensionPuzzleOutline size={24} className="text-gray-600 flex-shrink-0" />
                            <span className={`font-bold text-gray-600 whitespace-nowrap ${isExpanded ? 'block' : 'hidden'}`}>Project</span>
                        </button>
                        <button className={`flex items-center p-3 w-full rounded-md hover:bg-gray-200 cursor-pointer transition-colors duration-200 ${isExpanded ? 'space-x-3' : 'justify-center'}`}>
                            <IoCodeSlash size={24} className="text-gray-600 flex-shrink-0" />
                            <span className={`font-bold text-gray-600 whitespace-nowrap ${isExpanded ? 'block' : 'hidden'}`}>Code</span>
                        </button>
                        
                        {/* Search Bar */}
                        <div 
                            // 7. ใช้ prop "expandSidebar" ที่รับมา
                            onClick={expandSidebar} 
                            className={`flex items-center p-2 rounded-md bg-gray-200/50 border border-gray-300 ${isExpanded ? 'w-full space-x-3' : 'w-auto justify-center'} cursor-pointer`}
                        >
                            <IoSearch size={24} className={'text-gray-600 flex-shrink-0'} />
                            <input
                                type="text"
                                placeholder="Search..."
                                // เพิ่ม readOnly เพื่อป้องกันการพิมพ์เมื่อหด
                                readOnly={!isExpanded} 
                                className={`bg-transparent outline-none w-full text-gray-700 ${isExpanded ? 'block' : 'hidden'}`}
                            />
                        </div>
                    </nav>
                </div>

                {/* === ส่วนล่าง: Profile === */}
                <div className="px-2">
                    <hr className="border-gray-300/70 my-2" />
                    <button className={`flex items-center space-x-3 p-3 w-full rounded-md hover:bg-gray-200 cursor-pointer transition-colors duration-200 ${isExpanded ? '' : 'justify-center'}`}>
                        <IoPersonCircle size={28} className="text-gray-600 flex-shrink-0" />
                        <span className={`font-bold text-gray-600 whitespace-nowrap ${isExpanded ? 'block' : 'hidden'}`}>My Account</span>
                    </button>
                </div>

            </div>
        </>
    );
};