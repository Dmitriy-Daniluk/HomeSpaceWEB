import { cn } from '../../utils/cn';

export default function Card({ children, className, hover = false, ...props }) {
  return (
    <div
      className={cn(
        'bg-white/95 dark:bg-gray-800/95 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 ring-1 ring-black/5 dark:ring-white/5',
        hover && 'transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-indigo-200 dark:hover:border-indigo-700',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
