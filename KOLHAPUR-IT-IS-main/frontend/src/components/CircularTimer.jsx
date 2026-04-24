import React, { useState, useEffect } from 'react';

const CircularTimer = ({ deadline }) => {
  const [timeLeft, setTimeLeft] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [isLate, setIsLate] = useState(false);

  useEffect(() => {
    if (!deadline) return;
    
    const target = new Date(deadline).getTime();
    const start = new Date().getTime();
    const initialDiff = target - start;
    
    setTotalTime(initialDiff > 0 ? initialDiff : 3600000); // Default to 1hr for progress if already late
    
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const diff = target - now;
      
      setTimeLeft(diff);
      setIsLate(diff <= 0);
    }, 1000);

    return () => clearInterval(timer);
  }, [deadline]);

  const formatTime = (ms) => {
    const absMs = Math.abs(ms);
    const h = Math.floor(absMs / 3600000);
    const m = Math.floor((absMs % 3600000) / 60000);
    const s = Math.floor((absMs % 60000) / 1000);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // SVG Progress calculation
  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  const progress = isLate ? 1 : Math.max(0, Math.min(1, timeLeft / (totalTime || 1)));
  const strokeDashoffset = (circumference * (1 - progress)) || 0;

  return (
    <div className="flex flex-col items-center justify-center bg-[#2D333B] p-10 rounded-[3rem] shadow-2xl w-full max-w-sm mx-auto select-none">
      <div className="relative flex items-center justify-center">
        {/* SVG Circle */}
        <svg className="w-64 h-64 transform -rotate-90">
          <circle
            cx="128"
            cy="128"
            r={radius}
            stroke="#3E444D"
            strokeWidth="12"
            fill="transparent"
          />
          <circle
            cx="128"
            cy="128"
            r={radius}
            stroke={isLate ? "#FF6B6B" : "#FF8A65"}
            strokeWidth="12"
            fill="transparent"
            strokeDasharray={circumference}
            style={{ strokeDashoffset, transition: 'stroke-dashoffset 1s linear' }}
            strokeLinecap="round"
          />
        </svg>

        {/* Time Text */}
        <div className="absolute flex flex-col items-center">
          <span className="text-5xl font-black text-white tracking-tighter">
            {formatTime(timeLeft)}
          </span>
          <div className="mt-2 px-3 py-1 bg-white/5 rounded-full backdrop-blur-md border border-white/10 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
            <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">{currentTime}</span>
          </div>
        </div>
      </div>

      <div className="mt-8 text-center">
        <p className={`text-xs font-black uppercase tracking-[0.3em] ${isLate ? 'text-red-400' : 'text-slate-400'}`}>
          {isLate ? 'PROJECT OVERDUE' : 'TIME TO DEADLINE'}
        </p>
      </div>
    </div>
  );
};

export default CircularTimer;
