export const validatePassword = (password: string): { isValid: boolean; error: string } => {
    if (password.length < 8) {
        return { isValid: false, error: 'Password must be at least 8 characters long.' };
    }
    if (!/[A-Z]/.test(password)) {
        return { isValid: false, error: 'Password must contain at least one uppercase letter.' };
    }
    if (!/[a-z]/.test(password)) {
        return { isValid: false, error: 'Password must contain at least one lowercase letter.' };
    }
    if (!/[0-9]/.test(password)) {
        return { isValid: false, error: 'Password must contain at least one number.' };
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        return { isValid: false, error: 'Password must contain at least one special character.' };
    }
    return { isValid: true, error: '' };
};

export const getPasswordStrength = (password: string) => {
    return {
        length: password.length >= 8,
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        number: /[0-9]/.test(password),
        special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };
};
