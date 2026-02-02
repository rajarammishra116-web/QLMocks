import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload, Download, FileSpreadsheet, ArrowLeft, CheckCircle, AlertTriangle } from 'lucide-react';
import * as XLSX from 'xlsx';
import type { Question } from '@/types';

interface UploadQuestionsProps {
  onUpload: (questions: Question[]) => void;
  onBack: () => void;
  t: (key: string) => string;
}

export function UploadQuestions({ onUpload, onBack, t }: UploadQuestionsProps) {
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const downloadTemplate = () => {
    const template = [
      {
        Class: 9,
        Subject: 'Physics',
        Chapter: 'Motion',
        Topic: 'Distance and Displacement',
        Question_ID: 'PHY9_MOTION_001',
        Question_Text_EN: 'What is the SI unit of distance?',
        Question_Text_OR: 'ଦୂରତ୍ୱର SI ଏକକ କ\'ଣ?',
        Option_A_EN: 'Meter',
        Option_A_OR: 'ମିଟର',
        Option_B_EN: 'Kilogram',
        Option_B_OR: 'କିଲୋଗ୍ରାମ',
        Option_C_EN: 'Second',
        Option_C_OR: 'ସେକେଣ୍ଡ',
        Option_D_EN: 'Newton',
        Option_D_OR: 'ନ୍ୟୁଟନ',
        Correct_Option: 'A',
        Marks: 1,
      },
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Questions');
    XLSX.writeFile(wb, 'ExamTrack_Question_Template.xlsx');
  };

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && (droppedFile.name.endsWith('.xlsx') || droppedFile.name.endsWith('.xls'))) {
      setFile(droppedFile);
      processFile(droppedFile);
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      processFile(selectedFile);
    }
  }, []);

  const processFile = (file: File) => {
    setIsProcessing(true);
    setErrors([]);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        setPreviewData(jsonData.slice(0, 5));
        validateData(jsonData);
      } catch (err) {
        setErrors(['Failed to parse Excel file. Please check the format.']);
      }
      setIsProcessing(false);
    };
    reader.readAsArrayBuffer(file);
  };

  const validateData = (data: any[]) => {
    const validationErrors: string[] = [];
    const validClasses = [9, 10, 11, 12];
    const validOptions = ['A', 'B', 'C', 'D'];

    data.forEach((row, index) => {
      const rowNum = index + 2;

      if (!validClasses.includes(row.Class)) {
        validationErrors.push(`Row ${rowNum}: Invalid Class (must be 9, 10, 11, or 12)`);
      }
      if (!row.Subject) {
        validationErrors.push(`Row ${rowNum}: Subject is required`);
      }
      if (!row.Chapter) {
        validationErrors.push(`Row ${rowNum}: Chapter is required`);
      }
      if (!row.Topic) {
        validationErrors.push(`Row ${rowNum}: Topic is required`);
      }
      if (!row.Question_ID) {
        validationErrors.push(`Row ${rowNum}: Question_ID is required`);
      }
      if (!row.Question_Text_EN && !row.Question_Text_OR) {
        validationErrors.push(`Row ${rowNum}: At least one language question text is required`);
      }
      if (!validOptions.includes(row.Correct_Option)) {
        validationErrors.push(`Row ${rowNum}: Correct_Option must be A, B, C, or D`);
      }
      if (!row.Marks || row.Marks <= 0) {
        validationErrors.push(`Row ${rowNum}: Marks must be a positive number`);
      }
    });

    setErrors(validationErrors);
  };

  const handleUpload = () => {
    if (errors.length > 0) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        const questions: Question[] = jsonData.map((row: any) => ({
          id: row.Question_ID,
          classLevel: row.Class,
          subjectId: `${row.Subject.toLowerCase().substring(0, 3)}-${row.Class}`,
          chapterId: row.Chapter.toLowerCase().replace(/\s+/g, '-'),
          topicId: row.Topic.toLowerCase().replace(/\s+/g, '-'),
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

        onUpload(questions);
      } catch (err) {
        setErrors(['Failed to process file']);
      }
    };
    if (file) {
      reader.readAsArrayBuffer(file);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="w-6 h-6" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{t('upload.title')}</h1>
              <p className="text-sm text-gray-500">Upload questions from Excel file</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Upload Section */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Select Excel File</span>
                  <Button variant="outline" size="sm" onClick={downloadTemplate}>
                    <Download className="w-4 h-4 mr-2" />
                    {t('upload.template')}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleFileDrop}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-blue-500 transition-colors"
                >
                  <FileSpreadsheet className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-lg font-medium text-gray-700 mb-2">
                    Drag and drop your Excel file here
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
                  <p className="text-xs text-gray-400 mt-4">
                    Supports .xlsx and .xls files
                  </p>
                </div>

                {file && (
                  <div className="mt-6 p-4 bg-blue-50 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileSpreadsheet className="w-8 h-8 text-blue-600" />
                      <div>
                        <p className="font-medium text-gray-900">{file.name}</p>
                        <p className="text-sm text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setFile(null);
                        setPreviewData([]);
                        setErrors([]);
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Preview */}
            {previewData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Preview (First 5 rows)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Class</TableHead>
                          <TableHead>Subject</TableHead>
                          <TableHead>Chapter</TableHead>
                          <TableHead>Question (EN)</TableHead>
                          <TableHead>Correct</TableHead>
                          <TableHead>Marks</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {previewData.map((row, index) => (
                          <TableRow key={index}>
                            <TableCell>{row.Class}</TableCell>
                            <TableCell>{row.Subject}</TableCell>
                            <TableCell>{row.Chapter}</TableCell>
                            <TableCell className="max-w-xs truncate">
                              {row.Question_Text_EN}
                            </TableCell>
                            <TableCell>{row.Correct_Option}</TableCell>
                            <TableCell>{row.Marks}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Errors */}
            {errors.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="w-4 h-4" />
                <AlertDescription>
                  <p className="font-medium mb-2">Please fix the following errors:</p>
                  <ul className="list-disc list-inside space-y-1">
                    {errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Success */}
            {file && errors.length === 0 && (
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <AlertDescription className="text-green-700">
                  File validated successfully! Ready to upload.
                </AlertDescription>
              </Alert>
            )}

            {/* Upload Button */}
            {file && errors.length === 0 && (
              <div className="flex justify-end">
                <Button
                  onClick={handleUpload}
                  disabled={isProcessing}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {isProcessing ? 'Processing...' : 'Upload Questions'}
                </Button>
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Excel Format</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 text-sm">
                  <div>
                    <p className="font-medium text-gray-900 mb-2">Required Columns:</p>
                    <ul className="space-y-1 text-gray-600">
                      <li>• Class (9, 10, 11, 12)</li>
                      <li>• Subject (e.g., Physics)</li>
                      <li>• Chapter (e.g., Motion)</li>
                      <li>• Topic (e.g., Distance)</li>
                      <li>• Question_ID (unique)</li>
                      <li>• Question_Text_EN</li>
                      <li>• Question_Text_OR (optional)</li>
                      <li>• Option_A/B/C/D_EN</li>
                      <li>• Option_A/B/C/D_OR (optional)</li>
                      <li>• Correct_Option (A/B/C/D)</li>
                      <li>• Marks (number)</li>
                    </ul>
                  </div>
                  <div className="border-t pt-4">
                    <p className="font-medium text-gray-900 mb-2">Notes:</p>
                    <ul className="space-y-1 text-gray-600">
                      <li>• Download template for reference</li>
                      <li>• Odia text is optional but recommended</li>
                      <li>• Question_ID must be unique</li>
                      <li>• Marks must be positive</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
