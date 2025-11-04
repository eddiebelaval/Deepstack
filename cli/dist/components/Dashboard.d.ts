/**
 * Dashboard Component - Main PipBoy Trading Interface
 *
 * Displays real-time portfolio overview, recent activity, and key metrics.
 */
import React from 'react';
import { APIClient } from '../api/client';
interface DashboardProps {
    apiClient: APIClient;
}
export declare const Dashboard: React.FC<DashboardProps>;
export {};
