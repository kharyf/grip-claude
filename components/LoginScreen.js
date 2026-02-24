import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    ActivityIndicator,
    Animated,
} from 'react-native';

const LoginScreen = ({ onLogin, onSignUp, onForgotPassword, onConfirmAccount, error, isLoading, needsConfirmation }) => {
    const [mode, setMode] = useState('login'); // 'login', 'signup', 'forgotPassword', 'confirmCode'
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [name, setName] = useState('');
    const [confirmationCode, setConfirmationCode] = useState('');
    const [localError, setLocalError] = useState('');

    // Animation for the logo
    const [logoScale] = useState(new Animated.Value(1));

    // Automatically switch to confirmation code mode when needsConfirmation becomes true
    useEffect(() => {
        if (needsConfirmation) {
            setMode('confirmCode');
            setLocalError('');
        }
    }, [needsConfirmation]);

    const animateLogo = () => {
        Animated.sequence([
            Animated.timing(logoScale, {
                toValue: 0.95,
                duration: 100,
                useNativeDriver: true,
            }),
            Animated.timing(logoScale, {
                toValue: 1,
                duration: 100,
                useNativeDriver: true,
            }),
        ]).start();
    };

    const validateEmail = (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const handleLogin = () => {
        setLocalError('');
        if (!email.trim()) {
            setLocalError('Please enter your email');
            return;
        }
        if (!validateEmail(email)) {
            setLocalError('Please enter a valid email');
            return;
        }
        if (!password) {
            setLocalError('Please enter your password');
            return;
        }
        animateLogo();
        onLogin(email.toLowerCase().trim(), password);
    };

    const handleSignUp = () => {
        setLocalError('');
        if (!name.trim()) {
            setLocalError('Please enter your name');
            return;
        }
        if (!email.trim()) {
            setLocalError('Please enter your email');
            return;
        }
        if (!validateEmail(email)) {
            setLocalError('Please enter a valid email');
            return;
        }
        if (!password) {
            setLocalError('Password is required');
            return;
        }
        if (password.length < 8) {
            setLocalError('Password must be at least 8 characters');
            return;
        }
        if (password !== confirmPassword) {
            setLocalError('Passwords do not match');
            return;
        }
        animateLogo();
        onSignUp(email.toLowerCase().trim(), password, name.trim());
    };

    const handleForgotPassword = () => {
        setLocalError('');
        if (!email.trim()) {
            setLocalError('Please enter your email');
            return;
        }
        if (!validateEmail(email)) {
            setLocalError('Please enter a valid email');
            return;
        }
        animateLogo();
        onForgotPassword(email.toLowerCase().trim());
    };

    const handleConfirmCode = () => {
        setLocalError('');
        if (!confirmationCode.trim()) {
            setLocalError('Please enter the confirmation code');
            return;
        }
        animateLogo();
        onConfirmAccount(email.toLowerCase().trim(), confirmationCode.trim());
    };

    const switchMode = (newMode) => {
        setLocalError('');
        setMode(newMode);
        if (newMode !== 'confirmCode') {
            setConfirmationCode('');
        }
    };

    const displayError = localError || error;

    const renderLoginForm = () => (
        <>
            <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Email</Text>
                <TextInput
                    testID="email-input"
                    style={styles.input}
                    placeholder="Enter your email"
                    placeholderTextColor="#666"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                />
            </View>

            <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Password</Text>
                <TextInput
                    testID="password-input"
                    style={styles.input}
                    placeholder="Enter your password"
                    placeholderTextColor="#666"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                />
            </View>

            <TouchableOpacity
                style={styles.forgotPasswordLink}
                onPress={() => switchMode('forgotPassword')}
            >
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
                onPress={handleLogin}
                disabled={isLoading}
            >
                {isLoading ? (
                    <ActivityIndicator color="#1a1a1a" />
                ) : (
                    <Text style={styles.primaryButtonText}>Log In</Text>
                )}
            </TouchableOpacity>

            <View style={styles.dividerContainer}>
                <View style={styles.divider} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={styles.divider} />
            </View>

            <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => switchMode('signup')}
            >
                <Text style={styles.secondaryButtonText}>Create an Account</Text>
            </TouchableOpacity>
        </>
    );

    const renderSignUpForm = () => (
        <>
            <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Full Name</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Enter your full name"
                    placeholderTextColor="#666"
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                />
            </View>

            <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Email</Text>
                <TextInput
                    testID="email-input"
                    style={styles.input}
                    placeholder="Enter your email"
                    placeholderTextColor="#666"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                />
            </View>

            <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Password</Text>
                <TextInput
                    testID="password-input"
                    style={styles.input}
                    placeholder="At least 8 characters"
                    placeholderTextColor="#666"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                />
            </View>

            <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Confirm Password</Text>
                <TextInput
                    testID="confirm-password-input"
                    style={styles.input}
                    placeholder="Re-enter your password"
                    placeholderTextColor="#666"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                />
            </View>

            <TouchableOpacity
                style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
                onPress={handleSignUp}
                disabled={isLoading}
            >
                {isLoading ? (
                    <ActivityIndicator color="#1a1a1a" />
                ) : (
                    <Text style={styles.primaryButtonText}>Sign Up</Text>
                )}
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.backLink}
                onPress={() => switchMode('login')}
            >
                <Text style={styles.backLinkText}>Already have an account? Log In</Text>
            </TouchableOpacity>
        </>
    );

    const renderForgotPasswordForm = () => (
        <>
            <Text style={styles.subtitle}>
                Enter your email address and we'll send you a code to reset your password.
            </Text>

            <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Email</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Enter your email"
                    placeholderTextColor="#666"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                />
            </View>

            <TouchableOpacity
                style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
                onPress={handleForgotPassword}
                disabled={isLoading}
            >
                {isLoading ? (
                    <ActivityIndicator color="#1a1a1a" />
                ) : (
                    <Text style={styles.primaryButtonText}>Send Reset Code</Text>
                )}
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.backLink}
                onPress={() => switchMode('login')}
            >
                <Text style={styles.backLinkText}>Back to Login</Text>
            </TouchableOpacity>
        </>
    );

    const renderConfirmCodeForm = () => (
        <>
            <Text style={styles.subtitle}>
                Enter the confirmation code sent to{email ? ` ${email}` : ' your email address'}.
            </Text>

            <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Confirmation Code</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Enter 6-digit code"
                    placeholderTextColor="#666"
                    value={confirmationCode}
                    onChangeText={setConfirmationCode}
                    keyboardType="number-pad"
                    maxLength={6}
                    autoFocus={true}
                />
            </View>

            <TouchableOpacity
                style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
                onPress={handleConfirmCode}
                disabled={isLoading}
            >
                {isLoading ? (
                    <ActivityIndicator color="#1a1a1a" />
                ) : (
                    <Text style={styles.primaryButtonText}>Confirm Account</Text>
                )}
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.backLink}
                onPress={() => switchMode('login')}
            >
                <Text style={styles.backLinkText}>Back to Login</Text>
            </TouchableOpacity>
        </>
    );

    const getTitle = () => {
        switch (mode) {
            case 'signup':
                return 'Create Account';
            case 'forgotPassword':
                return 'Reset Password';
            case 'confirmCode':
                return 'Confirm Account';
            default:
                return 'Welcome Back';
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* Logo Section */}
                <View style={styles.logoSection}>
                    <Animated.View
                        style={[
                            styles.logoContainer,
                            { transform: [{ scale: logoScale }] },
                        ]}
                    >
                        <View style={styles.logoInner}>
                            <Text style={styles.logoIcon}>💰</Text>
                        </View>
                        <View style={styles.logoGlow} />
                    </Animated.View>
                    <Text style={styles.appName}>Gripah</Text>
                    <Text style={styles.tagline}>Smart Spending Tracker</Text>
                </View>

                {/* Form Section */}
                <View style={styles.formSection}>
                    <Text style={styles.title}>{getTitle()}</Text>

                    {displayError ? (
                        <View style={styles.errorContainer}>
                            <Text style={styles.errorText}>{displayError}</Text>
                        </View>
                    ) : null}

                    {mode === 'login' && renderLoginForm()}
                    {mode === 'signup' && renderSignUpForm()}
                    {mode === 'forgotPassword' && renderForgotPasswordForm()}
                    {mode === 'confirmCode' && renderConfirmCodeForm()}
                </View>

                {/* Footer */}
                <View style={styles.footer}>
                    <Text style={styles.footerText}>
                        By continuing, you agree to our Terms of Service and Privacy Policy
                    </Text>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#1a1a1a',
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingTop: 60,
        paddingBottom: 40,
    },
    logoSection: {
        alignItems: 'center',
        marginBottom: 40,
    },
    logoContainer: {
        width: 100,
        height: 100,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    logoInner: {
        width: 90,
        height: 90,
        borderRadius: 45,
        backgroundColor: '#32CD32',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#32CD32',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 10,
    },
    logoGlow: {
        position: 'absolute',
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderColor: 'rgba(50, 205, 50, 0.3)',
    },
    logoIcon: {
        fontSize: 48,
    },
    appName: {
        fontSize: 42,
        fontWeight: 'bold',
        color: '#32CD32',
        letterSpacing: 3,
        textShadowColor: 'rgba(50, 205, 50, 0.3)',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 10,
    },
    tagline: {
        fontSize: 16,
        color: '#888',
        marginTop: 8,
        letterSpacing: 1,
    },
    formSection: {
        backgroundColor: '#2a2a2a',
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        borderColor: 'rgba(50, 205, 50, 0.2)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 24,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 14,
        color: '#888',
        marginBottom: 24,
        textAlign: 'center',
        lineHeight: 20,
    },
    inputContainer: {
        marginBottom: 16,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#32CD32',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#1a1a1a',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        color: '#fff',
        borderWidth: 1,
        borderColor: '#3a3a3a',
    },
    forgotPasswordLink: {
        alignSelf: 'flex-end',
        marginBottom: 24,
        marginTop: 4,
    },
    forgotPasswordText: {
        color: '#32CD32',
        fontSize: 14,
        fontWeight: '500',
    },
    primaryButton: {
        backgroundColor: '#32CD32',
        borderRadius: 14,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 8,
        shadowColor: '#32CD32',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    primaryButtonText: {
        color: '#1a1a1a',
        fontSize: 18,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    dividerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 24,
    },
    divider: {
        flex: 1,
        height: 1,
        backgroundColor: '#3a3a3a',
    },
    dividerText: {
        color: '#666',
        paddingHorizontal: 16,
        fontSize: 14,
    },
    secondaryButton: {
        borderWidth: 2,
        borderColor: '#32CD32',
        borderRadius: 14,
        paddingVertical: 14,
        alignItems: 'center',
        backgroundColor: 'transparent',
    },
    secondaryButtonText: {
        color: '#32CD32',
        fontSize: 16,
        fontWeight: '600',
    },
    backLink: {
        alignItems: 'center',
        marginTop: 20,
    },
    backLinkText: {
        color: '#32CD32',
        fontSize: 15,
        fontWeight: '500',
    },
    errorContainer: {
        backgroundColor: 'rgba(255, 59, 48, 0.1)',
        borderRadius: 12,
        padding: 12,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 59, 48, 0.3)',
    },
    errorText: {
        color: '#FF3B30',
        fontSize: 14,
        textAlign: 'center',
    },
    footer: {
        marginTop: 32,
        alignItems: 'center',
    },
    footerText: {
        color: '#555',
        fontSize: 12,
        textAlign: 'center',
        lineHeight: 18,
    },
});

export default LoginScreen;
