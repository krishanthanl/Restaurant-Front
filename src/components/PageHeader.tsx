import type { ReactNode } from 'react';
import { Box, Typography } from '@mui/material';

interface PageHeaderProps { eyebrow: string; title: string; description: string; action?: ReactNode; }

export function PageHeader({ eyebrow, title, description, action }: PageHeaderProps) {
  return (
    <Box sx={{ display: 'flex', alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, mb: 3 }}>
      <Box>
        <Typography variant="overline" color="primary.main" fontWeight={800}>{eyebrow}</Typography>
        <Typography variant="h4" sx={{ mb: 0.75 }}>{title}</Typography>
        <Typography color="text.secondary">{description}</Typography>
      </Box>
      {action}
    </Box>
  );
}
