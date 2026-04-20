import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import Header from '../components/Header';
import Card from '../components/Card';
import Button from '../components/Button';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { location as locationApi } from '../utils/api';
import { locationsDB } from '../db/database';
import * as Location from 'expo-location';
import { formatRelativeDate } from '../utils/helpers';

const LocationScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const [members, setMembers] = useState([]);
  const [geofences, setGeofences] = useState([]);
  const [myLocation, setMyLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingLocation, setUpdatingLocation] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [locationsRes, geofencesRes] = await Promise.all([
        locationApi.getFamilyLocations(),
        locationApi.getGeofences(),
      ]);
      setMembers(locationsRes.data.locations || locationsRes.data);
      setGeofences(geofencesRes.data.geofences || geofencesRes.data);
    } catch (err) {
      console.error('Ошибка загрузки местоположений:', err);
      const cached = await locationsDB.getAll();
      setMembers(cached);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const updateMyLocation = async () => {
    try {
      setUpdatingLocation(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Ошибка', 'Доступ к местоположению не разрешён');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      setMyLocation(loc.coords);
      await locationApi.updateLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        accuracy: loc.coords.accuracy,
      });
      Alert.alert('Успех', 'Местоположение обновлено');
      loadData();
    } catch (err) {
      Alert.alert('Ошибка', 'Не удалось обновить местоположение');
    } finally {
      setUpdatingLocation(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title="Местоположение"
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Члены семьи</Text>
            <Button
              title="Обновить"
              onPress={updateMyLocation}
              loading={updatingLocation}
              variant="ghost"
              size="small"
              icon="crosshairs-gps"
            />
          </View>

          {myLocation && (
            <View style={[styles.myLocationBadge, { backgroundColor: colors.success + '15' }]}>
              <Icon name="map-marker-check" size={16} color={colors.success} />
              <Text style={[styles.myLocationText, { color: colors.success }]}>
                Моё местоположение обновлено
              </Text>
            </View>
          )}

          {members.map((member) => (
            <View key={member.id} style={styles.memberLocation}>
              <View style={[styles.memberAvatar, { backgroundColor: colors.primary }]}>
                <Text style={styles.memberAvatarText}>
                  {member.user_name?.charAt(0).toUpperCase() || '?'}
                </Text>
              </View>
              <View style={styles.memberLocationInfo}>
                <Text style={[styles.memberName, { color: colors.text }]}>{member.user_name}</Text>
                <Text style={[styles.memberCoords, { color: colors.textSecondary }]}>
                  {member.latitude?.toFixed(4)}, {member.longitude?.toFixed(4)}
                </Text>
                <Text style={[styles.memberTime, { color: colors.textSecondary }]}>
                  {member.recorded_at ? formatRelativeDate(member.recorded_at) : 'Неизвестно'}
                </Text>
              </View>
              <Icon name="map-marker" size={24} color={colors.primary} />
            </View>
          ))}

          {members.length === 0 && (
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Нет данных о местоположении
            </Text>
          )}
        </Card>

        <Card style={styles.card}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Геозоны</Text>
          {geofences.map((geo) => (
            <View key={geo.id} style={[styles.geofenceItem, { backgroundColor: colors.surface }]}>
              <View style={[styles.geofenceIcon, { backgroundColor: colors.warning + '15' }]}>
                <Icon name="circle-slice-8" size={20} color={colors.warning} />
              </View>
              <View style={styles.geofenceInfo}>
                <Text style={[styles.geofenceName, { color: colors.text }]}>{geo.name}</Text>
                <Text style={[styles.geofenceRadius, { color: colors.textSecondary }]}>
                  Радиус: {geo.radius}м
                </Text>
              </View>
            </View>
          ))}
          {geofences.length === 0 && (
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Геозоны не настроены
            </Text>
          )}
        </Card>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  myLocationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  myLocationText: {
    fontSize: 13,
    fontWeight: '600',
  },
  memberLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  memberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  memberAvatarText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  memberLocationInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  memberCoords: {
    fontSize: 13,
    marginBottom: 1,
  },
  memberTime: {
    fontSize: 12,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 16,
  },
  geofenceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  geofenceIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  geofenceInfo: {
    flex: 1,
  },
  geofenceName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  geofenceRadius: {
    fontSize: 13,
  },
});

export default LocationScreen;
