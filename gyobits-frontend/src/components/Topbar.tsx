import React from 'react';
import { RotateCw, Bell, User, Sun, Moon } from 'lucide-react';

export default function Topbar() {
  return (
    <header className="bg-card rounded-[14px] p-[15px] flex justify-between items-start shadow-sm border border-line">
      {/* Left */}
      <div className="flex flex-col gap-2">
        <div className="bg-gold-soft border border-chip-border text-gold text-[9px] font-bold px-2 py-0.5 rounded-full w-max uppercase tracking-wider">
          Dashboard
        </div>
        <h1 className="text-2xl font-serif text-ink">
          Selamat datang <span className="font-bold">Owner</span>
        </h1>
      </div>

      {/* Right */}
      <div className="flex flex-col items-end gap-3">
        <div className="flex items-center gap-3">
          {/* Time & Date */}
          <div className="flex flex-col items-end bg-stat px-3 py-1.5 rounded-xl border border-line">
            <span className="font-mono text-sm font-bold text-ink">19.16</span>
            <span className="text-[10px] text-side-text">Selasa, 6 Oktober</span>
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-2">
            <button className="w-8 h-8 rounded-full border border-line flex items-center justify-center text-ink hover:bg-stat transition-colors">
              <RotateCw size={14} />
            </button>
            <button className="w-8 h-8 rounded-full border border-line flex items-center justify-center text-ink hover:bg-stat transition-colors">
              <Bell size={14} />
            </button>
            <button className="w-8 h-8 rounded-full border border-line flex items-center justify-center text-ink hover:bg-stat transition-colors">
              <User size={14} />
            </button>
          </div>
        </div>

        {/* Theme Toggle */}
        <div className="flex items-center bg-gold-soft rounded-full p-0.5 border border-chip-border">
          <button className="w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-sm text-gold">
            <Sun size={12} />
          </button>
          <button className="w-6 h-6 rounded-full flex items-center justify-center text-side-text hover:text-gold transition-colors">
            <Moon size={12} />
          </button>
        </div>
      </div>
    </header>
  );
}
