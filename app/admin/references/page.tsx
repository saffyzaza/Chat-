'use client';

import { useState, useEffect } from 'react';
import { IoArrowBackOutline, IoDownloadOutline, IoSearchOutline, IoReloadOutline } from 'react-icons/io5';

interface ApaReference {
  fileName: string;
  path: string;
  apa: any;
  lastModified: Date;
}

export default function ReferencesPage() {
  const [references, setReferences] = useState<ApaReference[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  useEffect(() => {
    loadAllReferences();
  }, []);

  const loadAllReferences = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. ดึงรายการไฟล์จริงจาก MinIO (Recursive)
      const filesRes = await fetch('/api/files?path=/&recursive=true');
      let minioFiles: string[] = [];
      if (filesRes.ok) {
        const filesData = await filesRes.json();
        minioFiles = (filesData.files || [])
          .filter((f: any) => f.type === 'file')
          .map((f: any) => `${f.path}${f.name}`);
      }

      // 2. ดึงข้อมูล APA ทั้งหมดจากฐานข้อมูลโดยตรง
      const response = await fetch('/api/files/apa');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.references) {
          const refs: ApaReference[] = data.references
            .filter((item: any) => {
              // กรองเฉพาะไฟล์ที่มี Abstract
              const hasAbstract = item.apa?.abstract && item.apa.abstract.trim() !== '' && item.apa.abstract !== 'null';
              if (!hasAbstract) return false;

              // กรองเฉพาะไฟล์ที่มีอยู่จริงใน MinIO
              const fileKey = `${item.meta?.file_path}${item.meta?.file_name}`;
              return minioFiles.includes(fileKey);
            })
            .map((item: any) => ({
              fileName: item.meta?.file_name || 'ไม่ระบุชื่อไฟล์',
              path: item.meta?.file_path || '/',
              apa: item.apa,
              lastModified: new Date(item.meta?.created_at || Date.now()),
            }));
          setReferences(refs);
        } else {
          setReferences([]);
        }
      } else {
        setError('ไม่สามารถเชื่อมต่อ API ได้');
      }
    } catch (err) {
      console.error('Error loading references:', err);
      setError('เกิดข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  // ลบฟังก์ชัน loadReferencesFromFiles แบบเก่าออกเนื่องจากช้าและซ้ำซ้อน

  const filteredReferences = references.filter((ref) =>
    ref.fileName.toLowerCase().includes(searchTerm.toLowerCase())
  );



  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      alert('คัดลอกไปยังคลิปบอร์ดแล้ว');
    });
  };

  const handleViewPdf = (ref: ApaReference) => {
    const viewUrl = `/admin/view-pdf?path=${encodeURIComponent(ref.path)}&name=${encodeURIComponent(ref.fileName)}`;
    window.open(viewUrl, '_blank');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => window.location.assign('/admin')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="กลับหน้า Admin"
            >
              <IoArrowBackOutline size={24} className="text-gray-700" />
            </button>
            <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
              📚 อ้างอิง PDF
            </h1>
          </div>
          <button
            onClick={loadAllReferences}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="รีเฟรช"
          >
            <IoReloadOutline size={24} className="text-gray-700" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative">
            <IoSearchOutline size={20} className="absolute left-3 top-3.5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ค้นหาไฟล์..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all"
            />
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin mb-4"></div>
            <p className="text-gray-600 font-medium">กำลังโหลดข้อมูลอ้างอิง...</p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-center">
            <p className="font-medium">{error}</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredReferences.length === 0 && !error && (
          <div className="text-center py-12">
            <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
              <span className="text-5xl">📄</span>
            </div>
            <p className="text-gray-600 text-lg font-medium">
              {searchTerm ? 'ไม่พบไฟล์ที่ตรงกัน' : 'ยังไม่มีไฟล์ PDF'}
            </p>
          </div>
        )}

        {/* References List */}
        <div className="grid gap-4">
          {filteredReferences.map((ref, index) => (
            <div
              key={`${ref.path}-${ref.fileName}`}
              className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
            >
              {/* Card Header */}
              <div
                className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200 cursor-pointer hover:from-blue-100 hover:to-indigo-100 transition-colors"
                onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">📄</span>
                      <div>
                        <h3 className="font-semibold text-gray-800">{ref.fileName}</h3>
                        <p className="text-xs text-gray-500">
                          {ref.path === '/' ? '/' : ref.path}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500">
                      แก้ไขล่าสุด: {new Date(ref.lastModified).toLocaleString('th-TH')}
                    </p>
                  </div>
                  <div className="text-xl text-gray-400 ml-4">
                    {expandedIndex === index ? '▼' : '▶'}
                  </div>
                </div>
              </div>

              {/* Card Content - Expanded */}
              {expandedIndex === index && (
                <div className="p-6 bg-white border-t border-gray-200">
                  {/* APA Data Display */}
                  <div className="mb-6">
                    <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <span className="text-lg">📋</span>
                      ข้อมูล APA
                    </h4>
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 max-h-64 overflow-auto">
                      {ref.apa ? (
                        <>
                          {typeof ref.apa === 'string' ? (
                            <p className="text-sm text-gray-700 whitespace-pre-wrap break-words font-mono">
                              {ref.apa}
                            </p>
                          ) : (
                            <pre className="text-xs text-gray-700 whitespace-pre-wrap break-words font-mono">
                              {JSON.stringify(ref.apa, null, 2)}
                            </pre>
                          )}
                        </>
                      ) : (
                        <p className="text-sm text-gray-500">ไม่มีข้อมูล APA</p>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() =>
                        handleCopyToClipboard(
                          typeof ref.apa === 'string' ? ref.apa : JSON.stringify(ref.apa, null, 2)
                        )
                      }
                      className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                    >
                      📋 คัดลอก APA
                    </button>
                    <button
                      onClick={() => handleViewPdf(ref)}
                      className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium transition-colors"
                    >
                      View
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Statistics */}
        {!loading && filteredReferences.length > 0 && (
          <div className="mt-8 pt-8 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
                <p className="text-blue-600 text-sm font-medium">ทั้งหมด</p>
                <p className="text-3xl font-bold text-blue-800">{references.length}</p>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
                <p className="text-green-600 text-sm font-medium">พบ</p>
                <p className="text-3xl font-bold text-green-800">{filteredReferences.length}</p>
              </div>
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
                <p className="text-orange-600 text-sm font-medium">มี APA</p>
                <p className="text-3xl font-bold text-orange-800">
                  {filteredReferences.filter((r) => r.apa).length}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>


    </div>
  );
}
