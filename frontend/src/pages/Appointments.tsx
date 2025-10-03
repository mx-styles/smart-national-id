import React, { useState, useEffect } from 'react';
import {
  Typography,
  Paper,
  Box,
  Grid,
  Card,
  CardContent,
  Button,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  LinearProgress,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Tabs,
  Tab,
  Divider,
  Stack,
  Tooltip
} from '@mui/material';
import {
  Schedule,
  LocationOn,
  Cancel,
  Info,
  Refresh,
  Add as AddIcon,
  FilterList,
  Event,
  CheckCircle,
  Error,
  HourglassEmpty,
  PlayArrow
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
  address: string;
  phone: string;
}

interface User {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
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
  created_at?: string;
  updated_at?: string;
}

interface QueueStatus {
  position: number;
  estimated_wait_time: number;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`appointments-tabpanel-${index}`}
      aria-labelledby={`appointments-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const Appointments: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState(0);
  const [sortBy, setSortBy] = useState('scheduled_time');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [appointmentToCancel, setAppointmentToCancel] = useState<Appointment | null>(null);
  const [queueStatus, setQueueStatus] = useState<{ [key: number]: QueueStatus }>({});
  
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const response = await appointmentsAPI.getMyAppointments();
      setAppointments(response.data);
      
      // Fetch queue status for active appointments
      const activeAppointments = response.data.filter(
        (apt: Appointment) => apt.status === 'confirmed' || apt.status === 'in_progress'
      );
      
      for (const appointment of activeAppointments) {
        try {
          const queueResponse = await queueAPI.getQueuePosition(appointment.id);
          setQueueStatus(prev => ({
            ...prev,
            [appointment.id]: queueResponse.data
          }));
        } catch (error) {
          console.error('Failed to fetch queue status for appointment:', appointment.id);
        }
      }
    } catch (error: any) {
      toast.error('Failed to fetch appointments');
      console.error('Error fetching appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAppointments();
    setRefreshing(false);
  };

  const handleCancelAppointment = async () => {
    if (!appointmentToCancel) return;

    try {
      await appointmentsAPI.cancelAppointment(appointmentToCancel.id);
      toast.success('Appointment cancelled successfully');
      setCancelDialogOpen(false);
      setAppointmentToCancel(null);
      fetchAppointments();
    } catch (error: any) {
      toast.error('Failed to cancel appointment');
      console.error('Error cancelling appointment:', error);
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

  const getStatusIcon = (status: string) => {
    const icons = {
      scheduled: <Schedule />,
      confirmed: <CheckCircle />,
      in_progress: <PlayArrow />,
      completed: <CheckCircle />,
      cancelled: <Cancel />,
      no_show: <Error />
    };
    return icons[status as keyof typeof icons] || <Schedule />;
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
      fetchAppointments(); // Refresh the appointments list
    } catch (error: any) {
      console.error('Check-in error:', error);
      if (error.response?.data?.detail) {
        toast.error(error.response.data.detail);
      } else {
        toast.error('Failed to check in. Please try again.');
      }
    }
  };

  // Filter and sort appointments
  const filteredAppointments = appointments.filter(appointment => {
    const matchesSearch = searchTerm === '' || 
      appointment.appointment_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      appointment.ticket_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      appointment.service_center?.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || appointment.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  }).sort((a, b) => {
    if (sortBy === 'scheduled_time') {
      return new Date(b.scheduled_time).getTime() - new Date(a.scheduled_time).getTime();
    } else if (sortBy === 'created_at') {
      return new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime();
    } else if (sortBy === 'status') {
      return a.status.localeCompare(b.status);
    }
    return 0;
  });

  // Categorize appointments for tabs
  const upcomingAppointments = filteredAppointments.filter(
    apt => apt.status === 'scheduled' || apt.status === 'confirmed'
  );

  const activeAppointments = filteredAppointments.filter(
    apt => apt.status === 'in_progress'
  );

  const completedAppointments = filteredAppointments.filter(
    apt => apt.status === 'completed'
  );

  const cancelledAppointments = filteredAppointments.filter(
    apt => apt.status === 'cancelled' || apt.status === 'no_show'
  );

  const getTabAppointments = () => {
    switch (selectedTab) {
      case 0: return filteredAppointments;
      case 1: return upcomingAppointments;
      case 2: return activeAppointments;
      case 3: return completedAppointments;
      case 4: return cancelledAppointments;
      default: return filteredAppointments;
    }
  };

  const canCancelAppointment = (appointment: Appointment): boolean => {
    return appointment.status === 'scheduled' || appointment.status === 'confirmed';
  };



  if (loading) {
    return (
      <PageContainer title="Loading your appointments...">
        <LinearProgress />
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="My appointments"
      description="Stay organized with a consolidated view of your bookings, queue positions, and visit history."
      actions={
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <Button
            variant="outlined"
            color="inherit"
            startIcon={refreshing ? <HourglassEmpty /> : <Refresh />}
            onClick={handleRefresh}
            disabled={refreshing}
          >
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </Button>
          <Button
            variant="contained"
            color="secondary"
            startIcon={<AddIcon />}
            onClick={() => navigate('/book-appointment')}
          >
            Book appointment
          </Button>
        </Stack>
      }
    >

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Appointments
              </Typography>
              <Typography variant="h4">
                {appointments.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Upcoming
              </Typography>
              <Typography variant="h4" color="primary">
                {upcomingAppointments.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Completed
              </Typography>
              <Typography variant="h4" color="success.main">
                {completedAppointments.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Cancelled
              </Typography>
              <Typography variant="h4" color="error.main">
                {cancelledAppointments.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters and Search */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Search appointments"
              variant="outlined"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by type, ticket number, or service center"
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Filter by Status</InputLabel>
              <Select
                value={filterStatus}
                label="Filter by Status"
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <MenuItem value="all">All Statuses</MenuItem>
                <MenuItem value="scheduled">Scheduled</MenuItem>
                <MenuItem value="confirmed">Confirmed</MenuItem>
                <MenuItem value="in_progress">In Progress</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
                <MenuItem value="cancelled">Cancelled</MenuItem>
                <MenuItem value="no_show">No Show</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Sort by</InputLabel>
              <Select
                value={sortBy}
                label="Sort by"
                onChange={(e) => setSortBy(e.target.value)}
              >
                <MenuItem value="scheduled_time">Appointment Date</MenuItem>
                <MenuItem value="created_at">Date Created</MenuItem>
                <MenuItem value="status">Status</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={selectedTab}
          onChange={(e, newValue) => setSelectedTab(newValue)}
          indicatorColor="primary"
          textColor="primary"
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label={`All (${filteredAppointments.length})`} />
          <Tab label={`Upcoming (${upcomingAppointments.length})`} />
          <Tab label={`Active (${activeAppointments.length})`} />
          <Tab label={`Completed (${completedAppointments.length})`} />
          <Tab label={`Cancelled (${cancelledAppointments.length})`} />
        </Tabs>
      </Paper>

      {/* Appointments List */}
      <TabPanel value={selectedTab} index={selectedTab}>
        {getTabAppointments().length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Event sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No appointments found
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }}>
              {selectedTab === 0 
                ? "You haven't booked any appointments yet."
                : `No ${['', 'upcoming', 'active', 'completed', 'cancelled'][selectedTab]} appointments found.`
              }
            </Typography>
            {selectedTab === 0 && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => navigate('/book-appointment')}
              >
                Book Your First Appointment
              </Button>
            )}
          </Paper>
        ) : (
          <Stack spacing={2}>
            {getTabAppointments().map((appointment) => (
              <Card key={appointment.id} variant="outlined">
                <CardContent>
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={8}>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                        <Box sx={{ mr: 2 }}>
                          {getStatusIcon(appointment.status)}
                        </Box>
                        <Box sx={{ flexGrow: 1 }}>
                          <Typography variant="h6" gutterBottom>
                            {appointment.appointment_type.replace('_', ' ').toUpperCase()}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            Ticket: {appointment.ticket_number}
                          </Typography>
                          <Chip
                            label={appointment.status.replace('_', ' ').toUpperCase()}
                            color={getStatusColor(appointment.status)}
                            size="small"
                            sx={{ mb: 2 }}
                          />
                        </Box>
                      </Box>

                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <Schedule sx={{ mr: 1, color: 'text.secondary', fontSize: 20 }} />
                            <Box>
                              <Typography variant="body2" fontWeight="medium">
                                {formatDate(appointment.appointment_date)}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                at {formatTime(appointment.scheduled_time)}
                              </Typography>
                            </Box>
                          </Box>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <LocationOn sx={{ mr: 1, color: 'text.secondary', fontSize: 20 }} />
                            <Box>
                              <Typography variant="body2" fontWeight="medium">
                                {appointment.service_center?.name}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {appointment.service_center?.address}
                              </Typography>
                            </Box>
                          </Box>
                        </Grid>
                      </Grid>

                      {queueStatus[appointment.id] && (
                        <Alert severity="info" sx={{ mt: 2 }}>
                          <Typography variant="body2">
                            <strong>Queue Position:</strong> {queueStatus[appointment.id].position} | 
                            <strong> Estimated Wait:</strong> {queueStatus[appointment.id].estimated_wait_time} minutes
                          </Typography>
                        </Alert>
                      )}
                    </Grid>

                    <Grid item xs={12} md={4}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, height: '100%', justifyContent: 'center' }}>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<Info />}
                          onClick={() => {
                            setSelectedAppointment(appointment);
                            setDetailsOpen(true);
                          }}
                          fullWidth
                        >
                          View Details
                        </Button>
                        
                        {canCheckIn(appointment) && (
                          <Button
                            variant="contained"
                            size="small"
                            onClick={() => handleCheckIn(appointment.id)}
                            fullWidth
                          >
                            Check In
                          </Button>
                        )}
                        
                        {canCancelAppointment(appointment) && (
                          <Button
                            variant="outlined"
                            color="error"
                            size="small"
                            startIcon={<Cancel />}
                            onClick={() => {
                              setAppointmentToCancel(appointment);
                              setCancelDialogOpen(true);
                            }}
                            fullWidth
                          >
                            Cancel
                          </Button>
                        )}
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            ))}
          </Stack>
        )}
      </TabPanel>

      {/* Appointment Details Dialog */}
      <Dialog
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Appointment Details
        </DialogTitle>
        <DialogContent>
          {selectedAppointment && (
            <Box sx={{ pt: 1 }}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Appointment Type
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {selectedAppointment.appointment_type.replace('_', ' ').toUpperCase()}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Ticket Number
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {selectedAppointment.ticket_number}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Status
                  </Typography>
                  <Chip
                    label={selectedAppointment.status.replace('_', ' ').toUpperCase()}
                    color={getStatusColor(selectedAppointment.status)}
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Scheduled Date & Time
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {formatDateTime(selectedAppointment.appointment_date, selectedAppointment.scheduled_time)}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="h6" gutterBottom>
                    Service Center Details
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Name
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {selectedAppointment.service_center?.name}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Phone
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {selectedAppointment.service_center?.phone}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Address
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {selectedAppointment.service_center?.address}
                  </Typography>
                </Grid>
                {selectedAppointment.created_at && (
                  <Grid item xs={12}>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="subtitle2" color="text.secondary">
                      Booked On
                    </Typography>
                    <Typography variant="body1">
                      {selectedAppointment.created_at ? formatDateTime(selectedAppointment.created_at) : 'N/A'}
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Cancel Confirmation Dialog */}
      <Dialog
        open={cancelDialogOpen}
        onClose={() => setCancelDialogOpen(false)}
      >
        <DialogTitle>
          Cancel Appointment
        </DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to cancel this appointment?
          </Typography>
          {appointmentToCancel && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
              <Typography variant="body2">
                <strong>Type:</strong> {appointmentToCancel.appointment_type.replace('_', ' ').toUpperCase()}
              </Typography>
              <Typography variant="body2">
                <strong>Date:</strong> {formatDateTime(appointmentToCancel.appointment_date, appointmentToCancel.scheduled_time)}
              </Typography>
              <Typography variant="body2">
                <strong>Service Center:</strong> {appointmentToCancel.service_center?.name}
              </Typography>
            </Box>
          )}
          <Alert severity="warning" sx={{ mt: 2 }}>
            This action cannot be undone. You will need to book a new appointment if you change your mind.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelDialogOpen(false)}>
            Keep Appointment
          </Button>
          <Button 
            onClick={handleCancelAppointment} 
            color="error" 
            variant="contained"
          >
            Cancel Appointment
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default Appointments;