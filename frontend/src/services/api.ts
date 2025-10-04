import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (email: string, password: string) => {
    const formData = new FormData();
    formData.append('username', email);
    formData.append('password', password);
    return api.post('/auth/login', formData);
  },
  register: (userData: any) => api.post('/auth/register', userData),
  getCurrentUser: () => api.get('/auth/me'),
};

export const appointmentsAPI = {
  getMyAppointments: () => api.get('/appointments/my'),
  bookAppointment: (appointmentData: any) => api.post('/appointments/book', appointmentData),
  cancelAppointment: (appointmentId: number) => api.put(`/appointments/${appointmentId}/cancel`),
  getAppointmentDetails: (appointmentId: number) => api.get(`/appointments/${appointmentId}`),
};

export const queueAPI = {
  getCurrentStatus: (serviceCenterId: number) => api.get(`/queue/status/${serviceCenterId}`),
  checkIn: (appointmentId: number) => api.post(`/queue/checkin/${appointmentId}`),
  getQueuePosition: (appointmentId: number) => api.get(`/queue/position/${appointmentId}`),
};

export const serviceCentersAPI = {
  getAll: () => api.get('/service-centers'),
  getById: (id: number) => api.get(`/service-centers/${id}`),
  getAvailableSlots: (centerId: number, date: string) => api.get(`/service-centers/${centerId}/slots?date=${date}`),
};

export const adminAPI = {
  getQueueManagement: (serviceCenterId: number | string) => api.get(`/admin/queue/${serviceCenterId}`),
  callNextCustomer: (serviceCenterId: number | string) => api.post(`/admin/queue/${serviceCenterId}/next`),
  completeService: (appointmentId: number) => api.put(`/admin/appointments/${appointmentId}/complete`),
  updateAppointmentStatus: (appointmentId: number, status: string) => 
    api.put(`/admin/appointments/${appointmentId}/status`, { status }),
  getDashboardStats: () => api.get('/admin/dashboard/stats'),
  getAppointments: (params?: any) => api.get('/admin/appointments', { params }),
  // Service Center Management
  getServiceCenters: () => api.get('/admin/service-centers'),
  getServiceCenter: (id: number) => api.get(`/admin/service-centers/${id}`),
  createServiceCenter: (data: any) => api.post('/admin/service-centers', data),
  updateServiceCenter: (id: number, data: any) => api.put(`/admin/service-centers/${id}`, data),
  deleteServiceCenter: (id: number) => api.delete(`/admin/service-centers/${id}`),
  // User Management
  getUsers: () => api.get('/admin/users'),
  getUser: (id: number) => api.get(`/admin/users/${id}`),
  createUser: (data: any) => api.post('/admin/users', data),
  updateUser: (id: number, data: any) => api.put(`/admin/users/${id}`, data),
  deleteUser: (id: number) => api.delete(`/admin/users/${id}`),
  toggleUserStatus: (id: number, isActive: boolean) => api.put(`/admin/users/${id}/status`, { is_active: isActive }),
  resetUserPassword: (id: number, newPassword: string) => api.put(`/admin/users/${id}/password`, { new_password: newPassword }),
};

export const notificationsAPI = {
  getMyNotifications: () => api.get('/notifications/my'),
  markAsRead: (notificationId: number) => api.put(`/notifications/${notificationId}/read`),
  sendTestNotification: (data: any) => api.post('/notifications/test', data),
};

export default api;