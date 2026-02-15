'use client';

import { useState, useEffect } from 'react';
import { IoFolderOutline, IoDocumentOutline, IoEllipsisVertical, IoCreateOutline, IoTrashOutline, IoAddOutline, IoDownloadOutline, IoEyeOutline, IoCheckboxOutline, IoSquareOutline, IoReloadOutline, IoCheckmarkCircle, IoCloseCircleOutline } from 'react-icons/io5';

interface FileItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
  size?: number;
  modifiedDate: Date;
  path: string;
}

interface FileManagerProps {
  refreshTrigger?: number;
  onFolderSelect?: (folderPath: string) => void;
  onUploadComplete?: (data: { fileName: string; apaData: any }) => void;
  lastUploadData?: { fileName: string; apaData: any } | null;
}

export function FileManager({ refreshTrigger, onFolderSelect, onUploadComplete, lastUploadData }: FileManagerProps) {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [currentPath, setCurrentPath] = useState('/');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingFile, setEditingFile] = useState<FileItem | null>(null);
  const [newName, setNewName] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [viewingFile, setViewingFile] = useState<FileItem | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [isApaModalOpen, setIsApaModalOpen] = useState(false);
  const [apaData, setApaData] = useState<any | null>(null);
  const [apaLoading, setApaLoading] = useState(false);
  const [apaFile, setApaFile] = useState<FileItem | null>(null);
  const [bulkApaLoading, setBulkApaLoading] = useState(false);
  const [apaExistsMap, setApaExistsMap] = useState<Record<string, boolean>>({});

  const getFileKey = (filePath: string, fileName: string) => `${filePath}${fileName}`;

  const hasMeaningfulApa = (apa: any) => {
    if (!apa || typeof apa !== 'object') return false;

    const abstract = typeof apa.abstract === 'string' ? apa.abstract.trim() : '';
    const thaiKeywords = Array.isArray(apa.keywords?.thai) ? apa.keywords.thai : [];
    const engKeywords = Array.isArray(apa.keywords?.english) ? apa.keywords.english : [];
    const references = Array.isArray(apa.references) ? apa.references : [];
    const researchers = Array.isArray(apa.researchers) ? apa.researchers : [];
    const projectInfo = apa.projectInfo || {};

    const hasProjectInfo = [
      projectInfo.titleThai,
      projectInfo.titleEnglish,
      projectInfo.proposalCode,
      projectInfo.budgetYear,
      projectInfo.university,
      projectInfo.projectCode,
      projectInfo.totalBudget,
      projectInfo.otherInfo,
    ].some((value) => {
      if (value === null || value === undefined) return false;
      if (typeof value === 'string') return value.trim().length > 0;
      return true;
    });

    return (
      abstract.length > 0 ||
      thaiKeywords.length > 0 ||
      engKeywords.length > 0 ||
      references.length > 0 ||
      researchers.length > 0 ||
      hasProjectInfo
    );
  };

  // เมื่อได้ APA data จาก FileUploader ให้แสดง modal อัตโนมัติ (Auto)
  useEffect(() => {
    if (lastUploadData && lastUploadData.fileName) {
      console.log(`[FileManager] Auto-displaying APA for newly uploaded file: ${lastUploadData.fileName}`);
      setApaData(lastUploadData.apaData || null);
      setApaLoading(false);
      
      // สร้าง dummy FileItem เพื่อให้ปุ่ม Regenerate ทำงานได้ (ถ้ามีข้อมูลพอ)
      setApaFile({
        id: 'newly-uploaded',
        name: lastUploadData.fileName,
        type: 'file',
        modifiedDate: new Date(),
        path: currentPath
      } as FileItem);
      
      setIsApaModalOpen(true);
    }
  }, [lastUploadData, currentPath]);

  // โหลดไฟล์จาก API
  useEffect(() => {
    loadFiles();
  }, [currentPath, refreshTrigger]);

  const loadFiles = async () => {
    try {
      const response = await fetch(`/api/files?path=${encodeURIComponent(currentPath)}`);
      if (response.ok) {
        const data = await response.json();
        const loadedFiles = data.files || [];
        setFiles(loadedFiles);

        // โหลดสถานะ APA ของไฟล์ในโฟลเดอร์ปัจจุบัน เพื่อเปลี่ยนไอคอนให้เห็นทันที
        const apaRes = await fetch(`/api/files/apa?path=${encodeURIComponent(currentPath)}`);
        if (apaRes.ok) {
          const apaData = await apaRes.json();
          const nextMap: Record<string, boolean> = {};
          const refs = Array.isArray(apaData?.references) ? apaData.references : [];
          refs.forEach((item: any) => {
            const path = item?.meta?.file_path;
            const name = item?.meta?.file_name;
            if (typeof path === 'string' && typeof name === 'string') {
              nextMap[getFileKey(path, name)] = hasMeaningfulApa(item?.apa);
            }
          });
          setApaExistsMap(nextMap);
        } else {
          setApaExistsMap({});
        }
      }
    } catch (error) {
      console.error('Error loading files:', error);
      setApaExistsMap({});
    }
  };

  // สร้างโฟลเดอร์ใหม่
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;

    try {
      const response = await fetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: currentPath,
          name: newFolderName,
        }),
      });

      if (response.ok) {
        setNewFolderName('');
        setShowNewFolderInput(false);
        loadFiles();
      }
    } catch (error) {
      console.error('Error creating folder:', error);
      alert('ไม่สามารถสร้างโฟลเดอร์ได้');
    }
  };

  // แก้ไขชื่อไฟล์/โฟลเดอร์
  const handleEdit = (file: FileItem) => {
    setEditingFile(file);
    setNewName(file.name);
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingFile || !newName.trim()) return;

    try {
      const response = await fetch('/api/files', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: currentPath,
          oldName: editingFile.name,
          newName: newName,
        }),
      });

      if (response.ok) {
        setIsEditModalOpen(false);
        setEditingFile(null);
        setNewName('');
        loadFiles();
      }
    } catch (error) {
      console.error('Error renaming file:', error);
      alert('ไม่สามารถเปลี่ยนชื่อได้');
    }
  };

  // ลบไฟล์/โฟลเดอร์
  const handleDelete = async (file: FileItem) => {
    if (!confirm('คุณแน่ใจหรือไม่ที่จะลบรายการนี้?')) return;

    try {
      if (file.type === 'folder') {
        const response = await fetch(`/api/folders?path=${encodeURIComponent(currentPath)}&name=${encodeURIComponent(file.name)}`, {
          method: 'DELETE',
        });
        
        if (response.ok) {
          loadFiles();
        }
      } else {
        const response = await fetch(`/api/files?path=${encodeURIComponent(currentPath)}&name=${encodeURIComponent(file.name)}`, {
          method: 'DELETE',
        });
        
        if (response.ok) {
          loadFiles();
        }
      }
    } catch (error) {
      console.error('Error deleting:', error);
      alert('ไม่สามารถลบได้');
    }
  };

  // ลบหลายไฟล์พร้อมกัน
  const handleDeleteSelected = async () => {
    if (selectedFiles.size === 0) return;
    if (!confirm(`คุณแน่ใจหรือไม่ที่จะลบ ${selectedFiles.size} รายการ?`)) return;

    try {
      const deletePromises = Array.from(selectedFiles).map(async (fileId) => {
        const file = files.find(f => f.id === fileId);
        if (file) {
          const endpoint = file.type === 'folder' ? '/api/folders' : '/api/files';
          await fetch(`${endpoint}?path=${encodeURIComponent(currentPath)}&name=${encodeURIComponent(file.name)}`, {
            method: 'DELETE',
          });
        }
      });

      await Promise.all(deletePromises);
      setSelectedFiles(new Set());
      loadFiles();
    } catch (error) {
      console.error('Error deleting files:', error);
      alert('ไม่สามารถลบบางไฟล์ได้');
    }
  };

  const handleGenerateApaSelected = async () => {
    const targetFiles = files.filter((file) => selectedFiles.has(file.id) && file.type === 'file');

    if (targetFiles.length === 0) {
      alert('กรุณาเลือกไฟล์ก่อน (โฟลเดอร์ไม่รองรับ)');
      return;
    }

    setBulkApaLoading(true);
    try {
      const response = await fetch('/api/files/apa/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: currentPath,
          files: targetFiles.map((file) => file.name),
          concurrency: 3,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || 'ไม่สามารถสร้าง APA แบบหลายไฟล์ได้');
      }

      const failCount = Number(data?.failCount || 0);
      const successCount = Number(data?.successCount || 0);

      if (failCount > 0) {
        alert(`สร้าง APA สำเร็จ ${successCount} ไฟล์, ไม่สำเร็จ ${failCount} ไฟล์`);
      } else {
        alert(`สร้าง APA สำเร็จ ${successCount} ไฟล์`);
      }

      await loadFiles();
    } catch (error: any) {
      console.error('Error generating APA for selected files:', error);
      alert(error?.message || 'เกิดข้อผิดพลาดในการสร้าง APA หลายไฟล์');
    } finally {
      setBulkApaLoading(false);
    }
  };

  // Toggle checkbox
  const toggleFileSelection = (fileId: string) => {
    const newSelected = new Set(selectedFiles);
    if (newSelected.has(fileId)) {
      newSelected.delete(fileId);
    } else {
      newSelected.add(fileId);
    }
    setSelectedFiles(newSelected);
  };

  // Toggle select all
  const toggleSelectAll = () => {
    if (selectedFiles.size === files.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(files.map(f => f.id)));
    }
  };

  // เปิดดูไฟล์
  const handleViewFile = async (file: FileItem) => {
    setViewingFile(file);
    setIsViewModalOpen(true);
    setFileContent(null);
    
    try {
      // ดึงเนื้อหาไฟล์จาก API
      const response = await fetch(`/api/files/view?path=${encodeURIComponent(currentPath)}&name=${encodeURIComponent(file.name)}`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setFileContent(url);
      } else {
        console.error('Failed to load file content');
      }
    } catch (error) {
      console.error('Error viewing file:', error);
    }
  };

  const getFileExtension = (filename: string) => {
    return filename.split('.').pop()?.toLowerCase() || '';
  };

  const isPDF = (filename: string) => {
    return getFileExtension(filename) === 'pdf';
  };

  const isImage = (filename: string) => {
    const ext = getFileExtension(filename);
    return ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].includes(ext);
  };

  const isVideo = (filename: string) => {
    const ext = getFileExtension(filename);
    return ['mp4', 'webm', 'ogg', 'mov'].includes(ext);
  };

  const isAudio = (filename: string) => {
    const ext = getFileExtension(filename);
    return ['mp3', 'wav', 'ogg', 'm4a'].includes(ext);
  };

  const isDocument = (filename: string) => {
    const ext = getFileExtension(filename);
    return ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv'].includes(ext);
  };

  const getDocumentViewerUrl = (filename: string, content: string) => {
    const ext = getFileExtension(filename);
    
    // สำหรับ Microsoft Office (Word, Excel, PowerPoint)
    if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext)) {
      // ใช้ Google Docs Viewer
      return `https://docs.google.com/viewer?url=${encodeURIComponent(content)}&embedded=true`;
    }
    
    return content;
  };

  // ดาวน์โหลดไฟล์
  const handleDownload = async (file: FileItem) => {
    try {
      const response = await fetch(`/api/files/download?path=${encodeURIComponent(currentPath)}&name=${encodeURIComponent(file.name)}`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const element = document.createElement('a');
        element.href = url;
        element.download = file.name;
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
        URL.revokeObjectURL(url);
      } else {
        alert('ไม่สามารถดาวน์โหลดไฟล์ได้');
      }
    } catch (error) {
      console.error('Error downloading file:', error);
      alert('เกิดข้อผิดพลาดในการดาวน์โหลด');
    }
  };

  // เปิดโฟลเดอร์
  const handleOpenFolder = (folderName: string) => {
    const newPath = `${currentPath}${folderName}/`;
    setCurrentPath(newPath);
    if (onFolderSelect) {
      onFolderSelect(newPath);
    }
  };

  // กลับไปโฟลเดอร์ก่อนหน้า
  const handleGoBack = () => {
    const pathParts = currentPath.split('/').filter(Boolean);
    pathParts.pop();
    const newPath = '/' + pathParts.join('/') + (pathParts.length > 0 ? '/' : '');
    setCurrentPath(newPath);
    if (onFolderSelect) {
      onFolderSelect(newPath);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '-';
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(2)} KB`;
    return `${(kb / 1024).toFixed(2)} MB`;
  };

  const handleShowApa = async (file: FileItem) => {
    setApaLoading(true);
    setApaData(null);
    setApaFile(file);
    setIsApaModalOpen(true);
    try {
      // 1. ลองดึงข้อมูลที่มีอยู่แล้ว
      const response = await fetch(`/api/files/apa?path=${encodeURIComponent(currentPath)}&name=${encodeURIComponent(file.name)}`);
      
      let existingApa = null;
      if (response.ok) {
        const data = await response.json();
        existingApa = data.apa;
      }

      // 2. ถ้าไม่มีข้อมูล หรือเป็น 404 ให้ส่งไป Generate ใหม่
      if (!existingApa || response.status === 404) {
        console.log('[FileManager] No APA data, triggering generation...');
        setApaLoading(true);
        const genResponse = await fetch('/api/files/apa', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            path: currentPath,
            name: file.name
          })
        });

        if (genResponse.ok) {
          const genData = await genResponse.json();
          setApaData(genData.apa || null);
          setApaExistsMap((prev) => ({
            ...prev,
            [getFileKey(currentPath, file.name)]: hasMeaningfulApa(genData?.apa),
          }));
        } else {
          const errorData = await genResponse.json().catch(() => ({}));
          setApaData({ error: `ไม่สามารถเข้าถึงฐานข้อมูล APA ได้: ${errorData.error || genResponse.statusText}` });
        }
      } else {
        setApaData(existingApa);
        setApaExistsMap((prev) => ({
          ...prev,
          [getFileKey(currentPath, file.name)]: hasMeaningfulApa(existingApa),
        }));
      }
    } catch (err) {
      console.error('Error fetching/generating APA:', err);
      setApaData({ error: 'เกิดข้อผิดพลาดในการดึงข้อมูล APA' });
    } finally {
      setApaLoading(false);
    }
  };

  const handleRegenerateApa = async (file: FileItem) => {
    setApaLoading(true);
    setApaData(null);
    try {
      const genResponse = await fetch('/api/files/apa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: currentPath,
          name: file.name
        })
      });

      if (genResponse.ok) {
        const genData = await genResponse.json();
        setApaData(genData.apa || null);
        setApaExistsMap((prev) => ({
          ...prev,
          [getFileKey(currentPath, file.name)]: hasMeaningfulApa(genData?.apa),
        }));
      } else {
        const errorData = await genResponse.json().catch(() => ({}));
        setApaData({ error: `ไม่สามารถสร้างข้อมูล APA ได้: ${errorData.error || genResponse.statusText}` });
      }
    } catch (err) {
      console.error('Error regenerating APA:', err);
      setApaData({ error: 'เกิดข้อผิดพลาดในการสร้างข้อมูล APA ใหม่' });
    } finally {
      setApaLoading(false);
    }
  };

  // เปิด references page ในหน้าเดียวกัน
  const handleOpenReferencesPage = () => {
    window.location.assign('/admin/references');
  };

  const selectedFileCount = files.filter((file) => selectedFiles.has(file.id) && file.type === 'file').length;

  return (
    <div>
      {/* Path และปุ่มสร้างโฟลเดอร์ */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {currentPath !== '/' && (
            <button
              onClick={handleGoBack}
              className="px-3 py-1.5 text-sm bg-white hover:bg-gray-50 text-gray-600 rounded-lg font-medium transition-all border border-gray-200"
            >
              ← ย้อนกลับ
            </button>
          )}
          <span className="text-gray-600 text-sm bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">🗂️ {currentPath === '/' ? 'หน้าแรก' : currentPath}</span>
          {selectedFiles.size > 0 && (
            <span className="text-sm text-orange-600 bg-orange-50 px-3 py-1 rounded-lg font-medium border border-orange-200">({selectedFiles.size} รายการถูกเลือก)</span>
          )}
        </div>
        <div className="flex gap-2">
          {selectedFiles.size > 0 && (
            <button
              onClick={handleGenerateApaSelected}
              disabled={bulkApaLoading || selectedFileCount === 0}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-medium shadow-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              title="สร้าง APA ให้ไฟล์ที่เลือกหลายรายการพร้อมกัน"
            >
              <IoReloadOutline size={16} />
              {bulkApaLoading ? 'กำลังสร้าง APA...' : `สร้าง APA ที่เลือก (${selectedFileCount})`}
            </button>
          )}
          {selectedFiles.size > 0 && (
            <button
              onClick={handleDeleteSelected}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium shadow-sm transition-all"
            >
              <IoTrashOutline size={16} />
              ลบที่เลือก
            </button>
          )}
          <button
            onClick={handleOpenReferencesPage}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium shadow-sm transition-all"
            title="ดูข้อมูล APA และอ้างอิงของ PDF ทั้งหมด"
          >
            📚
            อ้างอิง
          </button>
          <button
            onClick={() => setShowNewFolderInput(true)}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium shadow-sm transition-all"
          >
            <IoAddOutline size={16} />
            สร้างโฟลเดอร์
          </button>
        </div>
      </div>

      {/* Input สร้างโฟลเดอร์ใหม่ */}
      {showNewFolderInput && (
        <div className="mb-6 flex gap-2 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <input
            type="text"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="ชื่อโฟลเดอร์ใหม่"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
            onKeyPress={(e) => e.key === 'Enter' && handleCreateFolder()}
          />
          <button
            onClick={handleCreateFolder}
            className="px-6 py-2 bg-orange-400 hover:bg-orange-500 text-white rounded-lg font-medium shadow-sm"
          >
            สร้าง
          </button>
          <button
            onClick={() => {
              setShowNewFolderInput(false);
              setNewFolderName('');
            }}
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-full hover:bg-gray-300 font-medium"
          >
            ยกเลิก
          </button>
        </div>
      )}

      {/* รายการไฟล์ */}
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-3 text-center">
                <button onClick={toggleSelectAll} className="p-1">
                  {selectedFiles.size === files.length && files.length > 0 ? (
                    <IoCheckboxOutline size={20} className="text-orange-500" />
                  ) : (
                    <IoSquareOutline size={20} className="text-gray-400" />
                  )}
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ชื่อ</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ขนาด</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">แก้ไขล่าสุด</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">จัดการ</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-orange-50">
            {files.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                      <IoDocumentOutline className="text-gray-400" size={32} />
                    </div>
                    <p className="text-gray-500">ไม่มีไฟล์ในโฟลเดอร์นี้</p>
                  </div>
                </td>
              </tr>
            ) : (
              files.map((file) => (
                <tr key={file.id} className="hover:bg-gradient-to-r hover:from-orange-50 hover:to-pink-50 transition-colors">
                  <td className="px-3 py-4 text-center">
                    <button onClick={() => toggleFileSelection(file.id)} className="p-1">
                      {selectedFiles.has(file.id) ? (
                        <IoCheckboxOutline size={20} className="text-orange-500" />
                      ) : (
                        <IoSquareOutline size={20} className="text-gray-400 hover:text-orange-400" />
                      )}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {file.type === 'folder' ? (
                        <span className="text-yellow-500 text-xl">📁</span>
                      ) : (
                        <IoDocumentOutline className="text-gray-400" size={22} />
                      )}
                      <button
                        onClick={() => file.type === 'folder' && handleOpenFolder(file.name)}
                        className={`text-sm font-medium ${
                          file.type === 'folder' ? 'text-black-900 hover:text-orange-700 hover:underline' : 'text-gray-700'
                        }`}
                      >
                        {file.name}
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatFileSize(file.size)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(file.modifiedDate).toLocaleString('th-TH')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex gap-2">
                      {file.type === 'file' && (
                        <>
                          <button
                            onClick={() => handleViewFile(file)}
                            className="p-2 text-purple-600 hover:bg-purple-50 hover:text-purple-700 rounded-lg transition-colors font-medium"
                            title="ดูไฟล์"
                          >
                            <IoEyeOutline size={18} />
                          </button>
                          <button
                            onClick={() => handleDownload(file)}
                            className="p-2 text-green-600 hover:bg-green-50 hover:text-green-700 rounded-lg transition-colors font-medium"
                            title="ดาวน์โหลด"
                          >
                            <IoDownloadOutline size={18} />
                          </button>
                          <button
                            onClick={() => handleShowApa(file)}
                            className="p-2 text-blue-600 hover:bg-blue-50 hover:text-blue-700 rounded-lg transition-colors font-medium"
                            title={apaExistsMap[getFileKey(file.path, file.name)] ? 'มี APA แล้ว (คลิกเพื่อดู)' : 'ยังไม่มี APA (คลิกเพื่อสร้าง/ดู)'}
                          >
                            {apaExistsMap[getFileKey(file.path, file.name)] ? (
                              <IoCheckmarkCircle size={18} className="text-emerald-600" />
                            ) : (
                              <IoCloseCircleOutline size={18} className="text-rose-500" />
                            )}
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleEdit(file)}
                        className="p-2 text-orange-500 hover:bg-orange-50 rounded-lg transition-colors"
                        title="แก้ไข"
                      >
                        <IoCreateOutline size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(file)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="ลบ"
                      >
                        <IoTrashOutline size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal แก้ไขชื่อ */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 shadow-xl border border-gray-200">
            <h3 className="text-lg font-medium mb-4 text-gray-700">✏️ แก้ไขชื่อ</h3>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg mb-4 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
              onKeyPress={(e) => e.key === 'Enter' && handleSaveEdit()}
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingFile(null);
                  setNewName('');
                }}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-full hover:bg-gray-300 font-medium"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium shadow-sm"
              >
                บันทึก
              </button>
            </div>
          </div>
        </div>
      )}

      

      {/* Modal ดูไฟล์ */}
      {isViewModalOpen && viewingFile && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-7xl w-full max-h-[95vh] flex flex-col shadow-xl border border-gray-200">
            <div className="bg-white px-6 py-4 flex justify-between items-center border-b border-gray-200 flex-shrink-0">
              <h3 className="text-lg font-medium flex items-center gap-2 text-gray-700">
                <IoDocumentOutline size={24} />
                {viewingFile.name}
                
                
              </h3>
              <button
                onClick={() => {
                  setIsViewModalOpen(false);
                  setViewingFile(null);
                  setFileContent(null);
                }}
                className="text-gray-400 hover:text-gray-600 p-2 rounded-lg transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="flex-1 overflow-auto p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <p className="text-xs text-gray-500 font-medium mb-1">📄 ชื่อไฟล์</p>
                  <p className="text-sm text-gray-800 font-medium truncate">{viewingFile.name}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <p className="text-xs text-gray-500 font-medium mb-1">📊 ขนาด</p>
                  <p className="text-sm text-gray-700 font-medium">{formatFileSize(viewingFile.size)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <p className="text-xs text-gray-500 font-medium mb-1">📅 วันที่แก้ไข</p>
                  <p className="text-sm text-gray-700 font-medium">{new Date(viewingFile.modifiedDate).toLocaleDateString('th-TH')}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <p className="text-xs text-gray-500 font-medium mb-1">🗂️ ตำแหน่ง</p>
                  <p className="text-sm text-gray-800 font-medium truncate">{viewingFile.path === '/' ? 'หน้าแรก' : viewingFile.path}</p>
                </div>
              </div>

              {/* แสดงเนื้อหาไฟล์ */}
              <div className="border-2 border-orange-100 rounded-2xl bg-gray-50 overflow-hidden">
                {fileContent ? (
                <>
                  {isPDF(viewingFile.name) ? (
                    // แสดง PDF
                    <div className="w-full h-[70vh] bg-white">
                      <iframe
                        src={fileContent}
                        className="w-full h-full"
                        title={viewingFile.name}
                      />
                    </div>
                    
                  ) : isImage(viewingFile.name) ? (
                    // แสดงรูปภาพ
                    <div className="p-6 flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 min-h-[60vh]">
                      <img 
                        src={fileContent} 
                        alt={viewingFile.name}
                        className="max-w-full max-h-[65vh] h-auto object-contain rounded-xl shadow-lg"
                      />
                    </div>
                  ) : isVideo(viewingFile.name) ? (
                    // แสดงวิดีโอ
                    <div className="p-6 bg-black flex items-center justify-center min-h-[60vh]">
                      <video 
                        src={fileContent} 
                        controls 
                        className="max-w-full max-h-[65vh] rounded-lg shadow-2xl"
                      >
                        เบราว์เซอร์ของคุณไม่รองรับการเล่นวิดีโอ
                      </video>
                    </div>
                  ) : isAudio(viewingFile.name) ? (
                    // แสดงเสียง
                    <div className="p-12 flex flex-col items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50 min-h-[60vh]">
                      <div className="bg-white p-8 rounded-3xl shadow-xl border-2 border-orange-200 max-w-lg w-full">
                        <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-orange-400 to-pink-500 rounded-full flex items-center justify-center">
                          <span className="text-5xl">🎵</span>
                        </div>
                        <p className="text-center text-gray-800 font-semibold mb-6 text-lg">{viewingFile.name}</p>
                        <audio 
                          src={fileContent} 
                          controls 
                          className="w-full"
                        >
                          เบราว์เซอร์ของคุณไม่รองรับการเล่นเสียง
                        </audio>
                      </div>
                    </div>
                  ) : isDocument(viewingFile.name) ? (
                    // แสดงเอกสาร
                    <>
                      {['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(getFileExtension(viewingFile.name)) ? (
                        <div className="p-4 bg-white">
                          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-l-4 border-orange-400 rounded-lg p-4 mb-4">
                            <p className="text-sm text-gray-700 flex items-start gap-2">
                              <span className="text-xl">💡</span>
                              <span><strong className="text-orange-700">เอกสาร Office:</strong> ใช้ Google Docs Viewer สำหรับแสดงผล</span>
                            </p>
                          </div>
                          <div className="rounded-xl overflow-hidden border-2 border-orange-100">
                            <iframe
                              src={getDocumentViewerUrl(viewingFile.name, fileContent)}
                              className="w-full h-[65vh]"
                              title={viewingFile.name}
                            />
                          </div>
                        </div>
                      ) : getFileExtension(viewingFile.name) === 'txt' ? (
                        // แสดงไฟล์ TXT
                        <div className="p-6 bg-white">
                          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200 max-h-[65vh] overflow-auto">
                            <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono leading-relaxed">
                              {atob(fileContent.split(',')[1] || '')}
                            </pre>
                          </div>
                        </div>
                      ) : getFileExtension(viewingFile.name) === 'csv' ? (
                        // แสดงไฟล์ CSV
                        <div className="p-6 bg-white">
                          <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-l-4 border-blue-400 rounded-lg p-4 mb-4">
                            <p className="text-sm text-gray-700 flex items-center gap-2">
                              <span className="text-xl">📊</span>
                              <strong className="text-blue-700">ไฟล์ CSV - ข้อมูลตาราง</strong>
                            </p>
                          </div>
                          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200 max-h-[65vh] overflow-auto">
                            <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono leading-relaxed">
                              {atob(fileContent.split(',')[1] || '')}
                            </pre>
                          </div>
                        </div>
                      ) : (
                        <div className="p-12 text-center bg-gradient-to-br from-gray-50 to-gray-100 min-h-[60vh] flex items-center justify-center">
                          <div>
                            <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-orange-200 to-pink-200 rounded-full flex items-center justify-center">
                              <IoDocumentOutline size={48} className="text-orange-600" />
                            </div>
                            <p className="text-xl font-semibold text-gray-700 mb-2">เอกสาร {getFileExtension(viewingFile.name).toUpperCase()}</p>
                            <p className="text-sm text-gray-500">ดาวน์โหลดเพื่อดูเนื้อหา</p>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    // ไฟล์ประเภทอื่นๆ ที่ไม่สามารถแสดงได้
                    <div className="p-12 text-center bg-gradient-to-br from-gray-50 to-gray-100 min-h-[60vh] flex items-center justify-center">
                      <div>
                        <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-orange-200 to-pink-200 rounded-full flex items-center justify-center">
                          <IoDocumentOutline size={48} className="text-orange-600" />
                        </div>
                        <p className="text-xl font-semibold text-gray-700 mb-2">ไฟล์ {getFileExtension(viewingFile.name).toUpperCase()}</p>
                        <p className="text-sm text-gray-500 mb-4">ไม่สามารถแสดงตัวอย่างได้</p>
                        <button
                          onClick={() => handleDownload(viewingFile)}
                          className="px-6 py-3 bg-gradient-to-r from-orange-400 to-orange-500 text-white rounded-full hover:from-orange-500 hover:to-orange-600 font-medium shadow-md inline-flex items-center gap-2"
                        >
                          <IoDownloadOutline size={18} />
                          ดาวน์โหลดไฟล์
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                // ไม่มีเนื้อหาไฟล์
                <div className="p-12 text-center bg-gradient-to-br from-gray-50 to-gray-100 min-h-[60vh] flex items-center justify-center">
                  <div>
                    <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full flex items-center justify-center animate-pulse">
                      <IoDocumentOutline size={48} className="text-gray-400" />
                    </div>
                    <p className="text-xl font-semibold text-gray-600 mb-2">กำลังโหลดไฟล์...</p>
                    <p className="text-sm text-gray-500">กรุณารอสักครู่</p>
                  </div>
                </div>
              )}
              </div>
            </div>

            <div className="flex gap-3 justify-end p-6 border-t border-gray-200 bg-white flex-shrink-0">
              <button
                onClick={() => handleDownload(viewingFile)}
                className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg flex items-center gap-2 font-medium shadow-sm"
              >
                <IoDownloadOutline size={18} />
                ดาวน์โหลด
              </button>
              <button
                onClick={() => {
                  setIsViewModalOpen(false);
                  setViewingFile(null);
                  setFileContent(null);
                }}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-full hover:bg-gray-300 font-medium"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal โชว์ APA */}
      {isApaModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-auto border border-gray-200 shadow-xl">
            <div className="sticky top-0 bg-white px-6 py-4 flex justify-between items-center border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-700">📚 ข้อมูล APA</h3>
              <button
                onClick={() => { setIsApaModalOpen(false); setApaData(null); setApaFile(null); }}
                className="text-gray-400 hover:text-gray-600 p-2 rounded-lg transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="p-6">
              {apaLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-500 rounded-full animate-spin mb-4"></div>
                  <p className="text-gray-600 font-medium">กำลังประมวลผลข้อมูลด้วย AI...</p>
                  <p className="text-xs text-gray-400 mt-1">ขั้นตอนนี้อาจใช้เวลา 10-20 วินาที</p>
                </div>
              ) : apaData ? (
                <div className="space-y-6">
                  {/* Abstract Section */}
                  <div className="bg-blue-50/50 rounded-xl p-5 border border-blue-100">
                    <h4 className="text-blue-800 font-bold mb-3 flex items-center gap-2">
                       <span>📝</span> บทคัดย่อ (Abstract)
                    </h4>
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                      {apaData.abstract || 'ไม่มีข้อมูลบทคัดย่อ'}
                    </p>
                  </div>

                  {/* Project Info Section */}
                  {apaData.projectInfo && (
                    <div className="bg-orange-50/50 rounded-xl p-5 border border-orange-100">
                      <h4 className="text-orange-800 font-bold mb-4 flex items-center gap-2">
                         <span>📊</span> ข้อมูลโครงการ (Project Info)
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <p className="text-xs text-orange-600 font-bold uppercase">ชื่อโครงการ (ไทย)</p>
                          <p className="text-sm text-gray-800 font-medium">{apaData.projectInfo.titleThai || '-'}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-orange-600 font-bold uppercase">Proposal Code</p>
                          <p className="text-sm text-gray-800 font-medium">{apaData.projectInfo.proposalCode || '-'}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-orange-600 font-bold uppercase">คณะ/หน่วยงาน</p>
                          <p className="text-sm text-gray-800 font-medium">{apaData.projectInfo.university || '-'}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-orange-600 font-bold uppercase">งบประมาณ</p>
                          <p className="text-sm text-gray-800 font-bold text-green-700">{apaData.projectInfo.totalBudget || '-'}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Researchers & Keywords */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                        <h4 className="text-gray-800 font-bold mb-3 flex items-center gap-2">
                          <span>👤</span> นักวิจัย (Researchers)
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {Array.isArray(apaData.researchers) && apaData.researchers.length > 0 ? (
                            apaData.researchers.map((r: any, i: number) => (
                              <span key={i} className="px-3 py-1 bg-white border border-gray-200 rounded-full text-xs text-gray-700 shadow-sm">
                                {typeof r === 'string' ? r : r.name || JSON.stringify(r)}
                              </span>
                            ))
                          ) : (
                            <p className="text-xs text-gray-500 italic">ไม่พบรายชื่อนักวิจัย</p>
                          )}
                        </div>
                     </div>
                     <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                        <h4 className="text-gray-800 font-bold mb-3 flex items-center gap-2">
                          <span>🏷️</span> คำสำคัญ (Keywords)
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {apaData.keywords?.thai?.length > 0 ? (
                            apaData.keywords.thai.map((k: string, i: number) => (
                              <span key={i} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                                {k}
                              </span>
                            ))
                          ) : (
                            <p className="text-xs text-gray-500 italic">ไม่มีข้อมูลคำสำคัญ</p>
                          )}
                        </div>
                     </div>
                  </div>

                  {/* Raw Data (Degub) */}
                  <details className="mt-4">
                    <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600 transition-colors">
                      ดูข้อมูลดิบ (Raw JSON)
                    </summary>
                    <pre className="mt-2 text-[10px] bg-gray-900 text-green-400 p-4 rounded-lg overflow-auto max-h-40 font-mono">
                      {JSON.stringify(apaData, null, 2)}
                    </pre>
                  </details>
                </div>
              ) : (
                <div className="text-center py-12">
                  <span className="text-4xl mb-4 block">🔍</span>
                  <p className="text-gray-600">ไม่มีข้อมูล APA สำหรับไฟล์นี้</p>
                </div>
              )}
            </div>
            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-end gap-2">
              {apaFile && (
                <button
                  onClick={() => handleRegenerateApa(apaFile)}
                  disabled={apaLoading}
                  className="px-6 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 font-medium disabled:opacity-50 flex items-center gap-2"
                >
                  <IoReloadOutline size={18} className={apaLoading ? 'animate-spin' : ''} />
                  สร้างใหม่ (Regenerate)
                </button>
              )}
              <button
                onClick={() => { setIsApaModalOpen(false); setApaData(null); setApaFile(null); }}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-full hover:bg-gray-300 font-medium"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}