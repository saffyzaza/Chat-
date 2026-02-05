'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  HiOutlineUserGroup, 
  HiOutlineCloud, 
  HiOutlineDocumentSearch, 
  HiOutlineUpload,
  HiOutlineArrowLeft,
  HiOutlineDesktopComputer,
  HiOutlineBookOpen
} from 'react-icons/hi';

const AdminMenuPage = () => {
  const [references, setReferences] = useState<any[]>([]);
  const [loadingRefs, setLoadingRefs] = useState(false);

  useEffect(() => {
    const fetchRefs = async () => {
      setLoadingRefs(true);
      try {
        // 1. ดึงรายการไฟล์จริงจาก MinIO (Recursive)
        const filesRes = await fetch('/api/files?path=/&recursive=true');
        let minioFiles: string[] = [];
        if (filesRes.ok) {
          const filesData = await filesRes.json();
          // สร้าง unique key จาก path + name เพื่อตรวจสอบความถูกต้อง
          minioFiles = (filesData.files || [])
            .filter((f: any) => f.type === 'file')
            .map((f: any) => `${f.path}${f.name}`);
        }

        // 2. ดึงข้อมูล APA ทั้งหมดจากฐานข้อมูล
        const response = await fetch('/api/files/apa');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.references) {
            const results = data.references
              .filter((item: any) => {
                // กรองเฉพาะไฟล์ที่มี Abstract
                const hasAbstract = item.apa?.abstract && item.apa.abstract.trim() !== '' && item.apa.abstract !== 'null';
                if (!hasAbstract) return false;

                // กรองเฉพาะไฟล์ที่มีอยู่จริงใน MinIO
                const fileKey = `${item.meta?.file_path}${item.meta?.file_name}`;
                return minioFiles.includes(fileKey);
              })
              .map((item: any) => ({
                title: item.apa?.projectInfo?.titleThai || item.apa?.titleThai || item.meta?.file_name || 'ไม่ระบุชื่อเรื่อง',
                abstract: item.apa?.abstract,
                projectInfo: item.apa?.projectInfo,
                file: item.meta?.file_name,
                path: item.meta?.file_path || '/'
              }));
            setReferences(results);
          }
        }
      } catch (error) {
        console.error('Error fetching dashboard refs:', error);
      } finally {
        setLoadingRefs(false);
      }
    };

    fetchRefs();
  }, []);

  const menuItems = [
    {
      title: 'อนุมัติผู้ใช้งาน',
      description: 'จัดการคำขอลงทะเบียน กำหนดสถานะ และสิทธิ์การเข้าถึงของผู้ใช้งานในระะบบ',
      icon: <HiOutlineUserGroup className="w-8 h-8" />,
      href: '/admin/approve',
      color: 'bg-blue-500',
      borderColor: 'border-blue-100',
      hoverColor: 'hover:border-blue-400'
    },
    {
      title: 'พยากรณ์อากาศรายตำบล',
      description: 'ระบบติดตามสภาพอากาศและร้อยละโอกาสเกิดฝนรายพื้นที่ 1-7 วันข้างหน้า',
      icon: <HiOutlineCloud className="w-8 h-8" />,
      href: '/admin/weather',
      color: 'bg-orange-500',
      borderColor: 'border-orange-100',
      hoverColor: 'hover:border-orange-400'
    },
    {
      title: 'จัดการไฟล์อ้างอิง',
      description: 'จัดการฐานข้อมูลเอกสาร PDF สำหรับให้ AI ใช้ในการสังเคราะห์ข้อมูลความรู้',
      icon: <HiOutlineDocumentSearch className="w-8 h-8" />,
      href: '/admin/references',
      color: 'bg-green-500',
      borderColor: 'border-green-100',
      hoverColor: 'hover:border-green-400'
    },
    {
      title: 'อัปโหลดเอกสาร',
      description: 'อัปโหลดและจัดการไฟล์เอกสาร PDF เพื่อใช้เป็นฐานข้อมูลความรู้สำหรับระบบ',
      icon: <HiOutlineUpload className="w-8 h-8" />,
      href: '/admin/upload',
      color: 'bg-purple-500',
      borderColor: 'border-purple-100',
      hoverColor: 'hover:border-purple-400'
    },
  ];

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      {/* Top Header Section */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-orange-100">
                <HiOutlineDesktopComputer className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Admin Dashboard</h1>
                <p className="text-sm text-gray-500 font-medium">ระบบจัดการข้อมูลและสุขภาวะ สสส.</p>
              </div>
            </div>
            
            <Link 
              href="/"
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-orange-600 font-medium transition-colors border border-gray-200 rounded-lg hover:bg-orange-50"
            >
              <HiOutlineArrowLeft className="w-5 h-5" />
              <span>กลับสู่หน้าหลัก</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            ยินดีต้อนรับเข้าสู่ <span className="text-orange-600">ระบบหลังบ้าน</span>
          </h2>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto text-balance">
            เลือกโมดูลที่ต้องการจัดการเพื่อควบคุมการทำงานของระบบแชท AI และฐานข้อมูลความรู้เชิงวิชาการ
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
          {menuItems.map((item, index) => (
            <Link 
              key={index}
              href={item.href}
              className={`group relative bg-white p-8 rounded-2xl border-2 ${item.borderColor} ${item.hoverColor} transition-all duration-300 hover:shadow-xl hover:-translate-y-1`}
            >
              <div className="flex items-start gap-6">
                <div className={`${item.color} p-4 rounded-xl text-white shadow-lg shrink-0 group-hover:scale-110 transition-transform duration-300`}>
                  {item.icon}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2 flex items-center gap-2">
                    {item.title}
                    <span className="inline-block transition-transform duration-300 group-hover:translate-x-1">→</span>
                  </h3>
                  <p className="text-gray-500 leading-relaxed font-normal">
                    {item.description}
                  </p>
                </div>
              </div>
              
              {/* Subtle background decoration */}
              <div className="absolute top-0 right-0 -mt-2 -mr-2 w-16 h-16 bg-gray-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity blur-2xl"></div>
            </Link>
          ))}
        </div>

        {/* System Status Footer */}
        <div className="mt-16 bg-orange-50 border border-orange-100 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-orange-900 font-medium">ระบบฐานข้อมูลความรู้ AI ทำงานปกติ</span>
          </div>
          <div className="text-orange-700 text-sm">
            © 2026 สำนักงานกองทุนสนับสนุนการสร้างเสริมสุขภาพ (สสส.)
          </div>


          
        </div>
        {/* Recent Academic References Section */}
        <div className="mt-12 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <HiOutlineBookOpen className="text-orange-500 w-5 h-5" />
              ข้อมูลวิชาการทั้งหมด (Abstracts & Titles)
            </h3>
            <Link 
              href="/admin/references" 
              className="text-sm text-orange-600 font-medium hover:underline bg-orange-50 px-3 py-1 rounded-full items-center flex gap-1 transition-colors hover:bg-orange-100"
            >
              แสดง list ทั้งหมด ({references.length}) →
            </Link>
          </div>
          
          <div className="p-6">
            {loadingRefs ? (
              <div className="flex flex-col items-center py-10">
                <div className="w-8 h-8 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin mb-2"></div>
                <p className="text-sm text-gray-500">กำลังดึงข้อมูลอ้างอิง...</p>
              </div>
            ) : references.length > 0 ? (
              <div className="space-y-4 font-mono text-sm">
                {references.map((ref, idx) => (
                  <div key={idx} className="p-4 bg-gray-50 rounded-lg border border-gray-100 relative group">
                    <div className="text-orange-600 font-bold mb-1">{idx + 1} &#123;</div>
                    <div className="pl-6 space-y-1">
                      <div>
                        <span className="text-blue-600 font-semibold">"Title":</span>{" "}
                        <span className="text-gray-900">"{ref.title}"</span>,
                      </div>
                      <div>
                        <span className="text-blue-600 font-semibold">"Abstract":</span>{" "}
                        <span className="text-gray-700 leading-relaxed text-justify">"{ref.abstract}"</span>,
                      </div>
                      {ref.projectInfo && (
                        <div className="mt-1">
                          <span className="text-blue-600 font-semibold">"ProjectInfo":</span>
                          <pre className="text-xs text-gray-600 bg-gray-100 p-2 rounded mt-1 overflow-x-auto whitespace-pre-wrap">
                            {JSON.stringify(ref.projectInfo, null, 2)}
                          </pre>
                        </div>
                      )}
                      <div>
                        <span className="text-blue-600 font-semibold">"Internal URL":</span>{" "}
                        <Link 
                          href={`/admin/view-pdf?path=${encodeURIComponent(ref.path)}&name=${encodeURIComponent(ref.file)}`}
                          target="_blank"
                          className="text-orange-500 hover:underline break-all"
                        >
                          "{ref.file}"
                        </Link>
                      </div>
                    </div>
                    <div className="text-orange-600 font-bold mt-1">&#125;,</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 text-gray-400">
                ไม่พบข้อมูลอ้างอิงในระบบ
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminMenuPage;
