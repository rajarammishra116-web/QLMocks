import { useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  CheckCircle,
  XCircle,
  HelpCircle,
  Target,
  TrendingUp,
  Download,
  ArrowLeft,
  Award,
  FileText
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import type { TestAttempt, Test, Question, Analytics } from '@/types';

interface ResultPageProps {
  attempt: TestAttempt;
  test: Test;
  questions: Question[];
  analytics: Analytics;
  onBack: () => void;
  getSubjectName: (id: string) => string;
  getChapterName: (id: string) => string;
  getTopicName: (id: string) => string;
  t: (key: string) => string;
  language: 'en' | 'or';
}

const COLORS = ['#22c55e', '#ef4444', '#f59e0b'];

export function ResultPage({
  attempt,
  test,
  questions,
  analytics,
  onBack,
  getSubjectName,
  getChapterName,
  getTopicName,
  t,
  language,
}: ResultPageProps) {
  const [showAnalysis, setShowAnalysis] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  const pieData = useMemo(() => [
    { name: t('result.correct'), value: attempt.correctCount || 0 },
    { name: t('result.incorrect'), value: attempt.incorrectCount || 0 },
    { name: t('result.unattempted'), value: attempt.unattemptedCount || 0 },
  ], [attempt, t]);

  const chapterData = useMemo(() => {
    return Object.entries(analytics.chapterWise).map(([chapterId, data]) => ({
      name: getChapterName(chapterId),
      accuracy: data.accuracy,
    }));
  }, [analytics.chapterWise, getChapterName]);

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
    if (grade.startsWith('A')) return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300';
    if (grade.startsWith('B')) return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300';
    if (grade === 'C') return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300';
    if (grade === 'D') return 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300';
    return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300';
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  // Add print styles
  const printStyles = `
    @media print {
      body * {
        visibility: hidden;
      }
      #result-container, #result-container * {
        visibility: visible;
      }
      #result-container {
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
      }
      header, button, .no-print {
        display: none !important;
      }
      .card {
        break-inside: avoid;
        page-break-inside: avoid;
        border: 1px solid #ddd;
        box-shadow: none;
      }
      /* Ensure text is black for printing */
      * {
        color: black !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      /* Hide background colors if needed or force them */
      .bg-green-100 { background-color: #dcfce7 !important; }
      .bg-red-100 { background-color: #fee2e2 !important; }
    }
  `;

  const downloadPDF = async () => {
    // Inject styles
    const styleSheet = document.createElement("style");
    styleSheet.innerText = printStyles;
    document.head.appendChild(styleSheet);

    // Ensure analysis is shown
    const wasAnalysisHidden = !showAnalysis;
    if (wasAnalysisHidden) {
      setShowAnalysis(true);
      // Small delay to allow render
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    window.print();

    // Clean up
    document.head.removeChild(styleSheet);
    if (wasAnalysisHidden) {
      setShowAnalysis(false);
    }
  };

  const strengths = useMemo(() => {
    return Object.entries(analytics.topicWise)
      .filter(([_, data]) => data.accuracy >= 70)
      .sort((a, b) => b[1].accuracy - a[1].accuracy)
      .slice(0, 3);
  }, [analytics.topicWise]);

  const weaknesses = useMemo(() => {
    return Object.entries(analytics.topicWise)
      .filter(([_, data]) => data.accuracy < 50)
      .sort((a, b) => a[1].accuracy - b[1].accuracy)
      .slice(0, 3);
  }, [analytics.topicWise]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={onBack} className="text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800">
                <ArrowLeft className="w-6 h-6" />
              </Button>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('result.title')}</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">{test.name}</p>
              </div>
            </div>
            <Button onClick={downloadPDF} variant="outline" className="border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800">
              <Download className="w-4 h-4 mr-2" />
              {t('result.downloadPDF')}
            </Button>
          </div>
        </div>
      </header>

      <main id="result-container" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" ref={resultRef}>
        {/* Score Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white">
            <CardContent className="p-6 text-center">
              <p className="text-blue-100 text-sm mb-1">{t('result.score')}</p>
              <p className="text-4xl font-bold">{attempt.score || 0}/{attempt.maxScore || 0}</p>
              <Progress value={((attempt.score || 0) / (attempt.maxScore || 1)) * 100} className="mt-3 bg-blue-800" />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-1">{t('result.percentage')}</p>
              <p className="text-4xl font-bold text-gray-900 dark:text-gray-100">{(attempt.percentage || 0).toFixed(1)}%</p>
              <Badge className={`mt-3 ${getGradeColor(getGrade(attempt.percentage || 0))}`}>
                {t('result.grade')}: {getGrade(attempt.percentage || 0)}
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-1">{t('result.accuracy')}</p>
              <p className="text-4xl font-bold text-gray-900 dark:text-gray-100">
                {(((attempt.correctCount || 0) / ((attempt.correctCount || 0) + (attempt.incorrectCount || 0))) * 100 || 0).toFixed(1)}%
              </p>
              <div className="flex justify-center gap-4 mt-3 text-sm">
                <span className="text-green-600 flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" /> {attempt.correctCount || 0}
                </span>
                <span className="text-red-600 flex items-center gap-1">
                  <XCircle className="w-4 h-4" /> {attempt.incorrectCount || 0}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-1">{t('result.timeTaken')}</p>
              <p className="text-4xl font-bold text-gray-900 dark:text-gray-100">{formatTime(attempt.timeTakenSeconds || 0)}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
                of {test.timeLimitMinutes} minutes
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Performance Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-blue-600" />
                Answer Distribution
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
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {pieData.map((_entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-6 mt-4">
                {pieData.map((entry, index) => (
                  <div key={entry.name} className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: COLORS[index] }}
                    />
                    <span className="text-sm text-gray-600">{entry.name}: {entry.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Chapter-wise Accuracy */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                Chapter-wise Accuracy
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chapterData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" domain={[0, 100]} />
                    <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(value) => `${value}%`} />
                    <Bar dataKey="accuracy" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Strength & Weakness Analysis */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Strengths */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-700">
                <Award className="w-5 h-5" />
                {t('result.strength')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {strengths.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-center py-4">No strong topics yet. Keep practicing!</p>
              ) : (
                <div className="space-y-3">
                  {strengths.map(([topicId, data]) => (
                    <div key={topicId} className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100">{getTopicName(topicId)}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{getChapterName(questions.find(q => q.topicId === topicId)?.chapterId || '')}</p>
                      </div>
                      <Badge className="bg-green-100 text-green-700">{data.accuracy}%</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Weaknesses */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-700">
                <HelpCircle className="w-5 h-5" />
                {t('result.weakness')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {weaknesses.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-center py-4">Great job! No weak topics identified.</p>
              ) : (
                <div className="space-y-3">
                  {weaknesses.map(([topicId, data]) => (
                    <div key={topicId} className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100">{getTopicName(topicId)}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{getChapterName(questions.find(q => q.topicId === topicId)?.chapterId || '')}</p>
                      </div>
                      <Badge className="bg-red-100 text-red-700">{data.accuracy}%</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Subject-wise Performance */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Subject-wise Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(analytics.subjectWise).map(([subjectId, data]) => (
                <div key={subjectId} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <p className="font-medium text-gray-900 dark:text-gray-100">{getSubjectName(subjectId)}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Accuracy</span>
                    <span className="font-semibold">{data.accuracy}%</span>
                  </div>
                  <Progress value={data.accuracy} className="mt-2" />
                  <div className="flex items-center justify-between mt-2 text-sm">
                    <span className="text-green-600">{data.correct} correct</span>
                    <span className="text-gray-500 dark:text-gray-400">of {data.total}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-center gap-4 mb-8">
          <Button onClick={onBack} variant="outline" className="border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('result.backDashboard')}
          </Button>
          <Button onClick={() => {
            setShowAnalysis(!showAnalysis);
            // Scroll after state update
            setTimeout(() => {
              const element = document.getElementById('answer-review');
              if (element) {
                element.scrollIntoView({ behavior: 'smooth' });
              }
            }, 100);
          }}>
            {showAnalysis ? 'Hide Answers' : 'Review Answers'}
          </Button>
        </div>

        {/* Detailed Answer Review */}
        {showAnalysis && (
          <Card id="answer-review" className="mt-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                Detailed Answer Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {questions.map((question, index) => {
                  const studentAnswer = attempt.answers[question.id];
                  const isCorrect = studentAnswer === question.correctOption;
                  const isUnanswered = !studentAnswer;

                  // Helper to get localized text
                  const getQuestionText = () => {
                    return language === 'or' && question.questionTextOR
                      ? question.questionTextOR
                      : question.questionTextEN;
                  };

                  const getOptionText = (opt: 'A' | 'B' | 'C' | 'D') => {
                    const optData = question.options[opt];
                    return language === 'or' && optData.or
                      ? optData.or
                      : optData.en;
                  };

                  return (
                    <div key={question.id} className={`p-4 rounded-lg border ${isCorrect ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20' :
                      isUnanswered ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800' :
                        'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20'
                      }`}>
                      <div className="flex items-start gap-4">
                        <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-white dark:bg-gray-800 font-bold text-sm shadow-sm">
                          {index + 1}
                        </span>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 dark:text-gray-100 mb-3">{getQuestionText()}</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {(['A', 'B', 'C', 'D'] as const).map((optionKey) => {
                              const optionText = getOptionText(optionKey);

                              let optionClass = "p-3 rounded-lg border flex items-center gap-3 ";

                              // Styling logic
                              if (question.correctOption === optionKey) {
                                optionClass += "bg-green-100 border-green-500 ring-1 ring-green-500"; // Correct answer (always green)
                              } else if (studentAnswer === optionKey && !isCorrect) {
                                optionClass += "bg-red-100 border-red-500 ring-1 ring-red-500"; // Wrong student answer (red)
                              } else {
                                optionClass += "bg-white dark:bg-gray-800 border-gray-200"; // Neutral
                              }

                              return (
                                <div key={optionKey} className={optionClass}>
                                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border ${question.correctOption === optionKey ? 'bg-green-600 text-white border-green-600' :
                                    (studentAnswer === optionKey && !isCorrect) ? 'bg-red-600 text-white border-red-600' :
                                      'bg-gray-100 text-gray-500 dark:text-gray-400 border-gray-300'
                                    }`}>
                                    {optionKey}
                                  </div>
                                  <span className={`text-sm ${question.correctOption === optionKey ? 'font-medium text-green-900' :
                                    (studentAnswer === optionKey && !isCorrect) ? 'font-medium text-red-900' :
                                      'text-gray-700'
                                    }`}>
                                    {optionText}
                                  </span>
                                  {studentAnswer === optionKey && (
                                    <span className="ml-auto text-xs font-medium px-2 py-1 rounded bg-white dark:bg-gray-800/50">
                                      Your Answer
                                    </span>
                                  )}
                                  {question.correctOption === optionKey && studentAnswer !== optionKey && (
                                    <span className="ml-auto text-xs font-medium px-2 py-1 rounded bg-green-200 text-green-800">
                                      Correct Answer
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
