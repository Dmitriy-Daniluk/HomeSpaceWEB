import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Send, Paperclip, Users, Trash2, Edit2, Check, X, MessageCircle } from 'lucide-react';
import api from '../utils/api';
import { getAssetUrl } from '../utils/files';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Loading from '../components/ui/Loading';
import EmptyState from '../components/ui/EmptyState';
import useAutoRefresh from '../hooks/useAutoRefresh';

export default function ChatPage() {
  const router = useRouter();
  const [families, setFamilies] = useState([]);
  const [selectedFamilyId, setSelectedFamilyId] = useState('');
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [familiesLoading, setFamiliesLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [deletingMessageId, setDeletingMessageId] = useState(null);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editingContent, setEditingContent] = useState('');
  const [editingSaving, setEditingSaving] = useState(false);
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const fileInputRef = useRef(null);
  const selectedFamily = useMemo(
    () => families.find((family) => String(family.id) === String(selectedFamilyId)) || null,
    [families, selectedFamilyId]
  );

  const fetchFamilies = async ({ background = false } = {}) => {
    if (!background) setFamiliesLoading(true);
    try {
      const res = await api.get('/chat');
      const data = res.data.data || [];
      setFamilies(data);
      const queryFamilyId = router.query.familyId ? String(router.query.familyId) : '';
      const storedFamilyId = typeof window !== 'undefined' ? localStorage.getItem('chatFamilyId') : '';
      const nextFamily = data.find((family) => String(family.id) === queryFamilyId)
        || data.find((family) => String(family.id) === storedFamilyId)
        || data[0];

      if (nextFamily) {
        setSelectedFamilyId(String(nextFamily.id));
      } else {
        setLoading(false);
      }
    } catch (err) {
      console.error(err);
      setLoading(false);
    } finally {
      if (!background) setFamiliesLoading(false);
    }
  };

  const fetchMessages = useCallback(async (familyId, options = {}) => {
    if (!familyId) return;
    const { showLoader = false, background = false } = options;
    if (showLoader) {
      setLoading(true);
      setMessagesLoading(true);
      setMessages([]);
    }
    if (background) setRefreshing(true);

    try {
      const res = await api.get(`/chat/${familyId}`);
      setMessages(res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setMessagesLoading(false);
      setRefreshing(false);
    }
  }, []);

  const selectFamily = (familyId) => {
    const normalizedFamilyId = String(familyId);
    if (!normalizedFamilyId || normalizedFamilyId === String(selectedFamilyId)) return;
    setSelectedFamilyId(normalizedFamilyId);
    setEditingMessageId(null);
    setEditingContent('');
    setNewMessage('');
    if (typeof window !== 'undefined') localStorage.setItem('chatFamilyId', normalizedFamilyId);
    router.replace(
      { pathname: router.pathname, query: { familyId: normalizedFamilyId } },
      undefined,
      { shallow: true }
    );
  };

  useEffect(() => {
    if (router.isReady) fetchFamilies();
  }, [router.isReady]);

  useEffect(() => {
    if (!selectedFamilyId) return undefined;
    fetchMessages(selectedFamilyId, { showLoader: true });
  }, [selectedFamilyId, fetchMessages]);

  useAutoRefresh(() => {
    fetchFamilies({ background: true });
    if (selectedFamilyId) {
      fetchMessages(selectedFamilyId, { background: true });
    }
  }, { enabled: router.isReady });

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedFamily) return;
    setSending(true);
    try {
      const res = await api.post('/chat', { familyId: selectedFamily.id, content: newMessage });
      setNewMessage('');
      if (res.data.data) {
        setMessages((prev) => [...prev, res.data.data]);
      } else {
        fetchMessages(selectedFamily.id, { background: true });
      }
    } catch (err) { console.error(err); }
    finally { setSending(false); }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedFamily) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('file_name', file.name || 'attachment');
    formData.append('familyId', selectedFamily.id);
    formData.append('file_type', file.type.startsWith('image/') ? 'image' : 'document');

    setUploadingFile(true);
    try {
      const uploadRes = await api.post('/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const attachmentUrl = uploadRes.data.data?.file_path || uploadRes.data.data?.filePath;
      const attachmentName = uploadRes.data.data?.file_name || uploadRes.data.data?.fileName || file.name;

      const messageRes = await api.post('/chat', {
        familyId: selectedFamily.id,
        content: newMessage.trim() || `Файл: ${attachmentName}`,
        attachmentUrl,
      });

      setNewMessage('');
      if (messageRes.data.data) {
        setMessages((prev) => [...prev, messageRes.data.data]);
      } else {
        fetchMessages(selectedFamily.id, { background: true });
      }
    } catch (err) {
      console.error(err);
      window.alert('Не удалось прикрепить файл к чату. Проверьте консоль и попробуйте ещё раз.');
    } finally {
      setUploadingFile(false);
      e.target.value = '';
    }
  };

  const deleteMessage = async (id) => {
    if (!window.confirm('Удалить сообщение?')) return;
    setDeletingMessageId(id);
    try {
      await api.delete(`/chat/${id}`);
      setMessages((prev) => prev.filter((msg) => msg.id !== id));
    } catch (err) {
      console.error(err);
      window.alert(err.response?.data?.message || err.response?.data?.error || 'Не удалось удалить сообщение.');
    } finally {
      setDeletingMessageId(null);
    }
  };

  const startEditing = (message) => {
    setEditingMessageId(message.id);
    setEditingContent(message.content || message.message || '');
  };

  const saveEditedMessage = async () => {
    if (!editingMessageId || !editingContent.trim()) return;
    setEditingSaving(true);
    try {
      const res = await api.put(`/chat/${editingMessageId}`, { content: editingContent.trim() });
      const updated = res.data.data;
      setMessages((prev) => prev.map((msg) => (msg.id === editingMessageId ? { ...msg, ...updated } : msg)));
      setEditingMessageId(null);
      setEditingContent('');
    } catch (err) {
      console.error(err);
      window.alert(err.response?.data?.message || err.response?.data?.error || 'Не удалось отредактировать сообщение.');
    } finally {
      setEditingSaving(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  };

  const currentFamilyName = selectedFamily?.name || 'Семейный чат';

  if (!loading && families.length === 0) {
    return (
      <>
        <Head><title>Чат — HomeSpace</title></Head>
        <EmptyState
          icon={Users}
          title="Сначала создайте семью"
          description="Чат создаётся для семейной группы, чтобы все участники видели общую историю сообщений."
          action={<Link href="/family"><Button>Перейти к семьям</Button></Link>}
        />
      </>
    );
  }

  return (
    <>
      <Head><title>Чат — HomeSpace</title></Head>
      <div className="h-[calc(100vh-8rem)] flex flex-col animate-fade-in">
        <div className="mb-4 overflow-hidden rounded-3xl border border-sky-100 bg-gradient-to-r from-sky-600 via-indigo-600 to-violet-600 p-5 text-white shadow-xl shadow-sky-950/10 dark:border-sky-900/60">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/20 bg-white/10">
                <MessageCircle className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Чат</h1>
                <p className="text-sm text-white/75">{currentFamilyName} · {messages.length} сообщений</p>
              </div>
            </div>
            {families.length > 0 && (
              <select
                value={selectedFamily?.id || ''}
                onChange={(e) => {
                  selectFamily(e.target.value);
                }}
                className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-white/50 [&>option]:text-gray-900"
              >
                {families.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
          {familiesLoading ? (
            <div className="h-10 w-48 animate-pulse rounded-2xl bg-white/70 dark:bg-gray-800" />
          ) : families.map((family) => {
            const isActive = String(family.id) === String(selectedFamilyId);
            return (
              <button
                key={family.id}
                type="button"
                onClick={() => selectFamily(family.id)}
                className={`flex flex-shrink-0 items-center gap-3 rounded-2xl border px-4 py-2 text-left text-sm transition-colors ${
                  isActive
                    ? 'border-sky-400 bg-sky-50 text-sky-800 shadow-sm dark:border-sky-700 dark:bg-sky-900/25 dark:text-sky-200'
                    : 'border-gray-100 bg-white text-gray-600 hover:border-sky-200 hover:text-sky-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-sky-800'
                }`}
              >
                <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${isActive ? 'bg-sky-500 text-white' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-300'}`}>
                  {(family.name || 'F').charAt(0)}
                </span>
                <span>
                  <span className="block font-medium">{family.name}</span>
                  <span className="block text-xs opacity-70">{family.member_count || 0} участников</span>
                </span>
              </button>
            );
          })}
        </div>

        <Card className="flex-1 flex flex-col overflow-hidden p-0 border-sky-100 dark:border-sky-900/50">
          <div className="border-b border-gray-100 bg-white/80 px-4 py-3 backdrop-blur dark:border-gray-700 dark:bg-gray-800/80">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-300">
                  <Users className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{currentFamilyName}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Общая история семьи обновляется в фоне</p>
                </div>
              </div>
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300">
                {refreshing ? 'обновление...' : 'online'}
              </span>
            </div>
          </div>
          {/* Messages */}
          <div ref={chatContainerRef} className="flex-1 overflow-y-auto space-y-4 bg-gradient-to-b from-sky-50/70 via-white to-indigo-50/50 p-4 dark:from-gray-900 dark:via-gray-900 dark:to-indigo-950/20">
            {loading || messagesLoading ? (
              <Loading text="Загрузка сообщений..." />
            ) : messages.length === 0 ? (
              <EmptyState icon={Users} title="Нет сообщений" description="Начните общение с семьёй" />
            ) : (
              messages.map((msg, i) => {
                const isOwn = msg.senderId === msg.currentUserId || msg.isOwn;
                const attachmentUrl = msg.attachment_url || msg.attachmentUrl;
                const canDelete = isOwn || selectedFamily?.role === 'parent';
                const isEditing = editingMessageId === msg.id;
                const senderName = msg.senderName || msg.sender?.fullName || 'Участник';
                const messageText = msg.content || msg.message || '';
                return (
                  <div key={msg.id || i} className={`flex items-end gap-2 ${isOwn ? 'justify-end' : 'justify-start'} animate-slide-up`}>
                    {!isOwn && (
                      <div className="mb-6 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-indigo-500 text-xs font-semibold text-white shadow-sm">
                        {senderName.charAt(0)}
                      </div>
                    )}
                    <div className={`max-w-xs sm:max-w-md lg:max-w-lg ${isOwn ? 'order-2' : ''}`}>
                      {!isOwn && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 ml-1">{senderName}</p>
                      )}
                      <div className={`px-4 py-3 rounded-2xl shadow-sm border ${
                        isOwn
                          ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-br-md border-white/10 shadow-indigo-950/10'
                          : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-bl-md border-gray-100 dark:border-gray-700'
                      }`}>
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <input
                              value={editingContent}
                              onChange={(e) => setEditingContent(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveEditedMessage();
                                if (e.key === 'Escape') setEditingMessageId(null);
                              }}
                              className="min-w-0 flex-1 rounded-lg border border-white/30 bg-white/90 px-2 py-1 text-sm text-gray-900 outline-none"
                              autoFocus
                            />
                            <button type="button" onClick={saveEditedMessage} disabled={editingSaving} className="text-emerald-100 hover:text-white">
                              <Check className="w-4 h-4" />
                            </button>
                            <button type="button" onClick={() => setEditingMessageId(null)} className="text-red-100 hover:text-white">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <p className="text-sm break-words leading-relaxed">{messageText}</p>
                        )}
                        {attachmentUrl && (
                          <a
                            href={getAssetUrl(attachmentUrl)}
                            target="_blank"
                            rel="noreferrer"
                            className={`mt-2 inline-flex items-center gap-1 text-xs underline ${
                              isOwn ? 'text-indigo-100' : 'text-indigo-600 dark:text-indigo-300'
                            }`}
                          >
                            <Paperclip className="w-3.5 h-3.5" />
                            Открыть вложение
                          </a>
                        )}
                      </div>
                      <p className={`text-xs text-gray-400 mt-1 ${isOwn ? 'text-right' : ''}`}>
                        {formatTime(msg.createdAt || msg.created_at)}
                      </p>
                      {canDelete && (
                        <div className={`mt-1 flex items-center gap-2 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                          {isOwn && (
                            <button
                              type="button"
                              onClick={() => startEditing(msg)}
                              className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-600"
                            >
                              <Edit2 className="w-3 h-3" />
                              Изменить
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => deleteMessage(msg.id)}
                            disabled={deletingMessageId === msg.id}
                            className="inline-flex items-center gap-1 text-xs text-red-400 hover:text-red-600"
                          >
                            <Trash2 className="w-3 h-3" />
                            {deletingMessageId === msg.id ? 'Удаление...' : 'Удалить'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={sendMessage} className="border-t border-gray-100 bg-white/95 p-3 backdrop-blur dark:border-gray-700 dark:bg-gray-800/95">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingFile || !selectedFamily}
                className="p-2 rounded-xl border border-gray-100 bg-gray-50 text-gray-500 transition-colors hover:bg-sky-50 hover:text-sky-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-sky-900/20 dark:hover:text-sky-300"
                title="Прикрепить файл"
              >
                <Paperclip className={`w-5 h-5 ${uploadingFile ? 'animate-pulse' : ''}`} />
              </button>
              <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} disabled={uploadingFile} />
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder={uploadingFile ? 'Загружаю файл...' : 'Введите сообщение...'}
                className="flex-1 px-4 py-2.5 rounded-2xl border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder-gray-400 shadow-inner focus:outline-none focus:ring-2 focus:ring-sky-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
              <Button type="submit" variant="primary" loading={sending} disabled={!newMessage.trim()} className="px-3 shadow-lg shadow-indigo-950/10">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </>
  );
}
