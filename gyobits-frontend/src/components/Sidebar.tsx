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
  Store
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Handmade minimalist icons mapping
const menuGroups = [
  {
    title: 'KASIR',
    items: [
      { name: 'POS Terminal', icon: Store, href: '/pos' },
    ]
  },
  {
    title: 'COMMAND CENTER',
    items: [
      { name: 'Dashboard', icon: Gauge, href: '/' },
      { name: 'Stock', icon: Boxes, href: '/stock', badge: 2 },
    ]
  },
  {
    title: 'LAPORAN',
    items: [
      { name: 'Finance', icon: FileSpreadsheet, href: '/laporan/finance' },
      { name: 'Stock', icon: Scroll, href: '/laporan/stock' },
    ]
  },
  {
    title: 'OPERASIONAL',
    items: [
      { name: 'Input', icon: Calculator, href: '/input' },
    ]
  },
  {
    title: 'SETTING',
    items: [
      { name: 'Pengaturan', icon: Sliders, href: '/pengaturan' },
    ]
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [isHovered, setIsHovered] = useState(false);

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

      {/* MOBILE BOTTOM NAVIGATION BAR: Responsif portrait & landscape */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-side/95 backdrop-blur-md border-t border-side-edge text-side-text z-50 flex items-center justify-around px-2 shadow-2xl safe-area-bottom">
        <Link 
          href="/" 
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-lg text-[10px] font-medium transition-colors ${
            pathname === '/' ? 'text-gold font-bold' : 'hover:text-white'
          }`}
        >
          <Gauge size={18} />
          <span>Dashboard</span>
        </Link>
        <Link 
          href="/pos" 
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-lg text-[10px] font-medium transition-colors ${
            pathname === '/pos' ? 'text-gold font-bold' : 'hover:text-white'
          }`}
        >
          <Store size={18} />
          <span>POS</span>
        </Link>
        <Link 
          href="/stock" 
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-lg text-[10px] font-medium transition-colors relative ${
            pathname === '/stock' ? 'text-gold font-bold' : 'hover:text-white'
          }`}
        >
          <Boxes size={18} />
          <span>Stock</span>
          <span className="absolute top-0 right-2 w-2 h-2 rounded-full bg-[#3D6B50]" />
        </Link>
        <Link 
          href="/laporan/finance" 
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-lg text-[10px] font-medium transition-colors ${
            pathname === '/laporan/finance' ? 'text-gold font-bold' : 'hover:text-white'
          }`}
        >
          <FileSpreadsheet size={18} />
          <span>Finance</span>
        </Link>
        <Link 
          href="/laporan/stock" 
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-lg text-[10px] font-medium transition-colors ${
            pathname === '/laporan/stock' ? 'text-gold font-bold' : 'hover:text-white'
          }`}
        >
          <Scroll size={18} />
          <span>Lapor Stock</span>
        </Link>
        <Link 
          href="/input" 
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-lg text-[10px] font-medium transition-colors ${
            pathname === '/input' ? 'text-gold font-bold' : 'hover:text-white'
          }`}
        >
          <Calculator size={18} />
          <span>Operasional</span>
        </Link>
        <Link 
          href="/pengaturan" 
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-lg text-[10px] font-medium transition-colors ${
            pathname === '/pengaturan' ? 'text-gold font-bold' : 'hover:text-white'
          }`}
        >
          <Sliders size={18} />
          <span>Setting</span>
        </Link>
      </nav>
    </>
  );
}
