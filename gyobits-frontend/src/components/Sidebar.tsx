'use client';
import React, { useState } from 'react';
import { 
  Gauge,
  Boxes,
  FileSpreadsheet,
  Scroll,
  Calculator,
  Sliders,
  LogOut,
  Store,
  MoreHorizontal,
  X
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface MenuItem {
  name: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  href: string;
  badge?: string;
}

interface MenuGroup {
  title: string;
  items: MenuItem[];
}

// Handmade minimalist icons mapping
const menuGroups: MenuGroup[] = [
  {
    title: 'UTAMA',
    items: [
      { name: 'Dashboard', icon: Gauge, href: '/' },
      { name: 'POS Terminal', icon: Store, href: '/pos' },
    ]
  },
  {
    title: 'GUDANG & DAPUR',
    items: [
      { name: 'Stock Inventory', icon: Boxes, href: '/stock' },
      { name: 'Input Operasional', icon: Calculator, href: '/input' },
    ]
  },
  {
    title: 'LAPORAN RESMI',
    items: [
      { name: 'Laporan Finance', icon: FileSpreadsheet, href: '/laporan/finance' },
      { name: 'Laporan Stock', icon: Scroll, href: '/laporan/stock' },
    ]
  },
  {
    title: 'SISTEM',
    items: [
      { name: 'Pengaturan', icon: Sliders, href: '/pengaturan' },
    ]
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [isHovered, setIsHovered] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const isLainLainActive = pathname === '/stock' || pathname === '/laporan/stock' || pathname === '/pengaturan';

  return (
    <>
      {/* DESKTOP & TABLET SIDEBAR: Pin in place (Sticky/Fixed, does not scroll with page content) */}
      <aside 
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`hidden md:flex flex-col h-screen sticky top-0 left-0 bg-side border-r border-side-edge text-side-text font-sans overflow-y-auto hidden-scrollbar transition-all duration-300 ease-in-out shrink-0 select-none z-40 ${
          isHovered ? 'w-[175px] shadow-2xl' : 'w-[68px]'
        }`}
      >
        {/* Logo & Brand Header */}
        <div className="p-3.5 pt-5 mb-1">
          <Link 
            href="/"
            title="Kembali ke Dashboard"
            className="flex items-center gap-2.5 group transition-transform active:scale-95 overflow-hidden"
          >
            <div className="w-8 h-8 rounded-lg bg-gold/15 border border-gold/40 flex items-center justify-center shrink-0 group-hover:bg-gold/25 transition-colors">
              {/* Minimalist Geometric Diamond / Gyoza motif */}
              <div className="w-4 h-4 border-2 border-gold rotate-45 group-hover:rotate-90 transition-transform duration-300" />
            </div>
            {isHovered && (
              <span className="font-bold tracking-widest text-[12px] text-gold truncate transition-opacity duration-200">
                GYOBITS
              </span>
            )}
          </Link>
        </div>

        {/* Navigation Menus */}
        <div className="flex-1 px-2.5 space-y-3.5">
          {menuGroups.map((group, i) => (
            <div key={i}>
              {isHovered ? (
                <h3 className="text-[9px] font-bold tracking-[0.1em] mb-1.5 px-2 text-side-text/60 uppercase truncate transition-opacity duration-200">
                  {group.title}
                </h3>
              ) : (
                i > 0 && <div className="h-[1px] bg-side-divider/60 my-2 mx-1" />
              )}
              <ul className="space-y-1">
                {group.items.map((item, j) => {
                  const isActive = pathname === item.href;
                  return (
                    <li key={j}>
                      <Link 
                        href={item.href}
                        title={!isHovered ? item.name : undefined}
                        className={`flex items-center gap-2.5 px-2.5 py-2.5 rounded-xl text-xs transition-all duration-200 relative group
                          ${isActive 
                            ? 'bg-gold text-[#FAF7F2] font-bold shadow-xs' 
                            : 'hover:bg-side-divider hover:text-white'
                          }
                          ${!isHovered ? 'justify-center px-1' : ''}
                        `}
                      >
                        <item.icon 
                          size={18} 
                          className={`shrink-0 transition-colors ${
                            isActive ? 'text-[#FAF7F2]' : 'text-side-text group-hover:text-gold'
                          }`} 
                        />
                        {isHovered && (
                          <span className="truncate transition-opacity duration-200">{item.name}</span>
                        )}
                        {item.badge && (
                          <span className={`bg-[#3D6B50] text-white text-[9px] font-bold rounded-full flex items-center justify-center ${
                            !isHovered 
                              ? 'absolute -top-1 -right-1 w-3.5 h-3.5' 
                              : 'ml-auto w-4 h-4'
                          }`}>
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
              {isHovered && i < menuGroups.length - 1 && (
                <div className="h-[1px] bg-side-divider/40 mt-3 mx-1" />
              )}
            </div>
          ))}
        </div>

        {/* Bottom Logout */}
        <div className="p-2.5 mt-auto border-t border-side-divider/40">
          <Link 
            href="#"
            title="Keluar Sesi"
            className={`flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs transition-colors border border-side-divider hover:bg-side-divider hover:text-white ${
              !isHovered ? 'justify-center px-1' : ''
            }`}
          >
            <LogOut size={15} className="shrink-0" />
            {isHovered && <span>Logout</span>}
          </Link>
        </div>
      </aside>

      {/* POPUP MENU LAIN-LAIN (STOCK, LAPORAN STOCK, PENGATURAN) */}
      {showMoreMenu && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
          <div 
            onClick={() => setShowMoreMenu(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-xs animate-in fade-in"
          />
          <div className="relative bg-card border-t border-line rounded-t-2xl p-4 pb-20 shadow-2xl z-10 space-y-2 animate-in slide-in-from-bottom-6">
            <div className="flex items-center justify-between pb-2 border-b border-line">
              <span className="text-[11px] font-bold tracking-wider text-side-text uppercase">
                MENU LAIN-LAIN
              </span>
              <button 
                onClick={() => setShowMoreMenu(false)}
                className="p-1 rounded-lg text-side-text hover:text-ink"
              >
                <X size={18} />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2.5 pt-1">
              <Link
                href="/stock"
                onClick={() => setShowMoreMenu(false)}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all text-center gap-1.5 ${
                  pathname === '/stock' ? 'bg-gold-soft border-gold text-gold font-bold' : 'bg-stat border-line text-ink hover:border-gold'
                }`}
              >
                <Boxes size={22} className="text-gold" />
                <span className="text-[11px] font-semibold">Stock</span>
              </Link>

              <Link
                href="/laporan/stock"
                onClick={() => setShowMoreMenu(false)}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all text-center gap-1.5 ${
                  pathname === '/laporan/stock' ? 'bg-gold-soft border-gold text-gold font-bold' : 'bg-stat border-line text-ink hover:border-gold'
                }`}
              >
                <Scroll size={22} className="text-gold" />
                <span className="text-[11px] font-semibold">Laporan Stock</span>
              </Link>

              <Link
                href="/pengaturan"
                onClick={() => setShowMoreMenu(false)}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all text-center gap-1.5 ${
                  pathname === '/pengaturan' ? 'bg-gold-soft border-gold text-gold font-bold' : 'bg-stat border-line text-ink hover:border-gold'
                }`}
              >
                <Sliders size={22} className="text-gold" />
                <span className="text-[11px] font-semibold">Pengaturan</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* MOBILE BOTTOM NAVIGATION BAR: Tepat 5 Tombol Sesuai Permintaan User */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-side/95 backdrop-blur-md border-t border-side-edge text-side-text z-50 flex items-center justify-around px-2 shadow-2xl safe-area-bottom">
        {/* 1. POS */}
        <Link 
          href="/pos" 
          onClick={() => setShowMoreMenu(false)}
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-lg text-[10px] font-medium transition-colors ${
            pathname === '/pos' ? 'text-gold font-bold' : 'hover:text-white'
          }`}
        >
          <Store size={19} />
          <span>POS</span>
        </Link>

        {/* 2. DASHBOARD */}
        <Link 
          href="/" 
          onClick={() => setShowMoreMenu(false)}
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-lg text-[10px] font-medium transition-colors ${
            pathname === '/' ? 'text-gold font-bold' : 'hover:text-white'
          }`}
        >
          <Gauge size={19} />
          <span>Dashboard</span>
        </Link>

        {/* 3. OPERASIONAL */}
        <Link 
          href="/input" 
          onClick={() => setShowMoreMenu(false)}
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-lg text-[10px] font-medium transition-colors ${
            pathname === '/input' ? 'text-gold font-bold' : 'hover:text-white'
          }`}
        >
          <Calculator size={19} />
          <span>Operasional</span>
        </Link>

        {/* 4. FINANCE */}
        <Link 
          href="/laporan/finance" 
          onClick={() => setShowMoreMenu(false)}
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-lg text-[10px] font-medium transition-colors ${
            pathname === '/laporan/finance' ? 'text-gold font-bold' : 'hover:text-white'
          }`}
        >
          <FileSpreadsheet size={19} />
          <span>Finance</span>
        </Link>

        {/* 5. LAIN-LAIN */}
        <button 
          type="button"
          onClick={() => setShowMoreMenu(prev => !prev)}
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-lg text-[10px] font-medium transition-colors ${
            isLainLainActive || showMoreMenu ? 'text-gold font-bold' : 'hover:text-white'
          }`}
        >
          <MoreHorizontal size={19} />
          <span>Lain-Lain</span>
        </button>
      </nav>
    </>
  );
}
