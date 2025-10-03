import React, { useState, useEffect } from 'react';
import {
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  Button,
  Box,
  Chip,
  Alert,
  LinearProgress,
  Stack
} from '@mui/material';
import {
  EventAvailable,
  Schedule,
  LocationOn,
  Notifications,
  Add as AddIcon,
  Queue
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { appointmentsAPI, queueAPI } from '../services/api';
import { toast } from 'react-toastify';
import PageContainer from '../components/PageContainer';

// Type definitions
interface ServiceCenter {
  id: number;
  name: string;
}

interface User {
  id: number;
  first_name: string;
  last_name: string;
}

interface Appointment {
  id: number;
  ticket_number: string;
  appointment_type: string;
  appointment_date: string;
  scheduled_time: string;
  status: string;
  service_center?: ServiceCenter;
  user?: User;
}

interface QueueStatus {
  position: number;
  estimated_wait_time: number;
}

interface QueueStatusMap {
  [key: number]: QueueStatus;
}

const Dashboard: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [queueStatus, setQueueStatus] = useState<QueueStatusMap>({});
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      const response = await appointmentsAPI.getMyAppointments();
      setAppointments(response.data);
      
      // Fetch queue status for active appointments
      const activeAppointments = response.data.filter(
        (apt: any) => apt.status === 'confirmed' || apt.status === 'in_progress'
      );
      
      for (const appointment of activeAppointments) {
        try {
          const queueResponse = await queueAPI.getQueuePosition(appointment.id);
          setQueueStatus(prev => ({
            ...prev,
            [appointment.id]: queueResponse.data
          }));
        } catch (error) {
          console.error('Failed to fetch queue status:', error);
        }
      }
    } catch (error) {
      toast.error('Failed to fetch appointments');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    const colors = {
      scheduled: 'default' as const,
      confirmed: 'primary' as const,
      in_progress: 'secondary' as const,
      completed: 'success' as const,
      cancelled: 'error' as const,
      no_show: 'warning' as const
    };
    return colors[status as keyof typeof colors] || 'default';
  };

  const formatDate = (dateString: string): string => {
    if (!dateString) return 'N/A';
    try {
      // Handle both full datetime strings and date-only strings
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        // Try parsing as YYYY-MM-DD format
        const parts = dateString.split('-');
        if (parts.length === 3) {
          const [year, month, day] = parts.map(Number);
          const parsedDate = new Date(year, month - 1, day);
          if (!isNaN(parsedDate.getTime())) {
            return parsedDate.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            });
          }
        }
        return 'Invalid Date';
      }
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid Date';
    }
  };

  const formatTime = (timeString: string): string => {
    if (!timeString) return 'N/A';
    try {
      // Handle both full datetime strings and time-only strings (HH:MM:SS or HH:MM)
      if (timeString.includes('T') || timeString.includes(' ')) {
        // Full datetime string
        const date = new Date(timeString);
        if (isNaN(date.getTime())) return 'Invalid Time';
        return date.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit'
        });
      } else {
        // Time-only string (HH:MM:SS or HH:MM)
        const timeParts = timeString.split(':');
        if (timeParts.length >= 2) {
          const hours = parseInt(timeParts[0], 10);
          const minutes = parseInt(timeParts[1], 10);
          if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
            const date = new Date();
            date.setHours(hours, minutes, 0, 0);
            return date.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit'
            });
          }
        }
        return 'Invalid Time';
      }
    } catch (error) {
      console.error('Error formatting time:', error);
      return 'Invalid Time';
    }
  };

  const formatDateTime = (dateString: string, timeString?: string): string => {
    if (!dateString) return 'N/A';
    try {
      let date: Date;
      
      if (timeString) {
        // Combine date and time strings like in MyQueue.tsx
        const iso = `${dateString}T${timeString}`;
        date = new Date(iso);
      } else {
        // Single datetime string
        date = new Date(dateString);
      }
      
      if (isNaN(date.getTime())) {
        // Try parsing as YYYY-MM-DD format for date only
        const parts = dateString.split('-');
        if (parts.length === 3) {
          const [year, month, day] = parts.map(Number);
          const parsedDate = new Date(year, month - 1, day);
          if (!isNaN(parsedDate.getTime())) {
            return parsedDate.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            });
          }
        }
        return 'Invalid Date/Time';
      }
      
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Error formatting datetime:', error);
      return 'Invalid Date/Time';
    }
  };

  // Helper functions for check-in eligibility
  const isToday = (dateString: string): boolean => {
    if (!dateString) return false;
    try {
      // dateString expected as YYYY-MM-DD
      const [y, m, d] = dateString.split('-').map(Number);
      const apptLocal = new Date(y, (m || 1) - 1, d || 1);
      const today = new Date();
      return (
        apptLocal.getFullYear() === today.getFullYear() &&
        apptLocal.getMonth() === today.getMonth() &&
        apptLocal.getDate() === today.getDate()
      );
    } catch (error) {
      return false;
    }
  };

  const isPastAppointment = (dateString: string, timeString?: string): boolean => {
    if (!dateString) return false;
    try {
      const [y, m, d] = dateString.split('-').map(Number);
      const apptDate = new Date(y, (m || 1) - 1, d || 1);
      const today = new Date();
      
      // If it's a past date, it's definitely past
      if (apptDate < new Date(today.getFullYear(), today.getMonth(), today.getDate())) {
        return true;
      }
      
      // If it's today, check the time
      if (isToday(dateString) && timeString) {
        const [hours, minutes] = timeString.split(':').map(Number);
        const apptDateTime = new Date(y, (m || 1) - 1, d || 1, hours || 0, minutes || 0);
        return apptDateTime < new Date();
      }
      
      return false;
    } catch (error) {
      return false;
    }
  };

  const canCheckIn = (appointment: Appointment): boolean => {
    return (
      appointment.status === 'scheduled' &&
      isToday(appointment.appointment_date) &&
      !isPastAppointment(appointment.appointment_date, appointment.scheduled_time)
    );
  };

  const handleCheckIn = async (appointmentId: number): Promise<void> => {
    try {
      const appointment = appointments.find(apt => apt.id === appointmentId);
      if (!appointment) {
        toast.error('Appointment not found');
        return;
      }

      if (!canCheckIn(appointment)) {
        if (appointment.status !== 'scheduled') {
          toast.error('Only scheduled appointments can be checked in');
        } else if (!isToday(appointment.appointment_date)) {
          toast.error('You can only check in on the appointment date');
        } else if (isPastAppointment(appointment.appointment_date, appointment.scheduled_time)) {
          toast.error('Cannot check in for past appointments');
        } else {
          toast.error('Check-in not available for this appointment');
        }
        return;
      }

      await queueAPI.checkIn(appointmentId);
      toast.success('Checked in successfully!');
      fetchAppointments(); // Refresh data
    } catch (error: any) {
      console.error('Check-in error:', error);
      if (error.response?.data?.detail) {
        toast.error(error.response.data.detail);
      } else {
        toast.error('Failed to check in. Please try again.');
      }
    }
  };

  if (loading) {
    return (
      <PageContainer title="Loading your personalized dashboard...">
        <LinearProgress />
      </PageContainer>
    );
  }

  const upcomingAppointments = appointments.filter(
    apt => apt.status === 'scheduled' || apt.status === 'confirmed'
  );

  const recentAppointments = appointments.filter(
    apt => apt.status === 'completed' || apt.status === 'cancelled'
  ).slice(0, 3);

  return (
    <PageContainer
      title={`Welcome back, ${user?.first_name ?? 'there'}!`}
      description="Stay on top of your National ID journey with real-time queue tracking and appointment management."
      actions={
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <Button
            variant="contained"
            color="secondary"
            startIcon={<AddIcon />}
            onClick={() => navigate('/book-appointment')}
          >
            Book appointment
          </Button>
          <Button
            variant="outlined"
            color="inherit"
            startIcon={<Queue />}
            onClick={() => navigate('/my-queue')}
            sx={{
              borderColor: 'rgba(248, 250, 252, 0.4)',
              color: '#f8fafc',
              '&:hover': {
                borderColor: 'rgba(248, 250, 252, 0.8)'
              }
            }}
          >
            View queue
          </Button>
        </Stack>
      }
    >
      <Grid container spacing={3}>
        {/* Quick Actions */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%', backdropFilter: 'blur(8px)' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Quick Actions
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => navigate('/book-appointment')}
                  fullWidth
                >
                  Book New Appointment
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<Schedule />}
                  onClick={() => navigate('/my-queue')}
                  fullWidth
                >
                  View Queue Status
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<EventAvailable />}
                  onClick={() => navigate('/appointments')}
                  fullWidth
                >
                  My Appointments
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Upcoming Appointments */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Upcoming Appointments
            </Typography>
            {upcomingAppointments.length === 0 ? (
              <Alert severity="info">
                No upcoming appointments. Book your first appointment to get started!
              </Alert>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {upcomingAppointments.map((appointment) => (
                  <Card key={appointment.id} variant="outlined">
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                        <Box>
                          <Typography variant="h6">
                            {appointment.appointment_type.replace('_', ' ').toUpperCase()}
                          </Typography>
                          <Typography color="text.secondary" gutterBottom>
                            Ticket: {appointment.ticket_number}
                          </Typography>
                        </Box>
                        <Chip
                          label={appointment.status.replace('_', ' ').toUpperCase()}
                          color={getStatusColor(appointment.status)}
                          size="small"
                        />
                      </Box>
                      
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <Schedule sx={{ mr: 1, color: 'text.secondary' }} />
                            <Typography variant="body2">
                              {formatDateTime(appointment.appointment_date, appointment.scheduled_time)}
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <LocationOn sx={{ mr: 1, color: 'text.secondary' }} />
                            <Typography variant="body2">
                              {appointment.service_center?.name}
                            </Typography>
                          </Box>
                        </Grid>
                      </Grid>

                      {queueStatus[appointment.id] && (
                        <Alert severity="info" sx={{ mt: 2 }}>
                          Queue Position: {queueStatus[appointment.id].position} | 
                          Estimated Wait: {queueStatus[appointment.id].estimated_wait_time} minutes
                        </Alert>
                      )}

                      {canCheckIn(appointment) && (
                        <Button
                          variant="contained"
                          size="small"
                          sx={{ mt: 2 }}
                          onClick={() => handleCheckIn(appointment.id)}
                        >
                          Check In
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Recent Activity */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Recent Activity
            </Typography>
            {recentAppointments.length === 0 ? (
              <Typography color="text.secondary">
                No recent activity
              </Typography>
            ) : (
              <Grid container spacing={2}>
                {recentAppointments.map((appointment) => (
                  <Grid item xs={12} md={4} key={appointment.id}>
                    <Card variant="outlined" sx={{ height: '100%' }}>
                      <CardContent>
                        <Typography variant="subtitle1" gutterBottom>
                          {appointment.appointment_type.replace('_', ' ').toUpperCase()}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          {formatDateTime(appointment.appointment_date, appointment.scheduled_time)}
                        </Typography>
                        <Chip
                          label={appointment.status.replace('_', ' ').toUpperCase()}
                          color={getStatusColor(appointment.status)}
                          size="small"
                        />
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Paper>
        </Grid>
      </Grid>
    </PageContainer>
  );
};

export default Dashboard;