import { useState, useEffect } from 'react';
import Head from 'next/head';
import { Upload, FileText, Image, File, Trash2, Download, Eye, Grid, List, Filter, X, Link as LinkIcon } from 'lucide-react';
import api from '../utils/api';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import Loading from '../components/ui/Loading';
import Badge from '../components/ui/Badge';

const fileTypeIcons = {
  receipt: FileText,
  document: File,
  image: Image,
  other: File,
};

const fileTypeColors = {
  receipt: 'info',
  document: 'primary',
  image: 'success',
  other: 'default',
};

export default function FilesPage() {
  const [files, setFiles] = useState([]);
  const [families, setFamilies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid');
  const [typeFilter, setTypeFilter] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadType, setUploadType] = useState('document');
  const [uploading, setUploading] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);

  useEffect(() => {
    fetchFamilies();
  }, []);

  useEffect(() => {
    if (families.length > 0) fetchFiles();
  }, [typeFilter, families]);

  const fetchFamilies = async () => {
    try {
      const res = await api.get('/families');
      setFamilies(res.data.data);
    } catch (err) { console.error(err); }
  };

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const params = {};
      if (families[0]?.id) params.familyId = families[0].id;
      if (typeFilter) params.file_type = typeFilter;
      const res = await api.get('/files', { params });
      setFiles(res.data.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', uploadFile);
    formData.append('file_type', uploadType);
    if (families[0]?.id) formData.append('familyId', families[0].id);
    try {
      await api.post('/files/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setShowUploadModal(false);
      setUploadFile(null);
      setUploadType('document');
      fetchFiles();
    } catch (err) { console.error(err); }
    finally { setUploading(false); }
  };

  const deleteFile = async (id) => {
    if (!window.confirm('Удалить файл?')) return;
    try {
      await api.delete(`/files/${id}`);
      fetchFiles();
    } catch (err) { console.error(err); }
  };

  const downloadFile = (file) => {
    if (file.file_path) window.open(file.file_path, '_blank');
  };

  if (loading) return <Loading text="Загрузка файлов..." />;

  return (
    <>
      <Head><title>Файлы — HomeSpace</title></Head>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Файлы</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Документы, чеки и изображения</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white dark:bg-gray-600 shadow-sm' : ''}`}
              >
                <Grid className="w-4 h-4 text-gray-600 dark:text-gray-300" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white dark:bg-gray-600 shadow-sm' : ''}`}
              >
                <List className="w-4 h-4 text-gray-600 dark:text-gray-300" />
              </button>
            </div>
            <Select
              options={[
                { value: 'receipt', label: 'Чеки' },
                { value: 'document', label: 'Документы' },
                { value: 'image', label: 'Изображения' },
                { value: 'other', label: 'Другое' },
              ]}
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              placeholder="Тип"
              className="w-auto"
            />
            <Button onClick={() => setShowUploadModal(true)} icon={<Upload className="w-4 h-4" />}>
              Загрузить
            </Button>
          </div>
        </div>

        {files.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="Нет файлов"
            description="Загрузите первый файл"
            action={<Button onClick={() => setShowUploadModal(true)} icon={<Upload className="w-4 h-4" />}>Загрузить файл</Button>}
          />
        ) : viewMode === 'grid' ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {files.map((file) => {
              const Icon = fileTypeIcons[file.file_type] || File;
              return (
                <Card key={file.id} hover className="group">
                  <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-3 mx-auto">
                    <Icon className="w-6 h-6 text-gray-500 dark:text-gray-400" />
                  </div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white text-center truncate">{file.file_name}</p>
                  <div className="flex items-center justify-center mt-2">
                    <Badge variant={fileTypeColors[file.file_type] || 'default'} size="sm">
                      {file.file_type}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-1">
                    {new Date(file.created_at).toLocaleDateString('ru-RU')}
                  </p>
                  <div className="flex items-center justify-center gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setPreviewFile(file)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-500" title="Просмотр">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button onClick={() => downloadFile(file)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-500" title="Скачать">
                      <Download className="w-4 h-4" />
                    </button>
                    <button onClick={() => deleteFile(file.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500" title="Удалить">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="overflow-hidden">
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {files.map((file) => {
                const Icon = fileTypeIcons[file.file_type] || File;
                return (
                  <div key={file.id} className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors group">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{file.file_name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(file.created_at).toLocaleDateString('ru-RU')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={fileTypeColors[file.file_type] || 'default'} size="sm">{file.file_type}</Badge>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setPreviewFile(file)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-500">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => downloadFile(file)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-500">
                          <Download className="w-4 h-4" />
                        </button>
                        <button onClick={() => deleteFile(file.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* Upload Modal */}
        <Modal isOpen={showUploadModal} onClose={() => setShowUploadModal(false)} title="Загрузить файл">
          <form onSubmit={handleUpload} className="space-y-4">
            <div className="border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-xl p-8 text-center hover:border-indigo-400 transition-colors">
              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-3" />
              {uploadFile ? (
                <p className="text-sm text-gray-700 dark:text-gray-300">{uploadFile.name}</p>
              ) : (
                <label className="cursor-pointer">
                  <span className="text-sm text-indigo-600 dark:text-indigo-400 font-medium hover:underline">Выберите файл</span>
                  <input
                    type="file"
                    onChange={(e) => setUploadFile(e.target.files[0])}
                    className="hidden"
                    required
                  />
                </label>
              )}
            </div>
            <Select
              label="Тип файла"
              value={uploadType}
              onChange={(e) => setUploadType(e.target.value)}
              options={[
                { value: 'receipt', label: 'Чек' },
                { value: 'document', label: 'Документ' },
                { value: 'image', label: 'Изображение' },
                { value: 'other', label: 'Другое' },
              ]}
            />
            <Button type="submit" variant="primary" loading={uploading} className="w-full" icon={<Upload className="w-4 h-4" />}>
              Загрузить
            </Button>
          </form>
        </Modal>

        {/* Preview Modal */}
        <Modal isOpen={!!previewFile} onClose={() => setPreviewFile(null)} title={previewFile?.file_name || 'Просмотр'} size="lg">
          {previewFile && (
            <div className="text-center">
              {previewFile.file_type === 'image' && previewFile.file_path ? (
                <img src={previewFile.file_path} alt="" className="max-w-full rounded-xl" />
              ) : (
                <div className="py-12">
                  <File className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">Предпросмотр недоступен</p>
                  <Button variant="primary" className="mt-4" onClick={() => downloadFile(previewFile)} icon={<Download className="w-4 h-4" />}>
                    Скачать
                  </Button>
                </div>
              )}
            </div>
          )}
        </Modal>
      </div>
    </>
  );
}
