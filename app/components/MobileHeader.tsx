'use client';
import { IoMenu } from 'react-icons/io5';

interface MobileHeaderProps {
  toggleSidebar: () => void;
}

export const MobileHeader = ({ toggleSidebar }: MobileHeaderProps) => {
  return (
    // md:hidden = ซ่อนบนจอขนาดกลางและใหญ่
    <div className="md:hidden flex items-center justify-between p-4 bg-white shadow-md sticky top-0 z-10">
      
      {/* Hamburger Button */}
      <button 
        onClick={toggleSidebar} 
        className="p-2 text-[#eb6f45f1] rounded-full hover:bg-orange-100"
        aria-label="Open sidebar"
      >
        <IoMenu size={28} />
      </button>
      
      {/* Mobile Logo */}
      <img src="https://www.thaihealth.or.th/wp-content/uploads/2023/08/Logo-thaihealth.png" alt="Logo" className="h-8" />

      {/* Placeholder (เผื่อมีไอคอน Profile ด้านขวา) */}
      <div className="w-10"></div>
    </div>
  );
};