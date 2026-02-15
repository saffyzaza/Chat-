'use client';

import { useState } from 'react';
import Link from 'next/link';
import { getAuthToken } from '../../utils/auth';
import { Markdown } from '../../components/ui/Markdown';
import { ChartRenderer } from '../../components/chat/chatMessage/ChartRenderer';
import { HiOutlineChatAlt2, HiOutlineArrowLeft } from 'react-icons/hi';

type ChatMessage = {
	id: string;
	role: 'user' | 'assistant';
	text: string;
	time: string;
	chart?: any;
};

export default function DiabetesChatPage() {
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [input, setInput] = useState('');
	const [loading, setLoading] = useState(false);

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
			const token = getAuthToken();
			const response = await fetch('/api/admin/diabetes', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					...(token ? { Authorization: token } : {}),
				},
				body: JSON.stringify({
					message: text,
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
					text: String(data?.reply || data?.message || 'ไม่มีคำตอบจาก AI'),
					chart: data?.chart,
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
		<div className="min-h-screen bg-[#f8f9fa]">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 h-16 flex items-center px-4 sm:px-6 lg:px-8 shrink-0">
        <Link 
          href="/admin" 
          className="mr-4 p-2 text-gray-500 hover:text-orange-600 hover:bg-orange-50 rounded-full transition-colors"
        >
          <HiOutlineArrowLeft className="w-6 h-6" />
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center text-orange-600">
             <HiOutlineChatAlt2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-800">ช่องแชทโรคเบาหวาน (Diabetes Chat)</h1>
            <p className="text-xs text-gray-500">ระบบให้คำปรึกษาและติดตามผู้ป่วยโรคเบาหวานด้วย AI</p>
          </div>
        </div>
      </div>

			<div className="max-w-6xl mx-auto p-6 space-y-6">

				<div className="bg-white border border-gray-200 rounded-lg p-4 text-sm text-gray-700">
					ระบบจะตอบคำถามเกี่ยวกับสถิติ ตัวเลข เป้าหมาย และผลการดำเนินงานด้านเบาหวานของหน่วยงานต่างๆ ตามฐานข้อมูลที่มี
				</div>

				<div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
					<div className="h-[58vh] overflow-auto p-4 space-y-3 bg-gray-50">
						{messages.length === 0 ? (
							<div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
                <HiOutlineChatAlt2 className="w-12 h-12 opacity-20" />
								<p className="text-sm">เริ่มต้นแชทได้เลย เช่น “ขอสรุปผลงานเบาหวานของโรงพยาบาล...” หรือ “เป้าหมายเทียบกับผลงานปีนี้เป็นอย่างไร”</p>
							</div>
						) : (
							messages.map((message) => (
								<div
									key={message.id}
									className={`rounded-lg border p-4 max-w-[85%] ${
										message.role === 'user'
											? 'bg-white border-orange-100 ml-auto'
											: 'bg-blue-50 border-blue-100 mr-auto'
									}`}
								>
									<div className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                    <span className={`w-2 h-2 rounded-full ${message.role === 'user' ? 'bg-orange-400' : 'bg-blue-400'}`}></span>
										{message.role === 'user' ? 'คุณ' : 'AI'} • {message.time}
									</div>
									{message.role === 'assistant' ? (
										<div className="flex flex-col gap-4">
											<Markdown className="text-sm text-gray-800 leading-relaxed">{message.text}</Markdown>
											{message.chart && (
												<div className="w-full h-fit min-h-[300px] border rounded-lg p-2 bg-white">
													<ChartRenderer chartData={message.chart} />
												</div>
											)}
										</div>
									) : (
										<div className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{message.text}</div>
									)}
								</div>
							))
						)}
						{loading && (
              <div className="flex items-center gap-2 text-sm text-gray-500 bg-white p-3 rounded-lg border border-gray-100 w-fit">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                </div>
                AI กำลังประมวลผล...
              </div>
            )}
					</div>

					<div className="border-t border-gray-200 p-4 flex gap-2 bg-white">
						<textarea
							value={input}
							onChange={(event) => setInput(event.target.value)}
							onKeyDown={(event) => {
								if (event.key === 'Enter' && !event.shiftKey) {
									event.preventDefault();
									sendMessage();
								}
							}}
							placeholder="พิมพ์คำถามของคุณที่นี่..."
							disabled={loading}
							className="flex-1 min-h-[50px] max-h-[150px] border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all resize-none"
              rows={1}
						/>
						<button
							onClick={sendMessage}
							disabled={loading || !input.trim()}
							className="px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors self-end h-[46px]"
						>
							ส่ง
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}

