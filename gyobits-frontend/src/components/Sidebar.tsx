'use client';
import React from 'react';
import { 
  LayoutDashboard, 
  Package, 
  Wallet, 
  ScrollText, 
  Calculator, 
  Settings, 
  LogOut,
  Diamond,
  ShoppingCart
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const menuGroups = [
  {
    title: 'KASIR',
    items: [
      { name: 'POS Terminal', icon: ShoppingCart, href: '/pos' },
    ]
  },
  {
    title: 'COMMAND CENTER',
    items: [
      { name: 'Dashboard', icon: LayoutDashboard, href: '/' },
      { name: 'Stock', icon: Package, href: '/stock', badge: 2 },
    ]
  },
  {
    title: 'LAPORAN',
    items: [
      { name: 'Laporan Finance', icon: Wallet, href: '/laporan/finance' },
      { name: 'Laporan Stock', icon: ScrollText, href: '/laporan/stock' },
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
      { name: 'Pengaturan', icon: Settings, href: '/pengaturan' },
    ]
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-[141px] shrink-0 h-screen bg-side flex flex-col border-r border-side-edge text-side-text font-sans overflow-y-auto hidden-scrollbar">
      {/* Logo */}
      <div className="flex items-center gap-2 p-4 pt-6 text-gold mb-2">
        <Diamond size={18} className="fill-gold" />
        <span className="font-bold tracking-widest text-[11px]">GYOBITS</span>
      </div>

      {/* Menus */}
      <div className="flex-1 px-3 mt-2">
        {menuGroups.map((group, i) => (
          <div key={i} className="mb-4">
            <h3 className="text-[9px] font-bold tracking-[0.1em] mb-2 px-1 text-side-text/70 uppercase">
              {group.title}
            </h3>
            <ul className="space-y-1">
              {group.items.map((item, j) => {
                const isActive = pathname === item.href;
                return (
                  <li key={j}>
                    <Link 
                      href={item.href}
                      className={`flex items-center gap-2 px-2 py-2 rounded-lg text-xs transition-colors relative
                        ${isActive 
                          ? 'bg-gold text-[#FAF7F2] shadow-sm' 
                          : 'hover:bg-side-divider hover:text-white'
                        }`}
                    >
                      <item.icon size={14} className={isActive ? "text-[#FAF7F2]" : "text-side-text"} />
                      <span className="truncate">{item.name}</span>
                      {item.badge && (
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 bg-[#3D6B50] text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  </li>
                )
              })}
            </ul>
            {i < menuGroups.length - 1 && (
              <div className="h-[1px] bg-side-divider mt-4 mx-1" />
            )}
          </div>
        ))}
      </div>

      {/* Logout */}
      <div className="p-3 mb-2 mt-auto">
        <Link 
          href="#"
          className="flex items-center gap-2 px-2 py-2 rounded-lg text-xs transition-colors border border-side-divider hover:bg-side-divider hover:text-white"
        >
          <LogOut size={14} />
          <span>Logout</span>
        </Link>
      </div>
    </aside>
  );
}
