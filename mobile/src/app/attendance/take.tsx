import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge, AttendanceStatusBadge } from '../../components/ui/Badge';
import { Loading } from '../../components/ui/Loading';
import { useOffline } from '../../hooks/useOffline';

interface Student {
  id: string;
  name: string;
  studentId: string;
  avatar?: string;
}

type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

const MOCK_STUDENTS: Student[] = [
  { id: '1', name: 'Amadou Diallo', studentId: 'STD001' },
  { id: '2', name: 'Fatou Camara', studentId: 'STD002' },
  { id: '3', name: 'Moussa Keita', studentId: 'STD003' },
  { id: '4', name: 'Aissata Traoré', studentId: 'STD004' },
  { id: '5', name: 'Ibrahim Sylla', studentId: 'STD005' },
  { id: '6', name: 'Mariama Koné', studentId: 'STD006' },
  { id: '7', name: 'Oumar Sangaré', studentId: 'STD007' },
  { id: '8', name: 'Saran Coulibaly', studentId: 'STD008' },
  { id: '9', name: 'Cheick Diarra', studentId: 'STD009' },
  { id: '10', name: 'Kadia Touré', studentId: 'STD010' },
];

export default function TakeAttendanceScreen() {
  const { isOffline } = useOffline();
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const className = 'CM1 A';
  const currentDate = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  useEffect(() => {
    // Simulate loading students
    setTimeout(() => {
      setStudents(MOCK_STUDENTS);
      // Initialize all as present
      const initialAttendance: Record<string, AttendanceStatus> = {};
      MOCK_STUDENTS.forEach(s => {
        initialAttendance[s.id] = 'present';
      });
      setAttendance(initialAttendance);
      setLoading(false);
    }, 1000);
  }, []);

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: status,
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    // Simulate saving
    setTimeout(() => {
      setSaving(false);
      router.back();
    }, 1500);
  };

  const stats = {
    present: Object.values(attendance).filter(s => s === 'present').length,
    absent: Object.values(attendance).filter(s => s === 'absent').length,
    late: Object.values(attendance).filter(s => s === 'late').length,
    excused: Object.values(attendance).filter(s => s === 'excused').length,
  };

  const renderStudent = ({ item }: { item: Student }) => {
    const status = attendance[item.id];
    
    return (
      <Card style={styles.studentCard}>
        <View style={styles.studentRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {item.name.split(' ').map(n => n[0]).join('')}
            </Text>
          </View>
          <View style={styles.studentInfo}>
            <Text style={styles.studentName}>{item.name}</Text>
            <Text style={styles.studentId}>{item.studentId}</Text>
          </View>
        </View>
        
        <View style={styles.statusButtons}>
          <TouchableOpacity
            style={[
              styles.statusButton,
              status === 'present' && styles.statusPresent,
            ]}
            onPress={() => handleStatusChange(item.id, 'present')}
          >
            <Ionicons
              name="checkmark-circle"
              size={16}
              color={status === 'present' ? '#ffffff' : '#16a34a'}
            />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.statusButton,
              status === 'absent' && styles.statusAbsent,
            ]}
            onPress={() => handleStatusChange(item.id, 'absent')}
          >
            <Ionicons
              name="close-circle"
              size={16}
              color={status === 'absent' ? '#ffffff' : '#dc2626'}
            />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.statusButton,
              status === 'late' && styles.statusLate,
            ]}
            onPress={() => handleStatusChange(item.id, 'late')}
          >
            <Ionicons
              name="time"
              size={16}
              color={status === 'late' ? '#ffffff' : '#d97706'}
            />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.statusButton,
              status === 'excused' && styles.statusExcused,
            ]}
            onPress={() => handleStatusChange(item.id, 'excused')}
          >
            <Ionicons
              name="document-text"
              size={16}
              color={status === 'excused' ? '#ffffff' : '#0284c7'}
            />
          </TouchableOpacity>
        </View>
      </Card>
    );
  };

  if (loading) {
    return <Loading fullScreen message="Chargement des élèves..." />;
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.className}>{className}</Text>
          <Text style={styles.date}>{currentDate}</Text>
        </View>
        <View style={{ width: 24 }} />
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <View style={[styles.statDot, { backgroundColor: '#16a34a' }]} />
          <Text style={styles.statValue}>{stats.present}</Text>
          <Text style={styles.statLabel}>Présents</Text>
        </View>
        <View style={styles.statItem}>
          <View style={[styles.statDot, { backgroundColor: '#dc2626' }]} />
          <Text style={styles.statValue}>{stats.absent}</Text>
          <Text style={styles.statLabel}>Absents</Text>
        </View>
        <View style={styles.statItem}>
          <View style={[styles.statDot, { backgroundColor: '#d97706' }]} />
          <Text style={styles.statValue}>{stats.late}</Text>
          <Text style={styles.statLabel}>Retards</Text>
        </View>
        <View style={styles.statItem}>
          <View style={[styles.statDot, { backgroundColor: '#0284c7' }]} />
          <Text style={styles.statValue}>{stats.excused}</Text>
          <Text style={styles.statLabel}>Excusés</Text>
        </View>
      </View>

      {/* Student List */}
      <FlatList
        data={students}
        renderItem={renderStudent}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          isOffline ? (
            <View style={styles.offlineBanner}>
              <Ionicons name="cloud-offline" size={16} color="#f59e0b" />
              <Text style={styles.offlineText}>Mode hors ligne actif</Text>
            </View>
          ) : null
        }
      />

      {/* Save Button */}
      <View style={styles.footer}>
        <Button
          title="Enregistrer les présences"
          onPress={handleSave}
          loading={saving}
          fullWidth
          size="lg"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  headerCenter: {
    alignItems: 'center',
  },
  className: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  date: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  statLabel: {
    fontSize: 10,
    color: '#6b7280',
    marginTop: 2,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  studentCard: {
    marginBottom: 8,
  },
  studentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f3ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8b5cf6',
  },
  studentInfo: {
    marginLeft: 12,
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  studentId: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  statusButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statusButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  statusPresent: {
    backgroundColor: '#16a34a',
    borderColor: '#16a34a',
  },
  statusAbsent: {
    backgroundColor: '#dc2626',
    borderColor: '#dc2626',
  },
  statusLate: {
    backgroundColor: '#d97706',
    borderColor: '#d97706',
  },
  statusExcused: {
    backgroundColor: '#0284c7',
    borderColor: '#0284c7',
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef3c7',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  offlineText: {
    fontSize: 12,
    color: '#92400e',
    marginLeft: 6,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
});
