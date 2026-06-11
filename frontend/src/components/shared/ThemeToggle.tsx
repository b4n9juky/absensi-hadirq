import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

export const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-950/50 border border-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-900/40 text-xs font-bold transition-all"
    >
      {theme === 'dark' ? (
        <>
          <Sun className="w-3.5 h-3.5" />
          <span>Mode Terang</span>
        </>
      ) : (
        <>
          <Moon className="w-3.5 h-3.5" />
          <span>Mode Malam</span>
        </>
      )}
    </button>
  );
};
