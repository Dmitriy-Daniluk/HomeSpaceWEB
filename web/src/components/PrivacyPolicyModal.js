import { useEffect, useState } from 'react';
import { FileText, LockKeyhole, ShieldCheck } from 'lucide-react';
import Modal from './ui/Modal';

const sections = {
  privacy: {
    title: 'Политика конфиденциальности',
    icon: ShieldCheck,
  },
  terms: {
    title: 'Условия использования',
    icon: FileText,
  },
};

export default function PrivacyPolicyModal({ isOpen, onClose, initialTab = 'privacy' }) {
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    if (isOpen) setActiveTab(initialTab);
  }, [initialTab, isOpen]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Правила HomeSpace" size="lg">
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-gray-100 p-1 dark:bg-gray-900">
          {Object.entries(sections).map(([key, section]) => {
            const Icon = section.icon;
            const isActive = activeTab === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTab(key)}
                className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-white text-indigo-700 shadow-sm dark:bg-gray-800 dark:text-indigo-300'
                    : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100'
                }`}
              >
                <Icon className="h-4 w-4" />
                {section.title}
              </button>
            );
          })}
        </div>

        {activeTab === 'privacy' ? <PrivacyContent /> : <TermsContent />}
      </div>
    </Modal>
  );
}

function PrivacyContent() {
  return (
    <div className="space-y-5 text-sm leading-6 text-gray-600 dark:text-gray-300">
      <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4 text-indigo-900 dark:border-indigo-900/50 dark:bg-indigo-950/40 dark:text-indigo-100">
        <div className="flex items-start gap-3">
          <LockKeyhole className="mt-0.5 h-5 w-5 flex-shrink-0" />
          <p>
            HomeSpace хранит только те данные, которые нужны для работы семейных задач, бюджета, файлов, паролей, геолокации и поддержки.
          </p>
        </div>
      </div>

      <section>
        <h4 className="font-semibold text-gray-900 dark:text-white">Какие данные используются</h4>
        <p className="mt-1">
          Аккаунт, email, имя, семейные группы, задачи, бюджетные операции, файлы, сообщения поддержки и отзывы. Геолокация используется только для функций, где пользователь сам включает передачу местоположения.
        </p>
      </section>

      <section>
        <h4 className="font-semibold text-gray-900 dark:text-white">Зачем это нужно</h4>
        <p className="mt-1">
          Для входа в аккаунт, синхронизации семейных данных, показа аналитики, защиты доступа, восстановления пароля, поддержки пользователей и улучшения интерфейса.
        </p>
      </section>

      <section>
        <h4 className="font-semibold text-gray-900 dark:text-white">Безопасность</h4>
        <p className="mt-1">
          Пароли аккаунтов хранятся в виде хеша. Для чувствительных разделов проекта предусмотрены авторизация, ограничения доступа по семье и отдельная защита данных хранилища паролей.
        </p>
      </section>

      <section>
        <h4 className="font-semibold text-gray-900 dark:text-white">Права пользователя</h4>
        <p className="mt-1">
          Пользователь может обновлять профиль, удалять свои записи в доступных разделах и обращаться в поддержку, если нужно исправить или удалить данные, которые нельзя изменить вручную.
        </p>
      </section>
    </div>
  );
}

function TermsContent() {
  return (
    <div className="space-y-5 text-sm leading-6 text-gray-600 dark:text-gray-300">
      <section>
        <h4 className="font-semibold text-gray-900 dark:text-white">Аккаунт и доступ</h4>
        <p className="mt-1">
          Пользователь отвечает за сохранность своего пароля и за действия, выполненные из его аккаунта. Не передавайте доступ людям, которым не доверяете.
        </p>
      </section>

      <section>
        <h4 className="font-semibold text-gray-900 dark:text-white">Семейные данные</h4>
        <p className="mt-1">
          Добавляйте в HomeSpace только те данные, которыми вы вправе распоряжаться: задачи, документы, бюджетные операции, заметки и контакты семьи.
        </p>
      </section>

      <section>
        <h4 className="font-semibold text-gray-900 dark:text-white">Файлы и пароли</h4>
        <p className="mt-1">
          Не загружайте вредоносные файлы и не храните данные, нарушающие права других людей. Раздел паролей предназначен для личного и семейного использования.
        </p>
      </section>

      <section>
        <h4 className="font-semibold text-gray-900 dark:text-white">Подписка</h4>
        <p className="mt-1">
          Часть возможностей может быть ограничена тарифом. Интерфейс показывает такие ограничения рядом с соответствующими функциями.
        </p>
      </section>
    </div>
  );
}
