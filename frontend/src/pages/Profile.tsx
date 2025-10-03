import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  Box,
  Avatar,
  Divider,
  Alert,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack
} from '@mui/material';
import {
  Person,
  Email,
  Phone,
  Edit,
  Save,
  Cancel,
  Lock,
  AccountCircle
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import axios from 'axios';
import PageContainer from '../components/PageContainer';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Type definitions
interface ProfileData {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  national_id?: string;
}

interface PasswordChangeData {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

const Profile: React.FC = () => {
  const { user, updateProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState<ProfileData>({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    national_id: user?.national_id || ''
  });
  const [originalData, setOriginalData] = useState<ProfileData>({ ...profileData });
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [passwordData, setPasswordData] = useState<PasswordChangeData>({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    if (user) {
      const data = {
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        phone: user.phone || '',
        national_id: user.national_id || ''
      };
      setProfileData(data);
      setOriginalData(data);
    }
  }, [user]);

  const handleInputChange = (field: keyof ProfileData, value: string) => {
    // Only allow changes to editable fields
    if (field === 'email' || field === 'phone') {
      setProfileData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handlePasswordChange = (field: keyof PasswordChangeData, value: string) => {
    setPasswordData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleEdit = () => {
    setEditing(true);
  };

  const handleCancel = () => {
    setProfileData({ ...originalData });
    setEditing(false);
  };

  const validateProfileData = (): boolean => {
    // Only validate editable fields (email and phone)
    if (!profileData.email.trim()) {
      toast.error('Email is required');
      return false;
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(profileData.email)) {
      toast.error('Please enter a valid email address');
      return false;
    }

    // Phone validation (if provided)
    if (profileData.phone && profileData.phone.trim()) {
      const phoneRegex = /^[+]?[\d\s-()]+$/;
      if (!phoneRegex.test(profileData.phone.trim())) {
        toast.error('Please enter a valid phone number');
        return false;
      }
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateProfileData()) {
      return;
    }

    setLoading(true);
    try {
      // Only send editable fields to the API
      const editableData = {
        email: profileData.email,
        phone: profileData.phone
      };
      
      await updateProfile(editableData);
      setOriginalData({ ...profileData });
      setEditing(false);
      toast.success('Contact information updated successfully!');
    } catch (error: any) {
      console.error('Profile update error:', error);
      if (error.response?.data?.detail) {
        toast.error(error.response.data.detail);
      } else {
        toast.error('Failed to update profile. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const validatePasswordData = (): boolean => {
    if (!passwordData.current_password) {
      toast.error('Please enter your current password');
      return false;
    }
    if (!passwordData.new_password) {
      toast.error('Please enter a new password');
      return false;
    }
    if (passwordData.new_password.length < 6) {
      toast.error('New password must be at least 6 characters long');
      return false;
    }
    if (passwordData.new_password !== passwordData.confirm_password) {
      toast.error('Password confirmation does not match');
      return false;
    }
    if (passwordData.current_password === passwordData.new_password) {
      toast.error('New password must be different from current password');
      return false;
    }
    return true;
  };

  const handlePasswordSubmit = async () => {
    if (!validatePasswordData()) {
      return;
    }

    setPasswordLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/auth/change-password`, {
        current_password: passwordData.current_password,
        new_password: passwordData.new_password
      });
      
      toast.success('Password changed successfully!');
      setPasswordDialogOpen(false);
      setPasswordData({
        current_password: '',
        new_password: '',
        confirm_password: ''
      });
    } catch (error: any) {
      console.error('Password change error:', error);
      if (error.response?.data?.detail) {
        toast.error(error.response.data.detail);
      } else {
        toast.error('Failed to change password. Please try again.');
      }
    } finally {
      setPasswordLoading(false);
    }
  };

  const getInitials = (firstName: string, lastName: string): string => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  return (
    <PageContainer
      title={
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} alignItems={{ xs: 'flex-start', sm: 'center' }}>
          <Avatar
            sx={{
              width: 80,
              height: 80,
              bgcolor: 'secondary.main',
              boxShadow: '0px 18px 36px rgba(15, 23, 42, 0.2)',
              fontSize: '2rem'
            }}
          >
            {user ? getInitials(user.first_name, user.last_name) : <AccountCircle />}
          </Avatar>
          <Box>
            <Typography variant="h4" gutterBottom>
              {user?.first_name} {user?.last_name}
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.8 }}>
              {user?.role?.replace('_', ' ').toUpperCase()} • {user?.email}
            </Typography>
          </Box>
        </Stack>
      }
      description="Update your contact information, change your password, and review important account details."
      maxWidth="md"
    >

      <Grid container spacing={3}>
        {/* Profile Information */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Box>
                <Typography variant="h6">
                  Profile Information
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Only email and phone number can be edited
                </Typography>
              </Box>
              {!editing && (
                <Button
                  variant="outlined"
                  startIcon={<Edit />}
                  onClick={handleEdit}
                >
                  Edit Contact Info
                </Button>
              )}
            </Box>

            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body2">
                <strong>Note:</strong> Name and National ID are permanent fields that cannot be edited. 
                Book an appointment if you need to update these details.
              </Typography>
            </Alert>

            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="First Name"
                  value={profileData.first_name}
                  disabled={true}
                  required
                  InputProps={{
                    startAdornment: <Person sx={{ mr: 1, color: 'text.secondary' }} />,
                    readOnly: true
                  }}
                  sx={{
                    '& .MuiInputBase-root': {
                      backgroundColor: 'action.hover'
                    }
                  }}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Last Name"
                  value={profileData.last_name}
                  disabled={true}
                  required
                  InputProps={{
                    startAdornment: <Person sx={{ mr: 1, color: 'text.secondary' }} />,
                    readOnly: true
                  }}
                  sx={{
                    '& .MuiInputBase-root': {
                      backgroundColor: 'action.hover'
                    }
                  }}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Email Address"
                  type="email"
                  value={profileData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  disabled={!editing}
                  required
                  InputProps={{
                    startAdornment: <Email sx={{ mr: 1, color: 'text.secondary' }} />
                  }}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Phone Number"
                  value={profileData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  disabled={!editing}
                  InputProps={{
                    startAdornment: <Phone sx={{ mr: 1, color: 'text.secondary' }} />
                  }}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="National ID"
                  value={profileData.national_id}
                  disabled={true}
                  InputProps={{
                    readOnly: true
                  }}
                  sx={{
                    '& .MuiInputBase-root': {
                      backgroundColor: 'action.hover'
                    }
                  }}
                />
              </Grid>

              {editing && (
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                    <Button
                      variant="outlined"
                      startIcon={<Cancel />}
                      onClick={handleCancel}
                      disabled={loading}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="contained"
                      startIcon={loading ? <CircularProgress size={20} /> : <Save />}
                      onClick={handleSave}
                      disabled={loading}
                    >
                      {loading ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </Box>
                </Grid>
              )}
            </Grid>
          </Paper>
        </Grid>

        {/* Account Security */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Account Security
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Keep your account secure by updating your password regularly.
              </Typography>
              <Button
                variant="outlined"
                fullWidth
                startIcon={<Lock />}
                onClick={() => setPasswordDialogOpen(true)}
              >
                Change Password
              </Button>
            </CardContent>
          </Card>

          {/* Account Info */}
          <Card sx={{ mt: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Account Information
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Account Type
                </Typography>
                <Typography variant="body1">
                  {user?.role?.replace('_', ' ').toUpperCase()}
                </Typography>
              </Box>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Account Status
                </Typography>
                <Typography variant="body1" color={user?.is_active ? 'success.main' : 'error.main'}>
                  {user?.is_active ? 'Active' : 'Inactive'}
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Member Since
                </Typography>
                <Typography variant="body1">
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Password Change Dialog */}
      <Dialog
        open={passwordDialogOpen}
        onClose={() => setPasswordDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Change Password</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                type="password"
                label="Current Password"
                value={passwordData.current_password}
                onChange={(e) => handlePasswordChange('current_password', e.target.value)}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                type="password"
                label="New Password"
                value={passwordData.new_password}
                onChange={(e) => handlePasswordChange('new_password', e.target.value)}
                required
                helperText="Must be at least 6 characters long"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                type="password"
                label="Confirm New Password"
                value={passwordData.confirm_password}
                onChange={(e) => handlePasswordChange('confirm_password', e.target.value)}
                required
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setPasswordDialogOpen(false)}
            disabled={passwordLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handlePasswordSubmit}
            variant="contained"
            disabled={passwordLoading}
            startIcon={passwordLoading ? <CircularProgress size={20} /> : <Lock />}
          >
            {passwordLoading ? 'Changing...' : 'Change Password'}
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default Profile;