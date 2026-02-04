import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mail, Lock, User, BookOpen, Eye, EyeOff, CheckCircle, ArrowRight, XCircle } from 'lucide-react';
import type { UserRole, ClassLevel } from '@/types';
import { validatePassword } from '@/lib/validation';

interface LoginProps {
  onLogin: (email: string, password: string) => Promise<boolean>;
  onRegister: (name: string, email: string, password: string, role: UserRole, classLevel?: number, board?: string) => Promise<{ success: boolean; error?: string }>;
  t: (key: string) => string;
  onForgotPassword?: (email: string) => Promise<boolean>;
}

export function Login({ onLogin, onRegister, t, onForgotPassword }: LoginProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [activeTab, setActiveTab] = useState('login');
  const [showPassword, setShowPassword] = useState(false);
  const [forgotPasswordMode, setForgotPasswordMode] = useState(false);

  // Registration Success State
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState({ email: '', password: '' });

  // Admin mode check
  const [isAdminMode, setIsAdminMode] = useState(false);

  useEffect(() => {
    const checkHash = () => {
      setIsAdminMode(window.location.hash === '#admin');
    };

    checkHash();
    window.addEventListener('hashchange', checkHash);
    return () => window.removeEventListener('hashchange', checkHash);
  }, []);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRole, setRegRole] = useState<UserRole>('student');
  const [regClass, setRegClass] = useState<ClassLevel>(9);
  const [regBoard, setRegBoard] = useState('CBSE');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      if (forgotPasswordMode) {
        if (onForgotPassword) {
          const sent = await onForgotPassword(loginEmail);
          if (sent) {
            setSuccessMsg('Password reset email sent! Please check your inbox and spam/junk folder.');
            setForgotPasswordMode(false);
          } else {
            setError('Failed to send reset email. Please try again.');
          }
        }
        return;
      }

      const success = await onLogin(loginEmail, loginPassword);
      if (!success) {
        // If success is false, it means useAuth.login returned correctly but failed.
        // It might have already alerted, but we can set a generic error here just in case.
        // Note: useAuth.login already alerts, so we might just want to be sure UI is ready.
        // But typically we don't overwrite the alert with a text error unless we change useAuth to not alert.
        // For now, let's keep existing behavior but ensure loading stops.
      }
    } catch (err) {
      console.error("Login critical error:", err);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('=== REGISTRATION STARTED ===');
    console.log('Form data:', { regName, regEmail, regPassword: '***', regRole, regClass });

    setIsLoading(true);
    setError('');

    // Password validation
    const { isValid, error: passError } = validatePassword(regPassword);
    if (!isValid) {
      console.log('Validation failed:', passError);
      setError(passError);
      setIsLoading(false);
      return;
    }

    console.log('Validation passed, calling onRegister...');
    try {
      const result = await onRegister(
        regName,
        regEmail,
        regPassword,
        regRole,
        regRole === 'student' ? regClass : undefined,
        regRole === 'student' ? regBoard : undefined
      );

      console.log('onRegister returned:', result);

      if (result.success) {
        console.log('Registration SUCCESS!');
        setCreatedCredentials({ email: regEmail, password: regPassword });
        setRegistrationSuccess(true);
      } else {
        console.log('Registration FAILED:', result.error);
        const errorMsg = result.error || 'Registration failed.';
        setError(errorMsg);
        // Also show alert to ensure user sees the error
        alert(errorMsg);
      }
    } catch (err) {
      console.error('EXCEPTION in handleRegister:', err);
      const errorMsg = 'An unexpected error occurred. Please try again.';
      setError(errorMsg);
      alert(errorMsg);
    }

    setIsLoading(false);
    console.log('=== REGISTRATION COMPLETED ===');
  };

  const handleProceedToLogin = () => {
    setRegistrationSuccess(false);
    setActiveTab('login');
    setLoginEmail(createdCredentials.email);
    setLoginPassword(''); // For security, force them to re-enter or at least paste
    setSuccessMsg('Account created successfully. Please login.');
  };

  return (
    <div className="min-h-screen bg-[conic-gradient(at_top_right,_var(--tw-gradient-stops))] from-indigo-100 via-slate-100 to-teal-100 flex flex-col items-center justify-center p-4 force-light">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="flex justify-center mb-6">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
              <img
                src="/ql-logo.png"
                alt="QLMocks Logo"
                className="relative h-32 w-auto object-contain drop-shadow-xl transform transition hover:scale-105 duration-300"
              />
            </div>
          </div>
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h1 className="text-6xl text-gray-900 mb-2 font-bold tracking-tight" style={{ fontFamily: "'Outfit', 'Google Sans', sans-serif" }}>QLmocks</h1>
            <div className="flex items-center justify-center gap-3 mt-4 text-xs font-semibold text-indigo-900/60 uppercase tracking-[0.2em]">
              <span>Class 9-12</span>
              <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full"></span>
              <span>CBSE & State Board</span>
            </div>
          </motion.div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 mb-8 bg-white/40 dark:bg-white/40 backdrop-blur-md p-1.5 rounded-2xl shadow-inner border border-white/20">
            <TabsTrigger value="login" className="rounded-xl font-medium tracking-wide data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow-lg transition-all duration-300">{t('auth.login')}</TabsTrigger>
            <TabsTrigger value="register" className="rounded-xl font-medium tracking-wide data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow-lg transition-all duration-300">{t('auth.register')}</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="border-none shadow-xl bg-white/80 dark:bg-white/80 backdrop-blur-md">
                <CardHeader>
                  <CardTitle>{t('auth.login')}</CardTitle>
                  <CardDescription>
                    Enter your credentials to access your account
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">{t('auth.email')}</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          id="email"
                          type="email"
                          placeholder="Enter your email"
                          className="pl-10 h-11 bg-white/60 border-gray-200 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 transition-all rounded-xl"
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    {!forgotPasswordMode && (
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <Label htmlFor="password">{t('auth.password')}</Label>
                          <Button
                            variant="link"
                            className="p-0 h-auto text-xs text-blue-600 font-normal"
                            onClick={() => setForgotPasswordMode(true)}
                            type="button"
                          >
                            Forgot Password?
                          </Button>
                        </div>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            placeholder="Enter your password"
                            className="pl-10 pr-10 h-11 bg-white/60 border-gray-200 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 transition-all rounded-xl"
                            value={loginPassword}
                            onChange={(e) => setLoginPassword(e.target.value)}
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="space-y-2 mb-4">
                      {error && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-600 animate-in fade-in slide-in-from-top-1">
                          {error}
                        </div>
                      )}

                      {successMsg && (
                        <div className="p-3 bg-green-50 border border-green-200 rounded-md text-sm text-green-600 animate-in fade-in slide-in-from-top-1">
                          {successMsg}
                        </div>
                      )}
                    </div>

                    <Button
                      type="submit"
                      className="w-full h-11 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-700 hover:via-indigo-700 hover:to-violet-700 text-white shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-all duration-300 transform hover:-translate-y-0.5 rounded-xl font-medium tracking-wide text-base"
                      disabled={isLoading}
                    >
                      {isLoading ? t('common.loading') : (forgotPasswordMode ? 'Send Reset Link' : t('auth.login'))}
                    </Button>

                    {forgotPasswordMode && (
                      <Button
                        variant="ghost"
                        className="w-full text-sm text-gray-600"
                        onClick={() => setForgotPasswordMode(false)}
                        type="button"
                      >
                        Back to Login
                      </Button>
                    )}
                  </form>

                  {isAdminMode && (
                    <div className="mt-6 p-4 bg-gray-50/80 rounded-lg backdrop-blur-sm">
                      <p className="text-sm font-medium text-gray-700 mb-2">Demo Accounts:</p>
                      <div className="space-y-1 text-xs text-gray-600">
                        <p><strong>Admin:</strong> admin@examtrack.com / password</p>
                        <p><strong>Class 9:</strong> student9@examtrack.com / password</p>
                        <p><strong>Class 10:</strong> student10@examtrack.com / password</p>
                        <p><strong>Class 11:</strong> student11@examtrack.com / password</p>
                        <p><strong>Class 12:</strong> student12@examtrack.com / password</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          <TabsContent value="register">
            {registrationSuccess ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white/90 dark:bg-white/90 backdrop-blur-md rounded-xl p-6 shadow-xl border border-green-100"
              >
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900  mb-2">Registration Successful!</h2>
                  <p className="text-gray-600 text-sm mb-6">
                    Thank you for joining QLMocks. Please verify the email sent to your inbox.
                  </p>

                  <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left border border-gray-200">
                    <p className="text-xs text-gray-500 uppercase font-semibold mb-2">Your Credentials</p>
                    <div className="space-y-2">
                      <div>
                        <span className="text-xs text-gray-500 block">Email</span>
                        <span className="font-mono text-sm font-medium text-gray-900 ">{createdCredentials.email}</span>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500 block">Password</span>
                        <span className="font-mono text-sm font-medium text-gray-900 ">{createdCredentials.password}</span>
                        <p className="text-xs text-red-500 mt-1">Please write this down!</p>
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={handleProceedToLogin}
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                  >
                    Proceed to Login <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="border-none shadow-2xl bg-white/70 dark:bg-white/70 backdrop-blur-xl ring-1 ring-white/50">
                  <CardHeader>
                    <CardTitle>{t('auth.register')}</CardTitle>
                    <CardDescription>
                      Create a new account to get started
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleRegister} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="reg-name">{t('auth.name')}</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Input
                            id="reg-name"
                            placeholder="Enter your full name"
                            className="pl-10 bg-white/50 dark:bg-white/50"
                            value={regName}
                            onChange={(e) => setRegName(e.target.value)}
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="reg-email">{t('auth.email')}</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Input
                            id="reg-email"
                            type="email"
                            placeholder="Enter your email"
                            className="pl-10 bg-white/50 dark:bg-white/50"
                            value={regEmail}
                            onChange={(e) => setRegEmail(e.target.value)}
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="reg-password">{t('auth.password')}</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Input
                            id="reg-password"
                            type={showPassword ? "text" : "password"}
                            placeholder="Create a password"
                            className="pl-10 pr-10 bg-white/50 dark:bg-white/50"
                            value={regPassword}
                            onChange={(e) => setRegPassword(e.target.value)}
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 focus:outline-none"
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>

                        {regPassword && (
                          <div className="mt-3 p-3 bg-gray-50/80 rounded-lg border border-gray-100 backdrop-blur-sm">
                            <p className="text-xs font-medium text-gray-500 mb-2">Password Strength:</p>
                            <div className="space-y-1.5">
                              {[
                                { label: 'At least 8 characters', valid: regPassword.length >= 8 },
                                { label: 'Uppercase & Lowercase', valid: /[A-Z]/.test(regPassword) && /[a-z]/.test(regPassword) },
                                { label: 'Number', valid: /[0-9]/.test(regPassword) },
                                { label: 'Special Character', valid: /[!@#$%^&*(),.?":{}|<>]/.test(regPassword) },
                              ].map((req, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                  {req.valid ? (
                                    <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                                  ) : (
                                    <XCircle className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                                  )}
                                  <span className={`text-xs ${req.valid ? 'text-green-700 font-medium' : 'text-gray-500'}`}>
                                    {req.label}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label>{t('auth.role')}</Label>
                        <Select value={regRole} onValueChange={(v) => setRegRole(v as UserRole)}>
                          <SelectTrigger className="bg-white/50 dark:bg-white/50">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="student">{t('auth.student')}</SelectItem>
                            {isAdminMode && <SelectItem value="admin">{t('auth.admin')}</SelectItem>}
                          </SelectContent>
                        </Select>
                      </div>

                      {regRole === 'student' && (
                        <>
                          <div className="space-y-2">
                            <Label>Board</Label>
                            <Select value={regBoard} onValueChange={setRegBoard}>
                              <SelectTrigger className="bg-white/50 dark:bg-white/50">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="CBSE">CBSE</SelectItem>
                                <SelectItem value="Odisha">Odisha Board (CHSE/BSE)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>{t('auth.class')}</Label>
                            <div className="relative">
                              <BookOpen className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                              <Select value={String(regClass)} onValueChange={(v) => setRegClass(Number(v) as ClassLevel)}>
                                <SelectTrigger className="pl-10 bg-white/50 dark:bg-white/50">
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
                          </div>
                        </>
                      )}

                      <Button
                        type="submit"
                        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5"
                        disabled={isLoading}
                      >
                        {isLoading ? t('common.loading') : t('auth.register')}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* Legal Footer */}
      <div className="mt-8 text-center text-xs text-gray-500 space-y-2">
        <p>By continuing, you agree to our</p>
        <div className="flex justify-center items-center gap-2 flex-wrap">
          <button
            onClick={() => alert(`TERMS OF SERVICE\n\n1. Acceptance of Terms: By accessing QLMocks, you agree to these terms.\n\n2. Use License: You may use this service for personal, non-commercial educational purposes.\n\n3. User Accounts: You are responsible for maintaining the confidentiality of your account.\n\n4. Conduct: You agree not to misuse the service or attempt unauthorized access.\n\n5. Content: All test content and questions are the property of Quantum Leap.\n\n6. Termination: We may terminate accounts for violations of these terms.\n\n7. Disclaimer: The service is provided "as is" without warranties.\n\n8. Changes: We may update these terms at any time.`)}
            className="text-blue-600 hover:underline"
          >
            Terms of Service
          </button>
          <span>•</span>
          <button
            onClick={() => alert(`PRIVACY POLICY\n\n1. Information We Collect:\n- Account info (name, email)\n- Usage data (test attempts, scores)\n\n2. How We Use Your Information:\n- To provide and improve our services\n- To communicate with you\n- For analytics and research\n\n3. Data Security:\n- We use Firebase for secure data storage\n- Passwords are encrypted\n\n4. Cookies:\n- We use local storage for session management\n\n5. Third Parties:\n- We use Firebase (Google) for authentication and data storage\n\n6. Your Rights:\n- You can request account deletion\n- You can update your information\n\n7. Contact:\n- For privacy concerns, contact Quantum Leap support.`)}
            className="text-blue-600 hover:underline"
          >
            Privacy Policy
          </button>
          <span>•</span>
          <button
            onClick={() => alert(`DISCLAIMER\n\n1. Educational Purpose: QLMocks is designed for educational practice only.\n\n2. No Guarantee: We do not guarantee any specific exam results or outcomes.\n\n3. Content Accuracy: While we strive for accuracy, questions may contain errors.\n\n4. Not Official: This is not an official examination service. Mock tests are for practice only.\n\n5. Technical Issues: We are not responsible for issues due to internet connectivity or device problems.\n\n6. Score Interpretation: Mock test scores are indicative and may not reflect actual exam performance.\n\n7. User Responsibility: Users are responsible for their own preparation and exam readiness.\n\n8. Updates: Test content and features may be updated without prior notice.`)}
            className="text-blue-600 hover:underline"
          >
            Disclaimer
          </button>
        </div>
        <p className="mt-4 text-gray-400">© 2026 Quantum Leap. All rights reserved.</p>
      </div>
    </div>
  );
}
