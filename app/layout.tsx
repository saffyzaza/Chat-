import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import "./globals.css";

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "สสส. เพื่อนรักสุขภาพ",
  description: "สสส. เพื่อนรักสุขภาพ เป็นแอปพลิเคชันที่ช่วยให้ผู้ใช้สามารถติดตามและวิเคราะห์ข้อมูลสุขภาพของตนเองได้อย่างง่ายดาย โดยมีฟีเจอร์ที่หลากหลาย เช่น การบันทึกกิจกรรมประจำวัน การติดตามอาหารและน้ำหนัก และการวิเคราะห์ข้อมูลเพื่อให้คำแนะนำในการดูแลสุขภาพที่เหมาะสมกับแต่ละบุคคล",
  icons: {
    icon: "/musya-removebg-preview.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html>
      <head>
        {/* Chart.js */}
        <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
        {/* Chart.js Datalabels Plugin */}
        <script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2.2.0"></script>
        
        {/* Prism.js CSS */}
        <link href="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/themes/prism.min.css" rel="stylesheet" />
        
        {/* Prism.js Core */}
        <script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/prism.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-markup.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-javascript.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-python.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-json.min.js"></script>
        
        {/* Prism.js Autoloader */}
        <script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/plugins/autoloader/prism-autoloader.min.js"></script>
      </head>
      <body className={`${roboto.className} antialiased`}>
        {children}
      </body>
    </html>
  );
}
