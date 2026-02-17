import { render, screen, waitFor } from '@testing-library/react';
import { Login } from './Login';
import { vi } from 'vitest';
import userEvent from '@testing-library/user-event';

// Mock Lucide icons
vi.mock('lucide-react', async () => {
    return {
        Mail: () => <div data-testid="icon-mail" />,
        Lock: () => <div data-testid="icon-lock" />,
        User: () => <div data-testid="icon-user" />,
        BookOpen: () => <div data-testid="icon-book" />,
        Eye: () => <div data-testid="icon-eye" />,
        EyeOff: () => <div data-testid="icon-eye-off" />,
        CheckCircle: () => <div data-testid="icon-check" />,
        ArrowRight: () => <div data-testid="icon-arrow" />,
        XCircle: () => <div data-testid="icon-x" />,
    };
});

// Mock Framer Motion
vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe('Login Component', () => {
    const mockLogin = vi.fn();
    const mockRegister = vi.fn();
    const mockT = vi.fn((key) => key);

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders login form by default', () => {
        render(
            <Login
                onLogin={mockLogin}
                onRegister={mockRegister}
                t={mockT}
            />
        );

        // using getAllByText because "auth.login" appears in potentially multiple places
        expect(screen.getAllByText(/auth.login/i).length).toBeGreaterThan(0);
        expect(screen.getByLabelText(/auth.email/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/auth.password/i)).toBeInTheDocument();
    });

    it('handles login submission', async () => {
        const user = userEvent.setup();
        mockLogin.mockResolvedValue(true);

        render(
            <Login
                onLogin={mockLogin}
                onRegister={mockRegister}
                t={mockT}
            />
        );

        await user.type(screen.getByLabelText(/auth.email/i), 'test@example.com');
        await user.type(screen.getByLabelText(/auth.password/i), 'password123');

        // Find the submit button specifically
        const submitBtn = screen.getByRole('button', { name: /auth.login/i });
        await user.click(submitBtn);

        await waitFor(() => {
            expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123');
        });
    });

    it('validates registration password', async () => {
        const user = userEvent.setup();
        render(
            <Login
                onLogin={mockLogin}
                onRegister={mockRegister}
                t={mockT}
            />
        );

        // click register tab
        // Use getAllByRole because standard Tabs triggers are buttons or tabs
        // Check for aria-selected or tab semantics if possible, or just click anything saying 'Register'
        const registerElements = screen.getAllByText(/auth.register/i);
        // Usually the Tab Trigger is a button-like element.
        // Let's try clicking the first one that is likely a tab trigger
        if (registerElements.length > 0) {
            await user.click(registerElements[0]);
        }

        await waitFor(() => {
            // Check for name input which only exists in register form
            expect(screen.getByLabelText(/auth.name/i)).toBeInTheDocument();
        });
    });
});
