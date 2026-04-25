import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import Button from '../components/Button';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import * as DocumentPicker from 'expo-document-picker';
import { chat as chatApi, files as filesApi } from '../utils/api';
import { formatRelativeDate, guessMimeType } from '../utils/helpers';
import { getResponseData, toArrayData } from '../utils/syncService';

const ChatScreen = ({ route, navigation }) => {
  const initialFamilyId = route.params?.familyId || null;
  const { colors } = useTheme();
  const { user } = useAuth();
  const [families, setFamilies] = useState([]);
  const [selectedFamily, setSelectedFamily] = useState(initialFamilyId);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const flatListRef = useRef(null);

  useEffect(() => {
    loadFamilies();
  }, []);

  useEffect(() => {
    if (!selectedFamily) {
      return undefined;
    }

    loadMessages();
    const interval = setInterval(loadMessages, 10000);
    return () => clearInterval(interval);
  }, [selectedFamily]);

  const loadFamilies = async () => {
    try {
      const response = await chatApi.getFamilies();
      const data = toArrayData(response);
      setFamilies(data);
      if (!selectedFamily && data.length > 0) {
        setSelectedFamily(data[0].id);
      }
    } catch (err) {
      console.error('Ошибка загрузки семей для чата:', err);
    }
  };

  const loadMessages = async () => {
    if (!selectedFamily) {
      return;
    }

    try {
      const response = await chatApi.getMessages(selectedFamily);
      setMessages(toArrayData(response));
    } catch (err) {
      console.error('Ошибка загрузки сообщений:', err);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim()) {
      return;
    }

    try {
      setSending(true);
      await chatApi.sendMessage({ familyId: selectedFamily, message: inputText.trim() });
      setInputText('');
      await loadMessages();
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 250);
    } catch (err) {
      Alert.alert('Ошибка', 'Не удалось отправить сообщение');
    } finally {
      setSending(false);
    }
  };

  const pickAttachment = async () => {
    if (!selectedFamily) {
      return;
    }

    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (!result.assets?.[0]) {
        return;
      }

      const asset = result.assets[0];
      const mimeType = guessMimeType(asset.name, asset.mimeType);
      const fileType = mimeType.startsWith('image/') ? 'image' : 'document';
      const formData = new FormData();
      const attachmentName = asset.name || 'attachment';
      formData.append('file', {
        uri: asset.uri,
        name: attachmentName,
        type: mimeType,
      });
      formData.append('file_name', attachmentName);
      formData.append('familyId', selectedFamily);
      formData.append('file_type', fileType);

      setUploadingAttachment(true);
      const uploadResponse = await filesApi.upload(formData);
      const uploadedFile = getResponseData(uploadResponse);
      const attachmentUrl = uploadedFile?.file_path || uploadedFile?.filePath;

      await chatApi.sendMessage({
        familyId: selectedFamily,
        message: inputText.trim() || `Файл: ${uploadedFile?.file_name || uploadedFile?.fileName || attachmentName}`,
        attachmentUrl,
      });

      setInputText('');
      await loadMessages();
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 250);
    } catch (err) {
      Alert.alert(
        'Ошибка',
        err.response?.data?.message || err.response?.data?.error || 'Не удалось прикрепить файл'
      );
    } finally {
      setUploadingAttachment(false);
    }
  };

  const renderMessage = ({ item, index }) => {
    const senderId = item.senderId || item.sender_id;
    const previousSenderId = messages[index - 1]?.senderId || messages[index - 1]?.sender_id;
    const isMine = String(senderId) === String(user?.id);
    const showAvatar = index === 0 || previousSenderId !== senderId;

    return (
      <View style={[styles.messageRow, isMine ? styles.myMessageRow : styles.theirMessageRow]}>
        {!isMine && showAvatar ? (
          <View style={[styles.avatar, { backgroundColor: colors.accent }]}>
            <Text style={styles.avatarText}>
              {(item.senderName || item.sender_name || item.full_name)?.charAt(0).toUpperCase() || '?'}
            </Text>
          </View>
        ) : null}
        {!isMine && !showAvatar ? <View style={styles.avatarSpacer} /> : null}
        <View
          style={[
            styles.messageBubble,
            isMine
              ? styles.myBubble
              : [styles.theirBubble, { backgroundColor: colors.surface }],
          ]}
        >
          {!isMine && showAvatar ? (
            <Text style={[styles.senderName, { color: colors.accent }]}>
              {item.senderName || item.sender_name || item.full_name}
            </Text>
          ) : null}
          <Text style={[styles.messageText, isMine ? { color: '#ffffff' } : { color: colors.text }]}>
            {item.content}
          </Text>
          <Text
            style={[
              styles.messageTime,
              isMine ? { color: 'rgba(255,255,255,0.7)' } : { color: colors.textSecondary },
            ]}
          >
            {formatRelativeDate(item.createdAt || item.created_at)}
          </Text>
        </View>
      </View>
    );
  };

  const renderEmptyChat = () => (
    <View style={styles.emptyContainer}>
      <Icon name="message-text-outline" size={64} color={colors.textSecondary} />
      <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
        У вас пока нет семейного чата
      </Text>
      <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
        Сначала создайте семью или вступите в неё по коду.
      </Text>
      <Button
        title="Перейти к семьям"
        onPress={() => navigation.navigate('MainTabs', { screen: 'Family' })}
        icon="home-heart"
        style={styles.emptyButton}
      />
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <Header title="Семейный чат" onBack={() => navigation.goBack()} />

      {families.length === 0 ? (
        renderEmptyChat()
      ) : (
        <>
          {families.length > 1 ? (
            <View style={styles.familyTabs}>
              {families.map((family) => {
                const active = String(selectedFamily) === String(family.id);
                return (
                  <TouchableOpacity
                    key={family.id}
                    style={[
                      styles.familyTab,
                      { backgroundColor: active ? colors.primary : colors.surface },
                    ]}
                    onPress={() => setSelectedFamily(family.id)}
                  >
                    <Text style={{ color: active ? '#ffffff' : colors.text }}>{family.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : null}

          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderMessage}
            contentContainerStyle={styles.messagesList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            ListEmptyComponent={(
              <View style={styles.emptyContainer}>
                <Icon name="message-text-outline" size={64} color={colors.textSecondary} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  Сообщений пока нет
                </Text>
                <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
                  Начните разговор с семьёй
                </Text>
              </View>
            )}
          />

          <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.attachButton, { backgroundColor: colors.background, borderColor: colors.border }]}
              onPress={pickAttachment}
              disabled={uploadingAttachment || !selectedFamily}
              activeOpacity={0.7}
            >
              <Icon
                name={uploadingAttachment ? 'loading' : 'paperclip'}
                size={20}
                color={uploadingAttachment ? colors.primary : colors.textSecondary}
              />
            </TouchableOpacity>
            <TextInput
              style={[styles.input, { color: colors.text, backgroundColor: colors.background }]}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Напишите сообщение..."
              placeholderTextColor={colors.textSecondary}
              multiline
              maxLength={1000}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                { backgroundColor: inputText.trim() && selectedFamily ? colors.primary : colors.border },
              ]}
              onPress={sendMessage}
              disabled={!inputText.trim() || sending || uploadingAttachment || !selectedFamily}
              activeOpacity={0.7}
            >
              <Icon name="send" size={20} color={inputText.trim() ? '#ffffff' : colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </>
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  familyTabs: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  familyTab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
  },
  messagesList: {
    padding: 16,
    paddingBottom: 8,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  myMessageRow: {
    justifyContent: 'flex-end',
  },
  theirMessageRow: {
    justifyContent: 'flex-start',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginBottom: 4,
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  avatarSpacer: {
    width: 40,
  },
  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  myBubble: {
    backgroundColor: '#2563eb',
    borderBottomRightRadius: 6,
  },
  theirBubble: {
    borderBottomLeftRadius: 6,
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  messageTime: {
    fontSize: 10,
    marginTop: 4,
    textAlign: 'right',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    gap: 8,
  },
  attachButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginBottom: 2,
  },
  input: {
    flex: 1,
    fontSize: 15,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 24,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 12,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },
  emptyButton: {
    marginTop: 18,
  },
});

export default ChatScreen;
