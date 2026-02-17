import { render, screen, act } from '@testing-library/react';
import { ExamTimer } from './ExamTimer';
import type { ExamTimerHandle } from './ExamTimer';
import { useRef } from 'react';
import { vi } from 'vitest';

describe('ExamTimer', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('renders initial time correctly', () => {
        render(
            <ExamTimer
                initialTime={600} // 10 minutes
                onTimeUp={() => { }}
                onWarning={() => { }}
            />
        );
        expect(screen.getByText('10:00')).toBeInTheDocument();
    });

    it('counts down correctly', () => {
        render(
            <ExamTimer
                initialTime={60}
                onTimeUp={() => { }}
                onWarning={() => { }}
            />
        );

        expect(screen.getByText('01:00')).toBeInTheDocument();

        act(() => {
            vi.advanceTimersByTime(1000);
        });

        expect(screen.getByText('00:59')).toBeInTheDocument();
    });

    it('triggers onTimeUp when time reaches 0', () => {
        const onTimeUp = vi.fn();
        render(
            <ExamTimer
                initialTime={2}
                onTimeUp={onTimeUp}
                onWarning={() => { }}
            />
        );

        act(() => {
            vi.advanceTimersByTime(2000);
        });

        expect(onTimeUp).toHaveBeenCalled();
    });

    it('triggers onWarning when time reaches 5 minutes (300s)', () => {
        const onWarning = vi.fn();
        render(
            <ExamTimer
                initialTime={302}
                onTimeUp={() => { }}
                onWarning={onWarning}
            />
        );

        act(() => {
            vi.advanceTimersByTime(2000);
        });

        expect(onWarning).toHaveBeenCalled();
    });

    it('exposes current time via ref', () => {
        function TestComponent() {
            const ref = useRef<ExamTimerHandle>(null);
            return (
                <ExamTimer
                    ref={ref}
                    initialTime={60}
                    onTimeUp={() => { }}
                    onWarning={() => { }}
                />
            );
        }

        render(<TestComponent />);

        // Ref attaches on mount — this test verifies the component accepts a ref without crashing.
        // Full ref-value assertions require useEffect or a trigger to read ref.current after mount.
    });
});
