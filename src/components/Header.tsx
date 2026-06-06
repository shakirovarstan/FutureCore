import { Award } from "lucide-react";

interface HeaderProps {
  onLogoClick?: () => void;
}

export function Header({ onLogoClick }: HeaderProps) {
  return (
    <header className="fixed top-0 left-0 w-full z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/60 shadow-xs h-16 flex justify-between items-center px-4 md:px-8">
      <div 
        onClick={onLogoClick}
        className="flex items-center gap-2.5 cursor-pointer select-none active:scale-98 transition-transform duration-100"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="font-display font-black text-base sm:text-lg md:text-xl tracking-tight text-slate-800 select-none">
              FUTURE<span className="text-sky-500">CORE</span>
            </span>
            <span className="bg-sky-50 text-sky-600 border border-sky-200 text-[9px] font-sans font-black px-1.5 py-0.5 rounded-md leading-none shrink-0 select-none">.KG</span>
          </div>
          <span className="text-[9px] sm:text-[10px] text-slate-400 uppercase tracking-widest font-sans font-bold block -mt-0.5 leading-none whitespace-nowrap select-none">Learning Initiative</span>
        </div>
      </div>
      
      <div className="hidden sm:flex items-center gap-3">
        <span className="bg-emerald-50 text-emerald-700 border border-emerald-250 text-[10px] font-sans font-black px-3 py-1.5 rounded-xl uppercase tracking-wider">
          Обучение & Волонтерство
        </span>
      </div>
    </header>
  );
}
export default Header;
