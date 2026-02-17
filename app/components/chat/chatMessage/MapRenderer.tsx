'use client';

import React, { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { IoMapOutline, IoCloseOutline, IoResizeOutline, IoLayersOutline } from 'react-icons/io5';

const MapContainer = dynamic(() => import('react-leaflet').then((m) => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then((m) => m.TileLayer), { ssr: false });
const CircleMarker = dynamic(() => import('react-leaflet').then((m) => m.CircleMarker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then((m) => m.Popup), { ssr: false });

type AccidentMapPoint = {
  lat?: number | string;
  lon?: number | string;
  lng?: number | string;
  latitude?: number | string;
  longitude?: number | string;
  location?: string;
  point?: string;
  road?: string;
  area?: string;
  date?: string;
  time?: string;
  vehicleType?: string;
  vehicleTypes?: string[];
  raw?: Record<string, any>;
};

type MapPayload = {
  title?: string;
  subtitle?: string;
  points?: AccidentMapPoint[];
  center?: { lat?: number; lon?: number; lng?: number };
  zoom?: number;
};

interface MapRendererProps {
  mapData: MapPayload;
}

const toNumber = (value: any): number | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

export const MapRenderer: React.FC<MapRendererProps> = ({ mapData }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [previewMode, setPreviewMode] = useState<'street' | 'light'>('street');
  const [sizeMode, setSizeMode] = useState<'compact' | 'expanded'>('compact');

  const normalized = useMemo(() => {
    const list = Array.isArray(mapData?.points) ? mapData.points : [];

    const points = list
      .map((point, index) => {
        const lat = toNumber(point?.lat ?? point?.latitude);
        const lon = toNumber(point?.lon ?? point?.lng ?? point?.longitude);
        if (lat === null || lon === null) return null;

        const location = point?.location || point?.point || point?.area || point?.road || `จุดที่ ${index + 1}`;
        const date = point?.date || point?.raw?.['วันที่เกิดเหตุ'] || '-';
        const time = point?.time || point?.raw?.['เวลา'] || '-';
        const road = point?.road || point?.raw?.['สายทาง'] || '-';
        const area = point?.area || point?.raw?.['บริเวณที่เกิดเหตุ'] || '-';

        const directVehicle = typeof point?.vehicleType === 'string' ? point.vehicleType : '';
        const fromArray = Array.isArray(point?.vehicleTypes) ? point.vehicleTypes.filter(Boolean).join(', ') : '';
        const vehicleType = directVehicle || fromArray || '-';

        return {
          lat,
          lon,
          location,
          date,
          time,
          road,
          area,
          vehicleType,
          index,
        };
      })
      .filter(Boolean) as Array<{
        lat: number;
        lon: number;
        location: string;
        date: string;
        time: string;
        road: string;
        area: string;
        vehicleType: string;
        index: number;
      }>;

    const centerFromPayloadLat = toNumber(mapData?.center?.lat);
    const centerFromPayloadLon = toNumber(mapData?.center?.lon ?? mapData?.center?.lng);

    const center =
      centerFromPayloadLat !== null && centerFromPayloadLon !== null
        ? { lat: centerFromPayloadLat, lon: centerFromPayloadLon }
        : points.length > 0
          ? {
              lat: points.reduce((sum, point) => sum + point.lat, 0) / points.length,
              lon: points.reduce((sum, point) => sum + point.lon, 0) / points.length,
            }
          : { lat: 15.2447, lon: 104.8472 };

    const zoom = typeof mapData?.zoom === 'number' ? mapData.zoom : points.length > 1 ? 9 : 11;

    return { points, center, zoom };
  }, [mapData]);

  const mapHeight = sizeMode === 'compact' ? '300px' : '460px';
  const tileUrl =
    previewMode === 'street'
      ? 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
      : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
  const tileAttribution =
    previewMode === 'street'
      ? '&copy; OpenStreetMap contributors'
      : '&copy; OpenStreetMap contributors &copy; CARTO';

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm my-3 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-3">
        <div>
          <h4 className="text-sm md:text-base font-semibold text-gray-800">{mapData?.title || 'แผนที่จุดเกิดเหตุอุบัติเหตุ'}</h4>
          <p className="text-xs text-gray-500">
            พบพิกัด {normalized.points.length} จุด • แสดงวันที่ เวลา จุดเกิดเหตุ และสถานที่
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!isOpen ? (
            <button
              onClick={() => setIsOpen(true)}
              className="px-3 py-1.5 rounded-md bg-orange-500 text-white text-xs md:text-sm hover:bg-orange-600 transition-colors flex items-center gap-1"
            >
              <IoMapOutline size={16} />
              ดูแผนที่
            </button>
          ) : (
            <button
              onClick={() => setIsOpen(false)}
              className="px-3 py-1.5 rounded-md bg-gray-100 text-gray-700 text-xs md:text-sm hover:bg-gray-200 transition-colors flex items-center gap-1"
            >
              <IoCloseOutline size={16} />
              ปิดแผนที่
            </button>
          )}
        </div>
      </div>

      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/70 flex flex-wrap items-center gap-2">
        <button
          onClick={() => setPreviewMode((prev) => (prev === 'street' ? 'light' : 'street'))}
          className="px-2.5 py-1.5 rounded-md border border-gray-200 bg-white text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-1"
        >
          <IoLayersOutline size={14} />
          Preview: {previewMode === 'street' ? 'Street' : 'Light'}
        </button>
        <button
          onClick={() => setSizeMode((prev) => (prev === 'compact' ? 'expanded' : 'compact'))}
          className="px-2.5 py-1.5 rounded-md border border-gray-200 bg-white text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-1"
        >
          <IoResizeOutline size={14} />
          ขนาด: {sizeMode === 'compact' ? 'Compact' : 'Expanded'}
        </button>
      </div>

      {!isOpen ? (
        <div className="p-4">
          <div className="text-xs text-gray-500 mb-2">Preview รายการจุด (คลิก “ดูแผนที่” เพื่อเปิดแผนที่)</div>
          <div className="overflow-auto max-h-48 border border-gray-100 rounded-md">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 text-gray-700">
                <tr>
                  <th className="px-2 py-2 text-left">จุด</th>
                  <th className="px-2 py-2 text-left">วันที่</th>
                  <th className="px-2 py-2 text-left">เวลา</th>
                  <th className="px-2 py-2 text-left">สถานที่</th>
                </tr>
              </thead>
              <tbody>
                {normalized.points.slice(0, 8).map((point) => (
                  <tr key={`${point.lat}-${point.lon}-${point.index}`} className="border-t border-gray-100">
                    <td className="px-2 py-2 text-gray-700">{point.location}</td>
                    <td className="px-2 py-2 text-gray-600">{point.date}</td>
                    <td className="px-2 py-2 text-gray-600">{point.time}</td>
                    <td className="px-2 py-2 text-gray-600">{point.road !== '-' ? point.road : point.area !== '-' ? point.area : point.location}</td>
                  </tr>
                ))}
                {normalized.points.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-4 text-center text-gray-400">ไม่มีพิกัดสำหรับแสดงแผนที่</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div style={{ height: mapHeight }} className="w-full">
          <MapContainer
            center={[normalized.center.lat, normalized.center.lon]}
            zoom={normalized.zoom}
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom
          >
            <TileLayer url={tileUrl} attribution={tileAttribution} />
            {normalized.points.map((point) => (
              <CircleMarker
                key={`${point.lat}-${point.lon}-${point.index}`}
                center={[point.lat, point.lon]}
                radius={7}
                pathOptions={{
                  color: '#f97316',
                  fillColor: '#fb923c',
                  fillOpacity: 0.65,
                  weight: 2,
                }}
              >
                <Popup>
                  <div className="text-sm min-w-[220px]">
                    <div className="font-semibold text-gray-800 mb-1">{point.location}</div>
                    <div>วันที่: {point.date}</div>
                    <div>เวลา: {point.time}</div>
                    <div>สายทาง: {point.road}</div>
                    <div>บริเวณ: {point.area}</div>
                    <div>สถานที่: {point.road !== '-' ? point.road : point.area !== '-' ? point.area : point.location}</div>
                    <div>พิกัด: {point.lat}, {point.lon}</div>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>
      )}
    </div>
  );
};
