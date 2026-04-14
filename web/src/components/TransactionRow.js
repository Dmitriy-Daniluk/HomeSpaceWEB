import { ArrowUpRight, ArrowDownRight, FileText, Edit2 } from 'lucide-react';
import Badge from './ui/Badge';

export default function TransactionRow({ transaction, onDelete, onEdit }) {
  const isIncome = transaction.type === 'income';

  return (
    <tr className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors group">
      <td className="py-3 px-4">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isIncome ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
            {isIncome ? (
              <ArrowDownRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <ArrowUpRight className="w-4 h-4 text-red-600 dark:text-red-400" />
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">{transaction.description || transaction.category}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{transaction.category}</p>
          </div>
        </div>
      </td>
      <td className="py-3 px-4">
        <Badge variant={isIncome ? 'success' : 'danger'} size="sm">
          {isIncome ? 'Доход' : 'Расход'}
        </Badge>
      </td>
      <td className="py-3 px-4">
        <span className={`text-sm font-semibold ${isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
          {isIncome ? '+' : '-'}{Number(transaction.amount).toLocaleString('ru-RU')} ₽
        </span>
      </td>
      <td className="py-3 px-4 text-sm text-gray-500 dark:text-gray-400">
        {new Date(transaction.transaction_date).toLocaleDateString('ru-RU')}
      </td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
          {onEdit && (
            <button
              onClick={() => onEdit(transaction)}
              className="text-indigo-500 hover:text-indigo-700 transition-all text-sm"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(transaction.id)}
              className="text-red-500 hover:text-red-700 transition-all text-sm"
            >
              Удалить
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
