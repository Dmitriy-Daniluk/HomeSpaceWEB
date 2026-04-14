import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { Send, Paperclip, Users, Smile, Search, ArrowDown } from 'lucide-react';
import api from '../utils/api';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Loading from '../components/ui/Loading';
import EmptyState from '../components/ui/EmptyState';

export default function ChatPage() {
  const [families, setFamilies] = useState([]);
  const [selectedFamily, setSelectedFamily] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);

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
    scrollToBottom();
  }, [messages]);

  const fetchFamilies = async () => {
    try {
      const res = await api.get('/families');
      setFamilies(res.data.data);
    } catch (err) { console.error(err); }
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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  };

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
                const f = families.find((f) => f.id === e.target.value);
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
                        <p className="text-sm break-words">{msg.content}</p>
                      </div>
                      <p className={`text-xs text-gray-400 mt-1 ${isOwn ? 'text-right' : ''}`}>
                        {formatTime(msg.createdAt || msg.created_at)}
                      </p>
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
              <button type="button" className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 transition-colors">
                <Paperclip className="w-5 h-5" />
              </button>
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Введите сообщение..."
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
