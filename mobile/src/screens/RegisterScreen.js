import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import Input from '../components/Input';
import Button from '../components/Button';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { validateEmail, validatePassword } from '../utils/helpers';

const RegisterScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const { register, loading } = useAuth();
  const insets = useSafeAreaInsets();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);

  const handleRegister = async () => {
    if (!fullName.trim()) {
      Alert.alert('Ошибка', 'Введите ваше имя');
      return;
    }
    if (!validateEmail(email)) {
      Alert.alert('Ошибка', 'Введите корректный адрес электронной почты');
      return;
    }
    if (!validatePassword(password)) {
      Alert.alert('Ошибка', 'Пароль должен содержать минимум 6 символов');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Ошибка', 'Пароли не совпадают');
      return;
    }
    if (!agreeTerms) {
      Alert.alert('Ошибка', 'Примите условия использования');
      return;
    }
    try {
      await register(fullName.trim(), email.trim(), password);
    } catch (err) {
      Alert.alert('Ошибка регистрации', err.message);
    }
  };

  const isDark = colors.isDark;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: isDark ? '#0f172a' : '#f8fafc' }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient
        colors={isDark ? ['#1e1b4b', '#312e81', '#1e293b'] : ['#2563eb', '#7c3aed', '#2563eb']}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={[styles.header, { paddingTop: insets.top + 30 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-left" size={24} color="#ffffff" />
          </TouchableOpacity>
          <View style={styles.logoContainer}>
            <Icon name="account-plus" size={48} color="#ffffff" />
          </View>
          <Text style={styles.headerTitle}>Создать аккаунт</Text>
        </View>
      </LinearGradient>

      <View style={[styles.formContainer, { backgroundColor: colors.surface }]}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Input
            label="Полное имя"
            value={fullName}
            onChangeText={setFullName}
            placeholder="Иван Иванов"
            icon="account"
            autoCapitalize="words"
          />

          <Input
            label="Электронная почта"
            value={email}
            onChangeText={setEmail}
            placeholder="example@mail.ru"
            icon="email"
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Input
            label="Пароль"
            value={password}
            onChangeText={setPassword}
            placeholder="Минимум 6 символов"
            icon="lock"
            secureTextEntry
          />

          <Input
            label="Подтвердите пароль"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Повторите пароль"
            icon="lock-check"
            secureTextEntry
          />

          <TouchableOpacity
            style={styles.termsContainer}
            onPress={() => setAgreeTerms(!agreeTerms)}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, { borderColor: agreeTerms ? colors.primary : colors.border, backgroundColor: agreeTerms ? colors.primary : 'transparent' }]}>
              {agreeTerms && <Icon name="check" size={16} color="#ffffff" />}
            </View>
            <Text style={[styles.termsText, { color: colors.text }]}>
              Я принимаю{' '}
              <Text style={{ color: colors.primary, fontWeight: '500' }}>условия использования</Text>
              {' '}и{' '}
              <Text style={{ color: colors.primary, fontWeight: '500' }}>политику конфиденциальности</Text>
            </Text>
          </TouchableOpacity>

          <Button
            title="Зарегистрироваться"
            onPress={handleRegister}
            loading={loading}
            fullWidth
            size="large"
            style={styles.registerButton}
          />

          <View style={styles.loginRow}>
            <Text style={[styles.loginText, { color: colors.textSecondary }]}>
              Уже есть аккаунт?
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={[styles.loginLink, { color: colors.primary }]}>Войти</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    paddingBottom: 32,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  header: {
    paddingHorizontal: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    alignSelf: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
  },
  formContainer: {
    flex: 1,
    marginTop: -24,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
  },
  scrollContent: {
    padding: 24,
    paddingTop: 28,
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
    gap: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  termsText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  registerButton: {
    marginTop: 4,
    marginBottom: 16,
  },
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  loginText: {
    fontSize: 14,
  },
  loginLink: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default RegisterScreen;
