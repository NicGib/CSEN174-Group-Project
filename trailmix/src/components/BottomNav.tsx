import React from "react";

const iconClasses = "w-6 h-6";

const BottomNav: React.FC = () => {
  return (
    <nav className="w-full py-3 bg-[#252F18] text-white flex justify-around text-[10px] uppercase tracking-[0.15em]">
      <div className="flex flex-col items-center gap-1">
        {/* Heart icon */}
        <svg
          className={iconClasses}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20.8 4.6a5 5 0 0 0-7.1 0L12 6.3l-1.7-1.7a5 5 0 0 0-7.1 7.1l1.7 1.7L12 21l7.1-7.6 1.7-1.7a5 5 0 0 0 0-7.1z" />
        </svg>
        <span>MATCHES</span>
      </div>

      <div className="flex flex-col items-center gap-1">
        {/* Map pin */}
        <svg
          className={iconClasses}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 21s6-6.1 6-11a6 6 0 0 0-12 0c0 4.9 6 11 6 11z" />
          <circle cx="12" cy="10" r="2.5" />
        </svg>
        <span>MAP</span>
      </div>

      <div className="flex flex-col items-center gap-1 text-orange-400">
        {/* Swap arrows */}
        <svg
          className={iconClasses}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M7 7h11l-3-3" />
          <path d="M17 17H6l3 3" />
        </svg>
        <span>SWIPE</span>
      </div>

      <div className="flex flex-col items-center gap-1">
        {/* Chat bubble */}
        <svg
          className={iconClasses}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 11.5a7.5 7.5 0 0 0-7.5-7.5H7A4 4 0 0 0 3 8v7a4 4 0 0 0 4 4h4.5" />
          <path d="M17 21v-3.5a3.5 3.5 0 0 0-3.5-3.5H9" />
        </svg>
        <span>CHATS</span>
      </div>

      <div className="flex flex-col items-center gap-1">
        {/* User */}
        <svg
          className={iconClasses}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="8" r="3" />
          <path d="M6 20a6 6 0 0 1 12 0" />
        </svg>
        <span>YOU</span>
      </div>
    </nav>
  );
};

export default BottomNav;
