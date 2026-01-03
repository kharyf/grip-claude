import React, { createContext, useContext, useState, useEffect } from 'react';
import Auth0, { useAuth0 } from 'react-native-auth0';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const { authorize, clearSession, user, error, isLoading, getCredentials } = useAuth0();
    const [token, setToken] = useState(null);

    useEffect(() => {
        const fetchToken = async () => {
            if (user) {
                try {
                    const credentials = await getCredentials();
                    setToken(credentials.accessToken);
                } catch (e) {
                    console.error('Failed to get credentials:', e);
                }
            } else {
                setToken(null);
            }
        };
        fetchToken();
    }, [user]);

    const login = async () => {
        try {
            await authorize({ scope: 'openid profile email' });
        } catch (e) {
            console.log('Login failed', e);
        }
    };

    const logout = async () => {
        try {
            await clearSession();
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
