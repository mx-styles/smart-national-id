import { alpha, createTheme } from '@mui/material/styles';

const primaryMain = '#2563eb';
const primaryDark = '#1d4ed8';
const primaryLight = '#60a5fa';
const secondaryMain = '#f97316';
const slate900 = '#0f172a';
const slate800 = '#1e293b';
const slate100 = '#e2e8f0';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: primaryMain,
      light: primaryLight,
      dark: primaryDark,
      contrastText: '#f8fafc'
    },
    secondary: {
      main: secondaryMain,
      light: '#fb923c',
      dark: '#ea580c',
      contrastText: slate900
    },
    success: {
      main: '#22c55e'
    },
    warning: {
      main: '#facc15'
    },
    error: {
      main: '#ef4444'
    },
    background: {
      default: slate900,
      paper: '#ffffff'
    },
    text: {
      primary: slate900,
      secondary: '#475569'
    }
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 700,
      letterSpacing: '-0.02em'
    },
    h2: {
      fontWeight: 700,
      letterSpacing: '-0.01em'
    },
    h3: {
      fontWeight: 700,
      letterSpacing: '-0.01em'
    },
    h4: {
      fontWeight: 700
    },
    h5: {
      fontWeight: 600
    },
    h6: {
      fontWeight: 600
    },
    subtitle1: {
      fontWeight: 500
    },
    button: {
      fontWeight: 600,
      textTransform: 'none'
    }
  },
  shape: {
    borderRadius: 16
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          background: `radial-gradient(circle at 0% 0%, ${alpha(primaryMain, 0.12)} 0%, transparent 45%),\n            radial-gradient(circle at 100% 0%, ${alpha(secondaryMain, 0.15)} 0%, transparent 40%),\n            linear-gradient(180deg, ${slate900} 0%, ${slate800} 100%)`,
          backgroundAttachment: 'fixed',
          minHeight: '100vh'
        },
        '#root': {
          minHeight: '100vh'
        }
      }
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true
      },
      styleOverrides: {
        root: {
          borderRadius: 999,
          paddingLeft: 20,
          paddingRight: 20
        },
        containedPrimary: {
          boxShadow: `0px 20px 40px ${alpha(primaryMain, 0.25)}`
        }
      }
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 24,
          boxShadow: '0px 18px 36px rgba(15, 23, 42, 0.12)'
        }
      }
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 24,
          boxShadow: '0px 18px 40px rgba(15, 23, 42, 0.14)'
        }
      }
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 14,
          marginInline: 8
        }
      }
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          border: 'none',
          background: `linear-gradient(180deg, ${alpha(slate900, 0.9)} 0%, ${alpha(slate800, 0.95)} 100%)`,
          color: '#e2e8f0'
        }
      }
    }
  }
});

export default theme;
