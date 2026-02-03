import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Eye, GraduationCap, Users, TrendingUp, BookOpen, ChevronRight } from 'lucide-react';
import type { TestAttempt, Test } from '@/types';

interface AllResultsProps {
  attempts: TestAttempt[];
  tests: Test[];
  onViewAttempt: (attemptId: string) => void;
  onBack: () => void;
  getSubjectName: (id: string) => string;
  t: (key: string) => string;
}

type ViewLevel = 'tests' | 'students' | 'result';

export function AllResults({
  attempts,
  tests,
  onViewAttempt,
  onBack,
  getSubjectName,
}: AllResultsProps) {
  // Navigation state
  const [viewLevel, setViewLevel] = useState<ViewLevel>('tests');
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null);

  // Filters
  const [filterClass, setFilterClass] = useState<string>('all');
  const [filterBoard, setFilterBoard] = useState<string>('all');

  // Get completed attempts only
  const completedAttempts = useMemo(() =>
    attempts.filter(a => a.status === 'completed'),
    [attempts]
  );

  // Filter tests by class (only tests that exist - not deleted)
  const filteredTests = useMemo(() => {
    return tests.filter(test => {
      if (filterClass !== 'all' && test.classLevel !== Number(filterClass)) {
        return false;
      }
      // Board filter can be added here when tests have a board property
      return true;
    });
  }, [tests, filterClass]);

  // Get test statistics (based on FIRST attempt only)
  const testStats = useMemo(() => {
    const stats = new Map<string, {
      totalAttempts: number;
      avgScore: number;
      uniqueStudents: number;
      attempts: TestAttempt[];
    }>();

    filteredTests.forEach(test => {
      const testAttempts = completedAttempts.filter(a => a.testId === test.id);

      // Filter for first attempts only
      const firstAttemptsMap = new Map<string, TestAttempt>();
      // Sort to ensure we get earliest
      const sortedAttempts = [...testAttempts].sort((a, b) =>
        new Date(a.startedAt || 0).getTime() - new Date(b.startedAt || 0).getTime()
      );

      sortedAttempts.forEach(a => {
        if (!firstAttemptsMap.has(a.studentId)) {
          firstAttemptsMap.set(a.studentId, a);
        }
      });

      const firstAttempts = Array.from(firstAttemptsMap.values());

      const avgScore = firstAttempts.length > 0
        ? firstAttempts.reduce((sum, a) => sum + (a.percentage || 0), 0) / firstAttempts.length
        : 0;

      stats.set(test.id, {
        totalAttempts: firstAttempts.length, // Count of unique first attempts (students)
        avgScore,
        uniqueStudents: firstAttemptsMap.size,
        attempts: firstAttempts,
      });
    });

    return stats;
  }, [filteredTests, completedAttempts]);

  // Get students for selected test
  const studentsForTest = useMemo(() => {
    if (!selectedTestId) return [];

    const testAttempts = completedAttempts.filter(a => a.testId === selectedTestId);

    // Group by student, get their FIRST attempt
    const studentMap = new Map<string, TestAttempt>();

    // Sort by date ascending
    const sortedAttempts = [...testAttempts].sort((a, b) =>
      new Date(a.startedAt || 0).getTime() - new Date(b.startedAt || 0).getTime()
    );

    sortedAttempts.forEach(attempt => {
      if (!studentMap.has(attempt.studentId)) {
        studentMap.set(attempt.studentId, attempt);
      }
    });

    // Sort by percentage for the rank list
    return Array.from(studentMap.values()).sort((a, b) =>
      (b.percentage || 0) - (a.percentage || 0)
    );
  }, [selectedTestId, completedAttempts]);

  const selectedTest = tests.find(t => t.id === selectedTestId);

  const getGrade = (percentage: number): string => {
    if (percentage >= 90) return 'A+';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B+';
    if (percentage >= 60) return 'B';
    if (percentage >= 50) return 'C';
    if (percentage >= 40) return 'D';
    return 'F';
  };

  const getGradeColor = (grade: string): string => {
    if (grade.startsWith('A')) return 'bg-green-100 text-green-700';
    if (grade.startsWith('B')) return 'bg-blue-100 text-blue-700';
    if (grade === 'C') return 'bg-yellow-100 text-yellow-700';
    if (grade === 'D') return 'bg-orange-100 text-orange-700';
    return 'bg-red-100 text-red-700';
  };

  const handleViewTest = (testId: string) => {
    setSelectedTestId(testId);
    setViewLevel('students');
  };

  const handleViewStudentResult = (attemptId: string) => {
    onViewAttempt(attemptId);
  };

  const handleBack = () => {
    if (viewLevel === 'students') {
      setViewLevel('tests');
      setSelectedTestId(null);
    } else {
      onBack();
    }
  };

  // Summary stats
  const summaryStats = useMemo(() => {
    const totalTests = filteredTests.length;

    // Filter out relevant attempts
    const relevantAttempts = completedAttempts.filter(a =>
      filteredTests.some(t => t.id === a.testId)
    );

    // Get unique first attempts
    const firstAttemptsMap = new Map<string, TestAttempt>();
    const sortedAttempts = [...relevantAttempts].sort((a, b) =>
      new Date(a.startedAt || 0).getTime() - new Date(b.startedAt || 0).getTime()
    );

    sortedAttempts.forEach(attempt => {
      const key = `${attempt.studentId}-${attempt.testId}`;
      if (!firstAttemptsMap.has(key)) {
        firstAttemptsMap.set(key, attempt);
      }
    });

    const firstAttempts = Array.from(firstAttemptsMap.values());

    const totalAttempts = firstAttempts.length;
    const avgScore = totalAttempts > 0
      ? firstAttempts.reduce((sum, a) => sum + (a.percentage || 0), 0) / totalAttempts
      : 0;

    const uniqueStudents = new Set(firstAttempts.map(a => a.studentId)).size;

    return { totalTests, totalAttempts, avgScore, uniqueStudents };
  }, [filteredTests, completedAttempts]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={handleBack}>
                <ArrowLeft className="w-6 h-6" />
              </Button>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 transition-colors">
                  {viewLevel === 'tests' ? 'All Results' : selectedTest?.name || 'Test Results'}
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {viewLevel === 'tests'
                    ? 'View test performances and student results'
                    : `${studentsForTest.length} students attempted this test`
                  }
                </p>
              </div>
            </div>
            {viewLevel === 'students' && (
              <Badge variant="outline" className="text-sm">
                Class {selectedTest?.classLevel}
              </Badge>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {viewLevel === 'tests' && (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Tests</p>
                    <p className="text-2xl font-bold">{summaryStats.totalTests}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                    <Users className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Students</p>
                    <p className="text-2xl font-bold">{summaryStats.uniqueStudents}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                    <GraduationCap className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Attempts</p>
                    <p className="text-2xl font-bold">{summaryStats.totalAttempts}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Score</p>
                    <p className="text-2xl font-bold">{summaryStats.avgScore.toFixed(1)}%</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filters */}
            <Card className="mb-6">
              <CardContent className="p-4">
                <div className="flex flex-wrap gap-4">
                  <Select value={filterBoard} onValueChange={setFilterBoard}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Board" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Boards</SelectItem>
                      <SelectItem value="CBSE">CBSE</SelectItem>
                      <SelectItem value="Odisha">Odisha State Board</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filterClass} onValueChange={setFilterClass}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Class" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Classes</SelectItem>
                      <SelectItem value="9">Class 9</SelectItem>
                      <SelectItem value="10">Class 10</SelectItem>
                      <SelectItem value="11">Class 11</SelectItem>
                      <SelectItem value="12">Class 12</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Tests List */}
            <Card>
              <CardHeader>
                <CardTitle>Tests ({filteredTests.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {filteredTests.length === 0 ? (
                  <div className="text-center py-12">
                    <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">No tests found</h3>
                    <p className="text-gray-500">Create tests to see results here</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Test Name</TableHead>
                        <TableHead>Class</TableHead>
                        <TableHead>Subjects</TableHead>
                        <TableHead className="text-center">Students</TableHead>
                        <TableHead className="text-center">Attempts</TableHead>
                        <TableHead className="text-center">Avg Score</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTests.map(test => {
                        const stats = testStats.get(test.id);
                        return (
                          <TableRow key={test.id}>
                            <TableCell className="font-medium">{test.name}</TableCell>
                            <TableCell>
                              <Badge variant="outline">Class {test.classLevel}</Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {test.subjectIds.slice(0, 2).map(id => (
                                  <Badge key={id} variant="secondary" className="text-xs">
                                    {getSubjectName(id)}
                                  </Badge>
                                ))}
                                {test.subjectIds.length > 2 && (
                                  <Badge variant="secondary" className="text-xs">
                                    +{test.subjectIds.length - 2}
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className="font-semibold">{stats?.uniqueStudents || 0}</span>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className="font-semibold">{stats?.totalAttempts || 0}</span>
                            </TableCell>
                            <TableCell className="text-center">
                              {stats && stats.totalAttempts > 0 ? (
                                <Badge className={getGradeColor(getGrade(stats.avgScore))}>
                                  {stats.avgScore.toFixed(1)}%
                                </Badge>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewTest(test.id)}
                                disabled={!stats || stats.totalAttempts === 0}
                              >
                                View <ChevronRight className="w-4 h-4 ml-1" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {viewLevel === 'students' && selectedTest && (
          <>
            {/* Test Info */}
            <Card className="mb-6">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-lg">{selectedTest.name}</h3>
                    <div className="flex gap-2 mt-1">
                      {selectedTest.subjectIds.map(id => (
                        <Badge key={id} variant="secondary">{getSubjectName(id)}</Badge>
                      ))}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Questions</p>
                    <p className="text-2xl font-bold">{selectedTest.questionIds.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Students List */}
            <Card>
              <CardHeader>
                <CardTitle>Student Performances ({studentsForTest.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {studentsForTest.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">No attempts yet</h3>
                    <p className="text-gray-500">No students have taken this test yet</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Rank</TableHead>
                        <TableHead>Student Name</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-center">Score</TableHead>
                        <TableHead className="text-center">Correct</TableHead>
                        <TableHead className="text-center">Wrong</TableHead>
                        <TableHead className="text-center">Grade</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {studentsForTest.map((attempt, index) => {
                        const grade = getGrade(attempt.percentage || 0);
                        return (
                          <TableRow key={attempt.id}>
                            <TableCell>
                              <Badge variant={index < 3 ? 'default' : 'outline'}>
                                #{index + 1}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium">
                              {attempt.studentName || 'Unknown Student'}
                            </TableCell>
                            <TableCell>
                              {new Date(attempt.submittedAt || Date.now()).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-center font-semibold">
                              {(attempt.percentage || 0).toFixed(1)}%
                            </TableCell>
                            <TableCell className="text-center text-green-600">
                              {attempt.correctCount || 0}
                            </TableCell>
                            <TableCell className="text-center text-red-600">
                              {attempt.incorrectCount || 0}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge className={getGradeColor(grade)}>{grade}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewStudentResult(attempt.id)}
                              >
                                <Eye className="w-4 h-4 mr-1" /> View Result
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
