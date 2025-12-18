import React, { useState } from 'react';
import ForgotPassword from './ForgotPassword';
import ResetPassword from './ResetPassword';

interface AuthScreenProps {
    onLogin: (token: string, username: string) => void;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin }) => {
    const [view, setView] = useState<'login' | 'register' | 'forgot' | 'reset'>('login');
    const [emailForReset, setEmailForReset] = useState('');

    // Login/Register States
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [email, setEmail] = useState(''); // New for Register
    const [error, setError] = useState('');

    const apiHost = `http://${window.location.hostname}:8080`;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        const endpoint = view === 'register' ? '/api/register' : '/api/login';

        try {
            const body: any = { username, password };
            if (view === 'register') body.email = email; // Include email for registration

            const res = await fetch(`${apiHost}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (!res.ok) {
                const errorText = await res.text();
                throw new Error(errorText.trim() || (view === 'register' ? 'Registration failed' : 'Login failed'));
            }

            if (view === 'register') {
                // Auto login
                const loginRes = await fetch(`${apiHost}/api/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password }),
                });
                if (!loginRes.ok) throw new Error('Auto-login failed');
                const data = await loginRes.json();
                onLogin(data.token, data.username);
            } else {
                const data = await res.json();
                onLogin(data.token, data.username);
            }

        } catch (err) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError('An unknown error occurred');
            }
        }
    };

    if (view === 'forgot') {
        return <ForgotPassword
            onBack={() => setView('login')}
            onResetSent={(email) => { setEmailForReset(email); setView('reset'); }}
        />;
    }

    if (view === 'reset') {
        return <ResetPassword
            email={emailForReset}
            onBack={() => setView('login')}
            onSuccess={() => { setView('login'); alert("Password reset successful! Please login."); }}
        />;
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen animate-gradient p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm">
                <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-violet-500 mb-6 text-center">
                    {view === 'register' ? 'Join Meets' : 'Welcome Back'}
                </h2>

                {error && <div className="bg-red-100 text-red-600 p-2 rounded mb-4 text-sm text-center">{error}</div>}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                        <input
                            type="text"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            required
                        />
                    </div>
                    {view === 'register' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email <span className="text-gray-400 text-xs">(optional but recommended)</span></label>
                            <input
                                type="email"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                            />
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                        <input
                            type="password"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    {view === 'login' && (
                        <div className="text-right">
                            <button
                                type="button"
                                onClick={() => setView('forgot')}
                                className="text-sm text-violet-600 hover:text-violet-800"
                            >
                                Forgot Password?
                            </button>
                        </div>
                    )}

                    <button
                        type="submit"
                        className="w-full bg-gradient-to-r from-pink-500 to-violet-500 text-white font-bold py-3 px-4 rounded-xl hover:opacity-90 transition-all transform active:scale-95"
                    >
                        {view === 'register' ? 'Create Account' : 'Login'}
                    </button>
                </form>

                <div className="mt-4 text-center text-sm text-gray-500">
                    {view === 'register' ? 'Already have an account? ' : 'New to Meets? '}
                    <button
                        className="text-violet-600 font-bold hover:underline"
                        onClick={() => setView(view === 'register' ? 'login' : 'register')}
                    >
                        {view === 'register' ? 'Login' : 'Register'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AuthScreen;
