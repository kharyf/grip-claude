import 'react-native-get-random-values';
import { NativeModules } from 'react-native';

// Polyfill for NativeJSLogger (ExpoModulesCoreJSLogger)
// Following user instruction to treat it as a "DOM element" (EventTarget)
const createEventTargetMock = () => {
    const listeners = new Map();
    const mock = {
        addListener: (event, callback) => {
            if (!listeners.has(event)) listeners.set(event, new Set());
            listeners.get(event).add(callback);
            return {
                remove: () => {
                    if (listeners.has(event)) listeners.get(event).delete(callback);
                }
            };
        },
        removeListener: (event, callback) => {
            if (listeners.has(event)) listeners.get(event).delete(callback);
        },
        addEventListener: (event, callback) => mock.addListener(event, callback),
        removeEventListener: (event, callback) => mock.removeListener(event, callback),
        emit: (event, data) => {
            if (listeners.has(event)) {
                listeners.get(event).forEach(cb => cb(data));
            }
        }
    };
    mock.default = mock; // Standard ESM interop
    return mock;
};

const loggerMock = createEventTargetMock();
const g = typeof globalThis !== 'undefined' ? globalThis : global;

if (!g.expo) g.expo = { modules: {} };
if (!g.expo.modules.ExpoModulesCoreJSLogger) {
    g.expo.modules.ExpoModulesCoreJSLogger = loggerMock;
}

// Also polyfill NativeModules for older interop
if (NativeModules && typeof NativeModules.NativeJSLogger === 'undefined') {
    try {
        // Using defineProperty to avoid issues if the object is sealed but not Frozen
        Object.defineProperty(NativeModules, 'NativeJSLogger', { value: loggerMock, configurable: true });
        Object.defineProperty(NativeModules, 'ExpoModulesCoreJSLogger', { value: loggerMock, configurable: true });
    } catch (e) {
        // Fallback if defineProperty fails
        try { NativeModules.NativeJSLogger = loggerMock; } catch (e2) { }
    }
}

import { registerRootComponent } from 'expo';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
