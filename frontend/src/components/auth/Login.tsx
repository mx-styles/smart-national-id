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
  Stack
} from '@mui/material';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface LoginFormData {
  email: string;
  password: string;
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

const Login: React.FC = () => {
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError(''); // Clear error when user types
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await login(formData.email, formData.password);
      if (result.success) {
        navigate('/dashboard');
      } else {
        setError(result.error || 'Login failed');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', py: { xs: 6, md: 8 } }}>
      <Container component="main" maxWidth="sm">
        <Paper
          elevation={0}
          sx={{
            px: { xs: 3, md: 6 },
            py: { xs: 4, md: 6 },
            borderRadius: { xs: 3, md: 5 },
            backdropFilter: 'blur(18px)',
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            color: '#f8fafc',
            boxShadow: '0px 40px 80px rgba(15, 23, 42, 0.45)'
          }}
        >
          <Stack spacing={1.5} alignItems="center" sx={{ mb: 4 }}>
            <Typography component="h1" variant="h4" sx={{ fontWeight: 500, textAlign: 'center' }}>
              Smart e-National ID
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.8, textAlign: 'center', maxWidth: 360 }}>
              Seamless access to appointments, queue insights, and secure citizen services.
            </Typography>
          </Stack>
          <Typography component="h2" variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
            Sign in
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} sx={{ display: 'grid', gap: 2 }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email Address"
              name="email"
              autoComplete="email"
              autoFocus
              value={formData.email}
              onChange={handleChange}
              disabled={loading}
              sx={textFieldStyles}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type="password"
              id="password"
              autoComplete="current-password"
              value={formData.password}
              onChange={handleChange}
              disabled={loading}
              sx={textFieldStyles}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              color="secondary"
              sx={{ mt: 1, mb: 2 }}
              disabled={loading}
              startIcon={loading && <CircularProgress size={20} />}
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </Button>
            <Box textAlign="center">
              <Link component={RouterLink} to="/register" variant="body2" sx={{ color: 'rgba(248, 250, 252, 0.8)' }}>
                {"Don't have an account? Sign Up"}
              </Link>
            </Box>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default Login;