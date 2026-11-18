import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../theme/ThemeContext';

interface ThemeToggleButtonProps {
  compact?: boolean;
}

export const ThemeToggleButton: React.FC<ThemeToggleButtonProps> = ({
  compact = false,
}) => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? '라이트 모드로 전환' : '다크 모드로 전환'}
      title={isDark ? '라이트 모드로 전환' : '다크 모드로 전환'}
      className={[
        'inline-flex items-center justify-center rounded-lg border transition-colors cursor-pointer whitespace-nowrap shrink-0',
        'border-slate-300/80 bg-white/80 text-slate-700 hover:border-slate-400 hover:text-slate-900',
        'dark:border-white/12 dark:bg-obsidian-850 dark:text-slate-200 dark:hover:border-white/25 dark:hover:text-white',
        compact ? 'min-w-[38px] min-h-[38px]' : 'gap-1.5 px-3 py-1.5 min-h-[36px] text-xs font-medium',
      ].join(' ')}
    >
      {isDark ? (
        <>
          <Sun className="w-4 h-4 text-amber-400 shrink-0" />
          {!compact && <span>라이트</span>}
        </>
      ) : (
        <>
          <Moon className="w-4 h-4 text-slate-700 shrink-0" />
          {!compact && <span>다크</span>}
        </>
      )}
    </button>
  );
};
