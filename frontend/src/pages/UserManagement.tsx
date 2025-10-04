import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  Alert
} from '@mui/material';
import {
  Edit,
  Delete,
  Add,
  PersonAdd,
  CheckCircle,
  Cancel,
  AdminPanelSettings,
  Person,
  Work,
  LockReset
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import PageContainer from '../components/PageContainer';
import { adminAPI } from '../services/api';

interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  national_id?: string;
  phone_number?: string;
  role: 'citizen' | 'staff' | 'admin';
  is_active: boolean;
  created_at: string;
}

interface UserFormData {
  email: string;
  first_name: string;
  last_name: string;
  national_id: string;
  phone_number: string;
  role: 'citizen' | 'staff' | 'admin';
  password?: string;
}

interface UserStats {
  total_users: number;
  active_users: number;
  admins: number;
  staff: number;
  citizens: number;
}

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<UserStats>({
    total_users: 0,
    active_users: 0,
    admins: 0,
    staff: 0,
    citizens: 0
  });
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [passwordResetDialogOpen, setPasswordResetDialogOpen] = useState(false);
  const [resetPasswordData, setResetPasswordData] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [formData, setFormData] = useState<UserFormData>({
    email: '',
    first_name: '',
    last_name: '',
    national_id: '',
    phone_number: '',
    role: 'citizen',
    password: ''
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getUsers();
      const usersData = response.data;
      setUsers(usersData);
      
      // Calculate stats
      const totalUsers = usersData.length;
      const activeUsers = usersData.filter((u: User) => u.is_active).length;
      const admins = usersData.filter((u: User) => u.role === 'admin').length;
      const staff = usersData.filter((u: User) => u.role === 'staff').length;
      const citizens = usersData.filter((u: User) => u.role === 'citizen').length;
      
      setStats({
        total_users: totalUsers,
        active_users: activeUsers,
        admins,
        staff,
        citizens
      });
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (user?: User) => {
    if (user) {
      setEditMode(true);
      setSelectedUser(user);
      setFormData({
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        national_id: user.national_id || '',
        phone_number: user.phone_number || '',
        role: user.role,
        password: ''
      });
    } else {
      setEditMode(false);
      setSelectedUser(null);
      setFormData({
        email: '',
        first_name: '',
        last_name: '',
        national_id: '',
        phone_number: '',
        role: 'citizen',
        password: ''
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedUser(null);
    setEditMode(false);
  };

  const handleInputChange = (field: keyof UserFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    try {
      if (editMode && selectedUser) {
        // Update user
        const updateData: any = {
          first_name: formData.first_name,
          last_name: formData.last_name,
          role: formData.role,
          phone_number: formData.phone_number,
          national_id: formData.national_id
        };
        
        await adminAPI.updateUser(selectedUser.id, updateData);
        toast.success('User updated successfully');
      } else {
        // Create new user
        if (!formData.password || formData.password.length < 6) {
          toast.error('Password must be at least 6 characters');
          return;
        }
        
        await adminAPI.createUser(formData);
        toast.success('User created successfully');
      }
      
      handleCloseDialog();
      fetchUsers();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Operation failed');
    }
  };

  const handleToggleActive = async (userId: number, currentStatus: boolean) => {
    try {
      await adminAPI.toggleUserStatus(userId, !currentStatus);
      toast.success(`User ${!currentStatus ? 'activated' : 'deactivated'}`);
      fetchUsers();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to update user status');
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await adminAPI.deleteUser(userId);
        toast.success('User deleted successfully');
        fetchUsers();
      } catch (error: any) {
        toast.error(error.response?.data?.detail || 'Failed to delete user');
      }
    }
  };

  const handleOpenPasswordReset = (user: User) => {
    setSelectedUser(user);
    setResetPasswordData({
      newPassword: '',
      confirmPassword: ''
    });
    setPasswordResetDialogOpen(true);
  };

  const handleClosePasswordReset = () => {
    setPasswordResetDialogOpen(false);
    setSelectedUser(null);
    setResetPasswordData({
      newPassword: '',
      confirmPassword: ''
    });
  };

  const handlePasswordReset = async () => {
    if (!selectedUser) return;

    if (resetPasswordData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    if (resetPasswordData.newPassword !== resetPasswordData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    try {
      await adminAPI.resetUserPassword(selectedUser.id, resetPasswordData.newPassword);
      toast.success('Password reset successfully');
      handleClosePasswordReset();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to reset password');
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <AdminPanelSettings fontSize="small" />;
      case 'staff':
        return <Work fontSize="small" />;
      default:
        return <Person fontSize="small" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'error';
      case 'staff':
        return 'warning';
      default:
        return 'default';
    }
  };

  return (
    <PageContainer
      title="User Management"
      description="Manage system users, roles, and permissions"
      actions={
        <Button
          variant="contained"
          startIcon={<PersonAdd />}
          onClick={() => handleOpenDialog()}
        >
          Add New User
        </Button>
      }
    >
      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" variant="body2">
                    Total Users
                  </Typography>
                  <Typography variant="h4" sx={{ mt: 1 }}>
                    {stats.total_users}
                  </Typography>
                </Box>
                <Person color="primary" sx={{ fontSize: 40, opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" variant="body2">
                    Active Users
                  </Typography>
                  <Typography variant="h4" sx={{ mt: 1 }}>
                    {stats.active_users}
                  </Typography>
                </Box>
                <CheckCircle color="success" sx={{ fontSize: 40, opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" variant="body2">
                    Admins
                  </Typography>
                  <Typography variant="h4" sx={{ mt: 1 }}>
                    {stats.admins}
                  </Typography>
                </Box>
                <AdminPanelSettings color="error" sx={{ fontSize: 40, opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" variant="body2">
                    Staff
                  </Typography>
                  <Typography variant="h4" sx={{ mt: 1 }}>
                    {stats.staff}
                  </Typography>
                </Box>
                <Work color="warning" sx={{ fontSize: 40, opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" variant="body2">
                    Citizens
                  </Typography>
                  <Typography variant="h4" sx={{ mt: 1 }}>
                    {stats.citizens}
                  </Typography>
                </Box>
                <Person color="info" sx={{ fontSize: 40, opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Users Table */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>National ID</TableCell>
                <TableCell>Phone</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Created</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    <Alert severity="info">No users found</Alert>
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {user.first_name} {user.last_name}
                      </Typography>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.national_id || 'N/A'}</TableCell>
                    <TableCell>{user.phone_number || 'N/A'}</TableCell>
                    <TableCell>
                      <Chip
                        icon={getRoleIcon(user.role)}
                        label={user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                        color={getRoleColor(user.role) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={user.is_active ? <CheckCircle /> : <Cancel />}
                        label={user.is_active ? 'Active' : 'Inactive'}
                        color={user.is_active ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {new Date(user.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Edit User">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleOpenDialog(user)}
                        >
                          <Edit fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={user.is_active ? 'Deactivate' : 'Activate'}>
                        <IconButton
                          size="small"
                          color={user.is_active ? 'warning' : 'success'}
                          onClick={() => handleToggleActive(user.id, user.is_active)}
                        >
                          {user.is_active ? <Cancel fontSize="small" /> : <CheckCircle fontSize="small" />}
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Reset Password">
                        <IconButton
                          size="small"
                          color="info"
                          onClick={() => handleOpenPasswordReset(user)}
                        >
                          <LockReset fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete User">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteUser(user.id)}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* User Form Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editMode ? 'Edit User' : 'Add New User'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              label="Email"
              type="email"
              fullWidth
              required
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              disabled={editMode}
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="First Name"
                fullWidth
                required
                value={formData.first_name}
                onChange={(e) => handleInputChange('first_name', e.target.value)}
              />
              <TextField
                label="Last Name"
                fullWidth
                required
                value={formData.last_name}
                onChange={(e) => handleInputChange('last_name', e.target.value)}
              />
            </Box>
            <TextField
              label="National ID"
              fullWidth
              value={formData.national_id}
              onChange={(e) => handleInputChange('national_id', e.target.value)}
            />
            <TextField
              label="Phone Number"
              fullWidth
              value={formData.phone_number}
              onChange={(e) => handleInputChange('phone_number', e.target.value)}
            />
            <FormControl fullWidth required>
              <InputLabel>Role</InputLabel>
              <Select
                value={formData.role}
                label="Role"
                onChange={(e) => handleInputChange('role', e.target.value)}
              >
                <MenuItem value="citizen">Citizen</MenuItem>
                <MenuItem value="staff">Staff</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
              </Select>
            </FormControl>
            {!editMode && (
              <TextField
                label="Password"
                type="password"
                fullWidth
                required
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                helperText="Minimum 6 characters"
              />
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editMode ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Password Reset Dialog */}
      <Dialog open={passwordResetDialogOpen} onClose={handleClosePasswordReset} maxWidth="xs" fullWidth>
        <DialogTitle>
          Reset Password
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            {selectedUser && (
              <Alert severity="info">
                Resetting password for: <strong>{selectedUser.first_name} {selectedUser.last_name}</strong>
                <br />
                ({selectedUser.email})
              </Alert>
            )}
            <TextField
              label="New Password"
              type="password"
              fullWidth
              required
              value={resetPasswordData.newPassword}
              onChange={(e) => setResetPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
              helperText="Minimum 6 characters"
            />
            <TextField
              label="Confirm Password"
              type="password"
              fullWidth
              required
              value={resetPasswordData.confirmPassword}
              onChange={(e) => setResetPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
              error={resetPasswordData.confirmPassword !== '' && resetPasswordData.newPassword !== resetPasswordData.confirmPassword}
              helperText={
                resetPasswordData.confirmPassword !== '' && resetPasswordData.newPassword !== resetPasswordData.confirmPassword
                  ? 'Passwords do not match'
                  : ''
              }
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClosePasswordReset}>Cancel</Button>
          <Button 
            onClick={handlePasswordReset} 
            variant="contained"
            color="warning"
          >
            Reset Password
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default UserManagement;
