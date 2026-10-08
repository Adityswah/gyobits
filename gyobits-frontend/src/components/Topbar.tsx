'use client';
import React, { useEffect, useState, useRef } from 'react';
import { RotateCw, Bell, User, Sun, Moon, CheckCircle2, X } from 'lucide-react';
import { useApp } from '@/context/AppContext';

export default function Topbar() {
  const { 
    theme, 
    toggleTheme, 
    isSyncing, 
    syncNow, 
    notifications, 
    unreadCount, 
    clearNotifications 
  } = useApp();

  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  
  // Modals & Popovers
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showSyncFeedback, setShowSyncFeedback] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      // Format 24-hour time HH.mm:ss or HH.mm
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      setCurrentTime(`${hours}.${minutes}.${seconds}`);

      const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
      const dayName = days[now.getDay()];
      const dayNum = now.getDate();
      const monthName = months[now.getMonth()];
      setCurrentDate(`${dayName}, ${dayNum} ${monthName}`);
    };

    updateDateTime();
    const timer = setInterval(updateDateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Close popovers on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfile(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSyncClick = async () => {
    await syncNow();
    setShowSyncFeedback(true);
    setTimeout(() => setShowSyncFeedback(false), 3000);
  };

  return (
    <header className="bg-card rounded-[14px] p-3.5 sm:p-[15px] flex justify-between items-center shadow-sm border border-line relative z-20 transition-all duration-300">
      {/* Left: Badge & Greetings */}
      <div className="flex flex-col gap-1.5">
        <div className="bg-gold-soft border border-chip-border text-gold text-[9px] font-bold px-2 py-0.5 rounded-full w-max uppercase tracking-wider">
          DASHBOARD
        </div>
        <h1 className="text-xl sm:text-2xl font-serif text-ink tracking-tight">
          Selamat datang <span className="font-bold">Owner</span>
        </h1>
      </div>

      {/* Right: Date, Actions, Theme Toggle */}
      <div className="flex flex-col items-end gap-2.5">
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Running Clock & Date */}
          <div className="flex flex-col items-end bg-stat px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl border border-line shadow-2xs">
            <span className="font-mono text-xs sm:text-sm font-bold text-ink tracking-wider">
              {currentTime || '19.16.00'}
            </span>
            <span className="text-[9px] sm:text-[10px] text-side-text font-medium">
              {currentDate || 'Selasa, 6 Oktober'}
            </span>
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-1.5 sm:gap-2 relative">
            {/* Sync Button */}
            <button 
              onClick={handleSyncClick}
              disabled={isSyncing}
              title="Sinkronisasi Data Offline & Online"
              className="w-8 h-8 rounded-full border border-line flex items-center justify-center text-ink hover:bg-stat hover:text-gold transition-colors relative"
            >
              <RotateCw size={14} className={isSyncing ? "animate-spin text-gold" : ""} />
            </button>

            {/* Notification Button */}
            <div className="relative" ref={notifRef}>
              <button 
                onClick={() => {
                  setShowNotifications(prev => !prev);
                  if (!showNotifications) clearNotifications();
                }}
                title="Pemberitahuan Sistem"
                className="w-8 h-8 rounded-full border border-line flex items-center justify-center text-ink hover:bg-stat hover:text-gold transition-colors relative"
              >
                <Bell size={14} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-gold text-white text-[9px] font-bold flex items-center justify-center animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 top-10 w-72 sm:w-80 bg-card border border-line rounded-xl shadow-xl p-3 z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="flex justify-between items-center pb-2 border-b border-line mb-2">
                    <span className="text-xs font-bold text-ink">Notifikasi Transaksi & Sistem</span>
                    <button onClick={() => setShowNotifications(false)} className="text-side-text hover:text-ink">
                      <X size={14} />
                    </button>
                  </div>
                  <div className="max-h-56 overflow-y-auto space-y-2 text-xs">
                    {notifications.map((msg, i) => (
                      <div key={i} className="p-2 bg-bg rounded-lg border border-line text-ink leading-relaxed">
                        <span className="text-gold font-bold mr-1">•</span> {msg}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Button */}
            <div className="relative" ref={profileRef}>
              <button 
                onClick={() => setShowProfile(prev => !prev)}
                title="Akun & Otorisasi"
                className="w-8 h-8 rounded-full border border-line flex items-center justify-center text-ink hover:bg-stat hover:text-gold transition-colors"
              >
                <User size={14} />
              </button>

              {/* Profile Dropdown */}
              {showProfile && (
                <div className="absolute right-0 top-10 w-64 bg-card border border-line rounded-xl shadow-xl p-4 z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center gap-2.5 pb-3 border-b border-line mb-3">
                    <div className="w-9 h-9 rounded-full bg-gold-soft border border-chip-border flex items-center justify-center text-gold font-bold text-sm">
                      OW
                    </div>
                    <div>
                      <div className="text-xs font-bold text-ink">Owner GYOBITS</div>
                      <div className="text-[10px] text-side-text font-mono">Hak Akses: Penuh (Admin)</div>
                    </div>
                  </div>
                  <div className="space-y-1.5 text-xs text-ink">
                    <div className="p-2 bg-stat rounded-lg text-[11px] text-side-text">
                      Outlet: <span className="font-bold text-ink">Soto Seger & Gyoza Joyoboyo</span>
                    </div>
                    <div className="p-2 bg-stat rounded-lg text-[11px] text-side-text">
                      Jadwal Stan: <span className="font-bold text-gold">Sabtu & Minggu</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Theme Toggle Button */}
        <div className="flex items-center bg-gold-soft rounded-full p-0.5 border border-chip-border">
          <button 
            onClick={toggleTheme}
            className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
              theme === 'light' ? 'bg-surface shadow-xs text-gold' : 'text-side-text hover:text-gold'
            }`}
            title="Mode Terang"
          >
            <Sun size={12} />
          </button>
          <button 
            onClick={toggleTheme}
            className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
              theme === 'dark' ? 'bg-side shadow-xs text-gold' : 'text-side-text hover:text-gold'
            }`}
            title="Mode Gelap"
          >
            <Moon size={12} />
          </button>
        </div>
      </div>

      {/* Sync Success Toast */}
      {showSyncFeedback && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-green text-white text-xs px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 size={13} />
          <span>Sinkronisasi selesai! Data sudah diperbarui.</span>
        </div>
      )}
    </header>
  );
}
