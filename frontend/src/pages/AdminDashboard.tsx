import React, { useState, useEffect } from 'react';
import {
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  Button,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  People,
  EventNote,
  TrendingUp,
  PlayArrow,
  CheckCircle,
  Cancel,
  Refresh,
  Visibility
} from '@mui/icons-material';
import { adminAPI, serviceCentersAPI } from '../services/api';
import { toast } from 'react-toastify';
import PageContainer from '../components/PageContainer';

// Type definitions
interface DashboardStats {
  today_appointments?: number;
  active_queue?: number;
  completed_today?: number;
  avg_wait_time?: number;
}

interface ServiceCenter {
  id: number;
  name: string;
  code: string;
  city: string;
  province: string;
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
  wait_time?: number;
  user?: User;
  special_requirements?: string;
}

interface ActionDialogState {
  open: boolean;
  appointment: Appointment | null;
  action: string;
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
      id={`admin-tabpanel-${index}`}
      aria-labelledby={`admin-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const AdminDashboard: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [queueData, setQueueData] = useState<Appointment[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [serviceCenters, setServiceCenters] = useState<ServiceCenter[]>([]);
  const [selectedCenter, setSelectedCenter] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [actionDialog, setActionDialog] = useState<ActionDialogState>({ 
    open: false, 
    appointment: null, 
    action: '' 
  });

  useEffect(() => {
    fetchDashboardData();
    fetchServiceCenters();
  }, []);

  useEffect(() => {
    if (selectedCenter) {
      fetchQueueData();
    }
  }, [selectedCenter]);

  const fetchDashboardData = async () => {
    try {
      const [statsResponse, appointmentsResponse] = await Promise.all([
        adminAPI.getDashboardStats(),
        adminAPI.getAppointments({ limit: 50 })
      ]);
      
      setDashboardStats(statsResponse.data);
      setAppointments(appointmentsResponse.data);
    } catch (error) {
      toast.error('Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const fetchServiceCenters = async () => {
    try {
      const response = await serviceCentersAPI.getAll();
      setServiceCenters(response.data);
      if (response.data.length > 0) {
        setSelectedCenter(response.data[0].id.toString());
      }
    } catch (error) {
      toast.error('Failed to fetch service centers');
    }
  };

  const fetchQueueData = async () => {
    try {
      const response = await adminAPI.getQueueManagement(selectedCenter);
      setQueueData(response.data);
    } catch (error) {
      toast.error('Failed to fetch queue data');
    }
  };

  const handleCallNext = async () => {
    try {
      await adminAPI.callNextCustomer(selectedCenter);
      toast.success('Next customer called');
      fetchQueueData();
    } catch (error) {
      toast.error('Failed to call next customer');
    }
  };

  const handleCompleteService = async (appointmentId: number) => {
    try {
      await adminAPI.completeService(appointmentId);
      toast.success('Service completed');
      setActionDialog({ open: false, appointment: null, action: '' });
      fetchQueueData();
      fetchDashboardData();
    } catch (error) {
      toast.error('Failed to complete service');
    }
  };

  const handleUpdateStatus = async (appointmentId: number, status: string) => {
    try {
      await adminAPI.updateAppointmentStatus(appointmentId, status);
      toast.success('Status updated');
      setActionDialog({ open: false, appointment: null, action: '' });
      fetchQueueData();
      fetchDashboardData();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      scheduled: 'default',
      confirmed: 'primary',
      in_progress: 'secondary',
      completed: 'success',
      cancelled: 'error',
      no_show: 'warning'
    } as const;
    return colors[status as keyof typeof colors] || 'default';
  };

  const formatDateTime = (dateString: string, timeString?: string): string => {
    if (timeString) {
      // Combine date and time: YYYY-MM-DD + HH:MM:SS
      const iso = `${dateString}T${timeString}`;
      const d = new Date(iso);
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } else {
      // Fallback if only one string provided (could be datetime or just time)
      const d = new Date(dateString);
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  if (loading) {
    return (
      <PageContainer title="Loading admin dashboard...">
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress />
          <Typography sx={{ mt: 2 }}>Preparing analytics and queue data.</Typography>
        </Box>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Admin dashboard"
      description="Gain instant visibility across service centres, manage live queues, and track performance trends."
      actions={
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <Button variant="outlined" color="inherit" startIcon={<Refresh />} onClick={fetchDashboardData}>
            Refresh stats
          </Button>
          <Button variant="contained" color="secondary" startIcon={<PlayArrow />} onClick={handleCallNext} disabled={queueData.length === 0}>
            Call next customer
          </Button>
        </Stack>
      }
    >

      {/* Stats Cards */}
      {dashboardStats && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <EventNote color="primary" sx={{ mr: 2 }} />
                  <Box>
                    <Typography color="text.secondary" gutterBottom>
                      Today's Appointments
                    </Typography>
                    <Typography variant="h4">
                      {dashboardStats.today_appointments || 0}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <People color="success" sx={{ mr: 2 }} />
                  <Box>
                    <Typography color="text.secondary" gutterBottom>
                      Active Queue
                    </Typography>
                    <Typography variant="h4">
                      {dashboardStats.active_queue || 0}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <CheckCircle color="info" sx={{ mr: 2 }} />
                  <Box>
                    <Typography color="text.secondary" gutterBottom>
                      Completed Today
                    </Typography>
                    <Typography variant="h4">
                      {dashboardStats.completed_today || 0}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <TrendingUp color="warning" sx={{ mr: 2 }} />
                  <Box>
                    <Typography color="text.secondary" gutterBottom>
                      Avg Wait Time
                    </Typography>
                    <Typography variant="h4">
                      {dashboardStats.avg_wait_time || 0}m
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tabs */}
      <Paper sx={{ width: '100%' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
            <Tab label="Queue Management" />
            <Tab label="Appointments" />
          </Tabs>
        </Box>

        {/* Queue Management Tab */}
        <TabPanel value={tabValue} index={0}>
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>Service Center</InputLabel>
              <Select
                value={selectedCenter}
                label="Service Center"
                onChange={(e) => setSelectedCenter(e.target.value)}
              >
                {serviceCenters.map((center) => (
                  <MenuItem key={center.id} value={center.id.toString()}>
                    {center.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Box>
              <Button
                variant="outlined"
                startIcon={<Refresh />}
                onClick={fetchQueueData}
                sx={{ mr: 2 }}
              >
                Refresh
              </Button>
              <Button
                variant="contained"
                startIcon={<PlayArrow />}
                onClick={handleCallNext}
                disabled={queueData.length === 0}
              >
                Call Next
              </Button>
            </Box>
          </Box>

          {queueData.length === 0 ? (
            <Alert severity="info">No customers in queue</Alert>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Ticket #</TableCell>
                    <TableCell>Client</TableCell>
                    <TableCell>Service Type</TableCell>
                    <TableCell>Wait Time</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {queueData.map((item, index) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.ticket_number}</TableCell>
                      <TableCell>
                        {item.user?.first_name} {item.user?.last_name}
                      </TableCell>
                      <TableCell>
                        {item.appointment_type?.replace('_', ' ').toUpperCase()}
                      </TableCell>
                      <TableCell>{item.wait_time || 0} min</TableCell>
                      <TableCell>
                        <Chip
                          label={item.status.replace('_', ' ').toUpperCase()}
                          color={getStatusColor(item.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <IconButton
                          size="small"
                          onClick={() => setActionDialog({
                            open: true,
                            appointment: item,
                            action: 'complete'
                          })}
                          disabled={item.status !== 'in_progress'}
                        >
                          <CheckCircle />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => setActionDialog({
                            open: true,
                            appointment: item,
                            action: 'view'
                          })}
                        >
                          <Visibility />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </TabPanel>

        {/* Appointments Tab */}
        <TabPanel value={tabValue} index={1}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Ticket #</TableCell>
                  <TableCell></TableCell>
                  <TableCell>Service Type</TableCell>
                  <TableCell>Scheduled Time</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {appointments.map((appointment) => (
                  <TableRow key={appointment.id}>
                    <TableCell>{appointment.ticket_number}</TableCell>
                    <TableCell>
                      {appointment.user?.first_name} {appointment.user?.last_name}
                    </TableCell>
                    <TableCell>
                      {appointment.appointment_type?.replace('_', ' ').toUpperCase()}
                    </TableCell>
                    <TableCell>{formatDateTime(appointment.scheduled_time)}</TableCell>
                    <TableCell>
                      <Chip
                        label={appointment.status.replace('_', ' ').toUpperCase()}
                        color={getStatusColor(appointment.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => setActionDialog({
                          open: true,
                          appointment: appointment,
                          action: 'view'
                        })}
                      >
                        <Visibility />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>
      </Paper>

      {/* Action Dialog */}
      <Dialog
        open={actionDialog.open}
        onClose={() => setActionDialog({ open: false, appointment: null, action: '' })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {actionDialog.action === 'complete' ? 'Complete Service' : 'Appointment Details'}
        </DialogTitle>
        <DialogContent>
          {actionDialog.appointment && (
            <Box>
              <Typography variant="body1" gutterBottom>
                <strong>Client:</strong> {actionDialog.appointment.user?.first_name} {actionDialog.appointment.user?.last_name}
              </Typography>
              <Typography variant="body1" gutterBottom>
                <strong>Ticket:</strong> {actionDialog.appointment.ticket_number}
              </Typography>
              <Typography variant="body1" gutterBottom>
                <strong>Service:</strong> {actionDialog.appointment.appointment_type?.replace('_', ' ').toUpperCase()}
              </Typography>
              <Typography variant="body1" gutterBottom>
                <strong>Scheduled:</strong> {formatDateTime(actionDialog.appointment.appointment_date, actionDialog.appointment.scheduled_time)}
              </Typography>
              {actionDialog.appointment.special_requirements && (
                <Typography variant="body1" gutterBottom>
                  <strong>Special Requirements:</strong> {actionDialog.appointment.special_requirements}
                </Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActionDialog({ open: false, appointment: null, action: '' })}>
            Close
          </Button>
          {actionDialog.action === 'complete' && (
            <Button
              onClick={() => actionDialog.appointment && handleCompleteService(actionDialog.appointment.id)}
              color="primary"
              variant="contained"
            >
              Complete Service
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default AdminDashboard;