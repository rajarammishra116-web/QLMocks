import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Plus, AlertTriangle, HelpCircle, Shuffle, FileSpreadsheet, CheckCircle, Download, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import type { Test, Question, ClassLevel, TestType } from '@/types';

interface CreateTestProps {
  questions: Question[];
  onCreate: (test: Omit<Test, 'id' | 'createdAt'>) => void;
  onAddQuestions: (questions: Question[]) => Promise<Question[]>;
  onBack: () => void;
  getSubjectsByClass: (classLevel: ClassLevel) => { id: string; name: string; classLevel: ClassLevel }[];
  getQuestionsByFilter: (classLevel?: ClassLevel, subjectId?: string, chapterId?: string, topicId?: string) => Question[];
  t: (key: string) => string;
}

export function CreateTest({
  onCreate,
  onAddQuestions,
  onBack,
  getSubjectsByClass,
  getQuestionsByFilter,
  t,
}: CreateTestProps) {
  const [step, setStep] = useState(1);
  const [testName, setTestName] = useState('');
  const [classLevel, setClassLevel] = useState<ClassLevel>(9);
  const [testType, setTestType] = useState<TestType>('chapter-wise');
  const [board, setBoard] = useState<string>('CBSE');
  const [questionSource, setQuestionSource] = useState<'bank' | 'file'>('bank');

  // Bank selection state
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);

  // Exam schedule
  const [examDate, setExamDate] = useState<string>('');
  const [examTime, setExamTime] = useState<string>('');

  // File upload state
  const [file, setFile] = useState<File | null>(null);
  const [fileQuestions, setFileQuestions] = useState<Question[]>([]);
  const [fileErrors, setFileErrors] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const [numQuestions, setNumQuestions] = useState(10);
  const [timeLimit, setTimeLimit] = useState(30);
  const [marksPerQuestion, setMarksPerQuestion] = useState(1);
  const [negativeMarking, setNegativeMarking] = useState(false);
  const [negativeValue, setNegativeValue] = useState(0.25);
  const [shuffleQuestions, setShuffleQuestions] = useState(true);
  const [showResultImmediately, setShowResultImmediately] = useState(true);
  const [error, setError] = useState('');

  const onCreateTest = (test: Omit<Test, 'id' | 'createdAt'>) => onCreate(test);

  const availableSubjects = useMemo(() => getSubjectsByClass(classLevel), [classLevel, getSubjectsByClass]);

  // Update available subjects when class changes
  const handleClassChange = (newClass: ClassLevel) => {
    setClassLevel(newClass);
    setSelectedSubjects([]); // Reset selected subjects when class changes
  };

  const filteredQuestions = useMemo(() => {
    if (questionSource === 'file') {
      return fileQuestions;
    }

    let filtered = getQuestionsByFilter(classLevel);

    if (selectedSubjects.length > 0) {
      filtered = filtered.filter(q => selectedSubjects.includes(q.subjectId));
    }

    return filtered;
  }, [classLevel, selectedSubjects, getQuestionsByFilter, questionSource, fileQuestions]);

  const handleSubjectToggle = (subjectId: string) => {
    setSelectedSubjects(prev =>
      prev.includes(subjectId)
        ? prev.filter(id => id !== subjectId)
        : [...prev, subjectId]
    );
  };

  const downloadTemplate = () => {
    const template = [
      {
        Class: classLevel,
        Subject: 'Physics',
        Chapter: 'Motion',
        Topic: 'Distance and Displacement',
        Question_ID: 'UNIQUE_ID_001',
        Question_Text_EN: 'Sample Question',
        Question_Text_OR: 'ନମୁନା ପ୍ରଶ୍ନ',
        Option_A_EN: 'Option A',
        Option_A_OR: 'ବିକଳ୍ପ କ',
        Option_B_EN: 'Option B',
        Option_B_OR: 'ବିକଳ୍ପ ଖ',
        Option_C_EN: 'Option C',
        Option_C_OR: 'ବିକଳ୍ପ ଗ',
        Option_D_EN: 'Option D',
        Option_D_OR: 'ବିକଳ୍ପ ଘ',
        Correct_Option: 'A',
        Marks: 1,
      },
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Questions');
    XLSX.writeFile(wb, 'ExamTrack_Question_Template.xlsx');
  };

  const processFile = useCallback((file: File) => {
    setIsProcessing(true);
    setFileErrors([]);
    setFileQuestions([]);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        const newQuestions: Question[] = jsonData.map((row: any) => ({
          id: row.Question_ID,
          classLevel: row.Class,
          subjectId: `${row.Subject?.toLowerCase().substring(0, 3)}-${row.Class}`,
          chapterId: row.Chapter?.toLowerCase().replace(/\s+/g, '-'),
          topicId: row.Topic?.toLowerCase().replace(/\s+/g, '-'),
          questionTextEN: row.Question_Text_EN || '',
          questionTextOR: row.Question_Text_OR || '',
          options: {
            A: { en: row.Option_A_EN || '', or: row.Option_A_OR || '' },
            B: { en: row.Option_B_EN || '', or: row.Option_B_OR || '' },
            C: { en: row.Option_C_EN || '', or: row.Option_C_OR || '' },
            D: { en: row.Option_D_EN || '', or: row.Option_D_OR || '' },
          },
          correctOption: row.Correct_Option,
          marks: row.Marks,
        }));

        if (newQuestions.length === 0) {
          setFileErrors(['No questions found in file']);
        } else {
          const invalidRows = newQuestions.findIndex(q => !q.id || !q.questionTextEN || !q.correctOption);
          if (invalidRows >= 0) {
            setFileErrors([`Row ${invalidRows + 2} is missing required data`]);
          } else {
            setFileQuestions(newQuestions);
            const subjects = Array.from(new Set(newQuestions.map(q => q.subjectId)));
            setSelectedSubjects(subjects);
          }
        }
      } catch (err) {
        setFileErrors(['Failed to parse Excel file.']);
      }
      setIsProcessing(false);
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && (droppedFile.name.endsWith('.xlsx') || droppedFile.name.endsWith('.xls'))) {
      setFile(droppedFile);
      processFile(droppedFile);
    }
  }, [processFile]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      processFile(selectedFile);
    }
  }, [processFile]);

  const handleCreate = async () => {
    if (!testName.trim()) {
      setError('Test name is required');
      return;
    }

    // Validations based on source
    if (questionSource === 'bank') {
      if (selectedSubjects.length === 0) {
        setError('At least one subject must be selected for content');
        return;
      }
    } else {
      if (!file || fileQuestions.length === 0) {
        setError('Please upload a valid Excel file with questions');
        return;
      }
    }

    if (filteredQuestions.length === 0) {
      setError('No questions available for the selected criteria');
      return;
    }
    if (numQuestions > filteredQuestions.length) {
      setError(`Only ${filteredQuestions.length} questions available`);
      return;
    }

    // Capture the questions we will use for the test
    let questionsForTest = filteredQuestions;

    // If using file source, add questions to system first
    if (questionSource === 'file') {
      try {
        setIsProcessing(true);
        // Important: Use the questions returned by onAddQuestions which have the correct Firebase IDs
        const addedQuestions = await onAddQuestions(fileQuestions);
        questionsForTest = addedQuestions;
        setIsProcessing(false);
      } catch (err) {
        console.error('Failed to upload questions first:', err);
        setError('Failed to upload questions to database');
        setIsProcessing(false);
        return;
      }
    }

    const selectedQuestionIds = shuffleQuestions
      ? questionsForTest.sort(() => Math.random() - 0.5).slice(0, numQuestions).map(q => q.id)
      : questionsForTest.slice(0, numQuestions).map(q => q.id);

    // Use selectedSubjects for the test's subject IDs
    const finalSubjectIds = selectedSubjects;

    try {
      await onCreateTest({
        name: testName,
        type: testType,
        classLevel,
        board,
        subjectIds: finalSubjectIds,
        chapterIds: [], // No longer using chapter filters
        topicIds: [], // No longer using topic filters
        questionIds: selectedQuestionIds,
        totalQuestions: numQuestions,
        timeLimitMinutes: timeLimit,
        marksPerQuestion,
        negativeMarkingEnabled: negativeMarking,
        negativeMarkValue: negativeValue,
        passingPercentage: 40,
        shuffleQuestions,
        showResultImmediately,
        examDate: examDate || null,
        examTime: examTime || null,
        createdBy: 'admin',
      });
    } catch (err: any) {
      console.error('Failed to create test:', err);
      const errMsg = err?.message || err?.code || String(err);
      setError(`Failed to create test: ${errMsg}`);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="test-name">Test Name</Label>
        <Input
          id="test-name"
          placeholder="e.g., Physics - Motion Chapter Test"
          value={testName}
          onChange={(e) => setTestName(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label>Select Class</Label>
        <Select value={String(classLevel)} onValueChange={(v) => handleClassChange(Number(v) as ClassLevel)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="9">Class 9</SelectItem>
            <SelectItem value="10">Class 10</SelectItem>
            <SelectItem value="11">Class 11</SelectItem>
            <SelectItem value="12">Class 12</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Select Board</Label>
        <Select value={board} onValueChange={setBoard}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="CBSE">CBSE</SelectItem>
            <SelectItem value="Odisha">Odisha Board</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Test Type</Label>
        <Select value={testType} onValueChange={(v) => setTestType(v as TestType)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="chapter-wise">Chapter-wise Test</SelectItem>
            <SelectItem value="subject-wise">Subject-wise Test</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="exam-date">Exam Date (Optional)</Label>
          <Input
            id="exam-date"
            type="date"
            value={examDate}
            onChange={(e) => setExamDate(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="exam-time">Exam Time (Optional)</Label>
          <Input
            id="exam-time"
            type="time"
            value={examTime}
            onChange={(e) => setExamTime(e.target.value)}
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={() => setStep(2)}>Next Step</Button>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <Tabs value={questionSource} onValueChange={(v) => setQuestionSource(v as 'bank' | 'file')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="bank">Select from Question Bank</TabsTrigger>
          <TabsTrigger value="file">Upload Excel File</TabsTrigger>
        </TabsList>

        <TabsContent value="bank" className="space-y-6 mt-6">
          {/* Subject Group Filter */}
          <div>
            <Label className="mb-3 block">Subject Group</Label>
            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                variant={selectedSubjects.length === availableSubjects.length ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  // Select all subjects
                  setSelectedSubjects(availableSubjects.map(s => s.id));
                }}
              >
                All Subjects
              </Button>
              <Button
                type="button"
                variant={selectedSubjects.every(id =>
                  ['Physics', 'Chemistry', 'Mathematics', 'Biology'].includes(
                    availableSubjects.find(s => s.id === id)?.name || ''
                  )
                ) && selectedSubjects.length > 0 && selectedSubjects.length <= 4 ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  // Select science subjects only
                  const scienceIds = availableSubjects
                    .filter(s => ['Physics', 'Chemistry', 'Mathematics', 'Biology'].includes(s.name))
                    .map(s => s.id);
                  setSelectedSubjects(scienceIds);
                }}
              >
                Science
              </Button>
              <Button
                type="button"
                variant={selectedSubjects.every(id =>
                  ['History', 'Political Science', 'Geography', 'Economics'].includes(
                    availableSubjects.find(s => s.id === id)?.name || ''
                  )
                ) && selectedSubjects.length > 0 && selectedSubjects.length <= 4 ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  // Select social studies subjects only
                  const socialIds = availableSubjects
                    .filter(s => ['History', 'Political Science', 'Geography', 'Economics'].includes(s.name))
                    .map(s => s.id);
                  setSelectedSubjects(socialIds);
                }}
              >
                Social Studies
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSelectedSubjects([])}
              >
                Clear Selection
              </Button>
            </div>
          </div>

          {/* Individual Subject Selection */}
          <div>
            <Label className="mb-3 block">Select Individual Subjects</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {availableSubjects.map((subject) => (
                <div key={subject.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={subject.id}
                    checked={selectedSubjects.includes(subject.id)}
                    onCheckedChange={() => handleSubjectToggle(subject.id)}
                  />
                  <label htmlFor={subject.id} className="text-sm font-medium">
                    {subject.name}
                  </label>
                </div>
              ))}
            </div>
            {availableSubjects.length === 0 && (
              <p className="text-sm text-amber-600 mt-2">No subjects found for Class {classLevel}.</p>
            )}
            {selectedSubjects.length > 0 && (
              <p className="text-sm text-blue-600 mt-2">{selectedSubjects.length} subject(s) selected</p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="file" className="space-y-6 mt-6">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleFileDrop}
            className={`border-2 border-dashed border-gray-300 rounded-lg p-8 text-center transition-colors bg-white ${isProcessing ? 'opacity-50 cursor-wait' : 'hover:border-blue-500'}`}
          >
            {isProcessing ? (
              <Loader2 className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            )}
            <p className="text-lg font-medium text-gray-700 mb-2">
              {isProcessing ? 'Processing file...' : 'Drag and drop your Excel file here'}
            </p>
            <p className="text-sm text-gray-500 mb-4">or</p>
            <label>
              <input
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleFileSelect}
              />
              <Button variant="outline" asChild>
                <span>Browse Files</span>
              </Button>
            </label>
            <div className="mt-4 flex justify-center">
              <Button variant="ghost" size="sm" onClick={downloadTemplate} className="text-blue-600 hover:text-blue-700">
                <Download className="w-4 h-4 mr-2" />
                Download Template
              </Button>
            </div>
          </div>

          {file && (
            <div className="bg-blue-50 p-4 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="font-medium text-gray-900">{file.name}</p>
                  <p className="text-xs text-gray-500">
                    {fileQuestions.length} questions found
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => { setFile(null); setFileQuestions([]); }}>
                Remove
              </Button>
            </div>
          )}

          {fileErrors.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription>
                {fileErrors.map((e, i) => (
                  <div key={i}>{e}</div>
                ))}
              </AlertDescription>
            </Alert>
          )}

          {fileQuestions.length > 0 && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <AlertDescription className="text-green-700">
                Successfully parsed {fileQuestions.length} questions.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>
        {/* End Tabs */}
      </Tabs>

      <div className="flex justify-between mt-8">
        <Button variant="outline" onClick={() => setStep(1)}>Previous</Button>
        <Button onClick={() => setStep(3)}>Next Step</Button>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="bg-blue-50 p-4 rounded-lg">
        <p className="text-sm text-blue-700">
          <HelpCircle className="w-4 h-4 inline mr-2" />
          {filteredQuestions.length} questions available for selected criteria
        </p>
      </div>

      <div className="space-y-2">
        <Label>Number of Questions: {numQuestions}</Label>
        <Slider
          value={[numQuestions]}
          onValueChange={(v) => setNumQuestions(v[0])}
          min={1}
          max={Math.min(filteredQuestions.length, 100)}
          step={1}
        />
        <p className="text-sm text-gray-500">Max: {filteredQuestions.length} questions</p>
      </div>

      <div className="space-y-2">
        <Label>Time Limit: {timeLimit} minutes</Label>
        <Slider
          value={[timeLimit]}
          onValueChange={(v) => setTimeLimit(v[0])}
          min={5}
          max={180}
          step={5}
        />
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Switch
              checked={negativeMarking}
              onCheckedChange={setNegativeMarking}
            />
            <Label>Enable Negative Marking</Label>
          </div>
          {negativeMarking && (
            <Select value={String(negativeValue)} onValueChange={(v) => setNegativeValue(Number(v))}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0.25">-0.25</SelectItem>
                <SelectItem value="0.33">-0.33</SelectItem>
                <SelectItem value="0.5">-0.5</SelectItem>
                <SelectItem value="1">-1</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="space-y-2">
          <Label>Marks per Question: {marksPerQuestion}</Label>
          <Slider
            value={[marksPerQuestion]}
            onValueChange={(v) => setMarksPerQuestion(v[0])}
            min={1}
            max={10}
            step={1}
          />
        </div>

        <div className="flex items-center gap-2">
          <Switch
            checked={shuffleQuestions}
            onCheckedChange={setShuffleQuestions}
          />
          <Label className="flex items-center gap-2">
            <Shuffle className="w-4 h-4" />
            Shuffle Questions
          </Label>
        </div>

        <div className="flex items-center gap-2">
          <Switch
            checked={showResultImmediately}
            onCheckedChange={setShowResultImmediately}
          />
          <Label>Show Result Immediately</Label>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setStep(2)}>Previous</Button>
        <Button
          onClick={handleCreate}
          disabled={isProcessing}
          className="bg-gradient-to-r from-blue-600 to-indigo-600"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Plus className="w-4 h-4 mr-2" />
              Create Test
            </>
          )}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="w-6 h-6" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{t('create.title')}</h1>
              <p className="text-sm text-gray-500">Step {step} of 3</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle>
              {step === 1 && 'Basic Information'}
              {step === 2 && 'Select Content'}
              {step === 3 && 'Configure Settings'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
