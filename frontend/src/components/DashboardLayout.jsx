import React from 'react';
import { AppShell } from './AppShell';

export const DashboardLayout = ({ children, pageTitle, breadcrumbs }) => {
  return (
    <AppShell pageTitle={pageTitle} breadcrumbs={breadcrumbs}>
      {children}
    </AppShell>
  );
};

export default DashboardLayout;
