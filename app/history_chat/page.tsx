'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { IoSearchOutline, IoChatbubbleEllipsesOutline, IoTrashOutline, IoEllipsisHorizontal, IoStarOutline, IoCreateOutline } from 'react-icons/io5';
import { useChatHistory } from '../hooks/useChatHistory';

export default function HistoryChatPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [selectedChats, setSelectedChats] = useState<string[]>([]);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // ใช้ chat history hook
  const {
    sessions,
    isLoading,
    deleteSession,
    deleteSessions,
    renameSession,
    search,
    filterByDate,
    resetFilter,
    loadSessions
  } = useChatHistory();

  // โหลดข้อมูลเมื่อ component mount
  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  // ตัวอย่างข้อมูล (สำรอง - ถ้าไม่มีข้อมูลจริง)
  const [chatHistory] = useState([
    {
      id: '1',
      title: 'Unclear message',
      preview: '',
      date: '2025-11-12T10:30:00',
      messageCount: 15
    },
    {
      id: '2',
      title: 'Unclear input',
      preview: '',
      date: '2025-11-12T14:20:00',
      messageCount: 23
    },
    {
      id: '3',
      title: 'Numeric value interpretation',
      preview: '',
      date: '2025-11-12T09:15:00',
      messageCount: 18
    },
    {
      id: '4',
      title: 'Thai numeral conversion',
      preview: '',
      date: '2025-11-12T16:45:00',
      messageCount: 12
    },
    {
      id: '5',
      title: 'Thai Tax Calculation Website Template',
      preview: '',
      date: '2025-09-16T11:00:00',
      messageCount: 30
    },
    {
      id: '6',
      title: 'Design microservices',
      preview: '',
      date: '2025-08-16T11:00:00',
      messageCount: 30
    }
  ]);

  // ใช้ข้อมูลจาก localStorage แทน mock data
  const displaySessions = sessions.length > 0 ? sessions : chatHistory.map(ch => ({
    id: ch.id,
    title: ch.title,
    preview: ch.preview,
    createdAt: ch.date,
    updatedAt: ch.date,
    messageCount: ch.messageCount,
    messages: []
  }));

  // กรองข้อมูลตามการค้นหา
  const filteredHistory = displaySessions.filter(chat => {
    const matchesSearch = chat.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         chat.preview.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;

    const chatDate = new Date(chat.updatedAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - chatDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    switch (selectedFilter) {
      case 'today':
        return diffDays <= 1;
      case 'week':
        return diffDays <= 7;
      case 'month':
        return diffDays <= 30;
      default:
        return true;
    }
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const diffMonths = Math.floor(diffDays / 30);

    if (diffDays <= 1) {
      return `4 days ago`;
    } else if (diffDays <= 7) {
      return `${diffDays} days ago`;
    } else if (diffMonths === 2) {
      return `2 months ago`;
    } else if (diffMonths === 3) {
      return `3 months ago`;
    } else if (diffMonths >= 1) {
      return `${diffMonths} months ago`;
    } else {
      return `${diffDays} days ago`;
    }
  };

  const handleDeleteChat = (id: string) => {
    // ลบประวัติการสนทนา
    deleteSession(id);
    setOpenMenuId(null);
  };

  const handleChatClick = (id: string) => {
    if (selectedChats.length > 0) {
      toggleChatSelection(id);
    } else {
      // เปิดการสนทนา - redirect ไปหน้า chat พร้อม session ID
      router.push(`/?session=${id}`);
    }
  };

  const toggleChatSelection = (id: string) => {
    setSelectedChats(prev => 
      prev.includes(id) 
        ? prev.filter(chatId => chatId !== id)
        : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedChats.length === filteredHistory.length) {
      setSelectedChats([]);
    } else {
      setSelectedChats(filteredHistory.map(chat => chat.id));
    }
  };

  const handleDeleteSelected = () => {
    // ลบ chats ที่เลือกทั้งหมด
    deleteSessions(selectedChats);
    setSelectedChats([]);
  };

  const toggleMenu = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenMenuId(openMenuId === id ? null : id);
  };

  const handleMenuAction = (action: string, id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    switch (action) {
      case 'select':
        toggleChatSelection(id);
        break;
      case 'delete':
        handleDeleteChat(id);
        break;
      case 'rename':
        const newTitle = prompt('Enter new title:');
        if (newTitle) {
          renameSession(id, newTitle);
        }
        break;
      case 'star':
      case 'add-to-project':
        alert(`${action} feature coming soon!`);
        break;
    }
    
    setOpenMenuId(null);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-6xl mx-auto px-6 py-20">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-semibold text-gray-600">
            Chats
          </h1>
          <button 
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg font-medium hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors flex items-center gap-2"
          >
            <span className="text-lg">+</span>
            New chat
          </button>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <IoSearchOutline className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search your chats..."
              value={searchQuery}
              onChange={(e) => {
                const query = e.target.value;
                setSearchQuery(query);
                if (query.trim()) {
                  search(query);
                } else {
                  resetFilter();
                }
              }}
              className="w-full pl-16 pr-6 py-5 rounded-lg border border-gray-200 dark:border-gray-700 
                       bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400
                       focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-transparent
                       transition-all duration-200"
            />
          </div>
        </div>

        {/* Info Text */}
        <div className="mb-4 text-sm text-gray-600 dark:text-gray-400 flex items-center gap-4">
          {selectedChats.length === 0 ? (
            <>
              {filteredHistory.length} chats with Claude{' '}
              <button 
                onClick={toggleSelectAll}
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                Select
              </button>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={selectedChats.length === filteredHistory.length && filteredHistory.length > 0}
                onChange={toggleSelectAll}
                className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <span className="text-gray-900 dark:text-white font-medium">
                {selectedChats.length} selected
              </span>
              <button
                onClick={handleDeleteSelected}
                disabled={selectedChats.length === 0}
                className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Archive selected"
              >
                <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
              </button>
              <button
                onClick={handleDeleteSelected}
                disabled={selectedChats.length === 0}
                className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Delete selected"
              >
                <IoTrashOutline className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
              <button
                onClick={() => setSelectedChats([])}
                className="ml-auto p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                aria-label="Cancel selection"
              >
                <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Chat History List */}
        <div className="border-t border-gray-200 dark:border-gray-700">
          {isLoading ? (
            <div className="text-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white mx-auto mb-4"></div>
              <p className="text-gray-500 dark:text-gray-400">Loading chats...</p>
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="text-center py-16">
              <IoChatbubbleEllipsesOutline className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
              <p className="text-gray-500 dark:text-gray-400 text-lg">
                No chats found
              </p>
            </div>
          ) : (
            filteredHistory.map((chat) => (
              <div
                key={chat.id}
                className={`border-b border-gray-200 dark:border-gray-700 py-4 px-2 
                         hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer 
                         transition-colors group relative ${selectedChats.includes(chat.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                onClick={() => handleChatClick(chat.id)}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selectedChats.includes(chat.id)}
                    onChange={() => toggleChatSelection(chat.id)}
                    onClick={(e) => e.stopPropagation()}
                    className={`w-5 h-5 mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer transition-opacity ${
                      selectedChats.includes(chat.id) 
                        ? 'opacity-100' 
                        : 'opacity-0 group-hover:opacity-100'
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-medium text-gray-900 dark:text-white mb-1">
                      {chat.title}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Last message {formatDate(chat.updatedAt)}
                    </p>
                  </div>
                  
                  {/* More Options Button */}
                  <div className="relative">
                    <button
                      onClick={(e) => toggleMenu(chat.id, e)}
                      className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                      aria-label="More options"
                    >
                      <IoEllipsisHorizontal className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </button>

                    {/* Dropdown Menu */}
                    {openMenuId === chat.id && (
                      <>
                        {/* Backdrop to close menu */}
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setOpenMenuId(null)}
                        />
                        
                        <div className="absolute right-0 top-10 z-20 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-2">
                          <button
                            onClick={(e) => handleMenuAction('select', chat.id, e)}
                            className="w-full px-4 py-2.5 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3"
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Select
                          </button>
                          
                          <button
                            onClick={(e) => handleMenuAction('star', chat.id, e)}
                            className="w-full px-4 py-2.5 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3"
                          >
                            <IoStarOutline className="w-5 h-5" />
                            Star
                          </button>
                          
                          <button
                            onClick={(e) => handleMenuAction('rename', chat.id, e)}
                            className="w-full px-4 py-2.5 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3"
                          >
                            <IoCreateOutline className="w-5 h-5" />
                            Rename
                          </button>
                          
                          <button
                            onClick={(e) => handleMenuAction('add-to-project', chat.id, e)}
                            className="w-full px-4 py-2.5 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3"
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                            </svg>
                            Add to project
                          </button>
                          
                          <div className="my-1 border-t border-gray-200 dark:border-gray-700" />
                          
                          <button
                            onClick={(e) => handleMenuAction('delete', chat.id, e)}
                            className="w-full px-4 py-2.5 text-left text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3"
                          >
                            <IoTrashOutline className="w-5 h-5" />
                            Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
