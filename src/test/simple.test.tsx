import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

describe('Simple Test', () => {
    it('renders a div', () => {
        render(<div data-testid="test">Hello</div>);
        expect(screen.getByTestId('test')).toHaveTextContent('Hello');
    });
});
