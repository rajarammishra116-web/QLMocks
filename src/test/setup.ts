import '@testing-library/jest-dom';

// Mock ResizeObserver for Framer Motion and other layout-dependent components
global.ResizeObserver = class ResizeObserver {
    observe() { }
    unobserve() { }
    disconnect() { }
};
