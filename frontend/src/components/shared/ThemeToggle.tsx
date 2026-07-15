import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

export const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      aria-label={theme === 'dark' ? 'Aktifkan mode terang' : 'Aktifkan mode gelap'}
      className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-muted/50 border border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted text-sm font-medium transition-colors w-full"
    >
      {theme === 'dark' ? (
        <>
          <Sun className="w-4 h-4" />
          <span>Mode Terang</span>
        </>
      ) : (
        <>
          <Moon className="w-4 h-4" />
          <span>Mode Malam</span>
        </>
      )}
    </button>
  );
};
