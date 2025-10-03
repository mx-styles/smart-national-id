import React from 'react';
import { Box, Container, ContainerProps, Stack, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';

interface PageContainerProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  maxWidth?: ContainerProps['maxWidth'];
  disableGutters?: boolean;
  children: React.ReactNode;
}

const PageContainer: React.FC<PageContainerProps> = ({
  title,
  description,
  actions,
  maxWidth = 'lg',
  disableGutters,
  children
}) => {
  const theme = useTheme();

  const hasHeader = Boolean(title || description || actions);

  return (
    <Box sx={{ py: { xs: 3, md: 6 } }}>
      <Container maxWidth={maxWidth} disableGutters={disableGutters}>
        {hasHeader && (
          <Box
            sx={{
              mb: { xs: 3, md: 5 },
              p: { xs: 3, md: 4 },
              borderRadius: 4,
              background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.95)} 0%, ${alpha(theme.palette.primary.dark, 0.9)} 100%)`,
              color: theme.palette.primary.contrastText,
              boxShadow: '0px 32px 64px rgba(15, 23, 42, 0.22)',
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              alignItems: { xs: 'flex-start', md: 'center' },
              justifyContent: 'space-between',
              gap: 3,
              overflow: 'hidden'
            }}
          >
            <Box sx={{ maxWidth: 720 }}>
              {title && (
                typeof title === 'string' ? (
                  <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: description ? 1 : 0 }}>
                    {title}
                  </Typography>
                ) : (
                  title
                )
              )}
              {description && (
                typeof description === 'string' ? (
                  <Typography variant="body1" sx={{ opacity: 0.92 }}>
                    {description}
                  </Typography>
                ) : (
                  description
                )
              )}
            </Box>
            {actions && (
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ width: { xs: '100%', md: 'auto' } }}>
                {actions}
              </Stack>
            )}
          </Box>
        )}

        <Box sx={{ display: 'grid', gap: { xs: 3, md: 4 } }}>{children}</Box>
      </Container>
    </Box>
  );
};

export default PageContainer;
