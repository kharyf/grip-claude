import React, { createContext, useContext, useState, useEffect } from 'react';
import { getCurrentUser, fetchAuthSession, signInWithRedirect, signOut } from 'aws-amplify/auth';
import { Hub } from 'aws-amplify/utils';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const checkUser = async () => {
        try {
            const currentUser = await getCurrentUser();
            const session = await fetchAuthSession();

            setUser(currentUser);
            setToken(session.tokens?.accessToken?.toString() || null);
        } catch (e) {
            setUser(null);
            setToken(null);
        } finally {
            setIsLoading(false);
        }
    };

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
                case 'signInWithRedirect_failure':
                    setError('Login failed');
                    break;
            }
        });

        return () => unsubscribe();
    }, []);

    const login = async () => {
        try {
            await signInWithRedirect();
        } catch (e) {
            console.log('Login failed', e);
            setError(e.message);
        }
    };

    const logout = async () => {
        try {
            await signOut();
        } catch (e) {
            console.log('Logout failed', e);
        }
    };

    return (
        <AuthContext.Provider value={{ user, token, isLoading, login, logout, error }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
