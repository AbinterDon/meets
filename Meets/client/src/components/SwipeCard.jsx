import React from 'react';

const SwipeCard = ({ profile, onSwipe }) => {
  if (!profile) return null;

  const handleSwipe = async (direction) => {
    if (direction === 'right') {
      try {
        const res = await fetch(`http://${window.location.hostname}:8080/api/like`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ liked_username: profile.username })
        });
        const data = await res.json();
        if (data.match) {
          alert(`It's a Match with ${profile.name}! Go to Chat to say hi.`);
        }
      } catch (err) {
        console.error("Like failed", err);
      }
    }
    onSwipe(direction);
  };

  return (
    <div className="max-w-sm rounded-2xl overflow-hidden shadow-xl bg-white m-4 border border-gray-200">
      <div className="relative h-96 w-full">
        <div className="absolute inset-0 bg-gray-300">
          {profile.image_url ? (
            <img
              src={profile.image_url}
              alt={profile.name}
              className="w-full h-full object-cover"
              onError={(e) => { e.target.onerror = null; e.target.src = 'https://via.placeholder.com/400x600?text=No+Image'; }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-200 text-6xl text-gray-400">
              {profile.name[0]}
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
          <h2 className="text-3xl font-bold">{profile.name}, {profile.age}</h2>
          <p className="text-lg text-gray-200 mt-1">{profile.bio}</p>
        </div>
      </div>
      <div className="flex justify-center gap-6 p-6">
        <button
          onClick={() => handleSwipe('left')}
          className="p-4 rounded-full bg-red-100 text-red-500 hover:bg-red-200 hover:scale-110 transition-all shadow-md"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <button
          onClick={() => handleSwipe('right')}
          className="p-4 rounded-full bg-green-100 text-green-500 hover:bg-green-200 hover:scale-110 transition-all shadow-md"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default SwipeCard;
