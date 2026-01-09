import React, { useState, useRef, useEffect } from 'react'
import { CiDatabase } from 'react-icons/ci';
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
  IoChatbubblesOutline,
  IoCloseOutline,
  IoSearchOutline,
  IoGitCompareOutline,
  IoHelpCircleOutline,
  IoStatsChartOutline,
  IoCreateOutline,
  IoMicOutline,
  IoCameraOutline,
  IoImageOutline,
  IoFolderOutline
} from 'react-icons/io5'

// --- Component ย่อยสำหรับรายการเมนู Popup ---
const PopupMenuItem = ({ icon, text, onClick, disabled = false }: { 
  icon: React.ReactNode, 
  text: string, 
  onClick?: () => void,
  disabled?: boolean
}) => (
  <button 
    onClick={onClick}
    disabled={disabled}
    className={`flex items-center w-full space-x-3 p-3 rounded-lg transition-colors ${
      disabled 
        ? 'text-gray-400 cursor-not-allowed' 
        : 'text-gray-700 hover:bg-gray-100 cursor-pointer'
    }`}
  >
    {icon}
    <span className="font-medium">{text}</span>
  </button>
);

// --- Props Interface (รับฟังก์ชันจาก ChatInterface) ---
interface ChatInputAreaProps {
  onSend: (prompt: string, imageUrls?: string[], files?: File[], selectedTool?: string | null) => void; 
  isLoading: boolean;    
  // ส่ง prompt + ไฟล์ (ถ้า parent รองรับ) ใช้แทน onSend เมื่อมีไฟล์แนบ
  onSendWithFiles?: (prompt: string, files: File[], imageUrls?: string[]) => void;
  // เรียกเมื่อผู้ใช้กดหยุด
  onStop?: () => void;
}

// --- ข้อมูล Prompt สำหรับเมนูเครื่องมือ ---
const TOOL_PROMPTS = {
  search: "ช่วยค้นหาข้อมูลเกี่ยวกับข้อมูลนี้",
  compare: "ช่วยเปรียบเทียบข้อมูลนี้",
  consult: "ต้องการคำปรึกษาเกี่ยวกับข้อมูลนี้",
  summary: "ช่วยสรุปข้อมูลนี้",
  chart: "ช่วยสร้างกราฟจากข้อมูลนี้",
  plan: "ช่วยวางแผนจากข้อมูลนี้",
  database: "ช่วยค้นหาข้อมูลจากฐานข้อมูลนี้"
};

export const ChatInputArea = ({ onSend, isLoading, onSendWithFiles, onStop }: ChatInputAreaProps) => {
  const [prompt, setPrompt] = useState("");
  const [openPopup, setOpenPopup] = useState<string | null>(null); 
  const [files, setFiles] = useState<File[]>([]); // เก็บไฟล์ที่แนบ
  const [previews, setPreviews] = useState<string[]>([]); // URL สำหรับแสดงรูป
  const [selectedTool, setSelectedTool] = useState<string | null>(null); // เก็บเครื่องมือที่เลือก
  const [isRecording, setIsRecording] = useState(false); // สถานะการบันทึกเสียง
  const lastSentPromptRef = useRef<string>("");
  
  // MinIO Database Modal States
  const [showDatabaseModal, setShowDatabaseModal] = useState(false);
  const [minioFiles, setMinioFiles] = useState<any[]>([]);
  const [currentPath, setCurrentPath] = useState('/');
  const [loadingFiles, setLoadingFiles] = useState(false);
  // เก็บ key ของไฟล์ที่เลือกในรูปแบบ "<path>||<name>" เพื่อรองรับการค้นหาข้ามโฟลเดอร์
  const [selectedMinioFiles, setSelectedMinioFiles] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  const buildMinioKey = (file: { path?: string; name?: string }) => `${file.path || '/'}||${file.name || ''}`;
  const parseMinioKey = (key: string) => {
    const idx = key.indexOf('||');
    if (idx === -1) return { path: '/', name: key };
    return { path: key.slice(0, idx) || '/', name: key.slice(idx + 2) };
  };

  // --- Ref สำหรับ input file (ซ่อน) ---
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

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
    let finalPrompt = prompt.trim();
    const hasFiles = files.length > 0;
    const userTypedOwnPrompt = finalPrompt !== "";

    // กรณีที่ 1: มีเครื่องมือ + ไม่มี prompt ที่พิมพ์เอง
    if (selectedTool && !userTypedOwnPrompt) {
      const toolMap: { [key: string]: string } = {
        'ค้นหาข้อมูล': TOOL_PROMPTS.search,
        'เปรียบเทียบข้อมูล': TOOL_PROMPTS.compare,
        'ขอคำปรึกษา': TOOL_PROMPTS.consult,
        'สรุปรายงาน': TOOL_PROMPTS.summary,
        'สร้างกราฟ': TOOL_PROMPTS.chart,
        'เขียนแผนงาน': TOOL_PROMPTS.plan,
        'ฐานข้อมูล': TOOL_PROMPTS.database
      };
      finalPrompt = toolMap[selectedTool] || "";
      if (hasFiles && finalPrompt) {
        finalPrompt += " จากไฟล์/รูปภาพที่แนบมา";
      }
    }
    // กรณีที่ 2: ผู้ใช้พิมพ์เอง → ใช้ prompt ที่พิมพ์ตามเดิม (ไม่ต่อท้าย)
    // กรณีที่ 3: ไม่มีเครื่องมือ + ไม่มี prompt → ไม่ส่ง

    if (finalPrompt === "" || isLoading) return;

    // ส่ง URL ของรูปภาพ (previews) ไปด้วย
    const imageUrls = previews.filter(url => url !== '');

    // ส่งทั้งรูปภาพและไฟล์ไปด้วย พร้อม selectedTool
    lastSentPromptRef.current = finalPrompt;
    onSend(finalPrompt, imageUrls, files, selectedTool);
    // เคลียร์เฉพาะ prompt เท่านั้น ไม่ลบเครื่องมือ/ไฟล์
    setPrompt("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (imageInputRef.current) imageInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  // --- ฟังก์ชันหยุดการตอบ และกู้คืนข้อความล่าสุด ---
  const handleStopClick = () => {
    if (onStop) onStop();
    // รอสักครู่เพื่อให้แชทล้างข้อความ แล้วกู้คืนข้อความล่าสุดกลับมา
    setTimeout(() => {
      setPrompt(lastSentPromptRef.current || "");
    }, 300);
  };

  // --- เลือกไฟล์ ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    if (selected.length === 0) return;
    // รวมไฟล์ใหม่กับไฟล์เดิม (กันซ้ำด้วย name + size)
    setFiles(prev => {
      const map = new Map<string, File>();
      [...prev, ...selected].forEach(f => map.set(`${f.name}-${f.size}`, f));
      return Array.from(map.values());
    });
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  // --- helper ตรวจว่าเป็นรูป png/jpeg ---
  const isPreviewImage = (file: File) => {
    const byExt = /\.(png|jpe?g)$/i.test(file.name);
    const byType = file.type === 'image/png' || file.type === 'image/jpeg';
    return byExt || byType;
  };

  // --- สร้าง/ล้าง object URLs สำหรับภาพตัวอย่าง ---
  useEffect(() => {
    const urls = files.map(f => (isPreviewImage(f) ? URL.createObjectURL(f) : ''));
    setPreviews(urls);
    return () => {
      urls.forEach(u => {
        if (u) URL.revokeObjectURL(u);
      });
    };
  }, [files]);

  // --- ฟังก์ชันกด Enter ---
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { 
      e.preventDefault(); 
      handleSubmit();
    }
  };

  // --- ฟังก์ชันบันทึกเสียง ---
  const toggleRecording = () => {
    setIsRecording(!isRecording);
    // ที่นี่ควรมี logic สำหรับการบันทึกเสียงจริง
  };

  // --- ฟังก์ชันดึงไฟล์จาก MinIO ---
  const loadMinioFiles = async (path: string = '/', recursive: boolean = false) => {
    setLoadingFiles(true);
    try {
      const response = await fetch(`/api/files?path=${encodeURIComponent(path)}&recursive=${recursive ? 'true' : 'false'}`);
      if (response.ok) {
        const data = await response.json();
        setMinioFiles(data.files || []);
        setCurrentPath(path);
      }
    } catch (error) {
      console.error('Error loading MinIO files:', error);
    } finally {
      setLoadingFiles(false);
    }
  };

  // โหลดไฟล์เมื่อเปิด modal
  useEffect(() => {
    if (!showDatabaseModal) return;
    // ถ้ามีคำค้นหา ให้ดึงข้อมูลแบบ recursive จาก root เพื่อค้นหาทั้งนอก/ในโฟลเดอร์
    if (searchQuery.trim() !== '') {
      loadMinioFiles('/', true);
    } else {
      loadMinioFiles(currentPath, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showDatabaseModal, searchQuery]);

  // --- Toggle เลือกไฟล์จาก MinIO ---
  const toggleMinioFileSelection = (key: string) => {
    setSelectedMinioFiles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  // --- ยืนยันเลือกไฟล์จาก MinIO ---
  const handleConfirmMinioFiles = async () => {
    if (selectedMinioFiles.size === 0) return;
    
    // ดาวน์โหลดไฟล์ที่เลือกจาก MinIO
    const downloadPromises = Array.from(selectedMinioFiles).map(async (key) => {
      const { path, name } = parseMinioKey(key);
      try {
        const response = await fetch(`/api/files/download?path=${encodeURIComponent(path)}&name=${encodeURIComponent(name)}`);
        if (response.ok) {
          const blob = await response.blob();
          const file = new File([blob], name, { type: blob.type });
          return file;
        }
      } catch (error) {
        console.error(`Error downloading ${name}:`, error);
      }
      return null;
    });

    const downloadedFiles = (await Promise.all(downloadPromises)).filter(f => f !== null) as File[];
    
    // เพิ่มไฟล์ที่ดาวน์โหลดเข้ากับไฟล์ที่มีอยู่
    setFiles(prev => {
      const map = new Map<string, File>();
      [...prev, ...downloadedFiles].forEach(f => map.set(`${f.name}-${f.size}`, f));
      return Array.from(map.values());
    });

    // ปิด modal (คงสถานะไฟล์ที่เลือกไว้ เพื่อให้กลับมาเปิดดูแล้วยังเห็นเหมือนเดิม)
    setShowDatabaseModal(false);
  };

  // --- เปิด/ปิดโฟลเดอร์ ---
  const handleOpenFolder = (folderName: string, basePath: string = currentPath) => {
    const newPath = `${basePath}${folderName}/`;
    loadMinioFiles(newPath, false);
  };

  const handleGoBack = () => {
    if (currentPath === '/') return;
    const pathParts = currentPath.split('/').filter(Boolean);
    pathParts.pop();
    const newPath = '/' + pathParts.join('/') + (pathParts.length > 0 ? '/' : '');
    loadMinioFiles(newPath, false);
  };

  // --- กรองไฟล์ตามการค้นหา ---
  const filteredMinioFiles = minioFiles.filter(file => {
    const name = (file?.name || '').toString().toLowerCase();
    const q = searchQuery.toLowerCase();
    return name.includes(q);
  });

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
        {/* <button 
          type="button"
          onClick={toggleRecording}
          className={`p-2 rounded-lg transition-colors ${
            isRecording 
              ? 'bg-red-500 text-white' 
              : 'text-gray-500 hover:bg-gray-200'
          }`}
          title={isRecording ? "หยุดบันทึก" : "บันทึกเสียง"}
        >
          <IoMicOutline size={20} />
        </button> */}
        {isLoading ? (
          <button
            type="button"
            onClick={handleStopClick}
            className="p-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
            title="หยุด"
          >
            <IoCloseOutline size={20} />
          </button>
        ) : (
          <button 
            type="button"
            onClick={handleSubmit}
            disabled={isLoading || (prompt.trim() === "" && !selectedTool && files.length === 0)}
            className={`p-2 rounded-lg text-white ${
              (isLoading || (prompt.trim() === "" && !selectedTool && files.length === 0))
                ? 'bg-gray-400' 
                : 'bg-[#eb6f45f1] hover:bg-opacity-90'
            } transition-colors`}
          >
            <IoPaperPlane size={20} />
          </button>
        )}
      </div>

      {/* แสดงไฟล์ที่แนบ */}
      {files.length > 0 && (
        <div className='mt-2 flex flex-wrap gap-2'>
          {files.map((f, i) => (
            isPreviewImage(f) && previews[i] ? (
              <div key={`img-${i}`} className='relative group'>
                {/* รูปตัวอย่างขนาดเล็ก */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previews[i]}
                  alt={f.name}
                  className='w-16 h-16 rounded-lg object-cover border border-gray-200 shadow-sm'
                />
                <button
                  type='button'
                  onClick={() => removeFile(i)}
                  className='absolute -top-2 -right-2 bg-black/70 text-white rounded-full p-1 hover:bg-black transition-colors'
                  title='ลบไฟล์'
                >
                  <IoCloseOutline size={12} />
                </button>
              </div>
            ) : (
              <div key={`file-${i}`} className='flex items-center space-x-1 bg-gray-100 border border-gray-200 px-2 py-1 rounded-lg text-xs text-gray-700'>
                <span className='max-w-40 truncate' title={f.name}>{f.name}</span>
                <button
                  type='button'
                  onClick={() => removeFile(i)}
                  className='text-gray-500 hover:text-red-500 transition-colors'
                  title='ลบไฟล์'
                >
                  <IoCloseOutline size={14} />
                </button>
              </div>
            )
          ))}
        </div>
      )}

      {/* input file ซ่อน */}
      <input
        ref={fileInputRef}
        type='file'
        multiple
        className='hidden'
        onChange={handleFileChange}
      />
      
      <input
        ref={imageInputRef}
        type='file'
        multiple
        accept='image/*'
        className='hidden'
        onChange={handleFileChange}
      />
      
      <input
        ref={cameraInputRef}
        type='file'
        multiple
        accept='image/*'
        capture='environment'
        className='hidden'
        onChange={handleFileChange}
      />
      
      {/* แสดง Tool ที่เลือกเป็น Chip */}
      {selectedTool && (
        <div className='mt-3 flex items-center'>
          <div className='flex items-center space-x-2 bg-blue-50 border border-blue-200 text-blue-600 px-3 py-1.5 rounded-full text-sm shadow-sm'>
            <IoBulbOutline size={16} className='text-blue-500' />
            <span className='font-medium'>{selectedTool}</span>
            <button
              type='button'
              onClick={() => {
                setSelectedTool(null);
              }}
              className='text-blue-500 hover:text-blue-700 transition-colors ml-1'
              title='ลบ'
            >
              <IoCloseOutline size={16} />
            </button>
          </div>
        </div>
      )}

      {/* แถบเครื่องมือด้านล่าง (Popups) */}
      <div className='flex justify-between items-center mt-4 text-gray-500 text-sm'>
        <div className='flex items-center space-x-2'>
          {/* 1. ปุ่ม Add และ Popup */}
          <div className="relative">
            {openPopup === 'add' && (
              <div ref={addPopupRef} className="absolute bottom-full left-0 mb-2 w-60 bg-white rounded-xl shadow-lg border border-gray-100 p-2 z-10">
                <PopupMenuItem 
                  icon={<IoAttachOutline size={22} className="text-gray-600" />} 
                  text="เพิ่มไฟล์"
                  onClick={() => { fileInputRef.current?.click(); setOpenPopup(null); }}
                />
                <PopupMenuItem 
                  icon={<IoImageOutline size={22} className="text-gray-600" />} 
                  text="เพิ่มรูปภาพ"
                  onClick={() => { imageInputRef.current?.click(); setOpenPopup(null); }}
                />
                <PopupMenuItem 
                  icon={<IoCameraOutline size={22} className="text-gray-600" />} 
                  text="ถ่ายรูป"
                  onClick={() => { cameraInputRef.current?.click(); setOpenPopup(null); }}
                />
                {/* <PopupMenuItem 
                  icon={<IoMicOutline size={22} className="text-gray-600" />} 
                  text="บันทึกเสียง"
                  onClick={() => { toggleRecording(); setOpenPopup(null); }}
                />
                <PopupMenuItem 
                  icon={<IoDocumentTextOutline size={22} className="text-gray-600" />} 
                  text="สร้างเอกสารใหม่"
                  onClick={() => { setOpenPopup(null); }}
                /> */}
                <PopupMenuItem 
                  icon={<IoSparklesOutline size={22} className="text-gray-600" />} 
                  text="ใช้เครื่องมือ AI"
                  onClick={() => { 
                    setOpenPopup(null); 
                    togglePopup('tools');
                  }}
                />
              </div>
            )}
            <button 
              ref={addBtnRef}
              onClick={() => togglePopup('add')} 
              className={`flex items-center cursor-pointer space-x-2 bg-gray-100 rounded-full px-4 py-2 hover:bg-gray-200 transition-colors ${openPopup === 'add' ? 'bg-gray-200' : ''}`}
            >
              <IoAdd size={20} className='text-[#eb6f45f1]' />
              <span className='text-gray-700 font-medium text-sm'>เพิ่ม</span>
            </button>
          </div>
          
          {/* 2. ปุ่ม เครื่องมือ และ Popup */}
          <div className="relative">
            {openPopup === 'tools' && (
              <div ref={toolsPopupRef} className="absolute bottom-full left-0 mb-2 w-60 bg-white rounded-xl shadow-lg border border-gray-100 p-2 z-10">
                {/* <PopupMenuItem 
                  icon={<IoSearchOutline size={22} className="text-gray-600" />} 
                  text="ค้นหาข้อมูล"
                  onClick={() => { 
                    setOpenPopup(null); 
                    setSelectedTool('ค้นหาข้อมูล');
                  }}
                /> */}
                <PopupMenuItem 
                  icon={<IoGitCompareOutline size={22} className="text-gray-600" />} 
                  text="เปรียบเทียบข้อมูล"
                  onClick={() => { 
                    setOpenPopup(null); 
                    setSelectedTool('เปรียบเทียบข้อมูล');
                  }}
                />
                <PopupMenuItem 
                  icon={<IoHelpCircleOutline size={22} className="text-gray-600" />} 
                  text="ขอคำปรึกษา"
                  onClick={() => { 
                    setOpenPopup(null); 
                    setSelectedTool('ขอคำปรึกษา');
                  }}
                />
                <PopupMenuItem 
                  icon={<IoDocumentTextOutline size={22} className="text-gray-600" />} 
                  text="สรุปรายงาน"
                  onClick={() => { 
                    setOpenPopup(null); 
                    setSelectedTool('สรุปรายงาน');
                  }}
                />
                <PopupMenuItem 
                  icon={<IoStatsChartOutline size={22} className="text-gray-600" />} 
                  text="สร้างกราฟ"
                  onClick={() => { 
                    setOpenPopup(null); 
                    setSelectedTool('สร้างกราฟ');
                  }}
                />
                <PopupMenuItem 
                  icon={<IoCreateOutline size={22} className="text-gray-600" />} 
                  text="เขียนแผนงาน"
                  onClick={() => { 
                    setOpenPopup(null); 
                    setSelectedTool('เขียนแผนงาน');
                  }}
                />
                <PopupMenuItem 
                  icon={<CiDatabase size={22} className="text-gray-600" />} 
                  text="ฐานข้อมูล"
                  onClick={() => { 
                    setOpenPopup(null); 
                    setSelectedTool('ฐานข้อมูล');
                    setShowDatabaseModal(true);
                  }}
                />
              </div>
            )}
            <button ref={toolsBtnRef} onClick={() => togglePopup('tools')} className={`flex items-center cursor-pointer space-x-2 bg-gray-100 rounded-full px-4 py-2 hover:bg-gray-200 transition-colors ${openPopup === 'tools' ? 'bg-gray-200' : ''}`}>
              <IoListOutline size={20} className='text-[#eb6f45f1]' />
              <span className='text-gray-700 font-medium text-sm'>เครื่องมือ</span>
            </button>
          </div>
        </div>
        <div className='flex items-center space-x-2'>
        </div>
      </div>

      {/* Modal สำหรับเลือกไฟล์จาก MinIO Database */}
      {showDatabaseModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-3xl max-h-[80vh] overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="bg-gradient-to-r from-orange-500 to-pink-500 px-6 py-4 flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <CiDatabase size={28} className="text-white" />
                <div>
                  <h2 className="text-xl font-bold text-white">แหล่งข้อมูล</h2>
                  <p className="text-orange-50 text-sm">เลือกไฟล์จากฐานข้อมูล MinIO</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowDatabaseModal(false);
                }}
                className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
              >
                <IoCloseOutline size={24} />
              </button>
            </div>

            {/* Search Bar */}
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center space-x-2">
                {currentPath !== '/' && (
                  <button
                    onClick={handleGoBack}
                    className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg font-medium transition-colors"
                  >
                    ← ย้อนกลับ
                  </button>
                )}
                <div className="flex-1 relative">
                  <IoSearchOutline className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    placeholder="ค้นหาแหล่งข้อมูลในโฟลเดอร์นี้..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none"
                  />
                </div>
                <span className="text-sm text-gray-600 bg-gray-100 px-3 py-2 rounded-lg">
                  📁 {currentPath === '/' ? 'หน้าแรก' : currentPath}
                </span>
              </div>
              {selectedMinioFiles.size > 0 && (
                <div className="mt-2 text-sm text-orange-600 bg-orange-50 px-3 py-1 rounded-lg inline-block">
                  เลือกแล้ว {selectedMinioFiles.size} ไฟล์
                </div>
              )}
            </div>

            {/* File List */}
            <div className="overflow-y-auto" style={{ maxHeight: 'calc(80vh - 280px)' }}>
              {loadingFiles ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
                </div>
              ) : filteredMinioFiles.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                  <IoDocumentTextOutline size={48} className="mb-3" />
                  <p>{searchQuery ? 'ไม่พบไฟล์ที่ค้นหา' : 'ไม่มีไฟล์ในโฟลเดอร์นี้'}</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {filteredMinioFiles.map((file, index) => (
                    <div
                      key={`${file.id}-${index}`}
                      className={`flex items-center justify-between px-6 py-3 hover:bg-gray-50 transition-colors cursor-pointer ${
                        file.type === 'file' && selectedMinioFiles.has(buildMinioKey(file)) ? 'bg-orange-50' : ''
                      }`}
                      onClick={() => {
                        if (file.type === 'folder') {
                          handleOpenFolder(file.name, file.path || currentPath);
                        } else {
                          toggleMinioFileSelection(buildMinioKey(file));
                        }
                      }}
                    >
                      <div className="flex items-center space-x-3 flex-1">
                        {file.type === 'folder' ? (
                          <IoFolderOutline size={24} className="text-yellow-500" />
                        ) : (
                          <IoDocumentTextOutline size={24} className="text-gray-400" />
                        )}
                        <div className="flex-1">
                          <p className="font-medium text-gray-800">{file.name}</p>
                          <p className="text-xs text-gray-500">
                            {file.size ? `${(file.size / 1024).toFixed(2)} KB` : ''}
                            {file.modifiedDate && ` • ${new Date(file.modifiedDate).toLocaleDateString('th-TH')}`}
                            {searchQuery.trim() !== '' && file.path && ` • ${file.path}`}
                          </p>
                        </div>
                      </div>
                      {file.type === 'file' && (
                        <div className="flex items-center space-x-2">
                          {selectedMinioFiles.has(buildMinioKey(file)) ? (
                            <div className="w-5 h-5 bg-orange-500 rounded flex items-center justify-center">
                              <span className="text-white text-xs">✓</span>
                            </div>
                          ) : (
                            <div className="w-5 h-5 border-2 border-gray-300 rounded"></div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDatabaseModal(false);
                }}
                className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleConfirmMinioFiles}
                disabled={selectedMinioFiles.size === 0}
                className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                  selectedMinioFiles.size === 0
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-orange-500 hover:bg-orange-600 text-white'
                }`}
              >
                ยืนยัน ({selectedMinioFiles.size})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}