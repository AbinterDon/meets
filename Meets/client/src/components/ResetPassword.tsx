import React, { useState } from 'react';

interface ResetPasswordProps {
    email: string;
    onBack: () => void;
    onSuccess: () => void;
}

const ResetPassword: React.FC<ResetPasswordProps> = ({ email, onBack, onSuccess }) => {
    const [code, setCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const apiHost = `http://${window.location.hostname}:8080`;
        try {
            const res = await fetch(`${apiHost}/api/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, code, new_password: newPassword })
            });

            if (!res.ok) {
                const txt = await res.text();
                throw new Error(txt || 'Failed to reset password');
            }

            onSuccess(); // Back to Login or Auto Login
        } catch (err) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError('Unknown error');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen animate-gradient p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm">
                <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Set New Password</h2>
                <div className="mb-4 text-sm text-center text-gray-500">
                    Enter the code sent to <b>{email}</b>
                </div>

                {error && <div className="bg-red-100 text-red-600 p-2 rounded mb-4 text-sm">{error}</div>}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Reset Code</label>
                        <input
                            type="text"
                            required
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 outline-none text-center tracking-widest font-mono text-lg"
                            placeholder="000000"
                            maxLength={6}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                        <input
                            type="password"
                            required
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 outline-none"
                            placeholder="New password"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-violet-600 text-white font-bold py-2 px-4 rounded-xl hover:bg-violet-700 transition"
                    >
                        {loading ? 'Resetting...' : 'Reset Password'}
                    </button>
                    <button
                        type="button"
                        onClick={onBack}
                        className="w-full text-gray-500 hover:text-gray-700 font-medium text-sm"
                    >
                        Cancel
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ResetPassword;
