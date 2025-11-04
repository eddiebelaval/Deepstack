/**
 * PositionMonitor Component - Displays current portfolio positions
 *
 * Shows detailed position information with P&L tracking, risk metrics,
 * and real-time updates in PipBoy terminal aesthetic.
 */
import React from 'react';
import { APIClient } from '../api/client.js';
interface PositionMonitorProps {
    apiClient: APIClient;
}
export declare const PositionMonitor: React.FC<PositionMonitorProps>;
export {};
