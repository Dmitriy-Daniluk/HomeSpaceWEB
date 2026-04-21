import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { MapPin, Plus, Trash2, Navigation, Users, Circle, Crosshair, Clock, Shield } from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import Loading from '../components/ui/Loading';
import FamilyMap from '../components/FamilyMap';

export default function LocationPage() {
  const { user } = useAuth();
  const [families, setFamilies] = useState([]);
  const [selectedFamilyId, setSelectedFamilyId] = useState('');
  const [members, setMembers] = useState([]);
  const [geofences, setGeofences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showGeofenceModal, setShowGeofenceModal] = useState(false);
  const [geofenceForm, setGeofenceForm] = useState({ name: '', latitude: '', longitude: '', radius: '' });
  const [saving, setSaving] = useState(false);
  const [updatingLocation, setUpdatingLocation] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchFamilies();
  }, []);

  useEffect(() => {
    if (selectedFamilyId) {
      fetchMembers();
      fetchGeofences();
    }
  }, [selectedFamilyId]);

  const fetchFamilies = async () => {
    try {
      const res = await api.get('/families');
      const data = res.data.data || [];
      setFamilies(data);
      if (data.length > 0) setSelectedFamilyId(String(data[0].id));
      if (data.length === 0) setLoading(false);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Не удалось загрузить семьи');
      setLoading(false);
    }
  };

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const allMembers = [];
      const selectedFamily = families.find((family) => String(family.id) === String(selectedFamilyId));
      if (selectedFamily?.members) {
        for (const m of selectedFamily.members) {
          try {
            const locRes = await api.get(`/location/latest/${m.id}`);
            allMembers.push({ ...m, familyName: selectedFamily.name, location: locRes.data.data || null });
          } catch {
            allMembers.push({ ...m, familyName: selectedFamily.name, location: null });
          }
        }
      }
      setMembers(allMembers);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Не удалось загрузить участников');
    }
    finally { setLoading(false); }
  };

  const fetchGeofences = async () => {
    try {
      if (selectedFamilyId) {
        const res = await api.get(`/location/geofences/${selectedFamilyId}`);
        setGeofences(res.data.data || []);
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Не удалось загрузить геозоны');
    }
  };

  const updateLocation = async () => {
    setError('');
    setUpdatingLocation(true);
    try {
      if (!navigator.geolocation) {
        setError('Ваш браузер не поддерживает геолокацию');
        return;
      }

      const pos = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 30000,
        });
      });

      await api.post('/location/update', {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        familyId: selectedFamilyId,
      });
      await fetchMembers();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || err.message || 'Не удалось обновить местоположение');
    } finally {
      setUpdatingLocation(false);
    }
  };

  const createGeofence = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post(`/location/geofences/${selectedFamilyId}`, {
        ...geofenceForm,
        latitude: Number(geofenceForm.latitude),
        longitude: Number(geofenceForm.longitude),
        radius: Number(geofenceForm.radius),
      });
      setShowGeofenceModal(false);
      setGeofenceForm({ name: '', latitude: '', longitude: '', radius: '' });
      fetchGeofences();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Не удалось создать геозону');
    }
    finally { setSaving(false); }
  };

  const deleteGeofence = async (id) => {
    if (!window.confirm('Удалить геозону?')) return;
    try {
      await api.delete(`/location/geofences/${id}`);
      fetchGeofences();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Не удалось удалить геозону');
    }
  };

  const deleteMyLocation = async () => {
    if (!window.confirm('Удалить все сохранённые точки вашей геолокации из базы?')) return;
    setUpdatingLocation(true);
    try {
      await api.delete('/location/me');
      await fetchMembers();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Не удалось удалить геолокацию');
    } finally {
      setUpdatingLocation(false);
    }
  };

  if (loading) return <Loading text="Загрузка геолокации..." />;

  if (families.length === 0) {
    return (
      <>
        <Head><title>Геолокация — HomeSpace</title></Head>
        <EmptyState
          icon={MapPin}
          title="Сначала создайте семью"
          description="Геолокация работает для участников семейной группы: можно обновлять позицию и настраивать геозоны."
          action={<Link href="/family"><Button>Перейти к семьям</Button></Link>}
        />
      </>
    );
  }

  return (
    <>
      <Head><title>Геолокация — HomeSpace</title></Head>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Геолокация</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Отслеживание местоположения</p>
          </div>
          <div className="flex gap-2">
            <select
              value={selectedFamilyId}
              onChange={(e) => setSelectedFamilyId(e.target.value)}
              className="rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {families.map((family) => (
                <option key={family.id} value={family.id}>{family.name}</option>
              ))}
            </select>
            <Button variant="secondary" onClick={() => setShowGeofenceModal(true)} icon={<Crosshair className="w-4 h-4" />}>
              Геозона
            </Button>
            <Button onClick={updateLocation} loading={updatingLocation} icon={<Navigation className="w-4 h-4" />}>
              Обновить местоположение
            </Button>
            <Button variant="danger" onClick={deleteMyLocation} disabled={updatingLocation} icon={<Trash2 className="w-4 h-4" />}>
              Удалить мою геолокацию
            </Button>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        <FamilyMap members={members} geofences={geofences} />

        {/* Members Location */}
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Users className="w-5 h-5" /> Участники
          </h3>
          {members.length === 0 ? (
            <EmptyState icon={Users} title="Нет участников" />
          ) : (
            <div className="space-y-3">
              {members.map((m) => (
                <div key={m.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-sm font-medium">
                        {(m.fullName || m.full_name || 'U').charAt(0)}
                      </div>
                      <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white dark:border-gray-800 rounded-full" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white text-sm">{m.fullName || m.full_name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{m.familyName}</p>
                    </div>
                  </div>
                  {m.location ? (
                    <div className="text-right">
                      <p className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {Number(m.location.latitude).toFixed(4)}, {Number(m.location.longitude).toFixed(4)}
                      </p>
                      <p className="text-xs text-gray-400 flex items-center gap-1 justify-end">
                        <Clock className="w-3 h-3" />
                        {new Date(m.location.updatedAt || m.location.updated_at).toLocaleString('ru-RU')}
                      </p>
                      {m.location.isEncrypted && (
                        <p className="text-xs text-emerald-500 flex items-center gap-1 justify-end mt-1">
                          <Shield className="w-3 h-3" />
                          хранится зашифрованно
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Badge variant="default" size="sm">Нет данных</Badge>
                      {String(m.id) === String(user?.id) && (
                        <Badge variant="success" size="sm">можно обновить</Badge>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Geofences */}
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Crosshair className="w-5 h-5" /> Геозоны
          </h3>
          {geofences.length === 0 ? (
            <EmptyState icon={Circle} title="Нет геозон" description="Создайте геозону для отслеживания" />
          ) : (
            <div className="space-y-3">
              {geofences.map((g) => (
                <div key={g.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                      <Circle className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white text-sm">{g.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {Number(g.latitude)?.toFixed(4)}, {Number(g.longitude)?.toFixed(4)} • {g.radius || g.radius_meters}м
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteGeofence(g.id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Geofence Modal */}
        <Modal isOpen={showGeofenceModal} onClose={() => setShowGeofenceModal(false)} title="Создать геозону">
          <form onSubmit={createGeofence} className="space-y-4">
            <Input label="Название" value={geofenceForm.name} onChange={(e) => setGeofenceForm({ ...geofenceForm, name: e.target.value })} placeholder="Дом, Школа..." required />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Широта" type="number" step="any" value={geofenceForm.latitude} onChange={(e) => setGeofenceForm({ ...geofenceForm, latitude: e.target.value })} placeholder="55.7558" required />
              <Input label="Долгота" type="number" step="any" value={geofenceForm.longitude} onChange={(e) => setGeofenceForm({ ...geofenceForm, longitude: e.target.value })} placeholder="37.6173" required />
            </div>
            <Input label="Радиус (м)" type="number" value={geofenceForm.radius} onChange={(e) => setGeofenceForm({ ...geofenceForm, radius: e.target.value })} placeholder="500" required />
            <Button type="submit" variant="primary" loading={saving} className="w-full" icon={<Plus className="w-4 h-4" />}>Создать</Button>
          </form>
        </Modal>
      </div>
    </>
  );
}
