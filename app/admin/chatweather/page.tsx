'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getAuthToken } from '../../utils/auth';
import { Markdown } from '../../components/ui/Markdown';

type ChatMessage = {
	id: string;
	role: 'user' | 'assistant';
	text: string;
	time: string;
};

type WeatherMetaResponse = {
	success?: boolean;
	center?: {
		lat: number;
		lon: number;
	};
};

export default function AdminChatWeatherPage() {
	const [provinces, setProvinces] = useState<string[]>([]);
	const [contextInfo, setContextInfo] = useState<{
		province: string;
		district: string;
		days: number;
		lat: number;
		lon: number;
	} | null>(null);

	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [input, setInput] = useState('');
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		const fetchProvinces = async () => {
			try {
				const response = await fetch('/api/weather');
				const data = await response.json();
				if (data?.success && Array.isArray(data?.provinces)) {
					setProvinces(data.provinces);
				}
			} catch (error) {
				console.error('Error fetching provinces:', error);
			}
		};

		fetchProvinces();
	}, []);

	const resolveWeatherContext = async (text: string) => {
		const defaultProvince = 'อุบลราชธานี';
		const defaultDistrict = 'วารินชำราบ';
		const dayMatch = text.match(/(\d+)\s*วัน/);
		const parsedDays = dayMatch ? parseInt(dayMatch[1], 10) : 1;
		const resolvedDays = Number.isFinite(parsedDays) ? Math.min(10, Math.max(1, parsedDays)) : 1;

		const provinceFromText =
			provinces.find((item) => text.includes(item)) ||
			(text.includes('อุบล') ? defaultProvince : undefined) ||
			defaultProvince;

		const districtRes = await fetch(`/api/weather?province=${encodeURIComponent(provinceFromText)}`);
		const districtData = await districtRes.json().catch(() => ({}));
		const districtList: string[] = Array.isArray(districtData?.districts) ? districtData.districts : [];

		const districtFromText =
			districtList.find((item) => text.includes(item)) ||
			(provinceFromText === defaultProvince ? defaultDistrict : districtList[0]);

		if (!districtFromText) {
			throw new Error('ไม่พบอำเภอที่ใช้งานได้จากข้อความและข้อมูลระบบ');
		}

		const metaRes = await fetch(
			`/api/weather?province=${encodeURIComponent(provinceFromText)}&district=${encodeURIComponent(districtFromText)}&metadataOnly=true`
		);
		const metaData = (await metaRes.json().catch(() => ({}))) as WeatherMetaResponse;
		if (!metaData?.success || !metaData?.center) {
			throw new Error('ไม่สามารถระบุพิกัดจากจังหวัด/อำเภอที่ตรวจพบได้');
		}

		return {
			province: provinceFromText,
			district: districtFromText,
			days: resolvedDays,
			lat: Number(metaData.center.lat),
			lon: Number(metaData.center.lon),
		};
	};

	const sendMessage = async () => {
		const text = input.trim();
		if (!text || loading) return;

		const userMessage: ChatMessage = {
			id: `${Date.now()}-user`,
			role: 'user',
			text,
			time: new Date().toLocaleTimeString('th-TH'),
		};

		setMessages((prev) => [...prev, userMessage]);
		setInput('');
		setLoading(true);

		try {
			const resolved = await resolveWeatherContext(text);
			setContextInfo(resolved);

			const token = getAuthToken();
			const response = await fetch('/api/admin/chatweather', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					...(token ? { Authorization: token } : {}),
				},
				body: JSON.stringify({
					message: text,
					lat: resolved.lat,
					lon: resolved.lon,
					days: resolved.days,
				}),
			});

			const data = await response.json().catch(() => ({}));
			if (!response.ok) {
				throw new Error(data?.message || 'ไม่สามารถเรียก AI ได้');
			}

			setMessages((prev) => [
				...prev,
				{
					id: `${Date.now()}-assistant`,
					role: 'assistant',
					text: String(data?.reply || data?.summary || 'ไม่มีคำตอบจาก AI'),
					time: new Date().toLocaleTimeString('th-TH'),
				},
			]);
		} catch (error: any) {
			setMessages((prev) => [
				...prev,
				{
					id: `${Date.now()}-error`,
					role: 'assistant',
					text: error?.message || 'เกิดข้อผิดพลาดในการเรียก API',
					time: new Date().toLocaleTimeString('th-TH'),
				},
			]);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="min-h-screen bg-gray-100">
			<div className="max-w-6xl mx-auto p-6 space-y-6">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-2xl font-bold text-gray-800">🌦️ แชทวิเคราะห์อากาศ</h1>
						<p className="text-sm text-gray-500">ถามคำถามสภาพอากาศและเชื่อมบริบทกับข้อมูลอุบัติเหตุ</p>
					</div>
					<Link
						href="/admin"
						className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg"
					>
						กลับหน้าแอดมิน
					</Link>
				</div>

				<div className="bg-white border border-gray-200 rounded-lg p-4 text-sm text-gray-700">
					ระบบจะอ่านจังหวัด/อำเภอ/จำนวนวันจากข้อความผู้ใช้โดยอัตโนมัติ (ดีฟอลต์: อุบลราชธานี • วารินชำราบ • 1 วัน)
					{contextInfo && (
						<div className="mt-2 text-xs text-gray-600">
							บริบทล่าสุด: {contextInfo.province} / {contextInfo.district} / {contextInfo.days} วัน / {contextInfo.lat.toFixed(4)},{' '}
							{contextInfo.lon.toFixed(4)}
						</div>
					)}
				</div>

				<div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
					<div className="h-[58vh] overflow-auto p-4 space-y-3 bg-gray-50">
						{messages.length === 0 ? (
							<p className="text-sm text-gray-500">เริ่มต้นแชทได้เลย เช่น “พยากรณ์อากาศอุบลราชธานี 3 วันข้างหน้า”</p>
						) : (
							messages.map((message) => (
								<div
									key={message.id}
									className={`rounded-lg border p-3 ${
										message.role === 'user'
											? 'bg-white border-orange-100'
											: 'bg-blue-50 border-blue-100'
									}`}
								>
									<div className="text-xs text-gray-500 mb-1">
										{message.role === 'user' ? 'คุณ' : 'AI'} • {message.time}
									</div>
									{message.role === 'assistant' ? (
										<Markdown className="text-sm text-gray-800">{message.text}</Markdown>
									) : (
										<div className="text-sm text-gray-800 whitespace-pre-wrap">{message.text}</div>
									)}
								</div>
							))
						)}
						{loading && <p className="text-sm text-gray-500">AI กำลังตอบ...</p>}
					</div>

					<div className="border-t border-gray-200 p-4 flex gap-2">
						<textarea
							value={input}
							onChange={(event) => setInput(event.target.value)}
							onKeyDown={(event) => {
								if (event.key === 'Enter' && !event.shiftKey) {
									event.preventDefault();
									sendMessage();
								}
							}}
							placeholder="พิมพ์คำถามของคุณ..."
							disabled={loading}
							className="flex-1 min-h-[90px] border border-gray-300 rounded-lg px-3 py-2 text-sm"
						/>
						<button
							onClick={sendMessage}
							disabled={loading || !input.trim()}
							className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed"
						>
							ส่ง
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}

