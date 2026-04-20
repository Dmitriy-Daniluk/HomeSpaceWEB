import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { Send, Paperclip, Users, Smile, Trash2, Edit2, Check, X } from 'lucide-react';
import api from '../utils/api';
import { getAssetUrl } from '../utils/files';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Loading from '../components/ui/Loading';
import EmptyState from '../components/ui/EmptyState';

export default function ChatPage() {
  const [families, setFamilies] = useState([]);
  const [selectedFamily, setSelectedFamily] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [deletingMessageId, setDeletingMessageId] = useState(null);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editingContent, setEditingContent] = useState('');
  const [editingSaving, setEditingSaving] = useState(false);
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchFamilies();
  }, []);

  useEffect(() => {
    if (families.length > 0) {
      setSelectedFamily(families[0]);
    }
  }, [families]);

  useEffect(() => {
    if (selectedFamily) fetchMessages();
  }, [selectedFamily]);

  useEffect(() => {
    if (!selectedFamily) return undefined;
    const timer = window.setInterval(fetchMessages, 10000);
    return () => window.clearInterval(timer);
  }, [selectedFamily]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchFamilies = async () => {
    try {
      const res = await api.get('/families');
      const data = res.data.data || [];
      setFamilies(data);
      if (data.length === 0) setLoading(false);
    } catch (err) { console.error(err); setLoading(false); }
  };

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/chat/${selectedFamily.id}`);
      setMessages(res.data.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedFamily) return;
    setSending(true);
    try {
      await api.post('/chat', { familyId: selectedFamily.id, content: newMessage });
      setNewMessage('');
      fetchMessages();
    } catch (err) { console.error(err); }
    finally { setSending(false); }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedFamily) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('familyId', selectedFamily.id);
    formData.append('file_type', file.type.startsWith('image/') ? 'image' : 'document');

    setUploadingFile(true);
    try {
      const uploadRes = await api.post('/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const attachmentUrl = uploadRes.data.data?.file_path || uploadRes.data.data?.filePath;

      await api.post('/chat', {
        familyId: selectedFamily.id,
        content: newMessage.trim() || `Файл: ${file.name}`,
        attachmentUrl,
      });

      setNewMessage('');
      fetchMessages();
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
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Чат</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Общение с семьёй</p>
          </div>
          {families.length > 1 && (
            <select
              value={selectedFamily?.id || ''}
              onChange={(e) => {
                const f = families.find((f) => String(f.id) === String(e.target.value));
                setSelectedFamily(f);
              }}
              className="rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {families.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          )}
        </div>

        <Card className="flex-1 flex flex-col overflow-hidden p-0">
          {/* Messages */}
          <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
            {loading ? (
              <Loading text="Загрузка сообщений..." />
            ) : messages.length === 0 ? (
              <EmptyState icon={Users} title="Нет сообщений" description="Начните общение с семьёй" />
            ) : (
              messages.map((msg, i) => {
                const isOwn = msg.senderId === msg.currentUserId || msg.isOwn;
                const attachmentUrl = msg.attachment_url || msg.attachmentUrl;
                const canDelete = isOwn || selectedFamily?.role === 'parent';
                const isEditing = editingMessageId === msg.id;
                return (
                  <div key={msg.id || i} className={`flex ${isOwn ? 'justify-end' : 'justify-start'} animate-slide-up`}>
                    <div className={`max-w-xs sm:max-w-md lg:max-w-lg ${isOwn ? 'order-2' : ''}`}>
                      {!isOwn && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 ml-1">{msg.senderName || msg.sender?.fullName}</p>
                      )}
                      <div className={`px-4 py-2.5 rounded-2xl ${
                        isOwn
                          ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-br-md'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-md'
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
                          <p className="text-sm break-words">{msg.content}</p>
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
          <form onSubmit={sendMessage} className="border-t border-gray-100 dark:border-gray-700 p-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingFile || !selectedFamily}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
              <button type="button" className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 transition-colors">
                <Smile className="w-5 h-5" />
              </button>
              <Button type="submit" variant="primary" loading={sending} disabled={!newMessage.trim()} className="px-3">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </>
  );
}
