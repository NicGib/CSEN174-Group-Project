import React, { useState } from "react";
import SwipeCard, { Profile } from "../components/SwipeCard";
import BottomNav from "../components/BottomNav";

const profiles: Profile[] = [
  {
    id: 1,
    name: "John Doe",
    age: 24,
    location: "Santa Clara, CA",
    bio: "A high-energy adventurer looking for the next thrilling trail or scenic walk to explore.",
    photos: [
      "https://images.pexels.com/photos/1526404/pexels-photo-1526404.jpeg",
      "https://images.pexels.com/photos/1964648/pexels-photo-1964648.jpeg",
      "https://images.pexels.com/photos/697626/pexels-photo-697626.jpeg",
    ],
  },
  {
    id: 2,
    name: "Alex Rivera",
    age: 27,
    location: "San Jose, CA",
    bio: "Weekend hiker, weekday UX nerd. Always down for sunset loops and boba after.",
    photos: [
      "https://images.pexels.com/photos/2067804/pexels-photo-2067804.jpeg",
      "https://images.pexels.com/photos/2175956/pexels-photo-2175956.jpeg",
      "https://images.pexels.com/photos/845434/pexels-photo-845434.jpeg",
    ],
  },
];

const SwipePage: React.FC = () => {
  const [index, setIndex] = useState(0);
  const [swipeDirection, setSwipeDirection] =
    useState<"left" | "right" | "none">("none");

  const currentProfile = profiles[index];

  const goNext = () => {
    setSwipeDirection("none");
    setIndex((prev) => {
      const next = prev + 1;
      // loop for demo purposes
      return next >= profiles.length ? 0 : next;
    });
  };

  const handleLike = () => {
    setSwipeDirection("right");
    setTimeout(goNext, 260);
  };

  const handlePass = () => {
    setSwipeDirection("left");
    setTimeout(goNext, 260);
  };

  return (
    <div className="min-h-screen bg-[#D9C1DF] flex justify-center items-start pt-6 pb-8">
      <div className="w-[390px] bg-[#3B4A23] rounded-3xl overflow-hidden shadow-2xl flex flex-col">
        {/* Top bar / title */}
        <div className="px-4 pt-4 pb-2">
          <p className="text-xs text-white/60 mb-2">Match – Matching</p>
          <div className="flex items-center justify-between text-white text-xs">
            <span>3:14</span>
            <div className="flex items-center gap-1">
              <span>📶</span>
              <span>📡</span>
              <span>🔋</span>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="px-4 pb-4 flex-1 flex items-stretch">
          {currentProfile && (
            <SwipeCard
              profile={currentProfile}
              onLike={handleLike}
              onPass={handlePass}
              swipeDirection={swipeDirection}
            />
          )}
        </div>

        {/* Bottom nav */}
        <BottomNav />
      </div>
    </div>
  );
};

export default SwipePage;
