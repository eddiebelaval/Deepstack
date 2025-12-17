import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'com.deepstack.trading',
    appName: 'DeepStack',
    webDir: 'out', // Next.js static export directory

    // Server configuration for production
    server: {
        // Use https for both platforms
        androidScheme: 'https',
        iosScheme: 'https',
        // Allow navigation to your production domain
        allowNavigation: ['deepstack.trade', '*.deepstack.trade'],
    },

    // iOS-specific configuration
    ios: {
        // Content inset adjustment for notch/dynamic island
        contentInset: 'automatic',
        // Allow mixed content for development
        allowsLinkPreview: true,
        // Scroll behavior
        scrollEnabled: true,
        // Status bar style
        preferredContentMode: 'mobile',
    },

    // Plugin configurations
    plugins: {
        // Splash screen configuration
        SplashScreen: {
            launchShowDuration: 2000,
            launchAutoHide: true,
            backgroundColor: '#1a1613', // DeepStack dark background
            showSpinner: false,
            splashFullScreen: true,
            splashImmersive: true,
        },

        // Status bar configuration
        StatusBar: {
            style: 'dark', // Light content for dark background
            backgroundColor: '#1a1613',
        },

        // Keyboard configuration for chat input
        Keyboard: {
            resize: 'body',
            resizeOnFullScreen: true,
        },
    },
};

export default config;
