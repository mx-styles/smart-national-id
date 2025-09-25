import React, { useState, useEffect } from 'react';
import {
  Container,
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
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocationOn, Schedule, Info } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import dayjs, { Dayjs } from 'dayjs';
import { appointmentsAPI, serviceCentersAPI } from '../services/api';
import { toast } from 'react-toastify';

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
  appointment_date: Dayjs | null;
  scheduled_time: Dayjs | null;
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
    appointment_date: null,
    scheduled_time: null,
    special_requirements: ''
  });
  const [serviceCenters, setServiceCenters] = useState<ServiceCenter[]>([]);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
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

  useEffect(() => {
    if (formData.service_center_id && formData.appointment_date) {
      fetchAvailableSlots();
    }
  }, [formData.service_center_id, formData.appointment_date]);

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

  const fetchAvailableSlots = async () => {
    try {
      if (!formData.appointment_date) return;
      const dateStr = formData.appointment_date.format('YYYY-MM-DD');
      const response = await serviceCentersAPI.getAvailableSlots(
        Number(formData.service_center_id),
        dateStr
      );
      // API returns { available_slots: string[], date, service_center_id }
      setAvailableSlots(response.data?.available_slots || []);
    } catch (error) {
      console.error('Failed to fetch available slots:', error);
      setAvailableSlots([]);
    }
  };

  const handleChange = (field: keyof AppointmentFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setError('');
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
    if (!formData.appointment_date) {
      setError('Please select a date');
      return false;
    }
    if (!formData.scheduled_time) {
      setError('Please select a time');
      return false;
    }
    
    // Check if selected date is not in the past
    if (formData.appointment_date.isBefore(dayjs(), 'day')) {
      setError('Cannot book appointments for past dates');
      return false;
    }

    // Check if selected time is not in the past for today's appointments
    if (formData.appointment_date.isSame(dayjs(), 'day')) {
      const appointmentDateTime = formData.appointment_date
        .hour(formData.scheduled_time.hour())
        .minute(formData.scheduled_time.minute());
      
      if (appointmentDateTime.isBefore(dayjs())) {
        setError('Cannot book appointments for past times');
        return false;
      }
    }

    // Check if time is within operating hours  
    if (selectedCenter) {
      const openingHour = parseInt(selectedCenter.opening_time.split(':')[0]);
      const openingMinute = parseInt(selectedCenter.opening_time.split(':')[1]);
      const closingHour = parseInt(selectedCenter.closing_time.split(':')[0]);
      const closingMinute = parseInt(selectedCenter.closing_time.split(':')[1]);
      
      const selectedHour = formData.scheduled_time.hour();
      const selectedMinute = formData.scheduled_time.minute();
      
      const selectedTimeMinutes = selectedHour * 60 + selectedMinute;
      const openingTimeMinutes = openingHour * 60 + openingMinute;
      const closingTimeMinutes = closingHour * 60 + closingMinute;
      
      if (selectedTimeMinutes < openingTimeMinutes || selectedTimeMinutes > closingTimeMinutes) {
        setError(`Appointment time must be between ${selectedCenter.opening_time.substring(0, 5)} and ${selectedCenter.closing_time.substring(0, 5)}`);
        return false;
      }
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
      // Combine date and time
      if (!formData.appointment_date || !formData.scheduled_time) {
        setError('Please select both date and time');
        return;
      }
      
      const scheduledDateTime = formData.appointment_date
        .hour(formData.scheduled_time.hour())
        .minute(formData.scheduled_time.minute())
        .second(0);

      const appointmentData = {
        service_center_id: Number(formData.service_center_id),
        appointment_type: formData.appointment_type,
        appointment_date: formData.appointment_date.format('YYYY-MM-DD'),
        // Backend expects a time (HH:mm[:ss]) not a full ISO datetime
        scheduled_time: scheduledDateTime.format('HH:mm:ss'),
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
      <Container maxWidth="md" sx={{ mt: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Loading service centers...</Typography>
      </Container>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Typography variant="h4" gutterBottom align="center">
            Book Appointment
          </Typography>
          <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 4 }}>
            Schedule your National ID service appointment
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

              {/* Date Selection */}
              <Grid item xs={12} sm={6}>
                <DatePicker
                  label="Appointment Date"
                  value={formData.appointment_date}
                  onChange={(value) => handleChange('appointment_date', value)}
                  minDate={dayjs()}
                  maxDate={dayjs().add(30, 'day')}
                  disabled={loading}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      required: true,
                    },
                  }}
                />
              </Grid>

              {/* Time Selection */}
              <Grid item xs={12} sm={6}>
                <TimePicker
                  label="Preferred Time"
                  value={formData.scheduled_time}
                  onChange={(value) => handleChange('scheduled_time', value)}
                  minTime={(() => {
                    if (!selectedCenter) return dayjs().hour(8).minute(0);
                    
                    const openingHour = parseInt(selectedCenter.opening_time.split(':')[0]);
                    const openingMinute = parseInt(selectedCenter.opening_time.split(':')[1]);
                    let minTime = dayjs().hour(openingHour).minute(openingMinute);
                    
                    // If appointment is today, use current time if it's later than opening time
                    if (formData.appointment_date?.isSame(dayjs(), 'day')) {
                      const currentTime = dayjs();
                      if (currentTime.isAfter(minTime)) {
                        minTime = currentTime.add(15, 'minute'); // Add buffer time
                      }
                    }
                    
                    return minTime;
                  })()}
                  maxTime={selectedCenter ? 
                    dayjs().hour(parseInt(selectedCenter.closing_time.split(':')[0]))
                           .minute(parseInt(selectedCenter.closing_time.split(':')[1])) :
                    dayjs().hour(16).minute(30)
                  }
                  disabled={loading || !formData.appointment_date || !formData.service_center_id}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      required: true,
                    },
                  }}
                />
              </Grid>

              {/* Available Slots Info */}
              {availableSlots.length > 0 && (
                <Grid item xs={12} sm={6}>
                  <Alert severity="info">
                    {availableSlots.length} slots available on selected date
                  </Alert>
                </Grid>
              )}

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
      </Container>
    </LocalizationProvider>
  );
};

export default BookAppointment;