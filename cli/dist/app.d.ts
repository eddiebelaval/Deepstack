#!/usr/bin/env node
/**
 * DeepStack Trading System - PipBoy CLI Interface
 *
 * A retro-futuristic terminal interface inspired by Fallout's PipBoy,
 * providing a modern take on the classic Bloomberg Terminal experience.
 */
import React from 'react';
interface AppProps {
    command?: string;
    args?: string[];
}
declare const App: React.FC<AppProps>;
export default App;
