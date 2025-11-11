import React, { useState, useEffect, useCallback } from 'react';
import {
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  Box,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Card,
  CardContent
} from '@mui/material';
import { LocationOn, Schedule, Info } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import dayjs, { Dayjs } from 'dayjs';
import { appointmentsAPI, serviceCentersAPI } from '../services/api';
import { toast } from 'react-toastify';
import PageContainer from '../components/PageContainer';

// Type definitions
interface ServiceCenter {
  id: number;
  name: string;
  code: string;
  city: string;
  province: string;
  address: string;
  operating_hours: string;
  opening_time: string;  // Format: "HH:MM:SS"
  closing_time: string;  // Format: "HH:MM:SS"
  max_daily_capacity: number;
}

interface AppointmentFormData {
  service_center_id: string;
  appointment_type: string;
  special_requirements: string;
}

interface AppointmentType {
  value: string;
  label: string;
}

const BookAppointment: React.FC = () => {
  const [formData, setFormData] = useState<AppointmentFormData>({
    service_center_id: '',
    appointment_type: '',
    special_requirements: ''
  });
  const [serviceCenters, setServiceCenters] = useState<ServiceCenter[]>([]);
  const [assignedSlot, setAssignedSlot] = useState<{ date: Dayjs; time: string } | null>(null);
  const [slotLookupMessage, setSlotLookupMessage] = useState('');
  const [assigningSlot, setAssigningSlot] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingCenters, setLoadingCenters] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const appointmentTypes: AppointmentType[] = [
    { value: 'new_application', label: 'New Application' },
    { value: 'renewal', label: 'Renewal' },
    { value: 'replacement', label: 'Replacement' },
    { value: 'correction', label: 'Correction' },
    { value: 'collection', label: 'Collection' }
  ];

  useEffect(() => {
    fetchServiceCenters();
  }, []);

  const fetchServiceCenters = async () => {
    try {
      const response = await serviceCentersAPI.getAll();
      setServiceCenters(response.data);
    } catch (error) {
      toast.error('Failed to fetch service centers');
    } finally {
      setLoadingCenters(false);
    }
  };

  const assignFirstAvailableSlot = useCallback(async () => {
    const centerId = Number(formData.service_center_id);
    if (!centerId) return;

    setAssigningSlot(true);
    setSlotLookupMessage('Searching for the next available slot...');
    setAssignedSlot(null);

    const maxLookaheadDays = 30;

    try {
      for (let offset = 0; offset <= maxLookaheadDays; offset += 1) {
        const targetDate = dayjs().add(offset, 'day');
        const response = await serviceCentersAPI.getAvailableSlots(centerId, targetDate.format('YYYY-MM-DD'));
        const slots: string[] = response.data?.available_slots || [];

        if (slots.length > 0) {
          const firstSlot = slots[0];
          setAssignedSlot({ date: targetDate, time: firstSlot });
          setSlotLookupMessage('We reserved the earliest available slot for you.');
          return;
        }
      }

      setSlotLookupMessage('No available slots found in the next 30 days. You can try another center.');
    } catch (err) {
      console.error('Failed to assign available slot:', err);
      setSlotLookupMessage('Unable to fetch available slots right now. Please try again.');
    } finally {
      setAssigningSlot(false);
    }
  }, [formData.service_center_id]);

  useEffect(() => {
    if (formData.service_center_id) {
      assignFirstAvailableSlot();
    } else {
      setAssignedSlot(null);
      setSlotLookupMessage('');
    }
  }, [formData.service_center_id, assignFirstAvailableSlot]);

  const handleChange = (field: keyof AppointmentFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setError('');
    if (field === 'service_center_id') {
      setAssignedSlot(null);
      setSlotLookupMessage('');
    }
  };

  const validateForm = (): boolean => {
    if (!formData.service_center_id) {
      setError('Please select a service center');
      return false;
    }
    if (!formData.appointment_type) {
      setError('Please select an appointment type');
      return false;
    }
    if (!assignedSlot) {
      setError('No available slot has been assigned. Please try again or select a different center.');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (!assignedSlot) {
        setError('No available slot has been assigned. Please try again.');
        return;
      }

      const appointmentData = {
        service_center_id: Number(formData.service_center_id),
        appointment_type: formData.appointment_type,
        appointment_date: assignedSlot.date.format('YYYY-MM-DD'),
        // Backend expects a time (HH:mm[:ss]) not a full ISO datetime
        scheduled_time: dayjs(`${assignedSlot.date.format('YYYY-MM-DD')}T${assignedSlot.time}`).format('HH:mm:ss'),
        special_requirements: formData.special_requirements || null
      };

      const response = await appointmentsAPI.bookAppointment(appointmentData);
      toast.success('Appointment booked successfully!');
      navigate('/appointments', { 
        state: { newAppointment: response.data }
      });
    } catch (error: any) {
      // Normalize FastAPI/Pydantic error shapes into a user-friendly string
      const detail = error?.response?.data?.detail;
      let message = 'Failed to book appointment';
      if (detail) {
        if (typeof detail === 'string') {
          message = detail;
        } else if (Array.isArray(detail)) {
          message = detail
            .map((d: any) => d?.msg || (typeof d === 'string' ? d : JSON.stringify(d)))
            .join('; ');
        } else if (typeof detail === 'object') {
          message = detail.msg || JSON.stringify(detail);
        }
      }
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const selectedCenter = serviceCenters.find(center => center.id === parseInt(formData.service_center_id));

  if (loadingCenters) {
    return (
      <PageContainer title="Fetching service centers...">
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress />
          <Typography sx={{ mt: 2 }}>
            Preparing availability and operating hours.
          </Typography>
        </Box>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Book an appointment"
      description="Choose a service centre and we'll reserve the first available slot for you."
      actions={
        selectedCenter && (
          <Button variant="contained" color="secondary" onClick={() => navigate('/appointments')}>
            View my appointments
          </Button>
        )
      }
      maxWidth="md"
    >
      <Paper elevation={0} sx={{ p: { xs: 3, md: 4 } }}>
        <Typography variant="h5" gutterBottom>
          Appointment details
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Select your preferred centre and we will automatically reserve the earliest free timeslot available.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            {/* Service Center Selection */}
            <Grid item xs={12}>
              <FormControl fullWidth required>
                <InputLabel>Service Center</InputLabel>
                <Select
                  value={formData.service_center_id}
                  label="Service Center"
                  onChange={(e) => handleChange('service_center_id', e.target.value)}
                  disabled={loading}
                >
                  {serviceCenters.map((center) => (
                    <MenuItem key={center.id} value={center.id}>
                      <Box>
                        <Typography variant="body1">{center.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {center.city}, {center.province}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Selected Center Info */}
            {selectedCenter && (
              <Grid item xs={12}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      {selectedCenter.name}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <LocationOn sx={{ mr: 1, color: 'text.secondary' }} />
                      <Typography variant="body2">
                        {selectedCenter.address}, {selectedCenter.city}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Schedule sx={{ mr: 1, color: 'text.secondary' }} />
                      <Typography variant="body2">
                        Operating Hours: {selectedCenter.opening_time?.substring(0, 5) || '08:00'} - {selectedCenter.closing_time?.substring(0, 5) || '16:30'}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Info sx={{ mr: 1, color: 'text.secondary' }} />
                      <Typography variant="body2">
                        Daily Capacity: {selectedCenter.max_daily_capacity} appointments
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            )}

            {/* Slot Assignment Status */}
            {formData.service_center_id && (
              <Grid item xs={12}>
                <Alert severity={assignedSlot ? 'success' : 'info'}>
                  {assigningSlot ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CircularProgress size={18} />
                      <Typography variant="body2">{slotLookupMessage || 'Searching for available slots...'}</Typography>
                    </Box>
                  ) : assignedSlot ? (
                    <Box>
                      <Typography variant="body2" fontWeight={600}>
                        Reserved Slot
                      </Typography>
                      <Typography variant="body2">
                        {assignedSlot.date.format('dddd, MMM D, YYYY')} at {dayjs(`${assignedSlot.date.format('YYYY-MM-DD')}T${assignedSlot.time}`).format('HH:mm')}
                      </Typography>
                      <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                        {slotLookupMessage}
                      </Typography>
                    </Box>
                  ) : (
                    <Typography variant="body2">{slotLookupMessage || 'No available slots found yet.'}</Typography>
                  )}
                </Alert>
              </Grid>
            )}

            {/* Appointment Type */}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>Appointment Type</InputLabel>
                <Select
                  value={formData.appointment_type}
                  label="Appointment Type"
                  onChange={(e) => handleChange('appointment_type', e.target.value)}
                  disabled={loading}
                >
                  {appointmentTypes.map((type) => (
                    <MenuItem key={type.value} value={type.value}>
                      {type.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Special Requirements */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Special Requirements (Optional)"
                placeholder="e.g., wheelchair accessibility, interpreter needed, etc."
                value={formData.special_requirements}
                onChange={(e) => handleChange('special_requirements', e.target.value)}
                disabled={loading}
              />
            </Grid>

            {/* Submit Button */}
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                <Button
                  variant="outlined"
                  onClick={() => navigate('/dashboard')}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={loading}
                  startIcon={loading && <CircularProgress size={20} />}
                  sx={{ minWidth: 150 }}
                >
                  {loading ? 'Booking...' : 'Book Appointment'}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Box>
      </Paper>
    </PageContainer>
  );
};

export default BookAppointment;