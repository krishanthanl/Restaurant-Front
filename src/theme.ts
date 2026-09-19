import { alpha, createTheme } from '@mui/material/styles';

export const appTheme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#0f9f96', dark: '#087b75', light: '#d9f4ef', contrastText: '#ffffff' },
    secondary: { main: '#ff7043' },
    background: { default: '#eef8f6', paper: '#ffffff' },
    text: { primary: '#172525', secondary: '#637171' },
    success: { main: '#12a66a' },
    warning: { main: '#e77a20' },
    error: { main: '#dc4c4c' },
  },
  shape: { borderRadius: 14 },
  typography: {
    fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    h4: { fontWeight: 750, letterSpacing: '-0.035em' },
    h5: { fontWeight: 750, letterSpacing: '-0.025em' },
    h6: { fontWeight: 700 },
    button: { fontWeight: 700, textTransform: 'none' },
  },
  components: {
    MuiButton: { styleOverrides: { root: { borderRadius: 11, boxShadow: 'none', minHeight: 40 } } },
    MuiCard: { styleOverrides: { root: { border: `1px solid ${alpha('#0f675f', 0.11)}`, boxShadow: '0 14px 40px rgba(20, 79, 72, 0.07)' } } },
    MuiTextField: { defaultProps: { size: 'small' } },
    MuiFormControl: { defaultProps: { size: 'small' } },
  },
});
