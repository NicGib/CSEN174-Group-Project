import React, { useState } from "react";

export type Profile = {
  id: number;
  name: string;
  age: number;
  location: string;
  bio: string;
  photos: string[];
};

interface SwipeCardProps {
  profile: Profile;
  onLike: () => void;
  onPass: () => void;
  swipeDirection: "left" | "right" | "none";
}

const SwipeCard: React.FC<SwipeCardProps> = ({
  profile,
  onLike,
  onPass,
  swipeDirection,
}) => {
  const [photoIndex, setPhotoIndex] = useState(0);

  const nextPhoto = () => {
    setPhotoIndex((prev) => (prev + 1) % profile.photos.length);
  };

  const prevPhoto = () => {
    setPhotoIndex((prev) =>
      prev === 0 ? profile.photos.length - 1 : prev - 1
    );
  };

  const swipeClass =
    swipeDirection === "left"
      ? "-translate-x-[420px] rotate-[-10deg] opacity-0"
      : swipeDirection === "right"
      ? "translate-x-[420px] rotate-[10deg] opacity-0"
      : "translate-x-0 rotate-0 opacity-100";

  return (
    <div
      className={`w-full bg-[#252F18] rounded-3xl shadow-xl pb-6 overflow-hidden transition-transform duration-300 ease-in-out ${swipeClass}`}
    >
      {/* Image area with carousel */}
      <div className="relative h-[360px] bg-black/10">
        <div
          className="w-full h-full bg-cover bg-center"
          style={{
            backgroundImage: `url(${profile.photos[photoIndex]})`,
          }}
        />

        {/* Left/right hotspots */}
        <button
          type="button"
          onClick={prevPhoto}
          className="absolute inset-y-0 left-0 w-1/3"
        />
        <button
          type="button"
          onClick={nextPhoto}
          className="absolute inset-y-0 right-0 w-1/3"
        />

        {/* Top progress pills like your mock */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 flex gap-2">
          {profile.photos.map((_, idx) => (
            <div
              key={idx}
              className={`h-1.5 w-16 rounded-full ${
                idx === photoIndex ? "bg-white" : "bg-white/40"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Info Section */}
      <div className="p-4 relative">
        {/* Info Icon */}
        <div className="absolute right-4 -top-6 bg-[#6E7D3C] border-2 border-white w-10 h-10 rounded-full flex items-center justify-center text-white text-xl shadow-md">
          i
        </div>

        <h2 className="text-white font-semibold text-2xl">
          {profile.name}, {profile.age}
        </h2>

        <p className="text-white/80 text-sm mt-1">{profile.location}</p>

        <p className="text-white/75 text-sm mt-2 leading-snug">{profile.bio}</p>
      </div>

      {/* Buttons */}
      <div className="flex items-center justify-center gap-10 mt-3">
        <button
          type="button"
          onClick={onPass}
          className="w-16 h-16 rounded-full bg-[#C9382A] flex items-center justify-center shadow-xl active:scale-95 transition-transform"
        >
          <span className="text-white text-3xl leading-none">✕</span>
        </button>

        <button
          type="button"
          onClick={onLike}
          className="w-16 h-16 rounded-full bg-[#2E77B4] flex items-center justify-center shadow-xl active:scale-95 transition-transform"
        >
          <span className="text-white text-3xl leading-none">✓</span>
        </button>
      </div>
    </div>
  );
};

export default SwipeCard;
