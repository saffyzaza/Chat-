'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react'; // เพิ่ม Suspense
import { IoArrowBackOutline, IoDownloadOutline } from 'react-icons/io5';

// 1. แยกเนื้อหาเดิมมาไว้ในคอมโพเนนต์ย่อย
function PdfViewerContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');

  useEffect(() => {
    const path = searchParams.get('path') || '/';
    const name = searchParams.get('name');

    if (!name) {
      setError('ไม่มีไฟล์ที่ระบุ');
      setLoading(false);
      return;
    }

    setFileName(name);

    const loadPdf = async () => {
      try {
        const response = await fetch(
          `/api/files/download?path=${encodeURIComponent(path)}&name=${encodeURIComponent(name)}`
        );
        if (response.ok) {
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          setPdfUrl(url);
        } else {
          setError('ไม่สามารถโหลดไฟล์ได้');
        }
      } catch (err) {
        console.error('Error loading PDF:', err);
        setError('เกิดข้อผิดพลาดในการโหลดไฟล์');
      } finally {
        setLoading(false);
      }
    };

    loadPdf();
  }, [searchParams]);

  const handleDownload = async () => {
    if (pdfUrl) {
      const response = await fetch(pdfUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const element = document.createElement('a');
      element.href = url;
      element.download = fileName;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-300 shadow-sm p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="ย้อนกลับ"
          >
            <IoArrowBackOutline size={24} className="text-gray-700" />
          </button>
          <h1 className="text-xl font-semibold text-gray-800">{fileName}</h1>
        </div>
        <button
          onClick={handleDownload}
          disabled={!pdfUrl}
          className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white rounded-lg font-medium transition-colors"
        >
          <IoDownloadOutline size={18} />
          ดาวน์โหลด
        </button>
      </div>

      {/* PDF Viewer */}
      <div className="flex-1 overflow-auto">
        {loading && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600 font-medium">กำลังโหลดไฟล์...</p>
            </div>
          </div>
        )}

        {error && !loading && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-6xl mb-4">❌</div>
              <p className="text-gray-600 font-medium text-lg">{error}</p>
              <button
                onClick={() => router.back()}
                className="mt-4 px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium"
              >
                ย้อนกลับ
              </button>
            </div>
          </div>
        )}

        {pdfUrl && !error && (
          <iframe
            src={pdfUrl}
            className="w-full h-full"
            title={fileName}
          />
        )}
      </div>
    </div>
  );
}

// 2. Export หน้าหลักที่ครอบด้วย Suspense
export default function ViewPdfPage() {
  return (
    <Suspense fallback={
      <div className="h-screen flex items-center justify-center bg-gray-100">
        <p>กำลังเตรียมการเปิดไฟล์...</p>
      </div>
    }>
      <PdfViewerContent />
    </Suspense>
  );
}