import Topbar from "@/components/Topbar";
import StatCard from "@/components/StatCard";
import FinanceChart from "@/components/FinanceChart";
import { Wallet, TrendingDown, Coins, Landmark, ShieldCheck, Box, ArrowDownToLine, ArrowUpRight, AlertTriangle, Layers } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col gap-4 max-w-7xl mx-auto pb-10">
      <Topbar />

      {/* Periode Dashboard Section */}
      <section className="bg-bg border border-line rounded-[14px] p-3 flex justify-between items-center mt-2">
        <div>
          <h2 className="text-[11px] font-bold tracking-[0.1em] text-side-text uppercase mb-1">
            Periode Dashboard
          </h2>
          <div className="font-mono text-gold font-bold text-sm">
            01/10/2026 - 06/10/2026
          </div>
        </div>
        <div className="w-[200px]">
          <select className="w-full bg-card border border-line rounded-lg px-3 py-2 text-sm text-ink outline-none">
            <option>Periode</option>
          </select>
        </div>
      </section>

      {/* Dashboard Finance Section */}
      <section className="bg-bg border border-line rounded-[14px] p-4 flex flex-col gap-4">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-[11px] font-bold tracking-[0.1em] text-side-text uppercase">
            Dashboard Finance
          </h2>
          <Wallet size={16} className="text-gold" />
        </div>
        
        <div>
          <h3 className="text-xl font-serif font-bold text-ink mb-4">Cash Flow Periode Terpilih</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard 
              title="Pendapatan Kotor"
              icon={Wallet}
              value="Rp 0"
              subValue="cash + bank"
              color="green"
            />
            <StatCard 
              title="Pengeluaran"
              icon={TrendingDown}
              value="Rp 0"
              subValue="cash + bank"
              color="red"
            />
            <StatCard 
              title="Bersih Cash"
              icon={Coins}
              value="Rp 0"
              subValue="cash"
              color="ink"
            />
            <StatCard 
              title="Bersih Bank"
              icon={Landmark}
              value="Rp 0"
              subValue="bank"
              color="gold"
            />
            <div className="lg:col-span-4 mt-2">
              <StatCard 
                title="Pendapatan Bersih"
                icon={ShieldCheck}
                value="Rp 0"
                subValue="total bersih"
                color="green"
              />
            </div>
          </div>
        </div>

        <div className="bg-card border border-line rounded-[14px] p-4 mt-2">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h4 className="text-[9px] font-bold tracking-[0.1em] text-side-text uppercase mb-1">
                Multiple Line
              </h4>
              <h3 className="text-lg font-serif font-bold text-ink">
                Pendapatan Finance vs Pengeluaran
              </h3>
            </div>
            <select className="bg-white border border-line rounded px-2 py-1 text-xs text-ink outline-none">
              <option>Tanggal</option>
            </select>
          </div>
          
          <FinanceChart />
        </div>
      </section>

      {/* Dashboard Stock Section */}
      <section className="bg-bg border border-line rounded-[14px] p-4 flex flex-col gap-4">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-[11px] font-bold tracking-[0.1em] text-side-text uppercase">
            Dashboard Stock
          </h2>
          <Box size={16} className="text-gold" />
        </div>
        
        <h3 className="text-xl font-serif font-bold text-ink mb-4">Pergerakan dan Kondisi Stock</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <StatCard 
            title="Total SKU"
            icon={Box}
            value="0"
            subValue="item aktif"
            color="ink"
          />
          <StatCard 
            title="Stock Masuk"
            icon={ArrowDownToLine}
            value="0"
            subValue="pergerakan positif"
            color="green"
          />
          <StatCard 
            title="Stock Keluar"
            icon={ArrowUpRight}
            value="0"
            subValue="pergerakan negatif"
            color="gold"
          />
          <StatCard 
            title="Kondisi Stock"
            icon={AlertTriangle}
            value="0"
            subValue="perlu perhatian"
            color="red"
          />
          <StatCard 
            title="Nilai Stock"
            icon={Layers}
            value="Rp 0"
            subValue="valuasi gudang"
            color="green"
          />
        </div>
      </section>

    </div>
  );
}
