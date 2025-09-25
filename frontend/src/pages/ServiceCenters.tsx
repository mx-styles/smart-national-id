import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
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
  TextField,
  Grid,
  Switch,
  FormControlLabel,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  CardActions,
  Tooltip,
  Fab,
  InputAdornment
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  LocationOn as LocationIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Schedule as ScheduleIcon,
  Group as GroupIcon,
  Visibility as ViewIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import { adminAPI } from '../services/api';
import { ServiceCenter, ServiceCenterFormData } from '../types';
import { toast } from 'react-toastify';

interface ServiceCenterDialogState {
  open: boolean;
  mode: 'create' | 'edit' | 'view';
  serviceCenter: ServiceCenter | null;
}

const defaultFormData: ServiceCenterFormData = {
  name: '',
  code: '',
  address: '',
  city: '',
  province: '',
  phone: '',
  email: '',
  opening_time: '08:00',
  closing_time: '16:30',
  max_daily_capacity: 100,
  average_service_time: 15,
  latitude: undefined,
  longitude: undefined
};

const ServiceCenters: React.FC = () => {
  const [serviceCenters, setServiceCenters] = useState<ServiceCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialog, setDialog] = useState<ServiceCenterDialogState>({
    open: false,
    mode: 'create',
    serviceCenter: null
  });
  const [formData, setFormData] = useState<ServiceCenterFormData>(defaultFormData);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchServiceCenters();
  }, []);

  const fetchServiceCenters = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getServiceCenters();
      setServiceCenters(response.data);
    } catch (error) {
      toast.error('Failed to fetch service centers');
    } finally {
      setLoading(false);
    }
  };

  const filteredServiceCenters = serviceCenters.filter(center =>
    center.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    center.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    center.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
    center.province.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenDialog = (mode: 'create' | 'edit' | 'view', serviceCenter?: ServiceCenter) => {
    if (mode === 'create') {
      setFormData(defaultFormData);
    } else if (serviceCenter) {
      setFormData({
        name: serviceCenter.name,
        code: serviceCenter.code,
        address: serviceCenter.address,
        city: serviceCenter.city,
        province: serviceCenter.province,
        phone: serviceCenter.phone || '',
        email: serviceCenter.email || '',
        opening_time: serviceCenter.opening_time,
        closing_time: serviceCenter.closing_time,
        max_daily_capacity: serviceCenter.max_daily_capacity,
        average_service_time: serviceCenter.average_service_time,
        latitude: serviceCenter.latitude,
        longitude: serviceCenter.longitude
      });
    }
    
    setDialog({ open: true, mode, serviceCenter: serviceCenter || null });
    setFormErrors({});
  };

  const handleCloseDialog = () => {
    setDialog({ open: false, mode: 'create', serviceCenter: null });
    setFormData(defaultFormData);
    setFormErrors({});
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) errors.name = 'Name is required';
    if (!formData.code.trim()) errors.code = 'Code is required';
    if (!formData.address.trim()) errors.address = 'Address is required';
    if (!formData.city.trim()) errors.city = 'City is required';
    if (!formData.province.trim()) errors.province = 'Province is required';
    
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Invalid email format';
    }

    if (formData.max_daily_capacity < 1) {
      errors.max_daily_capacity = 'Capacity must be at least 1';
    }

    if (formData.average_service_time < 1) {
      errors.average_service_time = 'Service time must be at least 1 minute';
    }

    // Validate time format
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(formData.opening_time)) {
      errors.opening_time = 'Invalid time format (HH:MM)';
    }
    if (!timeRegex.test(formData.closing_time)) {
      errors.closing_time = 'Invalid time format (HH:MM)';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setSaving(true);
      
      if (dialog.mode === 'create') {
        await adminAPI.createServiceCenter(formData);
        toast.success('Service center created successfully');
      } else if (dialog.mode === 'edit' && dialog.serviceCenter) {
        await adminAPI.updateServiceCenter(dialog.serviceCenter.id, formData);
        toast.success('Service center updated successfully');
      }

      handleCloseDialog();
      fetchServiceCenters();
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 'Failed to save service center';
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (serviceCenter: ServiceCenter) => {
    if (!window.confirm(`Are you sure you want to delete "${serviceCenter.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await adminAPI.deleteServiceCenter(serviceCenter.id);
      toast.success('Service center deleted successfully');
      fetchServiceCenters();
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 'Failed to delete service center';
      toast.error(errorMessage);
    }
  };

  const handleToggleActive = async (serviceCenter: ServiceCenter) => {
    try {
      await adminAPI.updateServiceCenter(serviceCenter.id, {
        is_active: !serviceCenter.is_active
      });
      toast.success(`Service center ${serviceCenter.is_active ? 'deactivated' : 'activated'} successfully`);
      fetchServiceCenters();
    } catch (error) {
      toast.error('Failed to update service center status');
    }
  };

  const getStatusChip = (serviceCenter: ServiceCenter) => {
    if (!serviceCenter.is_active) {
      return <Chip label="Inactive" color="default" size="small" />;
    }
    if (!serviceCenter.is_operational) {
      return <Chip label="Offline" color="warning" size="small" />;
    }
    return <Chip label="Active" color="success" size="small" />;
  };

  if (loading) {
    return (
      <Container>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box py={3}>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4" component="h1">
            Service Centers Management
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog('create')}
          >
            Add Service Center
          </Button>
        </Box>

        {/* Search */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <TextField
            fullWidth
            placeholder="Search service centers by name, code, city, or province..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </Paper>

        {/* Statistics Cards */}
        <Grid container spacing={2} mb={3}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Total Centers
                </Typography>
                <Typography variant="h4">
                  {serviceCenters.length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Active Centers
                </Typography>
                <Typography variant="h4" color="success.main">
                  {serviceCenters.filter(c => c.is_active).length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Operational
                </Typography>
                <Typography variant="h4" color="primary.main">
                  {serviceCenters.filter(c => c.is_active && c.is_operational).length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Total Capacity
                </Typography>
                <Typography variant="h4">
                  {serviceCenters.reduce((sum, c) => sum + c.max_daily_capacity, 0)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Service Centers Table */}
        <Paper>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Code</TableCell>
                  <TableCell>Location</TableCell>
                  <TableCell>Operating Hours</TableCell>
                  <TableCell>Capacity</TableCell>
                  <TableCell>Queue</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredServiceCenters.map((center) => (
                  <TableRow key={center.id}>
                    <TableCell>
                      <Typography variant="subtitle2">{center.name}</Typography>
                      {center.email && (
                        <Typography variant="body2" color="textSecondary">
                          <EmailIcon fontSize="small" sx={{ mr: 0.5, verticalAlign: 'middle' }} />
                          {center.email}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip label={center.code} variant="outlined" size="small" />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{center.city}, {center.province}</Typography>
                      <Typography variant="caption" color="textSecondary">
                        {center.address}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        <ScheduleIcon fontSize="small" sx={{ mr: 0.5, verticalAlign: 'middle' }} />
                        {center.operating_hours}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        <GroupIcon fontSize="small" sx={{ mr: 0.5, verticalAlign: 'middle' }} />
                        {center.max_daily_capacity}
                      </Typography>
                      <Typography variant="caption" color="textSecondary" display="block">
                        ~{center.average_service_time}min/person
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="h6" color="primary">
                        {center.current_queue_length}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {getStatusChip(center)}
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="View Details">
                        <IconButton 
                          size="small" 
                          onClick={() => handleOpenDialog('view', center)}
                        >
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit">
                        <IconButton 
                          size="small" 
                          onClick={() => handleOpenDialog('edit', center)}
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={center.is_active ? "Deactivate" : "Activate"}>
                        <IconButton 
                          size="small" 
                          onClick={() => handleToggleActive(center)}
                          color={center.is_active ? "warning" : "success"}
                        >
                          <Switch checked={center.is_active} size="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton 
                          size="small" 
                          color="error" 
                          onClick={() => handleDelete(center)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {filteredServiceCenters.length === 0 && (
            <Box p={3} textAlign="center">
              <Typography color="textSecondary">
                {searchTerm ? 'No service centers match your search criteria.' : 'No service centers found.'}
              </Typography>
            </Box>
          )}
        </Paper>

        {/* Service Center Dialog */}
        <Dialog 
          open={dialog.open} 
          onClose={handleCloseDialog}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            {dialog.mode === 'create' && 'Add New Service Center'}
            {dialog.mode === 'edit' && 'Edit Service Center'}
            {dialog.mode === 'view' && 'Service Center Details'}
          </DialogTitle>
          
          <DialogContent>
            <Box sx={{ pt: 1 }}>
              <Grid container spacing={2}>
                {/* Basic Information */}
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>Basic Information</Typography>
                </Grid>
                
                <Grid item xs={12} sm={8}>
                  <TextField
                    fullWidth
                    label="Service Center Name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    error={!!formErrors.name}
                    helperText={formErrors.name}
                    disabled={dialog.mode === 'view'}
                    required
                  />
                </Grid>
                
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="Center Code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    error={!!formErrors.code}
                    helperText={formErrors.code}
                    disabled={dialog.mode === 'view'}
                    required
                  />
                </Grid>

                {/* Location */}
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>Location Details</Typography>
                </Grid>
                
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    error={!!formErrors.address}
                    helperText={formErrors.address}
                    disabled={dialog.mode === 'view'}
                    multiline
                    rows={2}
                    required
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="City"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    error={!!formErrors.city}
                    helperText={formErrors.city}
                    disabled={dialog.mode === 'view'}
                    required
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Province"
                    value={formData.province}
                    onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                    error={!!formErrors.province}
                    helperText={formErrors.province}
                    disabled={dialog.mode === 'view'}
                    required
                  />
                </Grid>

                {/* Contact Information */}
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>Contact Information</Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    error={!!formErrors.phone}
                    helperText={formErrors.phone}
                    disabled={dialog.mode === 'view'}
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    error={!!formErrors.email}
                    helperText={formErrors.email}
                    disabled={dialog.mode === 'view'}
                  />
                </Grid>

                {/* Operating Details */}
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>Operating Details</Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Opening Time"
                    type="time"
                    value={formData.opening_time}
                    onChange={(e) => setFormData({ ...formData, opening_time: e.target.value })}
                    error={!!formErrors.opening_time}
                    helperText={formErrors.opening_time}
                    disabled={dialog.mode === 'view'}
                    InputLabelProps={{ shrink: true }}
                    inputProps={{ step: 300 }} // 5 min intervals
                    required
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Closing Time"
                    type="time"
                    value={formData.closing_time}
                    onChange={(e) => setFormData({ ...formData, closing_time: e.target.value })}
                    error={!!formErrors.closing_time}
                    helperText={formErrors.closing_time}
                    disabled={dialog.mode === 'view'}
                    InputLabelProps={{ shrink: true }}
                    inputProps={{ step: 300 }} // 5 min intervals
                    required
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Max Daily Capacity"
                    type="number"
                    value={formData.max_daily_capacity}
                    onChange={(e) => setFormData({ ...formData, max_daily_capacity: parseInt(e.target.value) || 0 })}
                    error={!!formErrors.max_daily_capacity}
                    helperText={formErrors.max_daily_capacity}
                    disabled={dialog.mode === 'view'}
                    inputProps={{ min: 1 }}
                    required
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Average Service Time (minutes)"
                    type="number"
                    value={formData.average_service_time}
                    onChange={(e) => setFormData({ ...formData, average_service_time: parseInt(e.target.value) || 0 })}
                    error={!!formErrors.average_service_time}
                    helperText={formErrors.average_service_time}
                    disabled={dialog.mode === 'view'}
                    inputProps={{ min: 1 }}
                    required
                  />
                </Grid>

                {/* Coordinates (Optional) */}
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>Location Coordinates (Optional)</Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Latitude"
                    type="number"
                    value={formData.latitude || ''}
                    onChange={(e) => setFormData({ ...formData, latitude: e.target.value ? parseFloat(e.target.value) : undefined })}
                    disabled={dialog.mode === 'view'}
                    inputProps={{ step: 'any' }}
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Longitude"
                    type="number"
                    value={formData.longitude || ''}
                    onChange={(e) => setFormData({ ...formData, longitude: e.target.value ? parseFloat(e.target.value) : undefined })}
                    disabled={dialog.mode === 'view'}
                    inputProps={{ step: 'any' }}
                  />
                </Grid>

                {/* View Mode Additional Information */}
                {dialog.mode === 'view' && dialog.serviceCenter && (
                  <>
                    <Grid item xs={12}>
                      <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>Status Information</Typography>
                    </Grid>
                    
                    <Grid item xs={12} sm={6}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="body2">Active:</Typography>
                        {getStatusChip(dialog.serviceCenter)}
                      </Box>
                    </Grid>
                    
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2">
                        Current Queue: <strong>{dialog.serviceCenter.current_queue_length}</strong>
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={12}>
                      <Typography variant="body2" color="textSecondary">
                        Created: {new Date(dialog.serviceCenter.created_at).toLocaleString()}
                      </Typography>
                      {dialog.serviceCenter.updated_at && (
                        <Typography variant="body2" color="textSecondary">
                          Last Updated: {new Date(dialog.serviceCenter.updated_at).toLocaleString()}
                        </Typography>
                      )}
                    </Grid>
                  </>
                )}
              </Grid>
            </Box>
          </DialogContent>
          
          <DialogActions>
            <Button onClick={handleCloseDialog}>
              {dialog.mode === 'view' ? 'Close' : 'Cancel'}
            </Button>
            {dialog.mode !== 'view' && (
              <Button 
                onClick={handleSubmit}
                variant="contained"
                disabled={saving}
                startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
              >
                {saving ? 'Saving...' : (dialog.mode === 'create' ? 'Create' : 'Update')}
              </Button>
            )}
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
};

export default ServiceCenters;
