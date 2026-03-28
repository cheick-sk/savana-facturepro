import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import {
  Users,
  GraduationCap,
  ClipboardCheck,
  Calendar,
  TrendingUp,
  Bell,
  ChevronRight,
} from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useAuthStore } from '@/stores/authStore';

export default function SchoolFlowDashboard() {
  const { t } = useTranslation();
  const [refreshing, setRefreshing] = React.useState(false);
  const { user } = useAuthStore();

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  }, []);

  const todayStats = {
    totalStudents: 450,
    presentToday: 423,
    absentToday: 27,
    attendanceRate: 94,
  };

  const upcomingEvents = [
    { id: '1', title: 'Examen de Mathématiques', date: '25 Jan 2024', type: 'exam' },
    { id: '2', title: 'Réunion parents-profs', date: '28 Jan 2024', type: 'meeting' },
    { id: '3', title: 'Fête de fin de trimestre', date: '02 Fév 2024', type: 'event' },
  ];

  const recentActivities = [
    { id: '1', message: 'Moussa Diop marqué absent - 6ème A', time: '09:15' },
    { id: '2', message: 'Appel terminé - 5ème B', time: '09:00' },
    { id: '3', message: 'Nouvel élève inscrit: Aminata Sow', time: 'Hier' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{t('dashboard.welcome')}, {user?.name}</Text>
            <Text style={styles.subtitle}>{t('schoolflow.dashboardSubtitle')}</Text>
          </View>
          <TouchableOpacity style={styles.notificationButton}>
            <Bell size={24} color="#6B7280" />
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationCount}>3</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsGrid}>
          <Card style={styles.statCard}>
            <Users size={24} color="#8B5CF6" />
            <Text style={styles.statValue}>{todayStats.totalStudents}</Text>
            <Text style={styles.statLabel}>{t('schoolflow.totalStudents')}</Text>
          </Card>
          <Card style={styles.statCard}>
            <ClipboardCheck size={24} color="#10B981" />
            <Text style={styles.statValue}>{todayStats.attendanceRate}%</Text>
            <Text style={styles.statLabel}>{t('schoolflow.attendanceRate')}</Text>
          </Card>
          <Card style={styles.statCard}>
            <GraduationCap size={24} color="#3B82F6" />
            <Text style={styles.statValue}>{todayStats.presentToday}</Text>
            <Text style={styles.statLabel}>{t('schoolflow.presentToday')}</Text>
          </Card>
          <Card style={[styles.statCard, { backgroundColor: '#FEF2F2' }]}>
            <Users size={24} color="#EF4444" />
            <Text style={[styles.statValue, { color: '#EF4444' }]}>{todayStats.absentToday}</Text>
            <Text style={styles.statLabel}>{t('schoolflow.absentToday')}</Text>
          </Card>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('dashboard.quickActions')}</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.quickActionBtn}
              onPress={() => router.push('/schoolflow/attendance/index')}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: '#F5F3FF' }]}>
                <ClipboardCheck size={24} color="#8B5CF6" />
              </View>
              <Text style={styles.quickActionText}>{t('schoolflow.takeAttendance')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickActionBtn}
              onPress={() => router.push('/schoolflow/students/index')}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: '#EFF6FF' }]}>
                <Users size={24} color="#3B82F6" />
              </View>
              <Text style={styles.quickActionText}>{t('schoolflow.viewStudents')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Upcoming Events */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('schoolflow.upcomingEvents')}</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>{t('common.seeAll')}</Text>
            </TouchableOpacity>
          </View>
          
          {upcomingEvents.map((event) => (
            <Card key={event.id} style={styles.eventItem}>
              <View style={styles.eventIcon}>
                <Calendar size={20} color="#8B5CF6" />
              </View>
              <View style={styles.eventInfo}>
                <Text style={styles.eventTitle}>{event.title}</Text>
                <Text style={styles.eventDate}>{event.date}</Text>
              </View>
              <Badge variant={event.type === 'exam' ? 'error' : event.type === 'meeting' ? 'warning' : 'info'}>
                {t(`schoolflow.${event.type}`)}
              </Badge>
            </Card>
          ))}
        </View>

        {/* Recent Activities */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('schoolflow.recentActivity')}</Text>
          
          {recentActivities.map((activity) => (
            <View key={activity.id} style={styles.activityItem}>
              <View style={styles.activityDot} />
              <View style={styles.activityContent}>
                <Text style={styles.activityMessage}>{activity.message}</Text>
                <Text style={styles.activityTime}>{activity.time}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  greeting: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  notificationButton: {
    position: 'relative',
    padding: 8,
  },
  notificationBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationCount: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    width: '48%',
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  seeAllText: {
    fontSize: 14,
    color: '#8B5CF6',
    fontWeight: '500',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
  },
  quickActionBtn: {
    flex: 1,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    alignItems: 'center',
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 8,
  },
  eventIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#F5F3FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventInfo: {
    flex: 1,
    marginLeft: 12,
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  eventDate: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  activityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#8B5CF6',
    marginTop: 6,
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityMessage: {
    fontSize: 14,
    color: '#374151',
  },
  activityTime: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
});
