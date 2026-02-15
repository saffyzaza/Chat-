import { NextRequest, NextResponse } from 'next/server';

type Subdistrict = {
  name: string;
  lat: number;
  lon: number;
};

type District = {
  name: string;
  subdistricts: Subdistrict[];
};

type Province = {
  name: string;
  districts: District[];
};

const PROVINCES: Province[] = [
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

async function fetchOpenMeteoForecast(lat: number, lon: number, days: number) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weathercode,wind_speed_10m_max,relative_humidity_2m_max&forecast_days=${days}&timezone=Asia/Bangkok`;
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Open-Meteo error: ${response.status}`);
  return response.json();
}

function toForecastRows(daily: any, days: number) {
  const maxLength = Math.min(days, Array.isArray(daily?.time) ? daily.time.length : 0);
  const rows: any[] = [];

  for (let i = 0; i < maxLength; i++) {
    const date = new Date(daily.time[i]);
    rows.push({
      date: daily.time[i],
      dayName: ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'][date.getDay()],
      rainChance: Number(daily?.precipitation_probability_max?.[i] ?? 0),
      condition: getWeatherCondition(Number(daily?.weathercode?.[i] ?? 0)),
      minTemp: Math.round(Number(daily?.temperature_2m_min?.[i] ?? 0)),
      maxTemp: Math.round(Number(daily?.temperature_2m_max?.[i] ?? 0)),
      humidity: Math.round(Number(daily?.relative_humidity_2m_max?.[i] ?? 0)),
      windSpeed: Math.round(Number(daily?.wind_speed_10m_max?.[i] ?? 0))
    });
  }

  return rows;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const provinceName = searchParams.get('province') || '';
    const districtName = searchParams.get('district') || '';
    const metadataOnly = (searchParams.get('metadataOnly') || 'false').toLowerCase() === 'true';

    let days = parseInt(searchParams.get('days') || '7', 10);
    if (Number.isNaN(days) || days < 1) days = 7;
    if (days > 14) days = 14;

    if (!provinceName) {
      return NextResponse.json({
        success: true,
        provinces: PROVINCES.map((province) => province.name)
      });
    }

    const province = PROVINCES.find((item) => item.name === provinceName);
    if (!province) {
      return NextResponse.json({ success: false, message: 'ไม่พบจังหวัดที่ระบุ' }, { status: 404 });
    }

    if (!districtName) {
      return NextResponse.json({
        success: true,
        province: province.name,
        districts: province.districts.map((district) => district.name)
      });
    }

    const district = province.districts.find((item) => item.name === districtName);
    if (!district) {
      return NextResponse.json({ success: false, message: 'ไม่พบอำเภอที่ระบุ' }, { status: 404 });
    }

    const centerLat =
      district.subdistricts.reduce((sum, subdistrict) => sum + subdistrict.lat, 0) /
      district.subdistricts.length;
    const centerLon =
      district.subdistricts.reduce((sum, subdistrict) => sum + subdistrict.lon, 0) /
      district.subdistricts.length;

    if (metadataOnly) {
      return NextResponse.json({
        success: true,
        province: province.name,
        district: district.name,
        center: {
          lat: Number(centerLat.toFixed(6)),
          lon: Number(centerLon.toFixed(6))
        },
        subdistricts: district.subdistricts
      });
    }

    const data = await Promise.all(
      district.subdistricts.map(async (subdistrict) => {
        const weather = await fetchOpenMeteoForecast(subdistrict.lat, subdistrict.lon, days);
        return {
          subdistrict: subdistrict.name,
          lat: subdistrict.lat,
          lon: subdistrict.lon,
          forecasts: toForecastRows(weather?.daily, days)
        };
      })
    );

    return NextResponse.json({
      success: true,
      province: province.name,
      district: district.name,
      center: {
        lat: Number(centerLat.toFixed(6)),
        lon: Number(centerLon.toFixed(6))
      },
      data,
      generatedAt: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Weather route error:', error);
    return NextResponse.json({ success: false, message: error?.message || 'Server error' }, { status: 500 });
  }
}
