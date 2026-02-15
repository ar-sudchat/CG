import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AppContext';
import { SOCKET_URL } from '../utils/constants';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
    const { token } = useAuth();
    const socketRef = useRef(null);
    const [isConnected, setIsConnected] = useState(false);
    const [livePrices, setLivePrices] = useState({});
    const [triggeredAlerts, setTriggeredAlerts] = useState([]);

    useEffect(() => {
        if (!token) return;

        const socket = io(SOCKET_URL, {
            auth: { token },
            transports: ['websocket'],
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 3000,
        });

        socket.on('connect', () => {
            console.log('[Socket] Connected');
            setIsConnected(true);
        });

        socket.on('disconnect', () => {
            console.log('[Socket] Disconnected');
            setIsConnected(false);
        });

        socket.on('price_update', (data) => {
            setLivePrices(prev => ({
                ...prev,
                [data.symbol]: data,
            }));
        });

        socket.on('alert_triggered', (alertData) => {
            setTriggeredAlerts(prev => [alertData, ...prev]);
        });

        socket.on('connect_error', (err) => {
            console.log('[Socket] Connection error:', err.message);
        });

        socketRef.current = socket;

        return () => {
            socket.disconnect();
        };
    }, [token]);

    const subscribePair = (symbol) => {
        if (socketRef.current?.connected) {
            socketRef.current.emit('subscribe_pair', symbol);
        }
    };

    const unsubscribePair = (symbol) => {
        if (socketRef.current?.connected) {
            socketRef.current.emit('unsubscribe_pair', symbol);
        }
    };

    const clearAlerts = () => setTriggeredAlerts([]);

    return (
        <SocketContext.Provider value={{
            isConnected,
            livePrices,
            triggeredAlerts,
            subscribePair,
            unsubscribePair,
            clearAlerts,
        }}>
            {children}
        </SocketContext.Provider>
    );
};

export const useSocket = () => {
    return useContext(SocketContext);
};
