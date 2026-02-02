import { NextRequest, NextResponse } from 'next/server';

// ข้อมูลจังหวัด อำเภอ และตำบล พร้อมพิกัด
const PROVINCES = [
  {
    name: 'เชียงใหม่',
    districts: [
      {
        name: 'เมืองเชียงใหม่',
        subdistricts: [
          { name: 'ศรีภูมิ', lat: 18.7883, lon: 98.9853 },
          { name: 'พระสิงห์', lat: 18.7869, lon: 98.9820 },
          { name: 'หายยา', lat: 18.7950, lon: 98.9950 },
          { name: 'ช้างม่อย', lat: 18.7700, lon: 98.9600 },
          { name: 'วัดเกต', lat: 18.7890, lon: 98.9880 }
        ]
      },
      {
        name: 'แม่ริม',
        subdistricts: [
          { name: 'ริมใต้', lat: 18.9100, lon: 98.9300 },
          { name: 'ริมเหนือ', lat: 18.9200, lon: 98.9350 },
          { name: 'สันโป่ง', lat: 18.8900, lon: 98.9100 },
          { name: 'แม่สา', lat: 18.9500, lon: 98.9500 },
          { name: 'ขี้เหล็ก', lat: 18.8800, lon: 98.8900 }
        ]
      },
      {
        name: 'สันทราย',
        subdistricts: [
          { name: 'สันทรายหลวง', lat: 18.8100, lon: 99.0300 },
          { name: 'สันทรายน้อย', lat: 18.8200, lon: 99.0400 },
          { name: 'สันพระเนตร', lat: 18.8300, lon: 99.0200 },
          { name: 'สันนาเม็ง', lat: 18.8400, lon: 99.0500 }
        ]
      }
    ]
  },
  {
    name: 'กรุงเทพมหานคร',
    districts: [
      {
        name: 'ปทุมวัน',
        subdistricts: [
          { name: 'ปทุมวัน', lat: 13.7467, lon: 100.5308 },
          { name: 'ลุมพินี', lat: 13.7308, lon: 100.5420 },
          { name: 'รองเมือง', lat: 13.7500, lon: 100.5350 },
          { name: 'วังใหม่', lat: 13.7550, lon: 100.5250 }
        ]
      },
      {
        name: 'พระนคร',
        subdistricts: [
          { name: 'พระบรมมหาราชวัง', lat: 13.7500, lon: 100.4917 },
          { name: 'วังบูรพาภิรมย์', lat: 13.7600, lon: 100.5000 },
          { name: 'วัดราชบพิธ', lat: 13.7550, lon: 100.5050 },
          { name: 'สำราญราษฎร์', lat: 13.7650, lon: 100.5100 }
        ]
      }
    ]
  },
  {
    name: 'เชียงราย',
    districts: [
      {
        name: 'เมืองเชียงราย',
        subdistricts: [
          { name: 'เวียง', lat: 19.9105, lon: 99.8406 },
          { name: 'รอบเวียง', lat: 19.9050, lon: 99.8350 },
          { name: 'ดอยลาน', lat: 19.9200, lon: 99.8500 },
          { name: 'บ้านดู่', lat: 19.9000, lon: 99.8300 }
        ]
      },
      {
        name: 'แม่สาย',
        subdistricts: [
          { name: 'แม่สาย', lat: 20.4300, lon: 99.8800 },
          { name: 'ห้วยไคร้', lat: 20.4200, lon: 99.8700 },
          { name: 'โป่งผา', lat: 20.4400, lon: 99.8900 },
          { name: 'ศรีเมืองชุม', lat: 20.4100, lon: 99.8600 }
        ]
      }
    ]
  },
  {
    name: 'อุบลราชธานี',
    districts: [
      {
        name: 'เมืองอุบลราชธานี',
        subdistricts: [
          { name: 'ในเมือง', lat: 15.2286, lon: 104.8564 },
          { name: 'หนองขอน', lat: 15.2400, lon: 104.8700 },
          { name: 'ปทุม', lat: 15.2200, lon: 104.8400 },
          { name: 'กุดลาด', lat: 15.2500, lon: 104.8800 },
          { name: 'หนองบ่อ', lat: 15.2100, lon: 104.8300 }
        ]
      },
      {
        name: 'วารินชำราบ',
        subdistricts: [
          { name: 'วารินชำราบ', lat: 15.1900, lon: 104.8600 },
          { name: 'แสนสุข', lat: 15.1800, lon: 104.8500 },
          { name: 'ท่าลาด', lat: 15.2000, lon: 104.8700 },
          { name: 'คูเมือง', lat: 15.1700, lon: 104.8400 }
        ]
      },
      {
        name: 'เขื่องใน',
        subdistricts: [
          { name: 'เขื่องใน', lat: 15.3500, lon: 104.7500 },
          { name: 'ชีทวน', lat: 15.3600, lon: 104.7600 },
          { name: 'ก่อเอ้', lat: 15.3400, lon: 104.7400 },
          { name: 'ธาตุ', lat: 15.3700, lon: 104.7700 }
        ]
      }
    ]
  }
];

// ฟังก์ชันเรียก Open-Meteo API พร้อมระบบ Retry และ Timeout
async function fetchWeatherFromOpenMeteo(lat: number, lon: number, days: number = 7, retries = 2) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weathercode,wind_speed_10m_max,relative_humidity_2m_max&forecast_days=${days}&timezone=Asia/Bangkok`;
  
  for (let i = 0; i <= retries; i++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 seconds timeout

      const response = await fetch(url, { 
        cache: 'no-store',
        signal: controller.signal 
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error: any) {
      if (i === retries) {
        console.error(`Final error fetching from Open-Meteo after ${retries} retries:`, error.message || error);
        return null;
      }
      console.warn(`Retry ${i + 1}/${retries} failed: ${error.message || 'Connection error'}. Retrying...`);
      // รอซักพักก่อน retry (Exponential backoff)
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}

// ฟังก์ชันแปลง weather code เป็นสภาพอากาศภาษาไทย
function getWeatherCondition(code: number): string {
  if (code === 0) return 'ท้องฟ้าแจ่มใส';
  if (code <= 3) return 'มีเมฆบางส่วน';
  if (code <= 48) return 'มีหมอก';
  if (code <= 55) return 'ฝนตกเล็กน้อย';
  if (code <= 65) return 'ฝนตก';
  if (code <= 67) return 'ฝนเยือกแข็ง';
  if (code <= 77) return 'หิมะตก';
  if (code <= 82) return 'ฝนตกหนัก';
  if (code <= 86) return 'หิมะตกหนัก';
  if (code <= 99) return 'พายุฝนฟ้าคะนอง';
  return 'ไม่ทราบสภาพอากาศ';
}

// ฟังก์ชันสร้างข้อมูลพยากรณ์อากาศจาก Open-Meteo API
async function generateWeatherForecast(subdistrictName: string, lat: number, lon: number, days: number = 7) {
  try {
    const weatherData = await fetchWeatherFromOpenMeteo(lat, lon, days);
    
    if (!weatherData || !weatherData.daily) {
      console.warn(`Weather API failed for ${subdistrictName}, using fallback data.`);
      return { 
        isFallback: true, 
        forecasts: generateFallbackForecast(subdistrictName, days) 
      };
    }
    
    const forecasts = [];
    const daily = weatherData.daily;
    
    for (let i = 0; i < days && i < daily.time.length; i++) {
      const date = new Date(daily.time[i]);
      
      forecasts.push({
        date: daily.time[i],
        dayName: ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'][date.getDay()],
        rainChance: daily.precipitation_probability_max?.[i] || 0,
        condition: getWeatherCondition(daily.weathercode?.[i] || 0),
        minTemp: Math.round(daily.temperature_2m_min?.[i] || 20),
        maxTemp: Math.round(daily.temperature_2m_max?.[i] || 30),
        humidity: Math.round(daily.relative_humidity_2m_max?.[i] || 70),
        windSpeed: Math.round(daily.wind_speed_10m_max?.[i] || 10)
      });
    }
    
    return { isFallback: false, forecasts };
  } catch (err) {
    console.error(`Unexpected error in generateWeatherForecast for ${subdistrictName}:`, err);
    return { 
      isFallback: true, 
      forecasts: generateFallbackForecast(subdistrictName, days) 
    };
  }
}

// ฟังก์ชันสร้างข้อมูลสำรอง (กรณี API ล้มเหลว)
function generateFallbackForecast(subdistrictName: string, days: number = 7) {
  const forecasts = [];
  const today = new Date();
  
  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    
    const rainChance = Math.floor(Math.random() * 100);
    
    let condition = 'แจ่มใส';
    if (rainChance > 70) condition = 'ฝนตกหนัก';
    else if (rainChance > 50) condition = 'ฝนตก';
    else if (rainChance > 30) condition = 'มีเมฆมาก';
    else if (rainChance > 10) condition = 'มีเมฆบางส่วน';
    
    const minTemp = 22 + Math.floor(Math.random() * 5);
    const maxTemp = minTemp + 8 + Math.floor(Math.random() * 5);
    
    forecasts.push({
      date: date.toISOString().split('T')[0],
      dayName: ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'][date.getDay()],
      rainChance: rainChance,
      condition: condition,
      minTemp: minTemp,
      maxTemp: maxTemp,
      humidity: 60 + Math.floor(Math.random() * 30),
      windSpeed: 5 + Math.floor(Math.random() * 15)
    });
  }
  
  return forecasts;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const province = searchParams.get('province');
    const district = searchParams.get('district');
    let days = parseInt(searchParams.get('days') || '7');
    
    // ตรวจสอบความถูกต้องของจำนวนวัน
    if (isNaN(days) || days < 1) days = 7;
    if (days > 14) days = 14; // จำกัดสูงสุดที่ 14 วันตามมาตรฐาน API พยากรณ์

    // ถ้าไม่ระบุจังหวัด ให้ส่งรายการจังหวัดทั้งหมด
    if (!province) {
      return NextResponse.json({
        success: true,
        provinces: PROVINCES.map(p => p.name)
      });
    }

    // หาจังหวัดที่เลือก
    const selectedProvince = PROVINCES.find(p => p.name === province);
    if (!selectedProvince) {
      return NextResponse.json(
        { error: 'ไม่พบจังหวัดที่เลือก' },
        { status: 404 }
      );
    }

    // ถ้าไม่ระบุอำเภอ ให้ส่งรายการอำเภอในจังหวัด
    if (!district) {
      return NextResponse.json({
        success: true,
        province: province,
        districts: selectedProvince.districts.map(d => d.name)
      });
    }

    // หาอำเภอที่เลือก
    const selectedDistrict = selectedProvince.districts.find(d => d.name === district);
    if (!selectedDistrict) {
      return NextResponse.json(
        { error: 'ไม่พบอำเภอที่เลือก' },
        { status: 404 }
      );
    }

    // สร้างข้อมูลพยากรณ์อากาศสำหรับแต่ละตำบล
    const subdistrictForecastsData = await Promise.all(
      selectedDistrict.subdistricts.map(async (subdistrict) => {
        const result = await generateWeatherForecast(subdistrict.name, subdistrict.lat, subdistrict.lon, days);
        return {
          subdistrict: subdistrict.name,
          ...result
        };
      })
    );

    const hasAnyFallback = subdistrictForecastsData.some(d => d.isFallback);

    return NextResponse.json({
      success: true,
      province: province,
      district: district,
      data: subdistrictForecastsData,
      source: hasAnyFallback ? 'Simulated (API Unavailable)' : 'Open-Meteo API',
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Weather forecast error:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการดึงข้อมูลพยากรณ์อากาศ' },
      { status: 500 }
    );
  }
}