import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
    getCurrentUser,
    fetchAuthSession,
    fetchUserAttributes,
    signIn,
    signUp,
    signOut,
    confirmSignUp,
    resetPassword,
    confirmResetPassword,
    resendSignUpCode
} from 'aws-amplify/auth';
import { Hub } from 'aws-amplify/utils';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthenticating, setIsAuthenticating] = useState(false);
    const [error, setError] = useState(null);
    const [needsConfirmation, setNeedsConfirmation] = useState(false);
    const [pendingEmail, setPendingEmail] = useState(null);

    const checkUser = useCallback(async () => {
        try {
            const currentUser = await getCurrentUser();
            const session = await fetchAuthSession();
            const attributes = await fetchUserAttributes();

            setUser({
                ...currentUser,
                attributes: attributes
            });
            setToken(session.tokens?.idToken?.toString() || null);
        } catch (e) {
            setUser(null);
            setToken(null);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        checkUser();

        const unsubscribe = Hub.listen('auth', ({ payload }) => {
            switch (payload.event) {
                case 'signedIn':
                    checkUser();
                    break;
                case 'signedOut':
                    setUser(null);
                    setToken(null);
                    break;
            }
        });

        return () => unsubscribe();
    }, [checkUser]);

    const clearError = useCallback(() => {
        setError(null);
    }, []);

    const login = useCallback(async (email, password) => {
        try {
            setError(null);
            setIsAuthenticating(true);

            const result = await signIn({
                username: email,
                password
            });

            if (result.isSignedIn) {
                await checkUser();
            } else if (result.nextStep?.signInStep === 'CONFIRM_SIGN_UP') {
                setPendingEmail(email);
                setNeedsConfirmation(true);
                setError('Please confirm your account. Check your email for a confirmation code.');
            }
        } catch (e) {
            console.log('Login failed', e);

            // Handle interrupted sign-in by clearing session and retrying
            if (e.name === 'UnexpectedSignInInterruptionException') {
                try {
                    await signOut();
                    // Retry sign-in after clearing session
                    const retryResult = await signIn({
                        username: email,
                        password
                    });
                    if (retryResult.isSignedIn) {
                        await checkUser();
                        return;
                    }
                } catch (retryError) {
                    console.log('Retry login failed', retryError);
                    setError('Login session interrupted. Please try again.');
                }
            } else if (e.name === 'UserNotConfirmedException') {
                setPendingEmail(email);
                setNeedsConfirmation(true);
                setError('Please confirm your account. Check your email for a confirmation code.');
            } else if (e.name === 'NotAuthorizedException') {
                setError('Incorrect email or password.');
            } else if (e.name === 'UserNotFoundException') {
                setError('No account found with this email.');
            } else {
                setError(e.message || 'Login failed. Please try again.');
            }
        } finally {
            setIsAuthenticating(false);
        }
    }, [checkUser]);

    const register = useCallback(async (email, password, name) => {
        try {
            setError(null);
            setIsAuthenticating(true);

            const result = await signUp({
                username: email,
                password,
                options: {
                    userAttributes: {
                        email: email,
                        name: name,
                    },
                },
            });

            if (result.isSignUpComplete) {
                // Auto sign-in if sign up is complete (e.g., with auto-confirm)
                await login(email, password);
            } else {
                // Need to confirm the account
                setPendingEmail(email);
                setNeedsConfirmation(true);
                setError('Account created! Please check your email for a confirmation code.');
            }
        } catch (e) {
            console.log('Sign up failed', e);
            if (e.name === 'UsernameExistsException') {
                setError('An account with this email already exists.');
            } else if (e.name === 'InvalidPasswordException') {
                setError('Password must be at least 8 characters with uppercase, lowercase, and numbers.');
            } else {
                setError(e.message || 'Sign up failed. Please try again.');
            }
        } finally {
            setIsAuthenticating(false);
        }
    }, [login]);

    const confirmAccount = useCallback(async (email, code) => {
        try {
            setError(null);
            setIsAuthenticating(true);

            await confirmSignUp({
                username: email || pendingEmail,
                confirmationCode: code,
            });

            setNeedsConfirmation(false);
            setPendingEmail(null);
            setError('Account confirmed! You can now log in.');
        } catch (e) {
            console.log('Confirmation failed', e);
            if (e.name === 'CodeMismatchException') {
                setError('Invalid confirmation code. Please try again.');
            } else if (e.name === 'ExpiredCodeException') {
                setError('Confirmation code has expired. Please request a new one.');
            } else {
                setError(e.message || 'Confirmation failed. Please try again.');
            }
        } finally {
            setIsAuthenticating(false);
        }
    }, [pendingEmail]);

    const resendConfirmation = useCallback(async (email) => {
        try {
            setError(null);
            setIsAuthenticating(true);

            await resendSignUpCode({ username: email || pendingEmail });

            setError('A new confirmation code has been sent to your email.');
        } catch (e) {
            console.log('Resend confirmation failed', e);
            setError(e.message || 'Failed to resend code. Please try again.');
        } finally {
            setIsAuthenticating(false);
        }
    }, [pendingEmail]);

    const forgotPassword = useCallback(async (email) => {
        try {
            setError(null);
            setIsAuthenticating(true);

            await resetPassword({ username: email });

            setPendingEmail(email);
            setError('Password reset code sent! Check your email.');
        } catch (e) {
            console.log('Password reset failed', e);
            if (e.name === 'UserNotFoundException') {
                setError('No account found with this email.');
            } else {
                setError(e.message || 'Password reset failed. Please try again.');
            }
        } finally {
            setIsAuthenticating(false);
        }
    }, []);

    const confirmForgotPassword = useCallback(async (email, code, newPassword) => {
        try {
            setError(null);
            setIsAuthenticating(true);

            await confirmResetPassword({
                username: email || pendingEmail,
                confirmationCode: code,
                newPassword,
            });

            setPendingEmail(null);
            setError('Password reset successful! You can now log in with your new password.');
        } catch (e) {
            console.log('Password reset confirmation failed', e);
            if (e.name === 'CodeMismatchException') {
                setError('Invalid reset code. Please try again.');
            } else {
                setError(e.message || 'Password reset failed. Please try again.');
            }
        } finally {
            setIsAuthenticating(false);
        }
    }, [pendingEmail]);

    const logout = useCallback(async () => {
        try {
            await signOut();
            setUser(null);
            setToken(null);
            setError(null);
            setNeedsConfirmation(false);
            setPendingEmail(null);
        } catch (e) {
            console.log('Logout failed', e);
        }
    }, []);

    return (
        <AuthContext.Provider value={{
            user,
            token,
            isLoading,
            isAuthenticating,
            login,
            register,
            confirmAccount,
            resendConfirmation,
            forgotPassword,
            confirmForgotPassword,
            logout,
            error,
            clearError,
            needsConfirmation,
            pendingEmail,
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
