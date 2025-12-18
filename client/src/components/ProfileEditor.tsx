import React, { useState, useEffect } from 'react';

interface ProfileEditorProps {
    token: string;
}

const ProfileEditor: React.FC<ProfileEditorProps> = ({ token }) => {
    const [profile, setProfile] = useState({
        name: '',
        age: '',
        gender: '',
        bio: '',
        image_url: '',
        interests: [] as string[]
    });
    const [message, setMessage] = useState('');
    const [uploading, setUploading] = useState(false);
    const [newInterest, setNewInterest] = useState('');

    const apiHost = `http://${window.location.hostname}:8080`;

    useEffect(() => {
        fetch(`${apiHost}/api/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => res.json())
            .then(data => setProfile({
                name: data.name || '',
                age: (data.age || '').toString(),
                gender: data.gender || '',
                bio: data.bio || '',
                image_url: data.image_url || '',
                interests: data.interests || []
            }))
            .catch(err => console.error(err));
    }, [token]);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        setUploading(true);
        try {
            const res = await fetch(`${apiHost}/api/upload`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData,
            });
            if (res.ok) {
                const data = await res.json();
                setProfile(prev => ({ ...prev, image_url: data.url }));
                setMessage('Image uploaded!');
            } else {
                setMessage('Upload failed.');
            }
        } catch (err) {
            console.error(err);
            setMessage('Upload error.');
        } finally {
            setUploading(false);
        }
    };

    const handleAddInterest = () => {
        if (newInterest.trim() && !profile.interests.includes(newInterest.trim())) {
            setProfile(prev => ({ ...prev, interests: [...prev.interests, newInterest.trim()] }));
            setNewInterest('');
        }
    };

    const handleRemoveInterest = (interest: string) => {
        setProfile(prev => ({ ...prev, interests: prev.interests.filter(i => i !== interest) }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch(`${apiHost}/api/me`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    ...profile,
                    age: parseInt(profile.age) || 0
                }),
            });
            if (res.ok) {
                setMessage('Profile updated successfully!');
                setTimeout(() => setMessage(''), 3000);
            } else {
                setMessage('Failed to update profile.');
            }
        } catch (err) {
            setMessage('Error updating profile.');
        }
    };

    return (
        <div className="p-4 max-w-md mx-auto bg-white rounded-xl shadow-md space-y-4 overflow-y-auto max-h-[80vh]">
            <h2 className="text-2xl font-bold text-gray-800">Edit Profile</h2>
            {message && <div className="p-2 bg-green-100 text-green-700 rounded text-center">{message}</div>}

            <div className="flex flex-col items-center gap-4">
                <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-200 border-4 border-white shadow-lg relative">
                    {profile.image_url ? (
                        <img src={profile.image_url} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-4xl text-gray-400">?</div>
                    )}
                    {uploading && <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-xs">Uploading...</div>}
                </div>
                <label className="cursor-pointer bg-violet-100 text-violet-600 px-4 py-2 rounded-full font-bold hover:bg-violet-200 transition-colors">
                    Change Photo
                    <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                </label>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Display Name</label>
                    <input
                        type="text"
                        className="w-full mt-1 p-2 border rounded-md"
                        value={profile.name}
                        onChange={e => setProfile({ ...profile, name: e.target.value })}
                    />
                </div>
                <div className="flex gap-4">
                    <div className="w-1/2">
                        <label className="block text-sm font-medium text-gray-700">Age</label>
                        <input
                            type="number"
                            className="w-full mt-1 p-2 border rounded-md"
                            value={profile.age}
                            onChange={e => setProfile({ ...profile, age: e.target.value })}
                        />
                    </div>
                    <div className="w-1/2">
                        <label className="block text-sm font-medium text-gray-700">Gender</label>
                        <select
                            className="w-full mt-1 p-2 border rounded-md bg-white"
                            value={profile.gender}
                            onChange={e => setProfile({ ...profile, gender: e.target.value })}
                        >
                            <option value="">Select...</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Non-binary">Non-binary</option>
                        </select>
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Bio</label>
                    <textarea
                        className="w-full mt-1 p-2 border rounded-md h-24"
                        value={profile.bio}
                        onChange={e => setProfile({ ...profile, bio: e.target.value })}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Interests</label>
                    <div className="flex gap-2 mt-1">
                        <input
                            type="text"
                            className="flex-1 p-2 border rounded-md"
                            placeholder="Add an interest..."
                            value={newInterest}
                            onChange={e => setNewInterest(e.target.value)}
                            onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), handleAddInterest())}
                        />
                        <button
                            type="button"
                            onClick={handleAddInterest}
                            className="bg-violet-500 text-white px-4 py-2 rounded-md hover:bg-violet-600"
                        >
                            Add
                        </button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                        {profile.interests.map(interest => (
                            <span key={interest} className="bg-violet-100 text-violet-800 px-3 py-1 rounded-full text-sm flex items-center">
                                {interest}
                                <button
                                    type="button"
                                    onClick={() => handleRemoveInterest(interest)}
                                    className="ml-2 text-violet-600 hover:text-violet-900 font-bold"
                                >
                                    &times;
                                </button>
                            </span>
                        ))}
                    </div>
                </div>
                <button
                    type="submit"
                    className="w-full bg-violet-600 text-white font-bold py-2 rounded-lg hover:bg-violet-700"
                >
                    Save Profile
                </button>
            </form>
        </div>
    );
};

export default ProfileEditor;
