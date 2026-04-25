import { useTheme } from '../context/ThemeContext';

export default function Chart({ children, ...props }) {
  const { theme } = useTheme();

  const chartColors = {
    grid: theme === 'dark' ? '#374151' : '#f3f4f6',
    text: theme === 'dark' ? '#9ca3af' : '#6b7280',
    tooltip: theme === 'dark' ? '#1f2937' : '#ffffff',
  };

  return (
    <div className="w-full">
      {children({ colors: chartColors, isDark: theme === 'dark' })}
    </div>
  );
}
