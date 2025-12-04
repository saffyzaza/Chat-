// วิธีใช้ระบบ Authentication ในหน้าอื่นๆ

// 1. ตรวจสอบว่า User Login หรือยัง
export function isUserLoggedIn(): boolean {
  if (typeof window === 'undefined') return false;
  const user = localStorage.getItem('user');
  return user !== null;
}

// 2. ดึงข้อมูล User
export function getCurrentUser() {
  if (typeof window === 'undefined') return null;
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
}

// 3. ดึง Token
export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

// 4. ตรวจสอบและ Redirect ถ้ายังไม่ Login
export function requireAuth(redirectTo = '/') {
  if (!isUserLoggedIn()) {
    window.location.href = redirectTo;
    return false;
  }
  return true;
}

// 5. เรียก API พร้อม Token
export async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = getAuthToken();
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: token }),
    ...options.headers,
  };

  return fetch(url, {
    ...options,
    headers,
  });
}

// ตัวอย่างการใช้งาน:
/*
// ในหน้า Component
'use client';
import { useState, useEffect } from 'react';
import { getCurrentUser, requireAuth } from '@/app/utils/auth';

export default function ProfilePage() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // ตรวจสอบว่า Login หรือยัง
    if (!requireAuth()) return;
    
    // ดึงข้อมูล User
    const userData = getCurrentUser();
    setUser(userData);
  }, []);

  if (!user) return <div>Loading...</div>;

  return (
    <div>
      <h1>Welcome, {user.name}!</h1>
      <p>Email: {user.email}</p>
    </div>
  );
}

// เรียก API พร้อม Authentication
import { fetchWithAuth } from '@/app/utils/auth';

async function saveData() {
  const response = await fetchWithAuth('/api/data', {
    method: 'POST',
    body: JSON.stringify({ data: 'something' }),
  });
  
  const result = await response.json();
  console.log(result);
}
*/
