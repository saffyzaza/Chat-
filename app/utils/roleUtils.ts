/**
 * Role Management Utilities
 * ฟังก์ชันสำหรับจัดการและตรวจสอบ role ของ user
 */

export type UserRole = 'admin' | 'user';

export interface UserWithRole {
  id: number;
  name: string;
  email: string;
  role: UserRole;
}

/**
 * ตรวจสอบว่า user เป็น admin หรือไม่
 */
export const isAdmin = (user: UserWithRole | null): boolean => {
  return user?.role === 'admin';
};

/**
 * ตรวจสอบว่า user เป็น user ธรรมดาหรือไม่
 */
export const isRegularUser = (user: UserWithRole | null): boolean => {
  return user?.role === 'user';
};

/**
 * ดึงข้อมูล user จาก localStorage
 */
export const getCurrentUser = (): UserWithRole | null => {
  if (typeof window === 'undefined') return null;
  
  const userStr = localStorage.getItem('user');
  if (!userStr) return null;
  
  try {
    const user = JSON.parse(userStr);
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role || 'user'
    };
  } catch {
    return null;
  }
};

/**
 * ตรวจสอบว่า user มีสิทธิ์เข้าถึงฟีเจอร์ admin หรือไม่
 */
export const hasAdminAccess = (): boolean => {
  const user = getCurrentUser();
  return isAdmin(user);
};

/**
 * ตรวจสอบว่า user login แล้วหรือไม่
 */
export const isAuthenticated = (): boolean => {
  return getCurrentUser() !== null;
};

/**
 * รับ role label เป็นภาษาไทย
 */
export const getRoleLabel = (role: UserRole): string => {
  const labels: Record<UserRole, string> = {
    admin: 'ผู้ดูแลระบบ',
    user: 'ผู้ใช้งาน'
  };
  return labels[role];
};

/**
 * รับสีสำหรับแสดง role badge
 */
export const getRoleColor = (role: UserRole): string => {
  const colors: Record<UserRole, string> = {
    admin: 'bg-orange-500 text-white',
    user: 'bg-gray-500 text-white'
  };
  return colors[role];
};
