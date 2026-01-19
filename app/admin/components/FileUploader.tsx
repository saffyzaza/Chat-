"use client";

import path from "path";
import { useState, useRef } from "react";
import {
  IoAddOutline,
  IoClose,
  IoDocumentOutline,
  IoCheckmarkCircle,
} from "react-icons/io5";

interface FileUploaderProps {
  onUploadSuccess?: (data: { fileName: string; apaData: any }) => void;
  selectedFolder?: string;
  externalApiUrl?: string; // URL ของ API ภายนอกที่ต้องการส่งไฟล์ไปด้วย
}

interface UploadedFile {
  id: string;
  file: File;
  progress: number;
  status: "uploading" | "success" | "error";
  error?: string;
}

export function FileUploader({
  onUploadSuccess,
  selectedFolder = "/",
  externalApiUrl,
}: FileUploaderProps) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      handleFiles(files);
    }
  };

  const handleFiles = (files: File[]) => {
    const newUploads: UploadedFile[] = files.map((file, index) => ({
      id: `${Date.now()}-${index}-${Math.random()}`,
      file,
      progress: 0,
      status: "uploading" as const,
    }));

    setUploadedFiles((prev) => [...prev, ...newUploads]);

    // จำลองการอัปโหลด
    newUploads.forEach((upload) => {
      simulateUpload(upload);
    });
  };

  const simulateUpload = async (upload: UploadedFile) => {
    try {
      // อัปโหลดไฟล์ไปยัง API
      const formData = new FormData();
      // แนบไฟล์พร้อมชื่อไฟล์เดิม เพื่อรักษาชื่อภาษาไทย/UTF-8
      formData.append("file", upload.file, upload.file.name);
      formData.append("path", selectedFolder);

      // เพิ่ม URL ของ API ภายนอก (ถ้ามี)
      if (externalApiUrl) {
        formData.append("apiUrl", externalApiUrl);
      }
      // console.log('path', selectedFolder+upload.file.name);
      // console.log('file name', formData);
      

      const response = await fetch("/api/files", {
        method: "POST",
        body: formData,
      });

      // หมายเหตุ: การส่งต่อไปยัง RAG ภายนอกให้ทำฝั่งเซิร์ฟเวอร์เพื่อหลีกเลี่ยง CORS
      // ส่งค่า externalApiUrl ผ่าน formData แล้วให้ /api/files เป็นผู้เรียกแทน

      
      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const result = await response.json();

      // อัปเดทสถานะเป็นสำเร็จ
      setUploadedFiles((prev) =>
        prev.map((file) =>
          file.id === upload.id
            ? { ...file, progress: 100, status: "success" }
            : file
        )
      );

      // ทันทีหลัง upload สำเร็จ - เรียก generate APA
      let apaDataToShow: any = null;
      try {
        console.log(`[FileUploader] Generating APA for ${upload.file.name}...`);
        const apaResponse = await fetch('/api/files/apa', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            path: selectedFolder,
            name: upload.file.name,
          }),
        });

        if (apaResponse.ok) {
          const apaResponseData = await apaResponse.json();
          console.log('[FileUploader] ✅ APA generated:', apaResponseData);
          apaDataToShow = apaResponseData.apa || apaResponseData;
          
          // แสดง alert หรือ notification
          if (apaResponseData.debugInfo) {
            console.log(`[FileUploader] Extraction: ${apaResponseData.debugInfo.extractionMethod}, Length: ${apaResponseData.debugInfo.textExtractedLength}`);
          }
        } else {
          console.error('[FileUploader] ⚠️ APA generation failed');
        }
      } catch (apaErr) {
        console.error('[FileUploader] Error generating APA:', apaErr);
        // ไม่ throw error เพื่อไม่ให้กระทบการ upload
      }

      // แสดงผลลัพธ์ APA JSON จากการ upload (ถ้ามี - legacy)
      if (result.apa) {
        console.log('[FileUploader] APA from upload:', result.apa);
      }

      // แสดงผลลัพธ์จาก external API (ถ้ามี)
      if (result.externalApi?.success) {
        console.log("[FileUploader] External API Response:", result.externalApi.data);
      }

      // เรียก callback เพื่อให้ FileManager รีเฟรช และแสดง APA
      if (onUploadSuccess) {
        onUploadSuccess({
          fileName: upload.file.name,
          apaData: apaDataToShow
        });
      }
    } catch (error) {
      console.error("Error uploading file:", error);

      // อัปเดทสถานะเป็นล้มเหลว
      setUploadedFiles((prev) =>
        prev.map((file) =>
          file.id === upload.id ? { ...file, status: "error" } : file
        )
      );
    }
  };

  const removeFile = (id: string) => {
    setUploadedFiles((prev) => prev.filter((file) => file.id !== id));
  };

  const clearCompleted = () => {
    setUploadedFiles((prev) =>
      prev.filter((file) => file.status !== "success")
    );
  };

  const formatFileSize = (bytes: number) => {
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(2)} KB`;
    return `${(kb / 1024).toFixed(2)} MB`;
  };

  return (
    <>
      {/* Floating Action Button - สสส. theme */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-orange-500 hover:bg-orange-600 text-white rounded-lg shadow-lg flex items-center justify-center transition-all hover:scale-105 z-40"
        title="อัปโหลดไฟล์"
      >
        <IoAddOutline size={32} />
      </button>

      {/* Upload Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white px-6 py-4 flex justify-between items-center border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-700">
                📤 อัปโหลดไฟล์
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-2 rounded-lg transition-colors"
              >
                <IoClose size={24} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {/* Folder Info */}
              <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <p className="text-sm text-gray-600">
                  <strong className="text-gray-700">📁 โฟลเดอร์ปลายทาง:</strong>{" "}
                  <span className="font-semibold">{selectedFolder}</span>
                </p>
              </div>

              {/* Drop zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-all ${
                  isDragging
                    ? "border-orange-500 bg-orange-50"
                    : "border-gray-300 hover:border-orange-400 hover:bg-gray-50"
                }`}
              >
                <div className="w-16 h-16 mx-auto mb-4 bg-orange-500 rounded-full flex items-center justify-center">
                  <IoAddOutline className="text-white" size={32} />
                </div>
                <p className="text-lg font-medium text-gray-700 mb-2">
                  คลิกเพื่อเลือกไฟล์ หรือลากไฟล์มาวางที่นี่
                </p>
                <p className="text-sm text-gray-500">
                  รองรับไฟล์ทุกประเภท (ขนาดไม่เกิน 10MB)
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileInput}
                  className="hidden"
                />
              </div>

              {/* Upload list */}
              {uploadedFiles.length > 0 && (
                <div className="mt-6">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-sm font-medium text-gray-700">
                      ไฟล์ที่อัปโหลด ({uploadedFiles.length})
                    </h3>
                    {uploadedFiles.some((f) => f.status === "success") && (
                      <button
                        onClick={clearCompleted}
                        className="text-sm text-orange-500 hover:text-orange-600 font-medium"
                      >
                        ล้างรายการที่เสร็จแล้ว
                      </button>
                    )}
                  </div>

                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {uploadedFiles.map((upload) => (
                      <div
                        key={upload.id}
                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
                      >
                        <IoDocumentOutline
                          className="text-orange-500 flex-shrink-0"
                          size={24}
                        />

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {upload.file.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatFileSize(upload.file.size)}
                          </p>

                          {upload.status === "uploading" && (
                            <div className="mt-2">
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-orange-500 h-2 rounded-full transition-all"
                                  style={{ width: "100%" }}
                                />
                              </div>
                              <p className="text-xs text-orange-500 mt-1 font-medium">
                                กำลังอัปโหลด...
                              </p>
                            </div>
                          )}

                          {upload.status === "error" && (
                            <p className="text-xs text-red-500 mt-1">
                              อัปโหลดล้มเหลว
                            </p>
                          )}
                        </div>

                        {upload.status === "success" && (
                          <IoCheckmarkCircle
                            className="text-green-500 flex-shrink-0"
                            size={20}
                          />
                        )}

                        {upload.status === "error" && (
                          <span className="text-red-500 flex-shrink-0">✕</span>
                        )}

                        <button
                          onClick={() => removeFile(upload.id)}
                          className="p-1 hover:bg-gray-200 rounded flex-shrink-0"
                        >
                          <IoClose size={16} className="text-gray-500" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-end">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium shadow-sm transition-all"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
