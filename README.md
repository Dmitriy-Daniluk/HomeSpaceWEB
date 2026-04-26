# HomeSpace — Семейная система управления

<div align="center">

![HomeSpace](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Docker](https://img.shields.io/badge/docker-ready-brightgreen.svg)

**Кроссплатформенная система для управления повседневной деятельностью семьи**

[Веб-приложение](#веб-приложение) • [Мобильное приложение](#мобильное-приложение) • [API](#бэкенд-api) • [Docker](#быстрый-старт)

</div>

---

## 📋 Оглавление

- [О проекте](#о-проекте)
- [Возможности](#возможности)
- [Технологический стек](#технологический-стек)
- [Быстрый старт](#быстрый-старт)
- [Структура проекта](#структура-проекта)
- [Веб-приложение](#веб-приложение)
- [Мобильное приложение](#мобильное-приложение)
- [Бэкенд API](#бэкенд-api)
- [База данных](#база-данных)
- [Подписка](#подписка)
- [Развёртывание](#развёртывание)
- [Лицензия](#лицензия)

---

## 🏠 О проекте

**HomeSpace** — это удобная и интуитивно понятная кроссплатформенная система, включающая веб-приложение и мобильное приложение, предназначенная для управления повседневной деятельностью семьи.

Платформа объединяет в едином цифровом пространстве:
- 📋 Планирование задач и обязанностей
- 💰 Ведение семейного бюджета
- 📅 Управление расписанием
- 🤝 Координацию совместной активности

Система позволяет всем членам семьи:
- Синхронизировать свои действия в реальном времени
- Распределять обязанности с учётом ролей
- Отслеживать выполнение задач
- Контролировать финансовые показатели

---

## ✨ Возможности

### Управление задачами
- Создание задач с названием, дедлайном, описанием, приоритетом
- Назначение исполнителей из членов семьи
- Статусы: Новая → В процессе → Выполнено
- Фильтрация по статусу, исполнителю, приоритету
- Прикрепление фотографий к задачам

### Семейный бюджет
- Учёт доходов и расходов по категориям
- Статистика за всё время / за месяц / за произвольный период
- Визуализация расходов (диаграммы)
- Экспорт отчётов в **PDF** и **Excel**
- Подписка открывает просмотр расходов **за всё время**

### Анализ продуктивности
- Кто выполняет больше всего задач
- Процент выполнения задач за месяц
- Графики и тренды
- Экспорт аналитики

### Хранилище файлов
- Загрузка сканов чеков, квитанций, документов
- Прикрепление файлов к задачам и расходам
- Типы файлов: чеки, документы, изображения
- Вся финансовая информация в одном месте

### Зашифрованное хранилище паролей
- Сохранение логинов и паролей
- Уровни видимости: Личный / Родители / Семья
- Копирование в буфер обмена

### Геолокация
- Отслеживание местоположения членов семьи
- Гео-зоны с напоминаниями
- Возможность отследить, где находится ребёнок

### Чат семьи
- Обмен сообщениями внутри семьи
- Прикрепление файлов к сообщениям

### Техподдержка
- Отправка обращений администраторам
- Отслеживание статуса обращений

---

## 🛠 Технологический стек

| Компонент | Технологии |
|-----------|-----------|
| **Веб-фронтенд** | React + Next.js 14, TailwindCSS, Recharts, jsPDF, XLSX |
| **Мобильное приложение** | React Native (Expo), React Navigation, SQLite |
| **Бэкенд** | Node.js + Express, MySQL2, JWT, Multer, Winston |
| **База данных (сервер)** | MySQL 8.0 |
| **База данных (мобильное)** | SQLite (оффлайн-кэш) |
| **Контейнеризация** | Docker + Docker Compose |
| **Безопасность** | Helmet, bcryptjs, rate limiting, JWT |

---

## 🚀 Быстрый старт

### Требования
- Docker & Docker Compose
- Node.js 18+ (для локальной разработки)
- npm или yarn

### Запуск через Docker

```bash
# Клонирование репозитория
git clone <repository-url>
cd homespace

# Запуск всех сервисов без host-bind mounts
docker compose up -d --build

# Сервисы будут доступны:
# Веб-приложение: http://localhost:3000
# Бэкенд API:    http://localhost:5001
# MySQL:         localhost:3307
```

По умолчанию контейнеры не монтируют `backend`, `web` и SQL-файлы с хоста, поэтому они не ломаются от переименования родительской папки. После изменения кода пересоберите сервисы:

```bash
docker compose up -d --build --force-recreate
```

Настройки для Docker вынесены в переменные окружения. Шаблон лежит в `.env.example`; реальные значения держите в локальном `.env`, он исключён из Git.

Админские права больше не определяются фронтендом по email. Backend хранит роль пользователя в поле `users.role`, отдаёт клиенту только `isAdmin`, а API админки проверяет роль на сервере. Для свежей базы сид админа включается только явно:

```bash
SEED_ADMIN_USER=true
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=<strong-local-password>
```

Если нужен режим разработки с живым обновлением файлов из проекта:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build
```

### Локальная разработка

```bash
# Бэкенд
cd backend
cp .env.example .env
npm install
npm run dev

# Веб-приложение
cd web
npm install
npm run dev

# Мобильное приложение
cd mobile
npm install
npx expo start
```

> На Windows PowerShell может блокировать `npm.ps1`. В таком случае используйте `npm.cmd install`, `npm.cmd run dev`, `npm.cmd run build`.

### Подключение мобильного приложения к серверному API

`SSH` нужен только для доступа разработчика к серверу. Само мобильное приложение должно подключаться к публичному адресу backend API по `HTTPS`, например `https://api.example.com/api`.

1. На сервере поднимите backend за обратным прокси (`Nginx`/`Caddy`) и выдайте ему домен вроде `api.example.com`.
2. Проверьте, что backend отвечает снаружи по `GET https://api.example.com/api/health`.
3. В мобильном приложении создайте файл `mobile/.env` на основе `mobile/.env.example`.
4. Укажите `EXPO_PUBLIC_API_URL=https://api.example.com`.
5. Перезапустите Expo после изменения `.env`, чтобы приложение пересобрало публичные переменные окружения.

Прямое подключение мобильного клиента к MySQL не нужно и небезопасно. Схема должна быть такой: `mobile app -> HTTPS API -> backend -> database`.

---

## 📁 Структура проекта

```
homespace/
├── docker-compose.yml          # Docker Compose конфигурация
├── db/
│   └── schema.sql              # Схема базы данных MySQL
├── backend/                    # Node.js + Express API
│   ├── Dockerfile
│   ├── package.json
│   ├── .env.example
│   ├── uploads/                # Загруженные файлы
│   └── src/
│       ├── server.js           # Точка входа
│       ├── config/db.js        # Подключение к MySQL
│       ├── middleware/         # Auth, validation, error handler
│       ├── controllers/        # Бизнес-логика (14 файлов)
│       ├── routes/             # API маршруты (14 файлов)
│       └── utils/logger.js     # Логирование
├── web/                        # Next.js веб-приложение
│   ├── Dockerfile
│   ├── package.json
│   ├── tailwind.config.js
│   └── src/
│       ├── pages/              # Все страницы (18 файлов)
│       ├── components/         # UI компоненты (13 файлов)
│       ├── context/            # Auth, Theme контексты
│       ├── utils/              # API клиент, утилиты
│       └── styles/             # Глобальные стили
├── mobile/                     # React Native мобильное приложение
│   ├── package.json
│   ├── app.json
│   └── src/
│       ├── App.js              # Навигация
│       ├── screens/            # Экраны (16 файлов)
│       ├── components/         # Компоненты (9 файлов)
│       ├── context/            # Auth, Theme
│       ├── utils/              # API, константы, хелперы
│       └── db/database.js      # SQLite локальная БД
└── docs/                       # Документация
```

---

## 🌐 Веб-приложение

### Страницы

| Страница | Описание |
|----------|----------|
| **Главная** | Описание проекта, «О нас», форма пожеланий |
| **Вход / Регистрация** | Аутентификация, восстановление пароля |
| **Дашборд задач** | Фильтрация, создание, управление задачами |
| **Профиль** | ФИО, дата рождения, подписка, роль, статистика |
| **Семья** | Члены семьи, показатели, приглашения |
| **Бюджет** | Доходы/расходы, графики, экспорт PDF/Excel |
| **Аналитика** | Продуктивность, графики выполнения задач |
| **Файлы** | Хранилище документов, чеков, фотографий |
| **Пароли** | Зашифрованное хранилище паролей |
| **Геолокация** | Отслеживание, гео-зоны |
| **Чат** | Семейный чат в реальном времени |
| **Поддержка** | Обращения в техподдержку |
| **Админ-панель** | Статистика по пользователям и семьям (десктоп) |

### Темы
- ☀️ Светлая тема
- 🌙 Тёмная тема
- Переключение в один клик с сохранением предпочтений

---

## 📱 Мобильное приложение

### Экраны

| Экран | Описание |
|-------|----------|
| **Вход / Регистрация** | Аутентификация |
| **Задачи** | Список задач, фильтры, создание |
| **Бюджет** | Транзакции, итоги, добавление |
| **Семья** | Список семей, детали, приглашения |
| **Профиль** | Информация, статистика, настройки |
| **Геолокация** | Отслеживание, обновление позиции |
| **Пароли** | Хранилище паролей |
| **Чат** | Семейный чат |
| **Уведомления** | Список уведомлений |
| **Настройки** | Тема, уведомления, поддержка |
| **Файлы** | Просмотр и загрузка файлов |

### Оффлайн-режим
Мобильное приложение использует **SQLite** для локального кэширования данных с последующей синхронизацией при подключении к серверу.

---

## 🔌 Бэкенд API

### Эндпоинты

#### Аутентификация
```
POST   /api/auth/register          Регистрация
POST   /api/auth/login             Вход
POST   /api/auth/forgot-password   Восстановление пароля
POST   /api/auth/reset-password    Сброс пароля
```

#### Пользователи
```
GET    /api/users/profile          Получить профиль
PUT    /api/users/profile          Обновить профиль
POST   /api/users/avatar           Загрузить аватар
```

#### Семьи
```
GET    /api/families               Мои семьи
POST   /api/families               Создать семью
GET    /api/families/:id           Детали семьи
PUT    /api/families/:id           Обновить семью
POST   /api/families/:id/invite    Пригласить участника
POST   /api/families/join          Присоединиться по коду
DELETE /api/families/:id/member/:userId  Удалить участника
```

#### Задачи
```
GET    /api/tasks?familyId=&status=&executor=&priority=  Список задач
POST   /api/tasks                  Создать задачу
PUT    /api/tasks/:id              Обновить задачу
DELETE /api/tasks/:id              Удалить задачу
GET    /api/tasks/stats?familyId=  Статистика задач
```

#### Бюджет
```
GET    /api/budget?familyId=&period=&startDate=&endDate=  Транзакции
POST   /api/budget                 Добавить транзакцию
DELETE /api/budget/:id             Удалить транзакцию
GET    /api/budget/stats?familyId= Статистика бюджета
GET    /api/budget/subscription?familyId=  Данные подписки (все время)
```

#### Аналитика
```
GET    /api/analytics/productivity?familyId=  Продуктивность
GET    /api/analytics/export?familyId=&type=  Экспорт данных
```

#### Файлы
```
POST   /api/files/upload           Загрузить файл
GET    /api/files?familyId=        Список файлов
DELETE /api/files/:id              Удалить файл
```

#### Пароли
```
GET    /api/passwords?familyId=    Список паролей
POST   /api/passwords              Сохранить пароль
GET    /api/passwords/:id          Получить пароль
PUT    /api/passwords/:id          Обновить пароль
DELETE /api/passwords/:id          Удалить пароль
```

#### Геолокация
```
POST   /api/location/update        Обновить местоположение
GET    /api/location/latest/:userId  Последняя позиция
GET    /api/location/geofences/:familyId  Гео-зоны
POST   /api/location/geofences     Создать гео-зону
DELETE /api/location/geofences/:id Удалить гео-зону
```

#### Чат
```
GET    /api/chat/:familyId         Сообщения
POST   /api/chat                   Отправить сообщение
```

#### Уведомления
```
GET    /api/notifications          Мои уведомления
POST   /api/notifications/:id/read Прочитать
POST   /api/notifications/read-all Прочитать все
```

#### Поддержка
```
POST   /api/support                Создать обращение
GET    /api/support/my             Мои обращения
```

#### Администрирование
```
GET    /api/admin/stats            Общая статистика
GET    /api/admin/users            Пользователи
GET    /api/admin/families         Семьи
GET    /api/admin/subscriptions    Подписки
```

---

## 🗄 База данных

### Таблицы

| Таблица | Описание |
|---------|----------|
| `users` | Пользователи с подпиской |
| `families` | Семьи с целями накоплений |
| `family_members` | Роли (parent/child) |
| `tasks` | Задачи со статусами и приоритетами |
| `transactions` | Доходы и расходы |
| `password_vault` | Зашифрованное хранилище паролей |
| `attachments` | Вложения (чеки, фото, документы) |
| `user_locations` | История геолокации |
| `geofences` | Гео-зоны для напоминаний |
| `notifications` | Уведомления |
| `chat_messages` | Сообщения чата |
| `support_tickets` | Обращения в поддержку |
| `feedback` | Отзывы и пожелания |
| `productivity_reports` | Отчёты продуктивности |

---

## 💎 Подписка

### Freemium модель
| Функция | Бесплатно | Подписка |
|---------|-----------|----------|
| Задачи | ✅ | ✅ |
| Бюджет (1-2 месяца) | ✅ | ✅ |
| **Бюджет (всё время)** | ❌ | ✅ |
| Аналитика | ✅ | ✅ |
| Экспорт PDF/Excel | ✅ | ✅ |
| Хранилище файлов | ✅ | ✅ |
| Хранилище паролей | ✅ | ✅ |
| Геолокация | ✅ | ✅ |
| Чат | ✅ | ✅ |

---

## 🚢 Развёртывание

### Production Docker

```bash
# Создать .env файл
cp backend/.env.example backend/.env

# Изменить переменные для production
# JWT_SECRET, DB_PASSWORD, ADMIN_EMAILS

# Запустить
docker-compose -f docker-compose.prod.yml up -d
```

### Переменные окружения

```env
# Backend
PORT=5001
DB_HOST=mysql
DB_PORT=3306
DB_USER=homespace_user
DB_PASSWORD=homespace_pass
DB_NAME=homespace_model
JWT_SECRET=change_this_in_production
JWT_EXPIRE=7d
PASSWORD_VAULT_KEY=change_this_32_plus_char_secret_for_vault
NODE_ENV=production
FRONTEND_URL=http://localhost:3000
APP_NAME=HomeSpace
ADMIN_EMAILS=admin@homespace.com
MAX_FILE_SIZE=10485760
UPLOAD_DIR=uploads
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=no-reply@example.com
SMTP_PASSWORD=change_this_smtp_password
MAIL_FROM=HomeSpace <no-reply@example.com>

# Web
NEXT_PUBLIC_API_URL=http://localhost:5001/api
NEXT_PUBLIC_APP_NAME=HomeSpace
```

---

## 📄 Лицензия

MIT License

---

<div align="center">
  <strong>HomeSpace</strong> — Управляйте семейной жизнью легко 🏡
</div>
