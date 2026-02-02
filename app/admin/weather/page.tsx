'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface WeatherForecast {
  date: string;
  dayName: string;
  rainChance: number;
  condition: string;
  minTemp: number;
  maxTemp: number;
  humidity: number;
  windSpeed: number;
}

interface SubdistrictForecast {
  subdistrict: string;
  isFallback?: boolean;
  forecasts: WeatherForecast[];
}

interface WeatherData {
  province: string;
  district: string;
  data: SubdistrictForecast[];
  generatedAt: string;
}

export default function WeatherForecastPage() {
  const [provinces, setProvinces] = useState<string[]>([]);
  const [districts, setDistricts] = useState<string[]>([]);
  const [selectedProvince, setSelectedProvince] = useState<string>('');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('');
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedDays, setSelectedDays] = useState<number>(7);

  // ดึงรายการจังหวัด
  useEffect(() => {
    fetchProvinces();
  }, []);

  const fetchProvinces = async () => {
    try {
      const response = await fetch('/api/weather');
      const result = await response.json();
      if (result.success) {
        setProvinces(result.provinces);
      }
    } catch (error) {
      console.error('Error fetching provinces:', error);
    }
  };

  // ดึงรายการอำเภอเมื่อเลือกจังหวัด
  useEffect(() => {
    if (selectedProvince) {
      fetchDistricts(selectedProvince);
    } else {
      setDistricts([]);
      setSelectedDistrict('');
      setWeatherData(null);
    }
  }, [selectedProvince]);

  const fetchDistricts = async (province: string) => {
    try {
      const response = await fetch(`/api/weather?province=${encodeURIComponent(province)}`);
      const result = await response.json();
      if (result.success) {
        setDistricts(result.districts);
      }
    } catch (error) {
      console.error('Error fetching districts:', error);
    }
  };

  // ดึงข้อมูลพยากรณ์อากาศเมื่อเลือกอำเภอ
  useEffect(() => {
    if (selectedProvince && selectedDistrict) {
      fetchWeatherData(selectedProvince, selectedDistrict, selectedDays);
    } else {
      setWeatherData(null);
    }
  }, [selectedProvince, selectedDistrict, selectedDays]);

  const fetchWeatherData = async (province: string, district: string, days: number) => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/weather?province=${encodeURIComponent(province)}&district=${encodeURIComponent(district)}&days=${days}`
      );
      const result = await response.json();
      if (result.success) {
        setWeatherData(result);
      }
    } catch (error) {
      console.error('Error fetching weather data:', error);
    } finally {
      setLoading(false);
    }
  };

  // ฟังก์ชันกำหนดสีตามเปอร์เซ็นต์ฝน
  const getRainColor = (rainChance: number) => {
    if (rainChance >= 70) return 'bg-blue-600 text-white';
    if (rainChance >= 50) return 'bg-blue-500 text-white';
    if (rainChance >= 30) return 'bg-blue-400 text-white';
    if (rainChance >= 10) return 'bg-blue-200 text-blue-900';
    return 'bg-gray-100 text-gray-700';
  };

  // ฟังก์ชันแสดงไอคอนสภาพอากาศ
  const getWeatherIcon = (condition: string) => {
    if (condition.includes('พายุ') || condition.includes('ฟ้าคะนอง')) return '⛈️';
    if (condition.includes('ฝนตกหนัก')) return '🌧️';
    if (condition.includes('ฝน')) return '🌦️';
    if (condition.includes('หิมะ')) return '❄️';
    if (condition.includes('หมอก')) return '🌫️';
    if (condition.includes('เมฆมาก')) return '☁️';
    if (condition.includes('เมฆบางส่วน')) return '⛅';
    if (condition.includes('แจ่มใส')) return '☀️';
    return '☁️';
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Link 
                href="/admin"
                className="w-10 h-10 bg-orange-500 hover:bg-orange-600 rounded-lg flex items-center justify-center shadow-sm transition-colors"
              >
                <span className="text-white text-xl">←</span>
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-gray-700">🌦️ พยากรณ์อากาศรายอำเภอ</h1>
                <p className="text-gray-500 mt-1">ข้อมูลร้อยละฝนตกรายตำบล 1-7 วันข้างหน้า</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* จังหวัด */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">จังหวัด</label>
              <select
                value={selectedProvince}
                onChange={(e) => setSelectedProvince(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="">เลือกจังหวัด</option>
                {provinces.map((province) => (
                  <option key={province} value={province}>
                    {province}
                  </option>
                ))}
              </select>
            </div>

            {/* อำเภอ */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">อำเภอ</label>
              <select
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                disabled={!selectedProvince}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:bg-gray-100"
              >
                <option value="">เลือกอำเภอ</option>
                {districts.map((district) => (
                  <option key={district} value={district}>
                    {district}
                  </option>
                ))}
              </select>
            </div>

            {/* จำนวนวัน */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">จำนวนวัน</label>
              <select
                value={selectedDays}
                onChange={(e) => setSelectedDays(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="1">1 วัน</option>
                <option value="3">3 วัน</option>
                <option value="5">5 วัน</option>
                <option value="7">7 วัน</option>
              </select>
            </div>

            {/* ปุ่มรีเฟรช */}
            <div className="flex items-end">
              <button
                onClick={() => selectedProvince && selectedDistrict && fetchWeatherData(selectedProvince, selectedDistrict, selectedDays)}
                disabled={!selectedProvince || !selectedDistrict || loading}
                className="w-full px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? '⏳ กำลังโหลด...' : '🔄 รีเฟรชข้อมูล'}
              </button>
            </div>
          </div>
        </div>

        {/* Weather Data */}
        {loading ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <div className="animate-spin text-4xl mb-4">⏳</div>
            <p className="text-gray-500">กำลังโหลดข้อมูลพยากรณ์อากาศ...</p>
          </div>
        ) : weatherData ? (
          <div className="space-y-6">
            {/* Info */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-700">
                    {weatherData.province} - {weatherData.district}
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    ข้อมูล {weatherData.data.length} ตำบล • อัพเดทเมื่อ {new Date(weatherData.generatedAt).toLocaleString('th-TH')}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500">ระยะเวลาพยากรณ์</div>
                  <div className="text-2xl font-bold text-orange-500">{selectedDays} วัน</div>
                </div>
              </div>
            </div>

            {/* Weather Cards */}
            {weatherData.data.map((subdistrictData, idx) => (
              <div key={idx} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-orange-500 text-white px-6 py-3 flex justify-between items-center">
                  <h3 className="text-lg font-medium">📍 ตำบล{subdistrictData.subdistrict}</h3>
                  {subdistrictData.isFallback && (
                    <span className="bg-yellow-400 text-orange-900 text-xs px-2 py-1 rounded-full font-bold animate-pulse">
                      ⚠️ ข้อมูลจำลอง (API ขัดข้อง)
                    </span>
                  )}
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
                    {subdistrictData.forecasts.map((forecast, dayIdx) => (
                      <div 
                        key={dayIdx}
                        className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                      >
                        {/* วันที่ */}
                        <div className="bg-gray-50 px-3 py-2 border-b border-gray-200">
                          <div className="text-xs text-gray-500">{forecast.date}</div>
                          <div className="font-medium text-gray-700">{forecast.dayName}</div>
                        </div>

                        {/* ข้อมูลอากาศ */}
                        <div className="p-3 space-y-2">
                          {/* ไอคอนและสภาพอากาศ */}
                          <div className="text-center">
                            <div className="text-3xl mb-1">{getWeatherIcon(forecast.condition)}</div>
                            <div className="text-xs text-gray-600">{forecast.condition}</div>
                          </div>

                          {/* เปอร์เซ็นต์ฝน */}
                          <div className={`${getRainColor(forecast.rainChance)} rounded-lg px-2 py-3 text-center`}>
                            <div className="text-2xl font-bold">{forecast.rainChance}%</div>
                            <div className="text-xs">โอกาสฝนตก</div>
                          </div>

                          {/* อุณหภูมิ */}
                          <div className="text-center text-sm">
                            <div className="text-red-600 font-medium">↑ {forecast.maxTemp}°C</div>
                            <div className="text-blue-600 font-medium">↓ {forecast.minTemp}°C</div>
                          </div>

                          {/* ความชื้น และลม */}
                          <div className="border-t border-gray-200 pt-2 space-y-1">
                            <div className="flex items-center justify-between text-xs text-gray-600">
                              <span>💧 ความชื้น</span>
                              <span className="font-medium">{forecast.humidity}%</span>
                            </div>
                            <div className="flex items-center justify-between text-xs text-gray-600">
                              <span>💨 ลม</span>
                              <span className="font-medium">{forecast.windSpeed} km/h</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center text-gray-400">
            <div className="text-6xl mb-4">🌦️</div>
            <p className="text-lg">เลือกจังหวัดและอำเภอเพื่อดูพยากรณ์อากาศ</p>
          </div>
        )}
      </div>
    </div>
  );
}