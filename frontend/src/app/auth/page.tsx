'use client';
import './auth.css';

import Link from 'next/link';
import { SubmitButton } from '@/components/ui/submit-button';
import { Input } from '@/components/ui/input';
import GoogleSignIn from '@/components/GoogleSignIn';
import { useMediaQuery } from '@/hooks/use-media-query';
import { useState, useEffect, Suspense } from 'react';
import { signIn, signUp, forgotPassword } from './actions';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  X,
  CheckCircle,
  AlertCircle,
  MailCheck,
  Loader2,
} from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { useAuthMethodTracking } from '@/lib/stores/auth-tracking';
import { toast } from 'sonner';
import { useFeatureFlag } from '@/lib/feature-flags';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import GitHubSignIn from '@/components/GithubSignIn';
import Image from 'next/image';
import { ReleaseBadge } from '@/components/auth/release-badge';
import LoginFooter from './login-footer/login-footer';
import { motion } from 'framer-motion';

// Helper function to check if we're in production mode
const isProductionMode = (): boolean => {
  const envMode = process.env.NEXT_PUBLIC_ENV_MODE?.toLowerCase();
  return envMode === 'production';
};

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading } = useAuth();
  const mode = searchParams.get('mode');
  const returnUrl = searchParams.get('returnUrl');
  const message = searchParams.get('message');
  const { enabled: customAgentsEnabled } = useFeatureFlag('custom_agents');

  const isSignUp = mode === 'signup';
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [mounted, setMounted] = useState(false);
  const isProduction = isProductionMode();

  const { wasLastMethod: wasEmailLastMethod, markAsUsed: markEmailAsUsed } =
    useAuthMethodTracking('email');

  useEffect(() => {
    if (!isLoading && user) {
      router.push(returnUrl || '/dashboard');
    }
  }, [user, isLoading, router, returnUrl]);

  const isSuccessMessage =
    message &&
    (message.includes('Check your email') ||
      message.includes('Account created') ||
      message.includes('success'));

  // Registration success state
  const [registrationSuccess, setRegistrationSuccess] =
    useState(!!isSuccessMessage);
  const [registrationEmail, setRegistrationEmail] = useState('');

  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordStatus, setForgotPasswordStatus] = useState<{
    success?: boolean;
    message?: string;
  }>({});

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isSuccessMessage) {
      setRegistrationSuccess(true);
    }
  }, [isSuccessMessage]);

  const handleSignIn = async (prevState: any, formData: FormData) => {
    markEmailAsUsed();

    if (returnUrl) {
      formData.append('returnUrl', returnUrl);
    } else {
      formData.append('returnUrl', '/dashboard');
    }
    const result = await signIn(prevState, formData);

    if (
      result &&
      typeof result === 'object' &&
      'success' in result &&
      result.success &&
      'redirectTo' in result
    ) {
      window.location.href = result.redirectTo as string;
      return null;
    }

    if (result && typeof result === 'object' && 'message' in result) {
      toast.error('Login failed', {
        description: result.message as string,
        duration: 5000,
      });
      return {};
    }

    return result;
  };

  const handleSignUp = async (prevState: any, formData: FormData) => {
    markEmailAsUsed();

    const email = formData.get('email') as string;
    setRegistrationEmail(email);

    if (returnUrl) {
      formData.append('returnUrl', returnUrl);
    }

    // Add origin for email redirects
    formData.append('origin', window.location.origin);

    const result = await signUp(prevState, formData);

    // Check for success and redirectTo properties (direct login case)
    if (
      result &&
      typeof result === 'object' &&
      'success' in result &&
      result.success &&
      'redirectTo' in result
    ) {
      // Use window.location for hard navigation to avoid stale state
      window.location.href = result.redirectTo as string;
      return null; // Return null to prevent normal form action completion
    }

    // Check if registration was successful but needs email verification
    if (result && typeof result === 'object' && 'message' in result) {
      const resultMessage = result.message as string;
      if (resultMessage.includes('Check your email')) {
        setRegistrationSuccess(true);

        // Update URL without causing a refresh
        const params = new URLSearchParams(window.location.search);
        params.set('message', resultMessage);

        const newUrl =
          window.location.pathname +
          (params.toString() ? '?' + params.toString() : '');

        window.history.pushState({ path: newUrl }, '', newUrl);

        return result;
      } else {
        toast.error('Sign up failed', {
          description: resultMessage,
          duration: 5000,
        });
        return {};
      }
    }

    return result;
  };

  const handleForgotPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setForgotPasswordStatus({});

    if (!forgotPasswordEmail || !forgotPasswordEmail.includes('@')) {
      setForgotPasswordStatus({
        success: false,
        message: 'Please enter a valid email address',
      });
      return;
    }

    const formData = new FormData();
    formData.append('email', forgotPasswordEmail);
    formData.append('origin', window.location.origin);

    const result = await forgotPassword(null, formData);

    setForgotPasswordStatus(result);
  };

  const resetRegistrationSuccess = () => {
    setRegistrationSuccess(false);
    // Remove message from URL and set mode to signin
    const params = new URLSearchParams(window.location.search);
    params.delete('message');
    params.set('mode', 'signin');

    const newUrl =
      window.location.pathname +
      (params.toString() ? '?' + params.toString() : '');

    window.history.pushState({ path: newUrl }, '', newUrl);

    router.refresh();
  };

  // Show loading spinner while checking auth state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Registration success view
  if (registrationSuccess) {
    return (
      <div className="min-h-screen bg-[#EDEDED] flex items-center justify-center p-4">
        <div className="w-full max-w-md mx-auto">
          <div className="text-center">
            <div className="bg-green-50  rounded-full p-4 mb-6 inline-flex">
              <MailCheck className="h-12 w-12 text-green-500" />
            </div>

            <h1 className="text-3xl font-semibold text-foreground mb-4">
              Check your email
            </h1>

            <p className="text-muted-foreground mb-2">
              We've sent a confirmation link to:
            </p>

            <p className="text-lg font-medium mb-6">
              {registrationEmail || 'your email address'}
            </p>

            <div className="bg-green-50  border border-green-100 rounded-lg p-4 mb-8">
              <p className="text-sm text-green-800">
                Click the link in the email to activate your account. If you
                don't see the email, check your spam folder.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
              <Link
                href="/"
                className="flex h-11 items-center justify-center px-6 text-center rounded-lg border border-border bg-background hover:bg-accent transition-colors"
              >
                Return to home
              </Link>
              <button
                onClick={resetRegistrationSuccess}
                className="flex h-11 items-center justify-center px-6 text-center rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Back to sign in
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#EDEDED] relative dark:bg-background">
      <div className="flex min-h-screen items-center justify-center gap-15 px-2 xs:px-4 sm:px-6 lg:px-0">
        {/* Left Section - Image (No card background) */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{
            duration: 0.8,
            ease: [0.4, 0, 0.2, 1],
            delay: 0.4,
          }}
          className="hidden lg:block"
          style={{
            width: '500px',
            height: '650px',
          }}
        >
          <div className="relative w-full h-full rounded-[24px] overflow-hidden">
            <Image
              src="/auth/login-bg.png"
              alt="Preview"
              layout="fill"
              objectFit="cover"
              className="rounded-[24px]"
            />
            <Image
              src="/auth/logo.png"
              alt="Logo"
              width={40}
              height={40}
              className="absolute top-8 left-8"
            />
          </div>
        </motion.div>

        {/* Right Section Container */}
        <div
          className={`flex flex-col items-center w-full max-w-[500px] ${isSignUp ? 'mb-0' : 'mb-0'}`}
        >
          {/* Back to home button - Above the card */}
          {/* <div className="hidden lg:flex w-full justify-center mb-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground  dark:text-white transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to home
            </Link>
          </div> */}
          {/* Mobile Header - Only shows below 1024px */}
          <Link href="/">
            <div className="lg:hidden w-full mb-4 flex justify-center cursor-pointer">
              <div className="flex items-center gap-2">
                {/* Light logo */}
                <Image
                  src="/logo-light.svg"
                  alt="Helium Light Logo"
                  width={40}
                  height={40}
                  className="block dark:hidden mb-0"
                />
                {/* Dark logo */}
                <Image
                  src="/logo-dark.svg"
                  alt="Helium Dark Logo"
                  width={40}
                  height={40}
                  className="hidden dark:block mb-0"
                />
              </div>
            </div>
          </Link>
          {/* Right Section - Form (White card) */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
              duration: 0.8,
              ease: [0.4, 0, 0.2, 1],
              delay: 0.4,
            }}
            className={`bg-white rounded-[24px] shadow-lg flex flex-col justify-center w-full lg:w-[500px] ${isSignUp ? 'min-h-[654px] lg:h-[550px]' : 'min-h-[644px] lg:h-[540px]'}`}
            style={{
              paddingLeft: '16px',
              paddingRight: '16px',
            }}
          >
            <div className="w-full px-2 sm:px-4 lg:px-0">
            <form
  className={`${isSignUp ? 'space-y-3' : 'mb-[3rem] space-y-5'}`}
>
                <div className="space-y-3">
                  <label
                    htmlFor="email"
                    className="text-sm font-normal text-black mb-1.5 block"
                  >
                    Email
                  </label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="Email address"
                    className="h-13 xs:h-14 py-3 rounded-[50px] text-black placeholder:text-black/70 text-sm xs:text-base !bg-white dark:!bg-white !border-gray-200 dark:!border-gray-200 focus:!bg-white focus:!text-black autofill:!bg-white autofill:!text-black"
                    style={{
                      backgroundColor: 'white !important',
                      color: 'black !important',
                    }}
                    required
                  />
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                                        <label
                      htmlFor="password"
                      className="text-sm font-normal text-black"
                    >
                      Password
                    </label>
                    {!isSignUp && (
                      <button
                        type="button"
                        onClick={() => setForgotPasswordOpen(true)}
                        className="text-sm text-[#949494] hover:underline"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="Password"
                    className="h-13 xs:h-14 py-3 rounded-[50px] text-black placeholder:text-black/70 text-sm xs:text-base !bg-white dark:!bg-white !border-gray-200 dark:!border-gray-200 focus:!bg-white focus:!text-black autofill:!bg-white autofill:!text-black"
                    style={{
                      backgroundColor: 'white !important',
                      color: 'black !important',
                    }}
                    required
                  />
                </div>
                {isSignUp && (
                  <div className="space-y-3">
                    <label
                      htmlFor="confirmPassword"
                      className="text-sm font-medium text-black mb-1.5 block"
                    >
                      Confirm Password
                    </label>
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      placeholder="Confirm password"
                      className="h-13 xs:h-14 py-3 rounded-[50px] text-black placeholder:text-black/70 text-sm xs:text-base !bg-white dark:!bg-white !border-gray-200 dark:!border-gray-200 focus:!bg-white focus:!text-black autofill:!bg-white autofill:!text-black"
                      style={{
                        backgroundColor: 'white !important',
                        color: 'black !important',
                      }}
                      required
                    />
                  </div>
                )}
                <div className="pt-1">
                  <div className="relative">
                    <SubmitButton
                      formAction={isSignUp ? handleSignUp : handleSignIn}
                      className="w-full h-12 xs:h-12 sm:h-14 text-white rounded-[50px] text-sm xs:text-base auth-button py-3"
                      pendingText={
                        isSignUp ? 'Creating account...' : 'Initiating...'
                      }
                    >
                      {isSignUp
                        ? 'Create account'
                        : 'Ready to Initiate Intelligence'}
                    </SubmitButton>
                    {/* {wasEmailLastMethod && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-black rounded-full border-2 border-background shadow-sm">
                      <div className="w-full h-full bg-black rounded-full animate-pulse" />
                    </div>
                  )} */}
                  </div>
                </div>
              </form>
              {/* Sign up/Sign in link - only show if not in production */}
              {!isProduction && (
                <div className="mt-4 text-center text-sm">
                  <Link
                    href={
                      isSignUp
                        ? `/auth${returnUrl ? `?returnUrl=${returnUrl}` : ''}`
                        : `/auth?mode=signup${returnUrl ? `&returnUrl=${returnUrl}` : ''}`
                    }
                    className="text-muted-foreground"
                  >
                    {isSignUp ? (
                      'Already have an account? Sign in'
                    ) : (
                      <>
                        Don’t have an account?{' '}
                        <span className="text-black font-medium">SignUp</span>
                      </>
                    )}
                  </Link>
                </div>
              )}
              {/* Social login section */}
              {
                <>
                  <div className="relative my-3">
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 text-black font-medium">OR</span>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <GoogleSignIn returnUrl={returnUrl || undefined} />
                    <button className="w-full h-10 xs:h-11 sm:h-12 border border-gray-200 bg-white text-black rounded-full flex items-center justify-center gap-2 text-xs xs:text-sm sm:text-base hover:bg-gray-50 transition-colors">
                      <Image
                        src="/auth/apple-login.svg"
                        width="18"
                        height="18"
                        alt="Apple Login"
                        className="xs:w-5 xs:h-5"
                      />
                      <span className="truncate">Continue with Apple</span>
                    </button>
                    <button className="w-full h-10 xs:h-11 sm:h-12 border border-gray-200 bg-white text-black rounded-full flex items-center justify-center gap-2 text-xs xs:text-sm sm:text-base hover:bg-gray-50 transition-colors">
                      <Image
                        src="/auth/microsoft-login.svg"
                        width="18"
                        height="18"
                        alt="Microsoft Login"
                        className="xs:w-5 xs:h-5"
                      />
                      <span className="truncate">
                        Continue with Microsoft Account
                      </span>
                    </button>
                  </div>
                </>
              }
            </div>
          </motion.div>
        </div>
      </div>
      <Dialog open={forgotPasswordOpen} onOpenChange={setForgotPasswordOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>Reset Password</DialogTitle>
            </div>
            <DialogDescription>
              Enter your email address and we'll send you a link to reset your
              password.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <Input
              id="forgot-password-email"
              type="email"
              placeholder="Email address"
              value={forgotPasswordEmail}
              onChange={(e) => setForgotPasswordEmail(e.target.value)}
              className="h-12 py-3 rounded-xl"
              required
            />
            {forgotPasswordStatus.message && (
              <div
                className={`p-3 rounded-md flex items-center gap-3 ${
                  forgotPasswordStatus.success
                    ? 'bg-green-50  border border-green-200  text-green-800'
                    : 'bg-destructive/10 border border-destructive/20 text-destructive'
                }`}
              >
                {forgotPasswordStatus.success ? (
                  <CheckCircle className="h-4 w-4 flex-shrink-0" />
                ) : (
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                )}
                <span className="text-sm">{forgotPasswordStatus.message}</span>
              </div>
            )}
            <DialogFooter className="gap-2">
              <button
                type="button"
                onClick={() => setForgotPasswordOpen(false)}
                className="h-10 px-4 border border-border bg-background hover:bg-accent transition-colors rounded-md"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="h-10 px-4 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors rounded-md"
              >
                Send Reset Link
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <LoginFooter />
    </div>
  );
}

export default function Login() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
