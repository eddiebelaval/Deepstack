/**
 * Risk Display Component - Portfolio Risk Management Interface
 *
 * Shows risk metrics, position heat, Kelly sizing, and risk alerts.
 */
import React from 'react';
import { APIClient } from '../api/client';
interface RiskDisplayProps {
    apiClient: APIClient;
}
export declare const RiskDisplay: React.FC<RiskDisplayProps>;
export {};
