import { useState, useCallback } from 'react';
import type { Language } from '@/types';

interface Translations {
  [key: string]: {
    en: string;
    or: string;
  };
}

const TRANSLATIONS: Translations = {
  // Navigation
  'nav.dashboard': {
    en: 'Dashboard',
    or: 'ଡ୍ୟାସବୋର୍ଡ',
  },
  'nav.tests': {
    en: 'Tests',
    or: 'ପରୀକ୍ଷା',
  },
  'nav.results': {
    en: 'Results',
    or: 'ଫଳାଫଳ',
  },
  'nav.admin': {
    en: 'Admin Panel',
    or: 'ଆଡମିନ୍ ପ୍ୟାନେଲ',
  },
  'nav.logout': {
    en: 'Logout',
    or: 'ଲଗଆଉଟ୍',
  },
  
  // Auth
  'auth.login': {
    en: 'Login',
    or: 'ଲଗଇନ୍',
  },
  'auth.register': {
    en: 'Register',
    or: 'ପଞ୍ଜୀକରଣ',
  },
  'auth.email': {
    en: 'Email',
    or: 'ଇମେଲ୍',
  },
  'auth.password': {
    en: 'Password',
    or: 'ପାସୱାର୍ଡ',
  },
  'auth.name': {
    en: 'Full Name',
    or: 'ପୂର୍ଣ୍ଣ ନାମ',
  },
  'auth.class': {
    en: 'Class',
    or: 'ଶ୍ରେଣୀ',
  },
  'auth.role': {
    en: 'Role',
    or: 'ଭୂମିକା',
  },
  'auth.student': {
    en: 'Student',
    or: 'ଛାତ୍ର',
  },
  'auth.admin': {
    en: 'Admin',
    or: 'ଆଡମିନ୍',
  },
  'auth.submit': {
    en: 'Submit',
    or: 'ଦାଖଲ କରନ୍ତୁ',
  },
  'auth.noAccount': {
    en: "Don't have an account?",
    or: 'ଖାତା ନାହିଁ?',
  },
  'auth.hasAccount': {
    en: 'Already have an account?',
    or: 'ପୂର୍ବରୁ ଖାତା ଅଛି?',
  },
  
  // Dashboard
  'dash.welcome': {
    en: 'Welcome',
    or: 'ସ୍ଵାଗତ',
  },
  'dash.class': {
    en: 'Class',
    or: 'ଶ୍ରେଣୀ',
  },
  'dash.subjects': {
    en: 'Subjects',
    or: 'ବିଷୟଗୁଡିକ',
  },
  'dash.recentTests': {
    en: 'Recent Tests',
    or: 'ସାମ୍ପ୍ରତିକ ପରୀକ୍ଷାଗୁଡିକ',
  },
  'dash.bestSubject': {
    en: 'Best Performing Subject',
    or: 'ସର୍ବୋତ୍ତମ ବିଷୟ',
  },
  'dash.weakChapters': {
    en: 'Weakest Chapters',
    or: 'ଦୁର୍ବଳ ଅଧ୍ୟାୟଗୁଡିକ',
  },
  'dash.progress': {
    en: 'Progress Over Time',
    or: 'ସମୟ ସହିତ ପ୍ରଗତି',
  },
  'dash.noTests': {
    en: 'No tests taken yet',
    or: 'ଏପର୍ଯ୍ୟନ୍ତ କୌଣସି ପରୀକ୍ଷା ନାହିଁ',
  },
  'dash.startTest': {
    en: 'Start New Test',
    or: 'ନୂଆ ପରୀକ୍ଷା ଆରମ୍ଭ କରନ୍ତୁ',
  },
  'dash.viewAll': {
    en: 'View All',
    or: 'ସବୁ ଦେଖନ୍ତୁ',
  },
  
  // Tests
  'test.title': {
    en: 'Available Tests',
    or: 'ଉପଲବ୍ଧ ପରୀକ୍ଷାଗୁଡିକ',
  },
  'test.type': {
    en: 'Test Type',
    or: 'ପରୀକ୍ଷା ପ୍ରକାର',
  },
  'test.subject': {
    en: 'Subject',
    or: 'ବିଷୟ',
  },
  'test.chapter': {
    en: 'Chapter',
    or: 'ଅଧ୍ୟାୟ',
  },
  'test.questions': {
    en: 'Questions',
    or: 'ପ୍ରଶ୍ନଗୁଡିକ',
  },
  'test.duration': {
    en: 'Duration',
    or: 'ଅବଧି',
  },
  'test.marks': {
    en: 'Marks',
    or: 'ମାର୍କ୍ସ',
  },
  'test.negative': {
    en: 'Negative Marking',
    or: 'ଋଣାତ୍ମକ ମାର୍କିଂ',
  },
  'test.start': {
    en: 'Start Test',
    or: 'ପରୀକ୍ଷା ଆରମ୍ଭ କରନ୍ତୁ',
  },
  'test.chapterWise': {
    en: 'Chapter-wise',
    or: 'ଅଧ୍ୟାୟ-ଅନୁସାରେ',
  },
  'test.subjectWise': {
    en: 'Subject-wise',
    or: 'ବିଷୟ-ଅନୁସାରେ',
  },
  'test.fullSyllabus': {
    en: 'Full Syllabus',
    or: 'ସମ୍ପୂର୍ଣ୍ଣ ପାଠ୍ୟକ୍ରମ',
  },
  'test.practice': {
    en: 'Practice',
    or: 'ଅଭ୍ୟାସ',
  },
  
  // Test Taking
  'take.question': {
    en: 'Question',
    or: 'ପ୍ରଶ୍ନ',
  },
  'take.of': {
    en: 'of',
    or: 'ରୁ',
  },
  'take.timeLeft': {
    en: 'Time Left',
    or: 'ବାକି ସମୟ',
  },
  'take.previous': {
    en: 'Previous',
    or: 'ପୂର୍ବବର୍ତ୍ତୀ',
  },
  'take.next': {
    en: 'Next',
    or: 'ପରବର୍ତ୍ତୀ',
  },
  'take.submit': {
    en: 'Submit Test',
    or: 'ପରୀକ୍ଷା ଦାଖଲ କରନ୍ତୁ',
  },
  'take.confirmSubmit': {
    en: 'Are you sure you want to submit?',
    or: 'ଆପଣ ଦାଖଲ କରିବାକୁ ଚାହାଁନ୍ତି କି?',
  },
  'take.unattempted': {
    en: 'Unattempted questions',
    or: 'ଅପ୍ରଚେଷ୍ଟିତ ପ୍ରଶ୍ନଗୁଡିକ',
  },
  'take.optionA': {
    en: 'A',
    or: 'କ',
  },
  'take.optionB': {
    en: 'B',
    or: 'ଖ',
  },
  'take.optionC': {
    en: 'C',
    or: 'ଗ',
  },
  'take.optionD': {
    en: 'D',
    or: 'ଘ',
  },
  
  // Results
  'result.title': {
    en: 'Test Result',
    or: 'ପରୀକ୍ଷା ଫଳାଫଳ',
  },
  'result.score': {
    en: 'Score',
    or: 'ସ୍କୋର୍',
  },
  'result.percentage': {
    en: 'Percentage',
    or: 'ଶତକଡ଼ା',
  },
  'result.grade': {
    en: 'Grade',
    or: 'ଗ୍ରେଡ୍',
  },
  'result.accuracy': {
    en: 'Accuracy',
    or: 'ସଠିକତା',
  },
  'result.timeTaken': {
    en: 'Time Taken',
    or: 'ଲାଗିଥିବା ସମୟ',
  },
  'result.correct': {
    en: 'Correct',
    or: 'ସଠିକ୍',
  },
  'result.incorrect': {
    en: 'Incorrect',
    or: 'ଭୁଲ୍',
  },
  'result.unattempted': {
    en: 'Unattempted',
    or: 'ଅପ୍ରଚେଷ୍ଟିତ',
  },
  'result.analysis': {
    en: 'Performance Analysis',
    or: 'ପ୍ରଦର୍ଶନ ବିଶ୍ଳେଷଣ',
  },
  'result.strength': {
    en: 'Strengths',
    or: 'ଶକ୍ତିଗୁଡିକ',
  },
  'result.weakness': {
    en: 'Weaknesses',
    or: 'ଦୁର୍ବଳତାଗୁଡିକ',
  },
  'result.downloadPDF': {
    en: 'Download PDF',
    or: 'PDF ଡାଉନଲୋଡ୍ କରନ୍ତୁ',
  },
  'result.backDashboard': {
    en: 'Back to Dashboard',
    or: 'ଡ୍ୟାସବୋର୍ଡକୁ ଫେରନ୍ତୁ',
  },
  
  // Admin
  'admin.title': {
    en: 'Admin Dashboard',
    or: 'ଆଡମିନ୍ ଡ୍ୟାସବୋର୍ଡ',
  },
  'admin.upload': {
    en: 'Upload Questions',
    or: 'ପ୍ରଶ୍ନ ଅପଲୋଡ୍ କରନ୍ତୁ',
  },
  'admin.createTest': {
    en: 'Create Test',
    or: 'ପରୀକ୍ଷା ସୃଷ୍ଟି କରନ୍ତୁ',
  },
  'admin.manageTests': {
    en: 'Manage Tests',
    or: 'ପରୀକ୍ଷା ପରିଚାଳନା',
  },
  'admin.viewResults': {
    en: 'View All Results',
    or: 'ସମସ୍ତ ଫଳାଫଳ ଦେଖନ୍ତୁ',
  },
  'admin.totalQuestions': {
    en: 'Total Questions',
    or: 'ମୋଟ ପ୍ରଶ୍ନଗୁଡିକ',
  },
  'admin.totalTests': {
    en: 'Total Tests',
    or: 'ମୋଟ ପରୀକ୍ଷାଗୁଡିକ',
  },
  'admin.totalStudents': {
    en: 'Total Students',
    or: 'ମୋଟ ଛାତ୍ରଗଣ',
  },
  
  // Upload
  'upload.title': {
    en: 'Upload Questions from Excel',
    or: 'Excelରୁ ପ୍ରଶ୍ନ ଅପଲୋଡ୍ କରନ୍ତୁ',
  },
  'upload.selectFile': {
    en: 'Select Excel File',
    or: 'Excel ଫାଇଲ୍ ବାଛନ୍ତୁ',
  },
  'upload.dragDrop': {
    en: 'Drag and drop or click to select',
    or: 'ଡ୍ରାଗ୍ ଏବଂ ଡ୍ରପ୍ କରନ୍ତୁ କିମ୍ବା କ୍ଲିକ୍ କରନ୍ତୁ',
  },
  'upload.preview': {
    en: 'Preview',
    or: 'ପ୍ରିଭ୍ୟୁ',
  },
  'upload.upload': {
    en: 'Upload',
    or: 'ଅପଲୋଡ୍',
  },
  'upload.success': {
    en: 'Questions uploaded successfully',
    or: 'ପ୍ରଶ୍ନଗୁଡିକ ସଫଳତାର ସହିତ ଅପଲୋଡ୍ ହେଲା',
  },
  'upload.template': {
    en: 'Download Template',
    or: 'ଟେମ୍ପଲେଟ୍ ଡାଉନଲୋଡ୍ କରନ୍ତୁ',
  },
  
  // Create Test
  'create.title': {
    en: 'Create New Test',
    or: 'ନୂଆ ପରୀକ୍ଷା ସୃଷ୍ଟି କରନ୍ତୁ',
  },
  'create.testName': {
    en: 'Test Name',
    or: 'ପରୀକ୍ଷା ନାମ',
  },
  'create.selectClass': {
    en: 'Select Class',
    or: 'ଶ୍ରେଣୀ ବାଛନ୍ତୁ',
  },
  'create.selectSubject': {
    en: 'Select Subject',
    or: 'ବିଷୟ ବାଛନ୍ତୁ',
  },
  'create.selectChapter': {
    en: 'Select Chapter',
    or: 'ଅଧ୍ୟାୟ ବାଛନ୍ତୁ',
  },
  'create.selectTopics': {
    en: 'Select Topics',
    or: 'ବିଷୟବସ୍ତୁ ବାଛନ୍ତୁ',
  },
  'create.numQuestions': {
    en: 'Number of Questions',
    or: 'ପ୍ରଶ୍ନ ସଂଖ୍ୟା',
  },
  'create.timeLimit': {
    en: 'Time Limit (minutes)',
    or: 'ସମୟ ସୀମା (ମିନିଟ୍)',
  },
  'create.enableNegative': {
    en: 'Enable Negative Marking',
    or: 'ଋଣାତ୍ମକ ମାର୍କିଂ ସକ୍ରିୟ କରନ୍ତୁ',
  },
  'create.negativeValue': {
    en: 'Negative Mark Value',
    or: 'ଋଣାତ୍ମକ ମାର୍କ୍ ମୂଲ୍ୟ',
  },
  'create.shuffle': {
    en: 'Shuffle Questions',
    or: 'ପ୍ରଶ୍ନଗୁଡିକ ମିଶ୍ରଣ କରନ୍ତୁ',
  },
  'create.create': {
    en: 'Create Test',
    or: 'ପରୀକ୍ଷା ସୃଷ୍ଟି କରନ୍ତୁ',
  },
  
  // Common
  'common.loading': {
    en: 'Loading...',
    or: 'ଲୋଡ୍ ହେଉଛି...',
  },
  'common.save': {
    en: 'Save',
    or: 'ସଞ୍ଚୟ କରନ୍ତୁ',
  },
  'common.cancel': {
    en: 'Cancel',
    or: 'ବାତିଲ୍ କରନ୍ତୁ',
  },
  'common.delete': {
    en: 'Delete',
    or: 'ବିଲୋପ କରନ୍ତୁ',
  },
  'common.edit': {
    en: 'Edit',
    or: 'ସମ୍ପାଦନା',
  },
  'common.search': {
    en: 'Search',
    or: 'ଖୋଜନ୍ତୁ',
  },
  'common.filter': {
    en: 'Filter',
    or: 'ଫିଲ୍ଟର୍',
  },
  'common.all': {
    en: 'All',
    or: 'ସମସ୍ତ',
  },
  'common.minutes': {
    en: 'minutes',
    or: 'ମିନିଟ୍',
  },
  'common.seconds': {
    en: 'seconds',
    or: 'ସେକେଣ୍ଡ',
  },
};

export function useLanguage() {
  const [language, setLanguage] = useState<Language>('en');

  const toggleLanguage = useCallback(() => {
    setLanguage(prev => prev === 'en' ? 'or' : 'en');
  }, []);

  const setLang = useCallback((lang: Language) => {
    setLanguage(lang);
  }, []);

  const t = useCallback((key: string): string => {
    const translation = TRANSLATIONS[key];
    if (!translation) return key;
    return translation[language];
  }, [language]);

  return {
    language,
    toggleLanguage,
    setLang,
    t,
  };
}
