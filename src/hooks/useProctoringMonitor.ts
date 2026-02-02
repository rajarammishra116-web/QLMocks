import { useEffect, useCallback, useRef } from 'react';

export interface ProctoringData {
    tabSwitches: number;
    fullScreenExits: number;
    copiedContent: boolean;
    focusLostCount: number;
    suspiciousActivity: string[];
}

interface UseProctoringMonitorOptions {
    enabled: boolean;
    onViolation?: (type: string, count: number) => void;
    strictMode?: boolean; // If true, show warnings immediately
}

export function useProctoringMonitor(options: UseProctoringMonitorOptions) {
    const { enabled, onViolation, strictMode = false } = options;

    const dataRef = useRef<ProctoringData>({
        tabSwitches: 0,
        fullScreenExits: 0,
        copiedContent: false,
        focusLostCount: 0,
        suspiciousActivity: [],
    });

    // Track visibility changes (tab switches)
    useEffect(() => {
        if (!enabled) return;

        const handleVisibilityChange = () => {
            if (document.hidden) {
                dataRef.current.tabSwitches++;
                dataRef.current.suspiciousActivity.push(
                    `Tab switch at ${new Date().toISOString()}`
                );
                onViolation?.('tab_switch', dataRef.current.tabSwitches);
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [enabled, onViolation]);

    // Track focus loss
    useEffect(() => {
        if (!enabled) return;

        const handleBlur = () => {
            dataRef.current.focusLostCount++;
            dataRef.current.suspiciousActivity.push(
                `Focus lost at ${new Date().toISOString()}`
            );
        };

        window.addEventListener('blur', handleBlur);
        return () => window.removeEventListener('blur', handleBlur);
    }, [enabled]);

    // Track fullscreen changes
    useEffect(() => {
        if (!enabled) return;

        const handleFullscreenChange = () => {
            if (!document.fullscreenElement) {
                dataRef.current.fullScreenExits++;
                dataRef.current.suspiciousActivity.push(
                    `Fullscreen exit at ${new Date().toISOString()}`
                );
                onViolation?.('fullscreen_exit', dataRef.current.fullScreenExits);
            }
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, [enabled, onViolation]);

    // Prevent copy/paste
    useEffect(() => {
        if (!enabled) return;

        const preventCopy = (e: ClipboardEvent) => {
            e.preventDefault();
            dataRef.current.copiedContent = true;
            dataRef.current.suspiciousActivity.push(
                `Copy attempt at ${new Date().toISOString()}`
            );
            if (strictMode) {
                onViolation?.('copy_attempt', 1);
            }
        };

        const preventPaste = (e: ClipboardEvent) => {
            e.preventDefault();
        };

        const preventCut = (e: ClipboardEvent) => {
            e.preventDefault();
        };

        document.addEventListener('copy', preventCopy);
        document.addEventListener('paste', preventPaste);
        document.addEventListener('cut', preventCut);

        return () => {
            document.removeEventListener('copy', preventCopy);
            document.removeEventListener('paste', preventPaste);
            document.removeEventListener('cut', preventCut);
        };
    }, [enabled, strictMode, onViolation]);

    // Prevent right-click
    useEffect(() => {
        if (!enabled) return;

        const preventContextMenu = (e: MouseEvent) => {
            e.preventDefault();
        };

        document.addEventListener('contextmenu', preventContextMenu);
        return () => document.removeEventListener('contextmenu', preventContextMenu);
    }, [enabled]);

    // Request fullscreen
    const requestFullscreen = useCallback(async () => {
        try {
            await document.documentElement.requestFullscreen();
        } catch (error) {
            console.error('Failed to enter fullscreen:', error);
        }
    }, []);

    // Get current proctoring data
    const getProctoringData = useCallback((): ProctoringData => {
        return { ...dataRef.current };
    }, []);

    // Reset proctoring data
    const resetProctoringData = useCallback(() => {
        dataRef.current = {
            tabSwitches: 0,
            fullScreenExits: 0,
            copiedContent: false,
            focusLostCount: 0,
            suspiciousActivity: [],
        };
    }, []);

    return {
        proctoringData: dataRef.current,
        getProctoringData,
        resetProctoringData,
        requestFullscreen,
    };
}
