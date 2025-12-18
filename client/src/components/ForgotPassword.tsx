import React, { useState } from 'react';

interface ForgotPasswordProps {
    onBack: () => void;
    onResetSent: (email: string) => void;
}

const ForgotPassword: React.FC<ForgotPasswordProps> = ({ onBack, onResetSent }) => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setMessage('');

        const apiHost = `http://${window.location.hostname}:8080`;
        try {
            const res = await fetch(`${apiHost}/api/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            if (!res.ok) throw new Error('Failed to send reset code');

            setMessage('If that email is registered, we sent a code to it. (Check Server Terminal)');
            onResetSent(email); // Move to Reset Screen

        } catch (err) {
            setError('Something went wrong. Try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen animate-gradient p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm">
                <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Reset Password</h2>

                {message && <div className="bg-green-100 text-green-700 p-2 rounded mb-4 text-sm">{message}</div>}
                {error && <div className="bg-red-100 text-red-600 p-2 rounded mb-4 text-sm">{error}</div>}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 outline-none"
                            placeholder="Enter your email"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-violet-600 text-white font-bold py-2 px-4 rounded-xl hover:bg-violet-700 transition"
                    >
                        {loading ? 'Sending...' : 'Send Reset Code'}
                    </button>
                    <button
                        type="button"
                        onClick={onBack}
                        className="w-full text-gray-500 hover:text-gray-700 font-medium text-sm"
                    >
                        Back to Login
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ForgotPassword;
