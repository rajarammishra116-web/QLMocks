import { useEffect, useRef, useCallback } from 'react';

export function useInactivityTimer(
    timeoutMs: number,
    onTimeout: () => void,
    isActive: boolean
) {
    const onTimeoutRef = useRef(onTimeout);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Keep the callback ref up to date
    useEffect(() => {
        onTimeoutRef.current = onTimeout;
    }, [onTimeout]);

    const resetTimer = useCallback(() => {
        if (!isActive) return;

        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }

        timerRef.current = setTimeout(() => {
            onTimeoutRef.current();
        }, timeoutMs);
    }, [isActive, timeoutMs]);

    useEffect(() => {
        if (!isActive) {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
            return;
        }

        // Initial setup
        resetTimer();

        // Event listeners for activity
        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];

        let lastActivity = Date.now();

        const handleActivity = () => {
            const now = Date.now();
            // Throttle to once per second
            if (now - lastActivity > 1000) {
                lastActivity = now;
                resetTimer();
            }
        };

        events.forEach(event => {
            const options = (event === 'scroll' || event === 'touchstart') ? { passive: true } : undefined;
            window.addEventListener(event, handleActivity, options);
        });

        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
            events.forEach(event => {
                // @ts-ignore
                window.removeEventListener(event, handleActivity);
            });
        };
    }, [isActive, resetTimer]);

    return { resetTimer };
}
