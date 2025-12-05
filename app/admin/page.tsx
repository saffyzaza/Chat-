'use client';

import { useState } from 'react';
import { FileManager } from './components/FileManager';
import { FileUploader } from './components/FileUploader';


export default function AdminPage() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [selectedFolder, setSelectedFolder] = useState('/');
  const [isDragOver, setIsDragOver] = useState(false);
  
  // กำหนด URL ของ API ภายนอกที่ต้องการส่งไฟล์ไปด้วย (optional)
  // ตัวอย่าง: const externalApiUrl = 'https://your-api.com/upload';
  const externalApiUrl = 'http://72.61.120.205:8001/upload'; // API สำหรับอัปโหลดไฟล์

  const handleUploadSuccess = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleFolderSelect = (folderPath: string) => {
    setSelectedFolder(folderPath);
  };

  const handlePageDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handlePageDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handlePageDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    // อัปโหลดไฟล์
    for (const file of files) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('path', selectedFolder);
      
      // เพิ่ม URL ของ API ภายนอก (ถ้ามี)
      if (externalApiUrl) {
        formData.append('apiUrl', externalApiUrl);
      }

      try {
        const response = await fetch('/api/files', {
          method: 'POST',
          body: formData,
        });
        
        if (response.ok) {
          const result = await response.json();
          // แสดงผลลัพธ์จาก external API (ถ้ามี)
          if (result.externalApi?.success) {
            console.log('External API Response:', result.externalApi.data);
          }
        }
      } catch (error) {
        console.error('Upload error:', error);
      }
    }

    handleUploadSuccess();
  };

  return (
    <div 
      className="min-h-screen bg-gray-100 relative"
      onDragOver={handlePageDragOver}
      onDragLeave={handlePageDragLeave}
      onDrop={handlePageDrop}
    >
      {/* Drag Overlay */}
      {isDragOver && (
        <div className="fixed inset-0 bg-orange-500/10 backdrop-blur-sm z-40 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-lg p-12 border-2 border-dashed border-orange-500 max-w-md">
            <div className="text-center">
              <div className="w-24 h-24 mx-auto mb-4 bg-orange-500 rounded-full flex items-center justify-center">
                <span className="text-5xl">📁</span>
              </div>
              <h3 className="text-2xl font-bold text-orange-500 mb-2">วางไฟล์ที่นี่</h3>
              <p className="text-gray-600">เพื่ออัปโหลดไปยัง {selectedFolder}</p>
            </div>
          </div>
        </div>
      )}
      <div className="max-w-7xl mx-auto p-6">
        {/* Header with สสส. theme */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center shadow-sm">
              <span className="text-white text-2xl font-bold">📁</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-700">
                จัดการไฟล์เอกสาร
              </h1>
              <p className="text-gray-500 mt-1">สำนักงานกองทุนสนับสนุนการสร้างเสริมสุขภาพ</p>
            </div>
          </div>
        </div>

        {/* File Manager Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <h2 className="text-lg font-medium text-gray-700">📂 จัดการไฟล์และโฟลเดอร์</h2>
          </div>
          <div className="p-6">
            <FileManager 
              refreshTrigger={refreshTrigger} 
              onFolderSelect={handleFolderSelect}
            />
          </div>
        </div>
      </div>

      {/* Floating Upload Button */}
      <FileUploader 
        onUploadSuccess={handleUploadSuccess} 
        selectedFolder={selectedFolder}
        externalApiUrl={externalApiUrl}
      />
    </div>
  );
}
