import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { Search, Plus, Phone, Mail, ChevronRight, Users } from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';

interface Student {
  id: string;
  name: string;
  class: string;
  parentName: string;
  parentPhone: string;
  email: string;
  status: 'active' | 'inactive';
  attendance: number;
}

export default function StudentsListScreen() {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    const mockStudents: Student[] = [
      { id: '1', name: 'Moussa Diop', class: '6ème A', parentName: 'Ibrahima Diop', parentPhone: '+221 77 123 45 67', email: 'moussa@school.com', status: 'active', attendance: 95 },
      { id: '2', name: 'Aminata Sow', class: '6ème A', parentName: 'Fatou Sow', parentPhone: '+221 78 234 56 78', email: 'aminata@school.com', status: 'active', attendance: 92 },
      { id: '3', name: 'Ousmane Ba', class: '5ème B', parentName: 'Modou Ba', parentPhone: '+221 76 345 67 89', email: 'ousmane@school.com', status: 'active', attendance: 88 },
      { id: '4', name: 'Fatou Ndiaye', class: '5ème B', parentName: 'Awa Ndiaye', parentPhone: '+221 70 456 78 90', email: 'fatou@school.com', status: 'active', attendance: 97 },
      { id: '5', name: 'Cheikh Gueye', class: '4ème A', parentName: 'Mamadou Gueye', parentPhone: '+221 77 567 89 01', email: 'cheikh@school.com', status: 'inactive', attendance: 75 },
    ];
    setStudents(mockStudents);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStudents();
    setRefreshing(false);
  };

  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.class.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const classes = [...new Set(students.map(s => s.class))];

  const renderStudent = ({ item }: { item: Student }) => (
    <TouchableOpacity
      style={styles.studentItem}
      onPress={() => {}}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
      </View>
      <View style={styles.studentInfo}>
        <Text style={styles.studentName}>{item.name}</Text>
        <View style={styles.studentMeta}>
          <Badge variant="info">{item.class}</Badge>
          <Text style={styles.attendanceText}>
            {item.attendance}% {t('students.attendance')}
          </Text>
        </View>
      </View>
      <View style={styles.studentRight}>
        <Badge variant={item.status === 'active' ? 'success' : 'default'}>
          {t(`status.${item.status}`)}
        </Badge>
      </View>
      <ChevronRight size={20} color="#9CA3AF" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInput}>
          <Search size={20} color="#9CA3AF" />
          <TextInput
            style={styles.searchText}
            placeholder={t('students.search')}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9CA3AF"
          />
        </View>
      </View>

      {/* Class Filter */}
      <View style={styles.classFilter}>
        <TouchableOpacity
          style={[styles.classTab, !selectedClass && styles.classTabActive]}
          onPress={() => setSelectedClass(null)}
        >
          <Text style={[styles.classTabText, !selectedClass && styles.classTabTextActive]}>
            {t('students.allClasses')}
          </Text>
        </TouchableOpacity>
        {classes.map(cls => (
          <TouchableOpacity
            key={cls}
            style={[styles.classTab, selectedClass === cls && styles.classTabActive]}
            onPress={() => setSelectedClass(cls)}
          >
            <Text style={[styles.classTabText, selectedClass === cls && styles.classTabTextActive]}>
              {cls}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <Card style={styles.statCard}>
          <Text style={styles.statValue}>{students.length}</Text>
          <Text style={styles.statLabel}>{t('students.totalStudents')}</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={[styles.statValue, { color: '#10B981' }]}>
            {students.filter(s => s.status === 'active').length}
          </Text>
          <Text style={styles.statLabel}>{t('students.active')}</Text>
        </Card>
      </View>

      {/* List */}
      <FlatList
        data={selectedClass 
          ? filteredStudents.filter(s => s.class === selectedClass)
          : filteredStudents
        }
        renderItem={renderStudent}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <EmptyState
            icon={<Users size={48} color="#9CA3AF" />}
            title={t('students.noStudents')}
            message={t('students.noStudentsDesc')}
          />
        }
      />

      {/* Add Button */}
      <TouchableOpacity style={styles.fabButton}>
        <Plus size={24} color="#FFFFFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  searchContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  searchInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  searchText: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    paddingVertical: 12,
  },
  classFilter: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  classTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  classTabActive: {
    backgroundColor: '#8B5CF6',
  },
  classTabText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  classTabTextActive: {
    color: '#FFFFFF',
  },
  statsRow: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  listContent: {
    padding: 16,
    paddingBottom: 80,
  },
  studentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  studentInfo: {
    flex: 1,
    marginLeft: 12,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  studentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  attendanceText: {
    fontSize: 12,
    color: '#6B7280',
  },
  studentRight: {
    marginRight: 8,
  },
  fabButton: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
});
