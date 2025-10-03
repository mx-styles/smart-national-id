import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  Grid,
  Chip,
  Button,
  Alert,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Stack
} from '@mui/material';
import {
  Schedule,
  LocationOn,
  ConfirmationNumber,
  Refresh,
  Cancel as CancelIcon,
  CheckCircle
} from '@mui/icons-material';
import { queueAPI, appointmentsAPI } from '../services/api';
import { toast } from 'react-toastify';
import PageContainer from '../components/PageContainer';

// Type definitions
interface ServiceCenter {
  id: number;
  name: string;
}

interface QueueInfo {
  position: number;
  estimated_wait_time: number;
  total_ahead: number;
}

interface Appointment {
  id: number;
  ticket_number: string;
  appointment_type: string;
  scheduled_time: string;
  appointment_date: string;
  status: string;
  service_center?: ServiceCenter;
  queueInfo?: QueueInfo;
  special_requirements?: string;
}

interface CancelDialog {
  open: boolean;
  appointment: Appointment | null;
}

const MyQueue: React.FC = () => {
  const [queueData, setQueueData] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cancelDialog, setCancelDialog] = useState<CancelDialog>({ open: false, appointment: null });

  useEffect(() => {
    fetchQueueData();
    
    // Set up polling for real-time updates
    const interval = setInterval(fetchQueueData, 30000); // Poll every 30 seconds
    
    return () => clearInterval(interval);
  }, []);

  const fetchQueueData = async () => {
    try {
      setRefreshing(true);
      const response = await appointmentsAPI.getMyAppointments();
      const activeAppointments = response.data.filter(
        (apt: any) => apt.status === 'confirmed' || apt.status === 'in_progress' || apt.status === 'scheduled'
      );

      // Fetch queue position for each active appointment
      const queueDataPromises = activeAppointments.map(async (appointment: any) => {
        const isApptToday = isToday(appointment.appointment_date);
        if (!isApptToday) {
          return { ...appointment, queueInfo: null };
        }
        try {
          const queueResponse = await queueAPI.getQueuePosition(appointment.id);
          return {
            ...appointment,
            queueInfo: queueResponse.data
          };
        } catch (error) {
          return {
            ...appointment,
            queueInfo: null
          };
        }
      });

      const queueResults = await Promise.all(queueDataPromises);
      setQueueData(queueResults);
    } catch (error) {
      toast.error('Failed to fetch queue information');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    fetchQueueData();
  };

  const handleCancelAppointment = async () => {
    try {
      if (!cancelDialog.appointment) return;
      await appointmentsAPI.cancelAppointment(cancelDialog.appointment.id);
      toast.success('Appointment cancelled successfully');
      setCancelDialog({ open: false, appointment: null });
      fetchQueueData();
    } catch (error) {
      toast.error('Failed to cancel appointment');
    }
  };

  const handleCheckIn = async (appointmentId: number): Promise<void> => {
    try {
      await queueAPI.checkIn(appointmentId);
      toast.success('Checked in successfully!');
      fetchQueueData();
    } catch (error) {
      toast.error('Failed to check in');
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

  const formatDateTime = (dateString: string, timeString?: string): string => {
    const iso = timeString ? `${dateString}T${timeString}` : dateString;
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isToday = (dateString: string): boolean => {
    // dateString expected as YYYY-MM-DD
    const [y, m, d] = dateString.split('-').map(Number);
    const apptLocal = new Date(y, (m || 1) - 1, d || 1);
    const today = new Date();
    return (
      apptLocal.getFullYear() === today.getFullYear() &&
      apptLocal.getMonth() === today.getMonth() &&
      apptLocal.getDate() === today.getDate()
    );
  };

  const isPastAppointment = (dateString: string, timeString?: string): boolean => {
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
  };

  const getQueueProgress = (position?: number, totalAhead?: number): number => {
    if (!position || !totalAhead) return 0;
    return Math.max(0, ((totalAhead - position + 1) / totalAhead) * 100);
  };

  if (loading) {
    return (
      <PageContainer title="Loading queue information...">
        <LinearProgress />
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="My queue status"
      description="Track live queue positions for all of your upcoming and in-progress appointments."
      actions={
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <Button
            variant="outlined"
            color="inherit"
            startIcon={refreshing ? <CircularProgress size={18} /> : <Refresh />}
            onClick={handleRefresh}
            disabled={refreshing}
          >
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </Button>
          <Button variant="contained" color="secondary" onClick={() => window.location.href = '/book-appointment'}>
            Book appointment
          </Button>
        </Stack>
      }
    >

      {/* Queue Cards */}
      {queueData.length === 0 ? (
        <Alert severity="info" sx={{ textAlign: 'center' }}>
          No active appointments in queue. 
          <Button 
            variant="text" 
            sx={{ ml: 1 }}
            onClick={() => window.location.href = '/book-appointment'}
          >
            Book an appointment
          </Button>
        </Alert>
      ) : (
        <Grid container spacing={3}>
          {queueData.map((appointment) => (
            <Grid item xs={12} md={6} lg={4} key={appointment.id}>
              <Card 
                elevation={3}
                sx={{ 
                  height: '100%',
                  border: appointment.status === 'in_progress' ? '2px solid #4caf50' : 'none'
                }}
              >
                <CardContent>
                  {/* Status and Ticket */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Chip
                      label={appointment.status.replace('_', ' ').toUpperCase()}
                      color={getStatusColor(appointment.status)}
                      size="small"
                    />
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <ConfirmationNumber sx={{ mr: 0.5, fontSize: 16 }} />
                      <Typography variant="caption" fontWeight="bold">
                        {appointment.ticket_number}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Appointment Type */}
                  <Typography variant="h6" gutterBottom>
                    {appointment.appointment_type.replace('_', ' ').toUpperCase()}
                  </Typography>

                  {/* Date and Location */}
                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Schedule sx={{ mr: 1, color: 'text.secondary', fontSize: 18 }} />
                      <Typography variant="body2">
                        {formatDateTime(appointment.appointment_date, appointment.scheduled_time)}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <LocationOn sx={{ mr: 1, color: 'text.secondary', fontSize: 18 }} />
                      <Typography variant="body2">
                        {appointment.service_center?.name}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Queue Information */}
                  {isPastAppointment(appointment.appointment_date, appointment.scheduled_time) ? (
                    <Alert severity="warning" sx={{ mb: 2 }}>
                      This appointment time has passed. Please book a new appointment if needed.
                    </Alert>
                  ) : appointment.queueInfo ? (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Queue Information
                      </Typography>
                      
                      {appointment.status === 'in_progress' ? (
                        <Alert severity="success" sx={{ mb: 2 }}>
                          <Typography variant="body2" fontWeight="bold">
                            🎉 Your turn! Please proceed to the service counter.
                          </Typography>
                        </Alert>
                      ) : (
                        <>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="body2">Position in queue:</Typography>
                            <Typography variant="body2" fontWeight="bold">
                              #{appointment.queueInfo.position}
                            </Typography>
                          </Box>
                          
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                            <Typography variant="body2">Estimated wait:</Typography>
                            <Typography variant="body2" fontWeight="bold">
                              {appointment.queueInfo.estimated_wait_time} min
                            </Typography>
                          </Box>

                          {/* Progress Bar */}
                          <Box sx={{ mb: 2 }}>
                            <Typography variant="caption" color="text.secondary">
                              Queue Progress
                            </Typography>
                            <LinearProgress
                              variant="determinate"
                              value={getQueueProgress(
                                appointment.queueInfo.position,
                                appointment.queueInfo.total_ahead + appointment.queueInfo.position
                              )}
                              sx={{ mt: 0.5, height: 8, borderRadius: 4 }}
                            />
                          </Box>

                          {appointment.queueInfo.position <= 3 && (
                            <Alert severity="warning" sx={{ mb: 2 }}>
                              You're next in line! Please be ready.
                            </Alert>
                          )}
                        </>
                      )}
                    </Box>
                  ) : (
                    <Alert severity="info" sx={{ mb: 2 }}>
                      {isToday(appointment.appointment_date)
                        ? 'Queue information not available'
                        : 'Queue information will be available on the appointment day'}
                    </Alert>
                  )}

                  {/* Action Buttons */}
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {appointment.status === 'scheduled' && 
                     isToday(appointment.appointment_date) && 
                     !isPastAppointment(appointment.appointment_date, appointment.scheduled_time) && (
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={<CheckCircle />}
                        onClick={() => handleCheckIn(appointment.id)}
                        fullWidth
                      >
                        Check In
                      </Button>
                    )}
                    
                    {appointment.status !== 'in_progress' && 
                     appointment.status !== 'completed' && 
                     !isPastAppointment(appointment.appointment_date, appointment.scheduled_time) && (
                      <Button
                        variant="outlined"
                        size="small"
                        color="error"
                        startIcon={<CancelIcon />}
                        onClick={() => setCancelDialog({ open: true, appointment })}
                        fullWidth
                      >
                        Cancel
                      </Button>
                    )}

                    {isPastAppointment(appointment.appointment_date, appointment.scheduled_time) && 
                     appointment.status === 'scheduled' && (
                      <Button
                        variant="outlined"
                        size="small"
                        color="warning"
                        disabled
                        fullWidth
                      >
                        Missed Appointment
                      </Button>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Cancel Confirmation Dialog */}
      <Dialog
        open={cancelDialog.open}
        onClose={() => setCancelDialog({ open: false, appointment: null })}
      >
        <DialogTitle>Cancel Appointment</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to cancel your appointment for{' '}
            {cancelDialog.appointment?.appointment_type?.replace('_', ' ')} on{' '}
            {cancelDialog.appointment && formatDateTime(cancelDialog.appointment.appointment_date, cancelDialog.appointment.scheduled_time)}?
          </Typography>
          <Alert severity="warning" sx={{ mt: 2 }}>
            This action cannot be undone. You will need to book a new appointment.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelDialog({ open: false, appointment: null })}>
            Keep Appointment
          </Button>
          <Button onClick={handleCancelAppointment} color="error" variant="contained">
            Cancel Appointment
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default MyQueue;