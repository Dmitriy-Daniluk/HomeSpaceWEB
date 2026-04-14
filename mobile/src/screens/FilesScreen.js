import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Image,
  Platform,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import Header from '../components/Header';
import Card from '../components/Card';
import BottomSheetModal from '../components/Modal';
import EmptyState from '../components/EmptyState';
import Button from '../components/Button';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { files as filesApi } from '../utils/api';
import { FILE_TYPES, FILE_TYPE_LABELS } from '../utils/constants';
import { formatRelativeDate } from '../utils/helpers';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';

const FilesScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState('list');
  const [filterType, setFilterType] = useState('all');
  const [showUploadModal, setShowUploadModal] = useState(false);

  useEffect(() => {
    loadFiles();
  }, [filterType]);

  const loadFiles = async () => {
    try {
      setLoading(true);
      const params = filterType !== 'all' ? { type: filterType } : {};
      const response = await filesApi.getAll(params);
      setFiles(response.data.files || response.data);
    } catch (err) {
      console.error('Ошибка загрузки файлов:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadFiles();
  }, [filterType]);

  const uploadImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: false,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      try {
        const formData = new FormData();
        formData.append('file', {
          uri: result.assets[0].uri,
          name: result.assets[0].fileName || 'file.jpg',
          type: result.assets[0].mimeType || 'image/jpeg',
        });
        formData.append('file_type', 'image');
        await filesApi.upload(formData);
        setShowUploadModal(false);
        loadFiles();
      } catch (err) {
        Alert.alert('Ошибка', 'Не удалось загрузить файл');
      }
    }
  };

  const uploadDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({});
    if (result.assets && result.assets[0]) {
      try {
        const formData = new FormData();
        formData.append('file', {
          uri: result.assets[0].uri,
          name: result.assets[0].name,
          type: result.assets[0].mimeType || 'application/octet-stream',
        });
        formData.append('file_type', 'document');
        await filesApi.upload(formData);
        setShowUploadModal(false);
        loadFiles();
      } catch (err) {
        Alert.alert('Ошибка', 'Не удалось загрузить файл');
      }
    }
  };

  const handleDelete = (fileId) => {
    Alert.alert('Удалить файл', 'Вы уверены?', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: async () => {
          try {
            await filesApi.delete(fileId);
            setFiles((prev) => prev.filter((f) => f.id !== fileId));
          } catch (err) {
            Alert.alert('Ошибка', 'Не удалось удалить файл');
          }
        },
      },
    ]);
  };

  const getFileIcon = (fileType) => {
    switch (fileType) {
      case 'image': return 'image';
      case 'receipt': return 'receipt';
      case 'document': return 'file-document';
      default: return 'file';
    }
  };

  const getFileColor = (fileType) => {
    switch (fileType) {
      case 'image': return colors.accent;
      case 'receipt': return colors.success;
      case 'document': return colors.primary;
      default: return colors.textSecondary;
    }
  };

  const filteredFiles = filterType === 'all'
    ? files
    : files.filter((f) => f.file_type === filterType);

  const renderListItem = ({ item }) => (
    <Card style={styles.fileCard}>
      <View style={styles.fileRow}>
        <View style={[styles.fileIconContainer, { backgroundColor: getFileColor(item.file_type) + '15' }]}>
          <Icon name={getFileIcon(item.file_type)} size={28} color={getFileColor(item.file_type)} />
        </View>
        <View style={styles.fileInfo}>
          <Text style={[styles.fileName, { color: colors.text }]} numberOfLines={1}>
            {item.file_name || 'Файл'}
          </Text>
          <View style={styles.fileMeta}>
            <Text style={[styles.fileType, { color: getFileColor(item.file_type) }]}>
              {FILE_TYPE_LABELS[item.file_type] || item.file_type}
            </Text>
            <Text style={[styles.fileDate, { color: colors.textSecondary }]}>
              {formatRelativeDate(item.created_at)}
            </Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.deleteButton}>
          <Icon name="delete" size={20} color={colors.danger} />
        </TouchableOpacity>
      </View>
    </Card>
  );

  const renderGridItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.gridItem, { backgroundColor: colors.card }]}
      activeOpacity={0.7}
      onLongPress={() => handleDelete(item.id)}
    >
      {item.file_type === 'image' && item.thumbnail_uri ? (
        <Image source={{ uri: item.thumbnail_uri }} style={styles.gridImage} />
      ) : (
        <View style={[styles.gridIconContainer, { backgroundColor: getFileColor(item.file_type) + '15' }]}>
          <Icon name={getFileIcon(item.file_type)} size={40} color={getFileColor(item.file_type)} />
        </View>
      )}
      <Text style={[styles.gridFileName, { color: colors.text }]} numberOfLines={2}>
        {item.file_name || 'Файл'}
      </Text>
      <Text style={[styles.gridFileType, { color: getFileColor(item.file_type) }]}>
        {FILE_TYPE_LABELS[item.file_type] || item.file_type}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title="Файлы"
        onBack={() => navigation.goBack()}
        rightIcon="upload"
        onRightPress={() => setShowUploadModal(true)}
      />

      <View style={styles.toolbar}>
        <View style={styles.filterRow}>
          {['all', ...FILE_TYPES].map((type) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.filterChip,
                {
                  backgroundColor: filterType === type ? colors.primary : colors.card,
                  borderColor: colors.border,
                  borderWidth: 1,
                },
              ]}
              onPress={() => setFilterType(type)}
            >
              <Text
                style={[
                  styles.filterText,
                  { color: filterType === type ? '#ffffff' : colors.textSecondary },
                ]}
              >
                {type === 'all' ? 'Все' : FILE_TYPE_LABELS[type] || type}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.viewToggle}>
          <TouchableOpacity
            style={[styles.viewButton, { backgroundColor: viewMode === 'list' ? colors.primary : colors.card }]}
            onPress={() => setViewMode('list')}
          >
            <Icon name="view-list" size={18} color={viewMode === 'list' ? '#ffffff' : colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewButton, { backgroundColor: viewMode === 'grid' ? colors.primary : colors.card }]}
            onPress={() => setViewMode('grid')}
          >
            <Icon name="view-grid" size={18} color={viewMode === 'grid' ? '#ffffff' : colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {filteredFiles.length === 0 && !loading ? (
        <EmptyState
          icon="folder-open"
          title="Файлов нет"
          description="Загрузите первый файл"
          actionTitle="Загрузить"
          onAction={() => setShowUploadModal(true)}
        />
      ) : viewMode === 'grid' ? (
        <FlatList
          data={filteredFiles}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderGridItem}
          numColumns={2}
          contentContainerStyle={styles.gridContent}
          columnWrapperStyle={styles.gridRow}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        />
      ) : (
        <FlatList
          data={filteredFiles}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderListItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        />
      )}

      <BottomSheetModal
        visible={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        title="Загрузить файл"
      >
        <Button
          title="Выбрать изображение"
          onPress={uploadImage}
          variant="outline"
          icon="image"
          fullWidth
          style={{ marginBottom: 12 }}
        />
        <Button
          title="Выбрать документ"
          onPress={uploadDocument}
          variant="outline"
          icon="file-document"
          fullWidth
        />
      </BottomSheetModal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  toolbar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 6,
    flex: 1,
    flexWrap: 'wrap',
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
  },
  viewToggle: {
    flexDirection: 'row',
    gap: 6,
    marginLeft: 8,
  },
  viewButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
  },
  fileCard: {
    marginBottom: 10,
    padding: 14,
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fileIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 3,
  },
  fileMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fileType: {
    fontSize: 12,
    fontWeight: '500',
  },
  fileDate: {
    fontSize: 11,
  },
  deleteButton: {
    padding: 8,
  },
  gridContent: {
    padding: 12,
  },
  gridRow: {
    justifyContent: 'space-between',
    gap: 12,
  },
  gridItem: {
    flex: 1,
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  gridImage: {
    width: '100%',
    height: 120,
    borderRadius: 10,
    marginBottom: 8,
  },
  gridIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  gridFileName: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 2,
  },
  gridFileType: {
    fontSize: 11,
    fontWeight: '500',
  },
});

export default FilesScreen;
