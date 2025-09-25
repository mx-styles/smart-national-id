// Type definitions for the Smart e-National ID application

export interface User {
  id: number;
  email: string;
  full_name: string;
  phone: string;
  role: 'citizen' | 'staff' | 'admin';
  national_id?: string;
  is_active: boolean;
  created_at: string;
}

export interface ServiceCenter {
  id: number;
  name: string;
  code: string;
  address: string;
  city: string;
  province: string;
  phone?: string;
  email?: string;
  operating_hours: string;
  opening_time: string;
  closing_time: string;
  max_daily_capacity: number;
  current_queue_length: number;
  average_service_time: number;
  is_active: boolean;
  is_operational: boolean;
  latitude?: number;
  longitude?: number;
  created_at: string;
  updated_at?: string;
}

export interface ServiceCenterFormData {
  name: string;
  code: string;
  address: string;
  city: string;
  province: string;
  phone?: string;
  email?: string;
  opening_time: string;
  closing_time: string;
  max_daily_capacity: number;
  average_service_time: number;
  latitude?: number;
  longitude?: number;
}

export interface Appointment {
  id: number;
  user_id: number;
  service_center_id: number;
  appointment_date: string;
  appointment_time: string;
  service_type: string;
  status: 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  queue_position?: number;
  estimated_wait_time?: number;
  created_at: string;
  updated_at: string;
  service_center?: ServiceCenter;
  user?: User;
}

export interface QueueItem {
  id: number;
  appointment_id: number;
  service_center_id: number;
  position: number;
  estimated_time: string;
  status: 'waiting' | 'being_served' | 'completed';
  created_at: string;
  appointment?: Appointment;
}

export interface Notification {
  id: number;
  user_id: number;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  is_read: boolean;
  created_at: string;
}

export interface DashboardStats {
  total_appointments: number;
  appointments_today: number;
  queue_length: number;
  average_wait_time: number;
  service_centers_active: number;
  users_registered: number;
}

export {};