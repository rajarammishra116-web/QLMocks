import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
// ... imports ...
import { UserList } from './UserList';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Upload,
  Plus,
  FileText,
  Users,
  BookOpen,
  BarChart3,
  GraduationCap,
  LogOut,

  Trash2,
  TrendingUp,
  TrendingDown,
  // pending viewn,
  Activity,
  RefreshCw,
  Sun,
  Moon
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';

import type { User, Test, TestAttempt, Question } from '@/types';

interface AdminDashboardProps {
  user: User;
  tests: Test[];
  questions: Question[];
  attempts: TestAttempt[];
  onUploadQuestions: () => void;
  onCreateTest: () => void;
  onViewResults: () => void;
  onLogout: () => void;
  onDeleteTest: (id: string) => void;
  onCleanupOrphanedQuestions: () => Promise<number>;
  onCleanupOrphanedAttempts: () => Promise<number>;
  onCleanupOldAttempts: (days: number) => Promise<number>;
  onFetchUsers: () => Promise<User[]>;
  onDeleteUser: (userId: string) => Promise<boolean>;
  getSubjectName: (id: string) => string;
  refreshAttempts?: () => Promise<any>;
  fetchMoreTests?: () => void;
  hasMoreTests?: boolean;
  t: (key: string) => string;
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

export function AdminDashboard({
  user,
  tests,
  questions,
  attempts,
  onUploadQuestions,
  onCreateTest,
  onViewResults,
  onLogout,
  onDeleteTest,
  onCleanupOrphanedQuestions,
  onCleanupOrphanedAttempts,
  onCleanupOldAttempts,
  onFetchUsers,
  onDeleteUser,
  getSubjectName,
  refreshAttempts,
  fetchMoreTests,
  hasMoreTests,
  t,
}: AdminDashboardProps) {
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('overview');
  const [testToDelete, setTestToDelete] = useState<string | null>(null);
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const [isCleaningAttempts, setIsCleaningAttempts] = useState(false);
  const [cleanupDays, setCleanupDays] = useState('30');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const stats = useMemo(() => {
    // Filter attempts to include only the FIRST attempt per student per test
    const attemptsMap = new Map<string, TestAttempt>();

    // Sort by date ascending to ensure we process earlier attempts first
    const sortedAttempts = [...attempts].sort((a, b) =>
      new Date(a.startedAt || 0).getTime() - new Date(b.startedAt || 0).getTime()
    );

    sortedAttempts.forEach(attempt => {
      const key = `${attempt.studentId}-${attempt.testId}`;
      if (!attemptsMap.has(key)) {
        attemptsMap.set(key, attempt);
      }
    });

    // Calculate stats based on ALL attempts
    const totalQuestions = questions.length;
    const totalTests = tests.length;
    const totalAttempts = attempts.length;

    // Identify attempts associated with tests that are not currently loaded (due to pagination or deletion)
    const validTestIds = new Set(tests.map(t => t.id));
    const ghostAttempts = attempts.filter(a => !validTestIds.has(a.testId)).length;


    const completedForAvg = attempts.filter(a => a.status === 'completed');
    const avgScore = completedForAvg.length > 0
      ? completedForAvg.reduce((sum, a) => sum + (a.percentage || 0), 0) / completedForAvg.length
      : 0;

    // Calculate trends (compare last 7 days vs previous 7 days)
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const recentAttempts = attempts.filter(a => a.submittedAt && new Date(a.submittedAt) > sevenDaysAgo).length;
    const previousAttempts = attempts.filter(a => {
      if (!a.submittedAt) return false;
      const date = new Date(a.submittedAt);
      return date > fourteenDaysAgo && date <= sevenDaysAgo;
    }).length;

    const attemptsTrend = previousAttempts > 0
      ? ((recentAttempts - previousAttempts) / previousAttempts) * 100
      : recentAttempts > 0 ? 100 : 0;

    return {
      totalQuestions,
      totalTests,
      totalAttempts,
      avgScore,
      attemptsTrend,
      recentAttempts,
      ghostAttempts
    };
  }, [questions, tests, attempts]);


  const recentTests = useMemo(() => {
    return [...tests]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
  }, [tests]);

  const recentAttempts = useMemo(() => {
    return [...attempts]
      .filter(a => a.status === 'completed' && a.submittedAt) // Only show completed attempts
      .sort((a, b) => new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime())
      .slice(0, 10);
  }, [attempts]);

  const getTestTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      'chapter-wise': 'Chapter-wise',
      'subject-wise': 'Subject-wise',
      'full-syllabus': 'Full Syllabus',
      'practice': 'Practice',
    };
    return types[type] || type;
  };

  const getTestTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'chapter-wise': 'badge-info',
      'subject-wise': 'badge-success',
      'full-syllabus': 'bg-purple-100 text-purple-700 border-purple-200',
      'practice': 'badge-warning',
    };
    return colors[type] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      {/* Header */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="glass-card sticky top-0 z-10 border-b bg-white/80 dark:bg-gray-800/80 backdrop-blur-md dark:border-gray-700"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 gradient-primary rounded-xl flex items-center justify-center shadow-lg">
                <GraduationCap className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">{t('admin.title')}</h1>
                <p className="text-sm text-muted-foreground dark:text-gray-400">Welcome, {user.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={isRefreshing}
                onClick={async () => {
                  if (refreshAttempts) {
                    setIsRefreshing(true);
                    try {
                      await refreshAttempts();
                      alert("Latest results fetched successfully.");
                    } finally {
                      setIsRefreshing(false);
                    }
                  }
                }}
                className="hidden sm:flex"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'Refreshing...' : 'Refresh'}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
              >
                {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </Button>
              <Button variant="outline" size="sm" onClick={onLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                {t('nav.logout')}
              </Button>
            </div>
          </div>
        </div>
      </motion.header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="tests">Tests</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <motion.div
              variants={container}
              initial="hidden"
              animate="show"
              className="space-y-6"
            >
              {stats.ghostAttempts > 0 && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 flex items-start gap-3">
                  <div className="p-2 bg-yellow-100 dark:bg-yellow-800 rounded-full">
                    <Activity className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-yellow-900 dark:text-yellow-100">Data Mismatch Detected</h4>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                      There are <strong>{stats.ghostAttempts} results</strong> from tests that are not currently visible in the list.
                      This usually happens when older tests are on other pages or have been deleted but their results kept.
                    </p>
                    <div className="mt-3 flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-yellow-200 hover:bg-yellow-100 dark:border-yellow-800 dark:hover:bg-yellow-900"
                        onClick={() => fetchMoreTests && fetchMoreTests()}
                        disabled={!hasMoreTests}
                      >
                        {hasMoreTests ? "Load More Tests" : "All Tests Loaded"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => {
                          if (window.confirm("This will permanently delete attempts linked to missing/deleted tests. Are you sure?")) {
                            onCleanupOrphanedAttempts()
                              .then(count => alert(`Cleaned up ${count} orphaned attempts.`))
                              .catch(err => console.error(err));
                          }
                        }}
                      >
                        Cleanup Orphaned
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Quick Actions */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <motion.div variants={item}>
                  <Card
                    className="elevated-card cursor-pointer group bg-white dark:bg-gray-800 dark:border-gray-700"
                    onClick={onUploadQuestions}
                  >
                    <CardContent className="p-6 flex items-center gap-4">
                      <div className="w-14 h-14 gradient-primary rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Upload className="w-7 h-7 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">{t('admin.upload')}</h3>
                        <p className="text-sm text-muted-foreground dark:text-gray-400">Import from Excel</p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div variants={item}>
                  <Card
                    className="elevated-card cursor-pointer group bg-white dark:bg-gray-800 dark:border-gray-700"
                    onClick={onCreateTest}
                  >
                    <CardContent className="p-6 flex items-center gap-4">
                      <div className="w-14 h-14 gradient-success rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Plus className="w-7 h-7 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">{t('admin.createTest')}</h3>
                        <p className="text-sm text-muted-foreground dark:text-gray-400">Create new test</p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div variants={item}>
                  <Card
                    className="elevated-card cursor-pointer group bg-white dark:bg-gray-800 dark:border-gray-700"
                    onClick={onViewResults}
                  >
                    <CardContent className="p-6 flex items-center gap-4">
                      <div className="w-14 h-14 gradient-accent rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                        <BarChart3 className="w-7 h-7 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">{t('admin.viewResults')}</h3>
                        <p className="text-sm text-muted-foreground dark:text-gray-400">View all attempts</p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>

              {/* Stats Overview with Trends */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <motion.div variants={item}>
                  <Card className="stat-card text-blue-600 bg-white dark:bg-gray-800 dark:border-gray-700">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground dark:text-gray-400">{t('admin.totalQuestions')}</p>
                          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{stats.totalQuestions}</p>
                        </div>
                        <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                          <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div variants={item}>
                  <Card className="stat-card text-green-600 bg-white dark:bg-gray-800 dark:border-gray-700">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground dark:text-gray-400">{t('admin.totalTests')}</p>
                          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{stats.totalTests}</p>
                        </div>
                        <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                          <BookOpen className="w-6 h-6 text-green-600 dark:text-green-400" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div variants={item}>
                  <Card className="stat-card text-purple-600 bg-white dark:bg-gray-800 dark:border-gray-700">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-sm text-muted-foreground dark:text-gray-400">Total Attempts</p>
                          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{stats.totalAttempts}</p>
                          {stats.attemptsTrend !== 0 && (
                            <div className={cn(
                              "flex items-center gap-1 text-xs mt-2",
                              stats.attemptsTrend > 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                            )}>
                              {stats.attemptsTrend > 0 ? (
                                <TrendingUp className="w-3 h-3" />
                              ) : (
                                <TrendingDown className="w-3 h-3" />
                              )}
                              <span>{Math.abs(stats.attemptsTrend).toFixed(0)}% vs last week</span>
                            </div>
                          )}
                        </div>
                        <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                          <Users className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div variants={item}>
                  <Card className="stat-card text-amber-600 bg-white dark:bg-gray-800 dark:border-gray-700">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground dark:text-gray-400">Average Score</p>
                          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{stats.avgScore.toFixed(1)}%</p>
                        </div>
                        <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center">
                          <Activity className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>

              {/* Database Cleanup */}
              <motion.div variants={item}>
                <Card className="elevated-card border-l-4 border-l-orange-500 bg-white dark:bg-gray-800 dark:border-gray-700 dark:border-l-orange-500">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                        <Trash2 className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">Cleanup Orphaned Questions</p>
                        <p className="text-sm text-muted-foreground dark:text-gray-400">Remove questions not linked to any test</p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      className="border-orange-300 text-orange-600 hover:bg-orange-50"
                      onClick={async () => {
                        setIsCleaningUp(true);
                        try {
                          const count = await onCleanupOrphanedQuestions();
                          alert(`Cleanup complete! Deleted ${count} orphaned questions.`);
                        } catch (err) {
                          alert('Failed to cleanup orphaned questions.');
                          console.error(err);
                        }
                        setIsCleaningUp(false);
                      }}
                      disabled={isCleaningUp}
                    >
                      {isCleaningUp ? 'Cleaning...' : 'Run Cleanup'}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div variants={item}>
                <Card className="elevated-card border-l-4 border-l-red-500 bg-white dark:bg-gray-800 dark:border-gray-700 dark:border-l-red-500">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                        <Users className="w-5 h-5 text-red-600 dark:text-red-400" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">Cleanup Invalid Attempts</p>
                        <p className="text-sm text-muted-foreground dark:text-gray-400">Remove data from deleted users</p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      className="border-red-300 text-red-600 hover:bg-red-50"
                      onClick={async () => {
                        if (!confirm("This will delete all test attempts linked to users that no longer exist. Continue?")) return;
                        setIsCleaningUp(true);
                        try {
                          const count = await onCleanupOrphanedAttempts();
                          alert(`Cleanup complete! Deleted ${count} orphaned attempts.`);
                        } catch (err) {
                          alert('Failed to cleanup attempts.');
                          console.error(err);
                        }
                        setIsCleaningUp(false);
                      }}
                      disabled={isCleaningUp}
                    >
                      {isCleaningUp ? 'Cleaning...' : 'Fix Data'}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>



              <motion.div variants={item}>
                <Card className="hover:shadow-md transition-shadow bg-white dark:bg-gray-800 dark:border-gray-700">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Storage Management
                    </CardTitle>
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold mb-1 dark:text-white">Old Data Cleanup</div>
                    <div className="flex items-center gap-2 mb-4">
                      <p className="text-xs text-muted-foreground whitespace-nowrap">
                        Delete attempts older than:
                      </p>
                      <Select value={cleanupDays} onValueChange={setCleanupDays}>
                        <SelectTrigger className="h-7 w-[100px] text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="7">7 Days</SelectItem>
                          <SelectItem value="15">15 Days</SelectItem>
                          <SelectItem value="30">30 Days</SelectItem>
                          <SelectItem value="60">60 Days</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full border-red-200 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                      onClick={async () => {
                        const days = parseInt(cleanupDays);
                        if (confirm(`Are you sure you want to delete all attempts older than ${days} days? This cannot be undone.`)) {
                          setIsCleaningAttempts(true);
                          try {
                            const count = await onCleanupOldAttempts(days);
                            alert(`Cleaned up ${count} old attempts`);
                          } catch (e) {
                            alert('Failed to cleanup attempts');
                            console.error(e);
                          }
                          setIsCleaningAttempts(false);
                        }
                      }}
                      disabled={isCleaningAttempts}
                    >
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Recent Activity */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Tests */}
                <motion.div variants={item}>
                  <Card className="elevated-card bg-white dark:bg-gray-800 dark:border-gray-700">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-primary" />
                        <span className="text-gray-900 dark:text-white">Recent Tests</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {recentTests.length === 0 ? (
                          <p className="text-muted-foreground text-center py-4">No tests created yet</p>
                        ) : (
                          recentTests.map((test) => (
                            <div key={test.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-gray-700/50 rounded-lg hover:bg-slate-100 dark:hover:bg-gray-700 transition-colors">
                              <div className="flex-1">
                                <p className="font-medium text-gray-900 dark:text-white">{test.name}</p>
                                <p className="text-sm text-muted-foreground dark:text-gray-400">
                                  Class {test.classLevel} • {test.totalQuestions} questions
                                </p>
                              </div>
                              <Badge className={getTestTypeColor(test.type)}>
                                {getTestTypeLabel(test.type)}
                              </Badge>
                            </div>
                          ))
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Recent Attempts */}
                <motion.div variants={item}>
                  <Card className="elevated-card bg-white dark:bg-gray-800 dark:border-gray-700">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-primary" />
                        <span className="text-gray-900 dark:text-white">Recent Attempts</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3 max-h-80 overflow-y-auto custom-scrollbar">
                        {recentAttempts.length === 0 ? (
                          <p className="text-muted-foreground text-center py-4">No attempts yet</p>
                        ) : (
                          recentAttempts.map((attempt) => {
                            const test = tests.find(t => t.id === attempt.testId);
                            return (
                              <div key={attempt.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-gray-700/50 rounded-lg">
                                <div>
                                  <p className="font-medium text-gray-900 dark:text-white">{test?.name || 'Unknown Test'}</p>
                                  <p className="text-sm text-muted-foreground dark:text-gray-400">
                                    {new Date(attempt.submittedAt || Date.now()).toLocaleDateString()}
                                  </p>
                                </div>
                                <Badge className={cn(
                                  (attempt.percentage || 0) >= 60 ? 'badge-success' : 'badge-danger'
                                )}>
                                  {(attempt.percentage || 0).toFixed(0)}%
                                </Badge>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>
            </motion.div>
          </TabsContent>

          <TabsContent value="tests">
            <Card className="elevated-card bg-white dark:bg-gray-800 dark:border-gray-700">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="dark:text-white">All Tests</CardTitle>
                <Button onClick={onCreateTest} className="gradient-primary text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Test
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {tests.length === 0 ? (
                    <div className="text-center py-12">
                      <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground">No tests created yet</p>
                      <Button onClick={onCreateTest} className="mt-4 gradient-primary text-white">
                        <Plus className="w-4 h-4 mr-2" />
                        Create Your First Test
                      </Button>
                    </div>
                  ) : (
                    tests.map((test) => (
                      <div key={test.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 dark:hover:bg-gray-700/50 transition-colors dark:border-gray-700">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-gray-900 dark:text-white">{test.name}</p>
                            <Badge className={getTestTypeColor(test.type)}>
                              {getTestTypeLabel(test.type)}
                            </Badge>
                            {test.negativeMarkingEnabled && (
                              <Badge variant="destructive">-{test.negativeMarkValue}</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground dark:text-gray-400 mt-1">
                            Class {test.classLevel} • {test.subjectIds.map(getSubjectName).join(', ')} • {test.totalQuestions} questions • {test.timeLimitMinutes} min
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground mr-2">
                            {attempts.filter(a => a.testId === test.id).length} attempts
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-500 hover:text-red-600 hover:bg-red-50 h-8 w-8"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {hasMoreTests && fetchMoreTests && (
                  <div className="mt-4 text-center">
                    <Button variant="outline" onClick={() => fetchMoreTests()}>
                      Load More Tests
                    </Button>
                  </div>
                )}

              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            <UserList onFetchUsers={onFetchUsers} onDeleteUser={onDeleteUser} />
          </TabsContent>
        </Tabs>
      </main>

      <AlertDialog open={!!testToDelete} onOpenChange={(open) => !open && setTestToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the test
              and potentially impact any existing attempts.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                if (testToDelete) {
                  onDeleteTest(testToDelete);
                  setTestToDelete(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
