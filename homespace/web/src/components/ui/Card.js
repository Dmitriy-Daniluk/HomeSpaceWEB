import { cn } from '../../utils/cn';

export default function Card({ children, className, hover = false, ...props }) {
  return (
    <div
      className={cn(
        'bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6',
        hover && 'transition-all duration-300 hover:shadow-lg hover:-translate-y-1',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
