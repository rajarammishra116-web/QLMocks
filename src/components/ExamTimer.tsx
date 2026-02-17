import { useState, useEffect, useImperativeHandle, forwardRef, useRef } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ExamTimerHandle {
    getTime: () => number;
    setTime: (time: number) => void;
}

interface ExamTimerProps {
    initialTime: number;
    onTimeUp: () => void;
    onWarning: () => void;
    isPaused?: boolean;
}

export const ExamTimer = forwardRef<ExamTimerHandle, ExamTimerProps>(({
    initialTime,
    onTimeUp,
    onWarning,
    isPaused = false
}, ref) => {
    const [timeLeft, setTimeLeft] = useState(initialTime);
    const timeLeftRef = useRef(initialTime);

    useImperativeHandle(ref, () => ({
        getTime: () => timeLeftRef.current,
        setTime: (time: number) => {
            setTimeLeft(time);
            timeLeftRef.current = time;
        }
    }));

    // Sync ref with state
    useEffect(() => {
        timeLeftRef.current = timeLeft;
    }, [timeLeft]);

    useEffect(() => {
        if (isPaused) return;

        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                const next = prev - 1;

                if (next <= 0) {
                    clearInterval(timer);
                    onTimeUp();
                    return 0;
                }

                // Warning at 5 minutes (300 seconds)
                if (next === 300) {
                    onWarning();
                }

                return next;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [isPaused, onTimeUp, onWarning]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const getTimerClass = () => {
        if (timeLeft < 60) return 'text-red-600 bg-red-50 border-red-200 animate-pulse';
        if (timeLeft < 300) return 'text-amber-600 bg-amber-50 border-amber-200';
        return 'text-blue-600 bg-blue-50 border-blue-200 shadow-sm';
    };

    return (
        <div className={cn(
            "flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg font-mono text-base sm:text-lg transition-all border",
            getTimerClass()
        )}>
            <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="font-bold tracking-wider">{formatTime(timeLeft)}</span>
            {timeLeft < 60 && <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 animate-bounce" />}
        </div>
    );
});

ExamTimer.displayName = 'ExamTimer';
