import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';

const CountdownTimer = ({ deadline, onLate }) => {
  const [timeLeft, setTimeLeft] = useState({ d: 0, h: 0, m: 0, s: 0 });
  const [isLate, setIsLate] = useState(false);

  useEffect(() => {
    if (!deadline) return;

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const target = new Date(deadline).getTime();
      
      if (isNaN(target)) {
        clearInterval(timer);
        return;
      }

      const diff = target - now;

      if (diff <= 0) {
        setIsLate(true);
        if (onLate) onLate();
        const absDiff = Math.abs(diff);
        setTimeLeft({
          d: Math.floor(absDiff / (1000 * 60 * 60 * 24)),
          h: Math.floor((absDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          m: Math.floor((absDiff % (1000 * 60 * 60)) / (1000 * 60)),
          s: Math.floor((absDiff % (1000 * 60)) / 1000),
        });
      } else {
        setIsLate(false);
        setTimeLeft({
          d: Math.floor(diff / (1000 * 60 * 60 * 24)),
          h: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          m: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
          s: Math.floor((diff % (1000 * 60)) / 1000),
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [deadline, onLate]);

  const format = (num) => String(num).padStart(2, '0');

  return (
    <div className={`flex items-center gap-3 px-4 py-2 rounded-2xl border transition-all duration-500 shadow-sm ${
      isLate 
        ? 'bg-red-50 border-red-200 text-red-600 animate-pulse' 
        : 'bg-blue-50 border-blue-200 text-blue-600'
    }`}>
      <div className="flex items-center gap-2">
        <Clock size={16} className={isLate ? 'animate-spin-slow' : ''} />
        <span className="text-[10px] font-black uppercase tracking-tighter">
          {isLate ? 'Overdue By' : 'Time Remaining'}
        </span>
      </div>
      
      <div className="flex items-baseline gap-1 font-mono font-black text-lg tracking-tighter">
        <span>{format(timeLeft.d)}</span><span className="text-[10px] opacity-60 mr-1">d</span>
        <span>{format(timeLeft.h)}</span><span className="text-[10px] opacity-60 mr-1">h</span>
        <span>{format(timeLeft.m)}</span><span className="text-[10px] opacity-60 mr-1">m</span>
        <span>{format(timeLeft.s)}</span><span className="text-[10px] opacity-60">s</span>
      </div>

      {isLate && <AlertTriangle size={14} className="ml-1" />}
    </div>
  );
};

export default CountdownTimer;
