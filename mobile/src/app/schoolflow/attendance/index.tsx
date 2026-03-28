import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { 
  Check, 
  X, 
  Clock, 
  Save, 
  Users,
  CheckCircle,
  XCircle,
} from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

interface StudentAttendance {
  id: string;
  name: string;
  status: 'present' | 'absent' | 'late' | null;
}

export default function AttendanceScreen() {
  const { t } = useTranslation();
  const [selectedClass, setSelectedClass] = useState('6ème A');
  const [attendance, setAttendance] = useState<StudentAttendance[]>([]);
  const [saving, setSaving] = useState(false);

  const classes = ['6ème A', '6ème B', '5ème A', '5ème B', '4ème A', '4ème B'];

  useEffect(() => {
    loadStudents();
  }, [selectedClass]);

  const loadStudents = async () => {
    // Mock data based on selected class
    const mockStudents: StudentAttendance[] = [
      { id: '1', name: 'Moussa Diop', status: null },
      { id: '2', name: 'Aminata Sow', status: null },
      { id: '3', name: 'Ousmane Ba', status: null },
      { id: '4', name: 'Fatou Ndiaye', status: null },
      { id: '5', name: 'Cheikh Gueye', status: null },
      { id: '6', name: 'Mariama Fall', status: null },
      { id: '7', name: 'Ibrahima Sarr', status: null },
      { id: '8', name: 'Aissatou Mbaye', status: null },
    ];
    setAttendance(mockStudents);
  };

  const markAttendance = (studentId: string, status: 'present' | 'absent' | 'late') => {
    setAttendance(prev =>
      prev.map(student =>
        student.id === studentId
          ? { ...student, status: student.status === status ? null : status }
          : student
      )
    );
  };

  const markAllPresent = () => {
    setAttendance(prev =>
      prev.map(student => ({ ...student, status: 'present' }))
    );
  };

  const saveAttendance = async () => {
    const unmarked = attendance.filter(s => s.status === null);
    if (unmarked.length > 0) {
      Alert.alert(
        t('attendance.incomplete'),
        t('attendance.incompleteMessage', { count: unmarked.length }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('attendance.saveAnyway'), onPress: performSave }
        ]
      );
      return;
    }
    await performSave();
  };

  const performSave = async () => {
    setSaving(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      Alert.alert(t('common.success'), t('attendance.saved'), [
        { text: t('common.ok') }
      ]);
    } catch (error) {
      Alert.alert(t('common.error'), t('attendance.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const getStats = () => {
    const present = attendance.filter(s => s.status === 'present').length;
    const absent = attendance.filter(s => s.status === 'absent').length;
    const late = attendance.filter(s => s.status === 'late').length;
    const unmarked = attendance.filter(s => s.status === null).length;
    return { present, absent, late, unmarked, total: attendance.length };
  };

  const stats = getStats();

  const renderStudent = ({ item }: { item: StudentAttendance }) => (
    <View style={styles.studentRow}>
      <View style={styles.studentInfo}>
        <Text style={styles.studentName}>{item.name}</Text>
      </View>
      <View style={styles.attendanceButtons}>
        <TouchableOpacity
          style={[
            styles.attendanceBtn,
            item.status === 'present' && styles.presentBtn,
          ]}
          onPress={() => markAttendance(item.id, 'present')}
        >
          <Check 
            size={18} 
            color={item.status === 'present' ? '#FFFFFF' : '#10B981'} 
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.attendanceBtn,
            item.status === 'absent' && styles.absentBtn,
          ]}
          onPress={() => markAttendance(item.id, 'absent')}
        >
          <X 
            size={18} 
            color={item.status === 'absent' ? '#FFFFFF' : '#EF4444'} 
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.attendanceBtn,
            item.status === 'late' && styles.lateBtn,
          ]}
          onPress={() => markAttendance(item.id, 'late')}
        >
          <Clock 
            size={18} 
            color={item.status === 'late' ? '#FFFFFF' : '#F59E0B'} 
          />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Class Selector */}
      <View style={styles.classSelector}>
        <Text style={styles.classSelectorLabel}>{t('attendance.selectClass')}</Text>
        <FlatList
          horizontal
          data={classes}
          showsHorizontalScrollIndicator={false}
          keyExtractor={item => item}
          contentContainerStyle={styles.classList}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.classTab,
                selectedClass === item && styles.classTabActive,
              ]}
              onPress={() => setSelectedClass(item)}
            >
              <Text
                style={[
                  styles.classTabText,
                  selectedClass === item && styles.classTabTextActive,
                ]}
              >
                {item}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <CheckCircle size={20} color="#10B981" />
          <Text style={[styles.statValue, { color: '#10B981' }]}>{stats.present}</Text>
          <Text style={styles.statLabel}>{t('attendance.present')}</Text>
        </View>
        <View style={styles.statItem}>
          <XCircle size={20} color="#EF4444" />
          <Text style={[styles.statValue, { color: '#EF4444' }]}>{stats.absent}</Text>
          <Text style={styles.statLabel}>{t('attendance.absent')}</Text>
        </View>
        <View style={styles.statItem}>
          <Clock size={20} color="#F59E0B" />
          <Text style={[styles.statValue, { color: '#F59E0B' }]}>{stats.late}</Text>
          <Text style={styles.statLabel}>{t('attendance.late')}</Text>
        </View>
      </View>

      {/* Header Actions */}
      <View style={styles.headerActions}>
        <Text style={styles.studentsCount}>
          {attendance.length} {t('attendance.students')}
        </Text>
        <TouchableOpacity onPress={markAllPresent}>
          <Text style={styles.markAllText}>{t('attendance.markAllPresent')}</Text>
        </TouchableOpacity>
      </View>

      {/* Students List */}
      <FlatList
        data={attendance}
        renderItem={renderStudent}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <Text style={styles.listHeaderText}>{t('attendance.student')}</Text>
            <Text style={styles.listHeaderText}>{t('attendance.status')}</Text>
          </View>
        }
      />

      {/* Save Button */}
      <View style={styles.saveContainer}>
        <Button
          title={t('attendance.save')}
          onPress={saveAttendance}
          loading={saving}
          fullWidth
          leftIcon={<Save size={20} color="#FFFFFF" />}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  classSelector: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  classSelectorLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 12,
  },
  classList: {
    gap: 8,
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
    gap: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  headerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  studentsCount: {
    fontSize: 14,
    color: '#6B7280',
  },
  markAllText: {
    fontSize: 14,
    color: '#8B5CF6',
    fontWeight: '500',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 80,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    marginBottom: 8,
  },
  listHeaderText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#9CA3AF',
    textTransform: 'uppercase',
  },
  studentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    color: '#111827',
  },
  attendanceButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  attendanceBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  presentBtn: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  absentBtn: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
  },
  lateBtn: {
    backgroundColor: '#F59E0B',
    borderColor: '#F59E0B',
  },
  saveContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
});
