import React, { useState, useRef, useEffect } from 'react'
import { 
  IoAdd, 
  IoBulbOutline, 
  IoEllipsisVertical, 
  IoListOutline, 
  IoPaperPlane,
  IoAttachOutline,     
  IoLogoGoogle,
  IoDocumentTextOutline,
  IoHardwareChipOutline,
  IoSparklesOutline,     
  IoChatbubblesOutline   
} from 'react-icons/io5'

// --- Component ย่อยสำหรับรายการเมนู Popup ---
const PopupMenuItem = ({ icon, text, onClick }: { icon: React.ReactNode, text: string, onClick?: () => void }) => (
  <button 
    onClick={onClick}
    className="flex items-center w-full space-x-3 p-3 rounded-lg hover:bg-gray-100 text-gray-700 transition-colors"
  >
    {icon}
    <span className="font-medium">{text}</span>
  </button>
);

// --- Props Interface (รับฟังก์ชันจาก ChatInterface) ---
interface ChatInputAreaProps {
  onSend: (prompt: string) => void; 
  isLoading: boolean;              
}

export const ChatInputArea = ({ onSend, isLoading }: ChatInputAreaProps) => {
  const [prompt, setPrompt] = useState("");
  const [openPopup, setOpenPopup] = useState<string | null>(null);

  // --- Refs สำหรับ Popups ---
  const addBtnRef = useRef<HTMLButtonElement>(null);
  const addPopupRef = useRef<HTMLDivElement>(null);
  const toolsBtnRef = useRef<HTMLButtonElement>(null);
  const toolsPopupRef = useRef<HTMLDivElement>(null);
  const modelBtnRef = useRef<HTMLButtonElement>(null);
  const modelPopupRef = useRef<HTMLDivElement>(null);
  
  // --- Logic การสลับ Popup ---
  const togglePopup = (popupName: 'add' | 'tools' | 'model') => {
    setOpenPopup(prev => (prev === popupName ? null : popupName));
  };

  // --- Logic การคลิกนอก Popup ---
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openPopup === null) return; 
      const popupRefs = {
        add: { btn: addBtnRef, popup: addPopupRef },
        tools: { btn: toolsBtnRef, popup: toolsPopupRef },
        model: { btn: modelBtnRef, popup: modelPopupRef },
      };
      // @ts-ignore
      const currentRefs = popupRefs[openPopup];
      if (
        currentRefs &&
        currentRefs.popup.current && 
        !currentRefs.popup.current.contains(event.target as Node) &&
        currentRefs.btn.current && 
        !currentRefs.btn.current.contains(event.target as Node)
      ) {
        setOpenPopup(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openPopup]);

  // --- ฟังก์ชันส่งข้อความ ---
  const handleSubmit = () => {
    if (prompt.trim() === "" || isLoading) return; 
    onSend(prompt); 
    setPrompt(""); 
  };

  // --- ฟังก์ชันกด Enter ---
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { 
      e.preventDefault(); 
      handleSubmit();
    }
  };

  return (
    <div className='bg-white p-4 rounded-xl shadow-lg w-full'>
      {/* แถบ Input หลัก */}
      <div className='flex items-center space-x-2 bg-gray-50 border border-gray-200 rounded-lg p-2'>
        <IoBulbOutline size={22} className='text-[#eb6f45f1] mx-1' />
        <textarea 
          placeholder='พิมพ์ข้อความของคุณ...' 
          className='flex-1 bg-transparent border-0 focus:ring-0 outline-none p-1 placeholder-gray-400 resize-none'
          rows={1}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
        />
        <button 
          type="button"
          onClick={handleSubmit}
          disabled={isLoading || prompt.trim() === ""}
          className={`p-2 rounded-lg text-white ${
            (isLoading || prompt.trim() === "")
              ? 'bg-gray-400' 
              : 'bg-[#eb6f45f1] hover:bg-opacity-90'
          } transition-colors`}
        >
          <IoPaperPlane size={20} />
        </button>
      </div>
      
      {/* แถบเครื่องมือด้านล่าง (Popups) */}
      <div className='flex justify-between items-center mt-4 text-gray-500 text-sm'>
        <div className='flex items-center space-x-2'>
          {/* 1. ปุ่ม Add และ Popup */}
          <div className="relative">
            {openPopup === 'add' && (
              <div ref={addPopupRef} className="absolute bottom-full left-0 mb-2 w-60 bg-white rounded-xl shadow-lg border border-gray-100 p-2 z-10">
                <PopupMenuItem icon={<IoAttachOutline size={22} className="text-gray-600" />} text="อัปโหลดไฟล์" />
                <PopupMenuItem icon={<IoLogoGoogle size={22} className="text-gray-600" />} text="เพิ่มจากไดรฟ์" />
              </div>
            )}
            <button ref={addBtnRef} onClick={() => togglePopup('add')} className={`text-[#eb6f45f1] cursor-pointer bg-gray-100 p-2 rounded-full hover:bg-gray-200 transition-colors ${openPopup === 'add' ? 'bg-gray-200' : ''}`}>
              <IoAdd size={22} />
            </button>
          </div>
          {/* 2. ปุ่ม เครื่องมือ และ Popup */}
          <div className="relative">
            {openPopup === 'tools' && (
              <div ref={toolsPopupRef} className="absolute bottom-full left-0 mb-2 w-60 bg-white rounded-xl shadow-lg border border-gray-100 p-2 z-10">
                <PopupMenuItem icon={<IoDocumentTextOutline size={22} className="text-gray-600" />} text="เอกสารรายงาน" />
              </div>
            )}
            <button ref={toolsBtnRef} onClick={() => togglePopup('tools')} className={`flex items-center cursor-pointer space-x-2 bg-gray-100 rounded-full px-4 py-2 hover:bg-gray-200 transition-colors ${openPopup === 'tools' ? 'bg-gray-200' : ''}`}>
              <IoListOutline size={20} className='text-[#eb6f45f1]' />
              <span className='text-gray-700 font-medium text-sm'>เครื่องมือ</span>
            </button>
          </div>
        </div>
        {/* 3. ส่วนด้านขวา: 2.5 Pro และ Popup */}
        <div className='flex items-center space-x-2'>
          <div className="relative">
            {openPopup === 'model' && (
              <div ref={modelPopupRef} className="absolute bottom-full right-0 mb-2 w-60 bg-white rounded-xl shadow-lg border border-gray-100 p-2 z-10">
                <PopupMenuItem icon={<IoHardwareChipOutline size={22} className="text-blue-500" />} text="AI Model A (Pro)" />
                <PopupMenuItem icon={<IoSparklesOutline size={22} className="text-purple-500" />} text="AI Model B (Creative)" />
                <PopupMenuItem icon={<IoChatbubblesOutline size={22} className="text-green-500" />} text="AI Model C (Fast)" />
              </div>
            )}
            <button ref={modelBtnRef} onClick={() => togglePopup('model')} className={`flex items-center space-x-1 bg-gray-100 rounded-full px-4 py-2 hover:bg-gray-200 transition-colors ${openPopup === 'model' ? 'bg-gray-200' : ''}`}>
              <span className='text-[#eb6f45f1] text-sm font-semibold'>2.5 Pro</span>
              <IoEllipsisVertical size={18} className='text-gray-500' />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}