/**
 * Market Scanner Component - Stock Screening Interface
 *
 * Screens for trading opportunities using deep value and squeeze criteria.
 */
import React from 'react';
import { APIClient } from '../api/client';
interface MarketScannerProps {
    apiClient: APIClient;
}
export declare const MarketScanner: React.FC<MarketScannerProps>;
export default MarketScanner;
