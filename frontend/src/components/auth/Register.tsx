import React, { useState, ChangeEvent, FormEvent } from 'react';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Link,
  Box,
  Alert,
  CircularProgress,
  Grid,
  Stack
} from '@mui/material';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface RegisterFormData {
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  nationalId: string;
}

const textFieldStyles = {
  '& .MuiInputLabel-root': {
    color: 'rgba(248, 250, 252, 0.72)',
    '&.Mui-focused': {
      color: '#f8fafc'
    },
    '&.MuiInputLabel-shrink': {
      color: '#f8fafc'
    }
  },
  '& .MuiOutlinedInput-root': {
    color: '#f8fafc',
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    borderRadius: 18,
    transition: 'all .2s ease-in-out',
    '& fieldset': {
      borderColor: 'rgba(148, 163, 184, 0.35)'
    },
    '&:hover fieldset': {
      borderColor: 'rgba(191, 219, 254, 0.55)'
    },
    '&.Mui-focused fieldset': {
      borderColor: '#bfdbfe',
      boxShadow: '0 0 0 2px rgba(191, 219, 254, 0.25)'
    },
    '&.Mui-error fieldset': {
      borderColor: 'rgba(248, 113, 113, 0.7)'
    },
    '&.Mui-error.Mui-focused fieldset': {
      borderColor: '#fca5a5',
      boxShadow: '0 0 0 2px rgba(248, 113, 113, 0.2)'
    }
  },
  '& .MuiInputBase-input': {
    color: '#f8fafc',
    padding: '14px 16px',
    '::placeholder': {
      color: 'rgba(248, 250, 252, 0.62)'
    }
  },
  '& .MuiFormHelperText-root': {
    color: 'rgba(248, 250, 252, 0.7)'
  }
} as const;

const Register: React.FC = () => {
  const [formData, setFormData] = useState<RegisterFormData>({
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    nationalId: ''
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<boolean>(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError(''); // Clear error when user types
  };

  const validateForm = (): boolean => {
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return false;
    }
    if (!/^\d{10}$/.test(formData.phone.replace(/\D/g, ''))) {
      setError('Please enter a valid 10-digit phone number');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const userData = {
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        first_name: formData.firstName,
        last_name: formData.lastName,
        national_id: formData.nationalId || null
      };

      const result = await register(userData);
      if (result.success) {
        setSuccess(true);
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        setError(result.error || 'Registration failed');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', py: 6 }}>
        <Container component="main" maxWidth="xs">
          <Paper elevation={0} sx={{ p: 4, borderRadius: { xs: 3, sm: 4 }, textAlign: 'center', backdropFilter: 'blur(16px)', backgroundColor: 'rgba(15, 23, 42, 0.8)', color: '#f8fafc' }}>
            <Alert severity="success" sx={{ mb: 2 }}>
              Registration successful! Redirecting to login...
            </Alert>
            <Typography variant="body2" sx={{ opacity: 0.8 }}>
              Sit tight while we send you to the sign in page.
            </Typography>
          </Paper>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', py: { xs: 6, md: 8 } }}>
      <Container component="main" maxWidth="md">
        <Paper
          elevation={0}
          sx={{
            px: { xs: 3, md: 6 },
            py: { xs: 4, md: 6 },
            borderRadius: { xs: 3, md: 5 },
            backdropFilter: 'blur(18px)',
            backgroundColor: 'rgba(15, 23, 42, 0.8)',
            color: '#f8fafc',
            boxShadow: '0px 40px 80px rgba(15, 23, 42, 0.42)'
          }}
        >
          <Stack spacing={1.5} alignItems="center" sx={{ mb: 4 }}>
            <Typography component="h1" variant="h4" sx={{ fontWeight: 700, textAlign: 'center' }}>
              Smart e-National ID
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.8, textAlign: 'center', maxWidth: 520 }}>
              Create your account to manage appointments, queue progress, and service centre visits with confidence.
            </Typography>
          </Stack>
          <Typography component="h2" variant="h5" sx={{ fontWeight: 600, mb: 2, textAlign: 'center' }}>
            Create account
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  autoComplete="given-name"
                  name="firstName"
                  required
                  fullWidth
                  id="firstName"
                  label="First Name"
                  autoFocus
                  value={formData.firstName}
                  onChange={handleChange}
                  disabled={loading}
                  sx={textFieldStyles}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  required
                  fullWidth
                  id="lastName"
                  label="Last Name"
                  name="lastName"
                  autoComplete="family-name"
                  value={formData.lastName}
                  onChange={handleChange}
                  disabled={loading}
                  sx={textFieldStyles}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  required
                  fullWidth
                  id="email"
                  label="Email Address"
                  name="email"
                  autoComplete="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  disabled={loading}
                  sx={textFieldStyles}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  required
                  fullWidth
                  id="phone"
                  label="Phone Number"
                  name="phone"
                  autoComplete="tel"
                  placeholder="263771234567"
                  value={formData.phone}
                  onChange={handleChange}
                  disabled={loading}
                  sx={textFieldStyles}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  id="nationalId"
                  label="National ID (if available)"
                  name="nationalId"
                  placeholder="63-123456A12"
                  value={formData.nationalId}
                  onChange={handleChange}
                  disabled={loading}
                  helperText="Optional - for existing ID holders"
                  sx={textFieldStyles}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  required
                  fullWidth
                  name="password"
                  label="Password"
                  type="password"
                  id="password"
                  autoComplete="new-password"
                  value={formData.password}
                  onChange={handleChange}
                  disabled={loading}
                  helperText="Minimum 6 characters"
                  sx={textFieldStyles}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  required
                  fullWidth
                  name="confirmPassword"
                  label="Confirm Password"
                  type="password"
                  id="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  disabled={loading}
                  sx={textFieldStyles}
                />
              </Grid>
            </Grid>
            <Button
              type="submit"
              fullWidth
              variant="contained"
              color="secondary"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
              startIcon={loading && <CircularProgress size={20} />}
            >
              {loading ? 'Creating Account...' : 'Sign Up'}
            </Button>
            <Box textAlign="center">
              <Link component={RouterLink} to="/login" variant="body2" sx={{ color: 'rgba(248, 250, 252, 0.8)' }}>
                Already have an account? Sign in
              </Link>
            </Box>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default Register;