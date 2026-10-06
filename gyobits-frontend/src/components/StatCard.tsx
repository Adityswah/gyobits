import React from 'react';

interface StatCardProps {
  title: string;
  icon: React.ElementType;
  value: string;
  subValue: string;
  color: 'green' | 'red' | 'ink' | 'gold';
}

const colorMap = {
  green: { text: 'text-green', border: 'border-green/20' },
  red: { text: 'text-red', border: 'border-red/20' },
  ink: { text: 'text-ink', border: 'border-line' },
  gold: { text: 'text-gold', border: 'border-gold/30' },
};

export default function StatCard({ title, icon: Icon, value, subValue, color }: StatCardProps) {
  const colorStyles = colorMap[color];

  return (
    <div className="bg-stat rounded-[14px] border border-line p-4 flex flex-col justify-between h-[118px] relative overflow-hidden">
      {/* Gold line accent if needed - PRD says "aksen kiri 2 px --gold-line" */}
      <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-gold-line" />
      
      <div className="flex justify-between items-start ml-2">
        <h4 className={`text-[11px] font-bold tracking-wider uppercase ${colorStyles.text}`}>
          {title}
        </h4>
        <Icon size={14} className={colorStyles.text} />
      </div>
      
      <div className="ml-2 mt-auto">
        <div className="font-mono text-[22px] font-bold text-ink mb-1">
          {value}
        </div>
        <div className="text-[13px] text-side-text">
          {subValue}
        </div>
      </div>
    </div>
  );
}
