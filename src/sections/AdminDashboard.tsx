import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
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
  Activity
} from 'lucide-react';
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
  onCleanupOldAttempts: (days: number) => Promise<number>;
  getSubjectName: (id: string) => string;
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
  onCleanupOldAttempts,
  getSubjectName,
  t,
}: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [testToDelete, setTestToDelete] = useState<string | null>(null);
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const [isCleaningAttempts, setIsCleaningAttempts] = useState(false);

  const stats = useMemo(() => {
    const totalQuestions = questions.length;
    const totalTests = tests.length;
    const totalAttempts = attempts.length;
    const avgScore = attempts.length > 0
      ? attempts.reduce((sum, a) => sum + (a.percentage || 0), 0) / attempts.length
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
      recentAttempts
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
    <div className="min-h-screen">
      {/* Header */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="glass-card sticky top-0 z-10 border-b"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 gradient-primary rounded-xl flex items-center justify-center shadow-lg">
                <GraduationCap className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{t('admin.title')}</h1>
                <p className="text-sm text-muted-foreground">Welcome, {user.name}</p>
              </div>
            </div>
            <Button variant="outline" onClick={onLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              {t('nav.logout')}
            </Button>
          </div>
        </div>
      </motion.header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="tests">Tests</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <motion.div
              variants={container}
              initial="hidden"
              animate="show"
              className="space-y-6"
            >
              {/* Quick Actions */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <motion.div variants={item}>
                  <Card
                    className="elevated-card cursor-pointer group"
                    onClick={onUploadQuestions}
                  >
                    <CardContent className="p-6 flex items-center gap-4">
                      <div className="w-14 h-14 gradient-primary rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Upload className="w-7 h-7 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{t('admin.upload')}</h3>
                        <p className="text-sm text-muted-foreground">Import from Excel</p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div variants={item}>
                  <Card
                    className="elevated-card cursor-pointer group"
                    onClick={onCreateTest}
                  >
                    <CardContent className="p-6 flex items-center gap-4">
                      <div className="w-14 h-14 gradient-success rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Plus className="w-7 h-7 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{t('admin.createTest')}</h3>
                        <p className="text-sm text-muted-foreground">Create new test</p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div variants={item}>
                  <Card
                    className="elevated-card cursor-pointer group"
                    onClick={onViewResults}
                  >
                    <CardContent className="p-6 flex items-center gap-4">
                      <div className="w-14 h-14 gradient-accent rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                        <BarChart3 className="w-7 h-7 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{t('admin.viewResults')}</h3>
                        <p className="text-sm text-muted-foreground">View all attempts</p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>

              {/* Stats Overview with Trends */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <motion.div variants={item}>
                  <Card className="stat-card text-blue-600">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">{t('admin.totalQuestions')}</p>
                          <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalQuestions}</p>
                        </div>
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                          <FileText className="w-6 h-6 text-blue-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div variants={item}>
                  <Card className="stat-card text-green-600">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">{t('admin.totalTests')}</p>
                          <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalTests}</p>
                        </div>
                        <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                          <BookOpen className="w-6 h-6 text-green-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div variants={item}>
                  <Card className="stat-card text-purple-600">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-sm text-muted-foreground">Total Attempts</p>
                          <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalAttempts}</p>
                          {stats.attemptsTrend !== 0 && (
                            <div className={cn(
                              "flex items-center gap-1 text-xs mt-2",
                              stats.attemptsTrend > 0 ? "text-green-600" : "text-red-600"
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
                        <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                          <Users className="w-6 h-6 text-purple-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div variants={item}>
                  <Card className="stat-card text-amber-600">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Average Score</p>
                          <p className="text-3xl font-bold text-gray-900 mt-1">{stats.avgScore.toFixed(1)}%</p>
                        </div>
                        <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                          <Activity className="w-6 h-6 text-amber-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>

              {/* Database Cleanup */}
              <motion.div variants={item}>
                <Card className="elevated-card border-l-4 border-l-orange-500">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                        <Trash2 className="w-5 h-5 text-orange-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Cleanup Orphaned Questions</p>
                        <p className="text-sm text-muted-foreground">Remove questions not linked to any test</p>
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
                <Card className="hover:shadow-md transition-shadow">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Storage Management
                    </CardTitle>
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold mb-1">Old Data Cleanup</div>
                    <p className="text-xs text-muted-foreground mb-4">
                      Delete attempts older than 30 days to free up storage.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full border-red-200 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                      onClick={async () => {
                        if (confirm('Are you sure you want to delete all attempts older than 30 days? This cannot be undone.')) {
                          setIsCleaningAttempts(true);
                          try {
                            const count = await onCleanupOldAttempts(30);
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
                      {isCleaningAttempts ? 'Cleaning...' : 'Delete Old Attempts'}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Recent Activity */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Tests */}
                <motion.div variants={item}>
                  <Card className="elevated-card">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-primary" />
                        Recent Tests
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {recentTests.length === 0 ? (
                          <p className="text-muted-foreground text-center py-4">No tests created yet</p>
                        ) : (
                          recentTests.map((test) => (
                            <div key={test.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                              <div className="flex-1">
                                <p className="font-medium text-gray-900">{test.name}</p>
                                <p className="text-sm text-muted-foreground">
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
                  <Card className="elevated-card">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-primary" />
                        Recent Attempts
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
                              <div key={attempt.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                <div>
                                  <p className="font-medium text-gray-900">{test?.name || 'Unknown Test'}</p>
                                  <p className="text-sm text-muted-foreground">
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
            <Card className="elevated-card">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>All Tests</CardTitle>
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
                      <div key={test.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 transition-colors">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-gray-900">{test.name}</p>
                            <Badge className={getTestTypeColor(test.type)}>
                              {getTestTypeLabel(test.type)}
                            </Badge>
                            {test.negativeMarkingEnabled && (
                              <Badge variant="destructive">-{test.negativeMarkValue}</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
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
                            onClick={() => setTestToDelete(test.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
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
