import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  BookOpen,
  TrendingUp,
  Award,
  Clock,
  Target,
  BarChart3,
  GraduationCap,
  LogOut,
  User as UserIcon,
  ChevronDown,
  Key,
  PlayCircle,
  Sun,
  Moon
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import type { User, TestAttempt, Test } from '@/types';

interface StudentDashboardProps {
  user: User;
  attempts: TestAttempt[];
  tests: Test[];
  onStartTest: () => void;
  onResumeTest: (testId: string) => void;
  onViewResult: (attemptId: string) => void;
  onLogout: () => void;
  onUpdatePassword: (password: string) => Promise<boolean>;
  getSubjectName: (id: string) => string;
  getChapterName: (id: string) => string;
  t: (key: string) => string;
  deleteAccount: (password: string) => Promise<boolean>;
}

const COLORS = ['#3b82f6', '#ef4444', '#f59e0b'];



const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

export function StudentDashboard({
  user,
  attempts,
  tests,
  onStartTest,
  onResumeTest,
  onViewResult,
  onLogout,
  onUpdatePassword,
  getSubjectName,
  t,
  deleteAccount,
}: StudentDashboardProps) {
  const { theme, toggleTheme } = useTheme();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passError, setPassError] = useState('');
  const [passSuccess, setPassSuccess] = useState('');
  const [deleteConfirmPassword, setDeleteConfirmPassword] = useState('');

  const stats = useMemo(() => {
    if (attempts.length === 0) return null;
    const completedAttempts = attempts.filter(a => a.status === 'completed');
    if (completedAttempts.length === 0) return null;

    const totalTests = completedAttempts.length;
    const avgScore = completedAttempts.reduce((sum, a) => sum + (a.percentage || 0), 0) / totalTests;
    const bestScore = Math.max(...completedAttempts.map(a => a.percentage || 0));
    const totalTime = completedAttempts.reduce((sum, a) => sum + (a.timeTakenSeconds || 0), 0);

    // Calculate subject-wise performance
    const subjectScores: Record<string, { total: number; count: number }> = {};
    completedAttempts.forEach(a => {
      // This would require fetching test details per attempt to know subject
      // For now, let's assume we can lookup test from 'tests' prop
      const test = tests.find(t => t.id === a.testId);
      if (test && test.subjectIds && test.subjectIds.length > 0) {
        const subjectId = test.subjectIds[0];
        if (!subjectScores[subjectId]) {
          subjectScores[subjectId] = { total: 0, count: 0 };
        }
        subjectScores[subjectId].total += (a.percentage || 0);
        subjectScores[subjectId].count += 1;
      }
    });

    return {
      totalTests,
      avgScore,
      bestScore,
      totalTime,
      subjectScores
    };
  }, [attempts, tests]);

  const subjectPerformance = useMemo(() => {
    const subjectMap: Record<string, { total: number; count: number }> = {};

    attempts.forEach(attempt => {
      const test = tests.find(t => t.id === attempt.testId);
      if (!test) return;

      test.subjectIds.forEach(subId => {
        if (!subjectMap[subId]) {
          subjectMap[subId] = { total: 0, count: 0 };
        }
        subjectMap[subId].total += (attempt.percentage || 0);
        subjectMap[subId].count++;
      });
    });

    return Object.entries(subjectMap)
      .map(([subjectId, data]) => ({
        subjectId,
        name: getSubjectName(subjectId),
        avgScore: Math.round(data.total / data.count),
      }))
      .sort((a, b) => b.avgScore - a.avgScore);
  }, [attempts, tests, getSubjectName]);

  const recentTests = useMemo(() => {
    // Only show completed tests in recent history
    return [...attempts]
      .filter(a => a.status === 'completed')
      .sort((a, b) => new Date(b.submittedAt!).getTime() - new Date(a.submittedAt!).getTime())
      .slice(0, 5);
  }, [attempts]);

  const interruptedTests = useMemo(() => {
    const active = attempts.filter(a => a.status === 'in-progress' || a.status === 'paused');
    // Deduplicate: Keep only the latest attempt per testId
    const latestMap = new Map<string, TestAttempt>();
    active.forEach(a => {
      const existing = latestMap.get(a.testId);
      if (!existing || new Date(a.lastUpdated || 0) > new Date(existing.lastUpdated || 0)) {
        latestMap.set(a.testId, a);
      }
    });
    return Array.from(latestMap.values());
  }, [attempts]);

  const progressData = useMemo(() => {
    return [...attempts]
      .filter(a => a.status === 'completed')
      .sort((a, b) => new Date(a.submittedAt!).getTime() - new Date(b.submittedAt!).getTime())
      .map((attempt, index) => ({
        name: `Test ${index + 1}`,
        score: attempt.percentage || 0,
      }));
  }, [attempts]);

  const pieData = useMemo(() => {
    if (attempts.length === 0) return [];
    const lastAttempt = [...attempts]
      .filter(a => a.status === 'completed')
      .sort((a, b) => new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime())[0];

    if (!lastAttempt) return [];

    return [
      { name: 'Correct', value: lastAttempt.correctCount || 0 },
      { name: 'Incorrect', value: lastAttempt.incorrectCount || 0 },
      { name: 'Unanswered', value: lastAttempt.unattemptedCount || 0 },
    ];
  }, [attempts, t]);

  const getGrade = (percentage: number): string => {
    if (percentage >= 90) return 'A+';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B+';
    if (percentage >= 60) return 'B';
    if (percentage >= 50) return 'C';
    if (percentage >= 40) return 'D';
    return 'F';
  };

  const handlePasswordChange = async () => {
    setPassError('');
    setPassSuccess('');

    if (newPassword.length < 6) {
      setPassError('Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPassError('Passwords do not match');
      return;
    }

    const success = await onUpdatePassword(newPassword);
    if (success) {
      setPassSuccess('Password updated successfully');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      setPassError('Failed to update password');
    }
  };

  return (

    <div className={theme === 'dark' ? 'dark' : ''}>
      <div className="min-h-screen bg-gray-50/50 dark:bg-gray-950 transition-colors duration-300">
        {/* Header */}
        {/* Header */}
        <motion.header
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md sticky top-0 z-10 border-b dark:border-gray-800 shadow-sm transition-colors duration-300 overflow-hidden"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between gap-2 sm:gap-4">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg transform hover:scale-105 transition-transform shrink-0">
                  <GraduationCap className="w-5 h-5 sm:w-7 sm:h-7 text-white" />
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-auto p-1 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-800 text-left min-w-0 flex-1">
                      <div className="truncate">
                        <h1 className="text-base sm:text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-1 sm:gap-2 truncate">
                          <span className="truncate">{t('dash.welcome')}, {user.name}</span>
                          <ChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-400 shrink-0" />
                        </h1>
                        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-normal truncate">
                          {t('dash.class')} {user.class}
                        </p>
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56 dark:bg-gray-800 dark:border-gray-700">
                    <DropdownMenuLabel className="dark:text-gray-200">My Account</DropdownMenuLabel>
                    <DropdownMenuSeparator className="dark:bg-gray-700" />
                    <DropdownMenuItem onClick={() => setIsProfileOpen(true)} className="dark:text-gray-200 dark:focus:bg-gray-700">
                      <UserIcon className="w-4 h-4 mr-2" />
                      Profile
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="dark:bg-gray-700" />
                    <DropdownMenuItem onClick={onLogout} className="text-red-600 focus:text-red-600 dark:focus:bg-gray-700">
                      <LogOut className="w-4 h-4 mr-2" />
                      {t('nav.logout')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleTheme}
                  className="w-8 h-8 sm:w-10 sm:h-10 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  {theme === 'dark' ? <Sun className="w-4 h-4 sm:w-5 sm:h-5" /> : <Moon className="w-4 h-4 sm:w-5 sm:h-5" />}
                </Button>
                <Button onClick={onStartTest} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5 text-white h-9 px-3 sm:h-10 sm:px-4 text-xs sm:text-sm">
                  <BookOpen className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">{t('dash.startTest')}</span>
                </Button>
              </div>
            </div>
          </div>
        </motion.header>

        {/* Profile Dialog */}
        <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
          <DialogContent className="sm:max-w-[425px] max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Student Profile</DialogTitle>
              <DialogDescription>
                View your account details and manage password
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-gray-500 dark:text-gray-400 text-xs">Full Name</Label>
                  <div className="font-medium">{user.name}</div>
                </div>
                <div className="space-y-1">
                  <Label className="text-gray-500 dark:text-gray-400 text-xs">Email Address</Label>
                  <div className="font-medium">{user.email}</div>
                </div>
                <div className="space-y-1">
                  <Label className="text-gray-500 dark:text-gray-400 text-xs">Class</Label>
                  <div className="font-medium">Class {user.class}</div>
                </div>
                <div className="space-y-1">
                  <Label className="text-gray-500 dark:text-gray-400 text-xs">Board</Label>
                  <div className="font-medium">{user.board || 'CBSE'}</div>
                </div>
                <div className="space-y-1">
                  <Label className="text-gray-500 dark:text-gray-400 text-xs">Batch</Label>
                  <div className="font-medium">{user.batch || 'Standard Batch'}</div>
                </div>
              </div>

              <div className="border-t pt-4 mt-2">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Key className="w-4 h-4" /> Change Password
                </h4>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="new-pass">New Password</Label>
                    <Input
                      id="new-pass"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-pass">Confirm Password</Label>
                    <Input
                      id="confirm-pass"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                  {passError && <p className="text-red-500 text-sm">{passError}</p>}
                  {passSuccess && <p className="text-green-500 text-sm">{passSuccess}</p>}
                  <Button onClick={handlePasswordChange} className="w-full">Update Password</Button>
                </div>
              </div>

              <div className="border-t pt-4 mt-2">
                <h4 className="font-medium mb-3 flex items-center gap-2 text-red-600">
                  <LogOut className="w-4 h-4" /> Danger Zone
                </h4>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="destructive" className="w-full">
                      Delete Account
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle className="text-red-600">Delete Account</DialogTitle>
                      <DialogDescription>
                        Are you sure you want to delete your account? This action cannot be undone.
                        All your test history and data will be permanently removed.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="delete-confirm">To confirm, type your password</Label>
                        <Input
                          id="delete-confirm"
                          type="password"
                          value={deleteConfirmPassword}
                          onChange={(e) => setDeleteConfirmPassword(e.target.value)}
                          placeholder="Enter your password"
                        />
                      </div>
                      <Button
                        variant="destructive"
                        className="w-full"
                        onClick={async () => {
                          if (!deleteConfirmPassword) {
                            alert("Please enter your password to confirm.");
                            return;
                          }
                          const success = await deleteAccount(deleteConfirmPassword);
                          if (success) {
                            await onLogout();
                            // Final safety check: force refresh to root
                            window.location.href = "/";
                          } else {
                            alert("Account deletion failed. Please check your password and try again.");
                          }
                        }}
                      >
                        Permanently Delete My Account
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {attempts.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
            >
              <Card className="text-center py-16 border-none shadow-xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-md">
                <CardContent>
                  <div className="w-20 h-20 bg-blue-100/50 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                    <BookOpen className="w-10 h-10 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">You haven't appeared for any tests yet</h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-6">Click the button below to start your first test and track your progress.</p>
                  <Button onClick={onStartTest} size="lg" className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-lg transition-all text-white px-8">
                    <BookOpen className="w-5 h-5 mr-2" />
                    Start First Test
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="space-y-6"
            >
              {/* Continue Learning Section */}
              {interruptedTests.length > 0 && (
                <motion.div variants={item} className="mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                      <PlayCircle className="w-5 h-5 text-amber-500" />
                      Continue Learning
                    </h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {interruptedTests.map((attempt) => {
                      const test = tests.find(t => t.id === attempt.testId);
                      if (!test) return null;
                      return (
                        <Card key={attempt.id} className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-amber-500 bg-white/90 dark:bg-gray-800/90">
                          <CardContent className="p-6">
                            <div className="flex justify-between items-start mb-4">
                              <div className="flex-1 mr-2">
                                <h3 className="font-bold text-gray-900 dark:text-gray-100 line-clamp-1">{test.name}</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                  {attempt.status === 'paused' ? 'Paused' : 'In Progress'} • {new Date(attempt.lastUpdated || attempt.startedAt).toLocaleDateString()}
                                </p>
                              </div>
                              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 shrink-0">
                                Resume
                              </Badge>
                            </div>

                            <div className="space-y-3">
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Time Left:</span>
                                <span className="font-mono font-medium">{Math.floor((attempt.timeRemaining || 0) / 60)}m</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Answered:</span>
                                <span className="font-mono font-medium">{Object.keys(attempt.answers).length} / {test.totalQuestions}</span>
                              </div>
                              <Button onClick={() => onResumeTest(test.id)} className="w-full bg-amber-600 hover:bg-amber-700 text-white mt-2">
                                <PlayCircle className="w-4 h-4 mr-2" />
                                Resume Test
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* Stats Overview */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <motion.div variants={item}>
                  <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Tests Taken</p>
                          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{stats?.totalTests}</p>
                        </div>
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                          <BookOpen className="w-6 h-6 text-blue-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div variants={item}>
                  <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Average Score</p>
                          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{stats?.avgScore.toFixed(1)}%</p>
                        </div>
                        <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                          <TrendingUp className="w-6 h-6 text-green-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div variants={item}>
                  <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Best Score</p>
                          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{stats?.bestScore.toFixed(1)}%</p>
                        </div>
                        <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                          <Award className="w-6 h-6 text-yellow-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div variants={item}>
                  <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Total Time</p>
                          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                            {Math.floor((stats?.totalTime || 0) / 3600)}h
                          </p>
                        </div>
                        <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                          <Clock className="w-6 h-6 text-purple-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Progress Chart */}
                <motion.div variants={item}>
                  <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-blue-600" />
                        {t('dash.progress')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={progressData}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                            <XAxis
                              dataKey="name"
                              stroke={theme === 'dark' ? '#9ca3af' : '#4b5563'}
                              tick={{ fill: theme === 'dark' ? '#9ca3af' : '#4b5563' }}
                              tickLine={{ stroke: theme === 'dark' ? '#9ca3af' : '#4b5563' }}
                            />
                            <YAxis
                              domain={[0, 100]}
                              stroke={theme === 'dark' ? '#9ca3af' : '#4b5563'}
                              tick={{ fill: theme === 'dark' ? '#9ca3af' : '#4b5563' }}
                              tickLine={{ stroke: theme === 'dark' ? '#9ca3af' : '#4b5563' }}
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: theme === 'dark' ? 'rgba(31, 41, 55, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                                borderRadius: '8px',
                                border: 'none',
                                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                                color: theme === 'dark' ? '#f3f4f6' : '#111827'
                              }}
                              itemStyle={{ color: theme === 'dark' ? '#bfdbfe' : '#2563eb' }}
                            />
                            <Line
                              type="monotone"
                              dataKey="score"
                              stroke="#3b82f6"
                              strokeWidth={3}
                              dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4, stroke: '#fff' }}
                              activeDot={{ r: 6 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Latest Test Performance */}
                <motion.div variants={item}>
                  <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-blue-600" />
                        Latest Test Performance
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64 flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={pieData}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={5}
                              dataKey="value"
                              stroke="none"
                            >
                              {pieData.map((_entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip
                              contentStyle={{
                                backgroundColor: theme === 'dark' ? 'rgba(31, 41, 55, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                                borderRadius: '8px',
                                border: 'none',
                                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                                color: theme === 'dark' ? '#f3f4f6' : '#111827'
                              }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex justify-center gap-4 mt-4">
                        {pieData.map((entry, index) => (
                          <div key={entry.name} className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: COLORS[index] }}
                            />
                            <span className="text-sm text-gray-600 dark:text-gray-400">{entry.name}: {entry.value}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>

              {/* Subject Performance & Recent Tests */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Subject-wise Performance */}
                <motion.div variants={item}>
                  <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Target className="w-5 h-5 text-blue-600" />
                        {t('dash.bestSubject')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {subjectPerformance.map((subject, index) => (
                          <div key={subject.subjectId} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Badge variant={index === 0 ? "default" : "secondary"}>
                                  #{index + 1}
                                </Badge>
                                <span className="font-medium">{subject.name}</span>
                              </div>
                              <span className="text-sm font-semibold">{subject.avgScore}%</span>
                            </div>
                            <Progress value={subject.avgScore} className="h-2" />
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Recent Tests */}
                <motion.div variants={item}>
                  <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-blue-600" />
                        {t('dash.recentTests')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {recentTests.map((attempt) => {
                          const test = tests.find(t => t.id === attempt.testId);
                          return (
                            <motion.div
                              key={attempt.id}
                              whileHover={{ scale: 1.01 }}
                              className="flex items-center justify-between p-3 bg-white/50 dark:bg-gray-700/50 rounded-lg hover:bg-blue-50/50 cursor-pointer transition-all border border-transparent hover:border-blue-100"
                              onClick={() => onViewResult(attempt.id)}
                            >
                              <div>
                                <p className="font-medium text-gray-900 dark:text-gray-100">{test?.name || 'Unknown Test'}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                  {new Date(attempt.submittedAt || Date.now()).toLocaleDateString()}
                                </p>
                              </div>
                              <div className="text-right">
                                <Badge
                                  className={(attempt.percentage || 0) >= 60 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}
                                >
                                  {getGrade(attempt.percentage || 0)}
                                </Badge>
                                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mt-1">
                                  {(attempt.percentage || 0).toFixed(1)}%
                                </p>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>
            </motion.div>
          )}
        </main>
      </div>
    </div>
  );
}
