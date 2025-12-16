import React, { useState } from 'react';

const AuthScreen = ({ onLogin }) => {
    const [isRegistering, setIsRegistering] = useState(false);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const apiHost = `http://${window.location.hostname}:8080`;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        const endpoint = isRegistering ? '/api/register' : '/api/login';

        try {
            const res = await fetch(`${apiHost}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });

            if (!res.ok) {
                const errorText = await res.text();
                // If it's pure text, use it. If it's JSON (unexpected), handle it gracefully?
                // http.Error returns plain text usually with a newline.
                throw new Error(errorText.trim() || (isRegistering ? 'Registration failed' : 'Login failed'));
            }

            if (isRegistering) {
                // Auto login after register or just switch to login? 
                // Let's switch to login for simplicity or just auto-login if backend returned token (backend register currently doesn't return token)
                // Backend register returns 201 Created. So let's try to login immediately.
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
            setError(err.message);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm">
                <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-violet-500 mb-6 text-center">
                    {isRegistering ? 'Join Meets' : 'Welcome Back'}
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

                    <button
                        type="submit"
                        className="w-full bg-gradient-to-r from-pink-500 to-violet-500 text-white font-bold py-3 px-4 rounded-xl hover:opacity-90 transition-all transform active:scale-95"
                    >
                        {isRegistering ? 'Create Account' : 'Login'}
                    </button>
                </form>

                <div className="mt-4 text-center text-sm text-gray-500">
                    {isRegistering ? 'Already have an account? ' : 'New to Meets? '}
                    <button
                        className="text-violet-600 font-bold hover:underline"
                        onClick={() => setIsRegistering(!isRegistering)}
                    >
                        {isRegistering ? 'Login' : 'Register'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AuthScreen;
