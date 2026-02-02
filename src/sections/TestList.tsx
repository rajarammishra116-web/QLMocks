import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import {
  BookOpen,
  Clock,
  HelpCircle,
  Star,
  Search,
  Filter,
  ChevronRight,
  GraduationCap,
  ArrowLeft
} from 'lucide-react';

import type { Test, User, ClassLevel } from '@/types';

interface TestListProps {
  user: User;
  tests: Test[];
  onStartTest: (testId: string) => void;
  onBack: () => void;
  getSubjectName: (id: string) => string;
  t: (key: string) => string;
  language: 'en' | 'or';
  getSubjectsByClass: (classLevel: ClassLevel) => { id: string; name: string }[];
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

export function TestList({
  user,
  tests,
  onStartTest,
  onBack,
  getSubjectName,
  t,
  getSubjectsByClass,
}: TestListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterSubject, setFilterSubject] = useState<string>('all');

  const filteredTests = useMemo(() => {
    return tests.filter(test => {
      // Filter by class
      if (test.classLevel !== user.class) return false;

      // Auto-filter by student's registered board
      if (test.board && user.board && test.board !== user.board) return false;

      // Filter by search
      if (searchQuery && !test.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }

      // Filter by type
      if (filterType !== 'all' && test.type !== filterType) return false;

      // Filter by subject
      if (filterSubject !== 'all' && !test.subjectIds.includes(filterSubject)) return false;

      return true;
    });
  }, [tests, user.class, user.board, searchQuery, filterType, filterSubject]);

  const availableSubjects = useMemo(() => {
    if (!user.class) return [];
    return getSubjectsByClass(user.class as ClassLevel);
  }, [user.class, getSubjectsByClass]);

  const getTestTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      'chapter-wise': t('test.chapterWise'),
      'subject-wise': t('test.subjectWise'),
      'full-syllabus': t('test.fullSyllabus'),
      'practice': t('test.practice'),
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
    <div className="min-h-screen bg-gray-50/50 dark:bg-gray-950 transition-colors duration-300">
      {/* Header */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="glass-card sticky top-0 z-10 border-b"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={onBack} className="touch-target text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800">
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 gradient-primary rounded-lg flex items-center justify-center">
                  <GraduationCap className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('test.title')}</h1>
                  <p className="text-sm text-muted-foreground">Class {user.class}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="mb-6 elevated-card">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search tests..."
                    className="pl-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-gray-400" />
                    <Select value={filterType} onValueChange={setFilterType}>
                      <SelectTrigger className="w-full sm:w-40">
                        <SelectValue placeholder="Filter by type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="chapter-wise">{t('test.chapterWise')}</SelectItem>
                        <SelectItem value="subject-wise">{t('test.subjectWise')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Select value={filterSubject} onValueChange={setFilterSubject}>
                    <SelectTrigger className="w-full sm:w-40">
                      <SelectValue placeholder="Filter by subject" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Subjects</SelectItem>
                      {availableSubjects.map((subject) => (
                        <SelectItem key={subject.id} value={subject.id}>
                          {subject.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Tests Grid */}
        {filteredTests.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="text-center py-16 elevated-card">
              <CardContent>
                <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="w-10 h-10 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">No tests available</h3>
                <p className="text-muted-foreground">Check back later for new tests</p>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {filteredTests.map((test) => (
              <motion.div key={test.id} variants={item}>
                <Card className="elevated-card h-full flex flex-col">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <Badge className={getTestTypeColor(test.type)}>
                        {getTestTypeLabel(test.type)}
                      </Badge>
                      {test.negativeMarkingEnabled && (
                        <Badge variant="destructive" className="text-xs">
                          -{test.negativeMarkValue}
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-lg mt-2 line-clamp-2">{test.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col">
                    <div className="space-y-3 mb-4 flex-1">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <BookOpen className="w-4 h-4 flex-shrink-0" />
                        <span className="line-clamp-1">{test.subjectIds.map(getSubjectName).join(', ')}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <HelpCircle className="w-4 h-4 flex-shrink-0" />
                        <span>{test.totalQuestions} {t('test.questions')}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="w-4 h-4 flex-shrink-0" />
                        <span>{test.timeLimitMinutes} {t('common.minutes')}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Star className="w-4 h-4 flex-shrink-0 text-amber-500" />
                        <span>{test.totalQuestions} {t('test.marks')}</span>
                      </div>
                      {test.examDate && (
                        <div className="flex items-center gap-2 text-sm text-blue-600 font-medium">
                          <Clock className="w-4 h-4 flex-shrink-0" />
                          <span>
                            Scheduled: {new Date(test.examDate).toLocaleDateString()}
                            {test.examTime && ` at ${test.examTime}`}
                          </span>
                        </div>
                      )}
                    </div>
                    <Button
                      className="w-full gradient-primary text-white touch-target"
                      onClick={() => onStartTest(test.id)}
                    >
                      {t('test.start')}
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Results count */}
        {filteredTests.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-6 text-center text-sm text-muted-foreground"
          >
            Showing {filteredTests.length} {filteredTests.length === 1 ? 'test' : 'tests'}
          </motion.div>
        )}
      </main>
    </div>
  );
}
