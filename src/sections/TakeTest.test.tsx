import { render, screen, waitFor, within } from '@testing-library/react';
import { TakeTest } from './TakeTest';
import { vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import type { Test, Question, User } from '@/types';

// Mock dependencies
vi.mock('@/hooks/useProctoringMonitor', () => ({
    useProctoringMonitor: () => ({
        requestFullscreen: vi.fn(),
    }),
}));

vi.mock('@/components/ExamTimer', () => ({
    ExamTimer: ({ initialTime }: any) => (
        <div data-testid="exam-timer">
            Timer: {initialTime}
        </div>
    ),
}));

// Mock scrollIntoView
window.HTMLElement.prototype.scrollIntoView = vi.fn();

// Mock Radix UI Dialog to avoid focus trap issues in JSDOM
// Only if necessary, but usually standard mocks work. 
// For now, let's assume standard behavior works if we use pointer-events none handling or just precise clicks.

// Mock UI components that might cause issues
vi.mock('lucide-react', async () => {
    return {
        ChevronLeft: () => <div />,
        ChevronRight: () => <div />,
        Flag: () => <div />,
        AlertTriangle: () => <div />,
        Keyboard: () => <div />,
        Info: () => <div />,
        PauseCircle: () => <div />,
        Clock: () => <div />,
    };
});

describe('TakeTest Component Integration', () => {
    const mockUser: User = {
        id: 'user1',
        name: 'Test Student',
        email: 'test@example.com',
        role: 'student',
        class: 10,
        board: 'CBSE',
        createdAt: new Date(),
    };

    const mockTest: Test = {
        id: 'test1',
        name: 'Sample Test',
        type: 'chapter-wise',
        classLevel: 10,
        board: 'CBSE',
        subjectIds: ['math-10'],
        chapterIds: [],
        topicIds: [],
        questionIds: ['q1', 'q2'],
        totalQuestions: 2,
        timeLimitMinutes: 10,
        passingPercentage: 40,
        showResultImmediately: true,
        createdAt: new Date(),
        createdBy: 'admin',
        shuffleQuestions: false,
        marksPerQuestion: 2,
        negativeMarkingEnabled: false,
        negativeMarkValue: 0,
    };

    const mockQuestions: Question[] = [
        {
            id: 'q1',
            classLevel: 10,
            subjectId: 'math-10',
            chapterId: 'algebra',
            topicId: 'num-sys',
            questionTextEN: 'Question 1 Text',
            options: {
                A: { en: 'Option A' },
                B: { en: 'Option B' },
                C: { en: 'Option C' },
                D: { en: 'Option D' },
            },
            correctOption: 'A',
            marks: 2,
        },
        {
            id: 'q2',
            classLevel: 10,
            subjectId: 'math-10',
            chapterId: 'algebra',
            topicId: 'num-sys',
            questionTextEN: 'Question 2 Text',
            options: {
                A: { en: 'Option A2' },
                B: { en: 'Option B2' },
                C: { en: 'Option C2' },
                D: { en: 'Option D2' },
            },
            correctOption: 'B',
            marks: 2,
        },
    ];

    const mockHandlers = {
        onStartAttempt: vi.fn(),
        onUpdateAttempt: vi.fn(),
        onFinishAttempt: vi.fn(),
        onCancel: vi.fn(),
        onComplete: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
        mockHandlers.onStartAttempt.mockResolvedValue('attempt1');
        mockHandlers.onUpdateAttempt.mockResolvedValue(undefined);
        mockHandlers.onFinishAttempt.mockResolvedValue(undefined);
    });

    it('starts exam flow successfully', async () => {
        const user = userEvent.setup();
        render(
            <TakeTest
                user={mockUser}
                test={mockTest}
                questions={mockQuestions}
                language="en"
                {...mockHandlers}
            />
        );

        // 1. Check Instructions
        const dialog = screen.getByRole('alertdialog'); // Radix content usually has this role or dialog
        expect(within(dialog).getByText(/Exam Instructions/i)).toBeInTheDocument();

        // 2. Click Begin
        // We target the button specifically inside the dialog to avoid ambiguity
        const beginBtn = within(dialog).getByRole('button', { name: /I'm Ready to Begin/i });
        await user.click(beginBtn);

        // 3. Verify Exam Started
        // Expect question text
        await waitFor(() => {
            expect(screen.getByText('Question 1 Text')).toBeInTheDocument();
        });

        // Expect Timer
        expect(screen.getByTestId('exam-timer')).toBeInTheDocument();

        // Expect Handler Call
        expect(mockHandlers.onStartAttempt).toHaveBeenCalledWith('test1');
    });
});
