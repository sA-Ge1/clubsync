"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from "@/components/ui/input-otp";
import { motion, AnimatePresence } from "framer-motion";
import Footer from "@/components/Footer";
import { InteractiveHoverButton } from "@/components/ui/interactive-hover-button";
import { useUserInfo } from "@/hooks/useUserInfo";
// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5
    }
  }
};

const slideInVariants = {
  hidden: { opacity: 0, height: 0 },
  visible: {
    opacity: 1,
    height: "auto",
    transition: {
      duration: 0.3
    }
  },
  exit: {
    opacity: 0,
    height: 0,
    transition: {
      duration: 0.3
    }
  }
};

export default function LoginPage() {
  const router = useRouter();
  const{refresh} = useUserInfo();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"email" | "otp">("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [verified, setVerified] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [isSendingOTP, setIsSendingOTP] = useState(false);
  const [isVerifyingOTP, setIsVerifyingOTP] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState(0);
  const [showRedirectMessage, setShowRedirectMessage] = useState(false);

  // Email validation
  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Check if user exists in database
  const checkUserExists = async (email: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single();
      
      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found" error
        console.error('Error checking user existence:', error);
        return false;
      }
      
      return !!data; // Return true if user exists, false if not
    } catch (err) {
      console.error('Error checking user existence:', err);
      return false;
    }
  };

  // Handle auth callback errors
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    
    // Handle auth callback error
    if (urlParams.get('error')) {
      const errorMessage = urlParams.get('error');
      setError(errorMessage || 'Authentication failed');
      
      // If the error message indicates account not present, start redirect countdown
      if (errorMessage && errorMessage.includes('Account not present')) {
        setShowRedirectMessage(true);
        setRedirectCountdown(8);
      }
      
      // Clear URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Timer effect for OTP countdown
  useEffect(() => {
    if (countdown > 0) {
      const timer = setInterval(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [countdown]);

  // Timer effect for redirect countdown
  useEffect(() => {
    if (redirectCountdown > 0) {
      const timer = setInterval(() => {
        setRedirectCountdown(prev => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    } else if (redirectCountdown === 0 && showRedirectMessage) {
      // Redirect to signup page when countdown reaches 0
      router.push('/signup');
    }
  }, [redirectCountdown, showRedirectMessage, router]);

  // Format countdown time (5 minutes = 300 seconds)
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Check if account exists and send OTP
  const handleSendOTP = async () => {
    setIsSendingOTP(true);
    setError("");

    // First check if user exists in our database
    const userExists = await checkUserExists(email);
    
    if (!userExists) {
      setError("Account not present. Please sign up first.");
      setShowRedirectMessage(true);
      setRedirectCountdown(8); // Start 8-second countdown
      setIsSendingOTP(false);
      return;
    }

    // If user exists in database, proceed with OTP
    const { data: existingUser, error: checkError } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false }, // Don't create user if doesn't exist
    });

    if (checkError) {
      if (checkError.message.includes("User not found") || checkError.message.includes("Invalid login credentials")) {
        setError("Account not present. Please sign up first.");
        setShowRedirectMessage(true);
        setRedirectCountdown(8); // Start 8-second countdown
        setIsSendingOTP(false);
        return;
      }
      setError(checkError.message);
      setIsSendingOTP(false);
      return;
    }

    if (existingUser) {
      setCountdown(300); // 5 minutes countdown
      setStep("otp");
    }
    setIsSendingOTP(false);
  };

  // Verify OTP and login
  const handleVerifyOTP = async () => {
    setIsVerifyingOTP(true);
    setError("");

    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: "email",
    });

    if (error) {
      setError(error.message);
    } else if (data.user) {
      // Double-check that user exists in database before allowing login
      const userExists = await checkUserExists(email);
      
      if (!userExists) {
        setError("Account not present. Please sign up first.");
        setShowRedirectMessage(true);
        setRedirectCountdown(8);
        setIsVerifyingOTP(false);
        return;
      }
      
      setVerified(true);
      setError("");
      // Redirect to user dashboard
      //refresh the user data
      refresh();
      router.push("/user");
    }
    setIsVerifyingOTP(false);
  };

  // Google login
  const handleGoogleLogin = async () => {
    setError("");
    setLoading(true);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?source=login`,
      },
    });

    if (error) {
      setError(error.message);
    }
    setLoading(false);
  };

  return (
    <div>
    <motion.div 
      className="flex mt-15 w-full items-center justify-center p-6 md:p-10"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <motion.div 
        className="absolute top-20 left-4"
        variants={itemVariants}
      >
        <InteractiveHoverButton 
          className="z-3 border-2 border-border backdrop-blur-sm"
          onClick={() => router.push('/')}
        >
          Back
        </InteractiveHoverButton>
      </motion.div>
      
      <motion.div 
        className="w-full max-w-sm"
        variants={itemVariants}
      >
        <motion.div 
          className="flex flex-col gap-6 w-full"
          variants={containerVariants}
        >
          <Card className="w-full border-2 p-4 bg-background/95 backdrop-blur-sm border-border rounded-xl shadow-lg">
            <motion.div variants={itemVariants}>
              <CardHeader className="justify-center text-center border-b-2 p-3 border-border">
                <div className="flex flex-col items-center text-center">
                  <motion.h1 
                    className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent mb-2"
                    variants={itemVariants}
                  >
                    Welcome to CLubSync
                  </motion.h1>
                  <motion.p 
                    className="text-balance text-muted-foreground"
                    variants={itemVariants}
                  >
                    Continue with login
                  </motion.p>
                </div>
              </CardHeader>
            </motion.div>
            
            <CardContent className="">
              <motion.div 
                className="flex flex-col gap-6"
                variants={containerVariants}
              >
                {step === "email" && (
                  <>
                    <motion.div 
                      className="grid gap-3 relative"
                      variants={itemVariants}
                    >
                      <div className="flex items-center">
                        <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                      </div>
                      
                      <div className="relative pb-2">
                        <Input 
                          id="email" 
                          type="email" 
                          required 
                          placeholder="abc@rvce.edu.in"
                          value={email}
                          onChange={(e) => {
                            setEmail(e.target.value);
                            // Reset redirect state when user starts typing
                            if (showRedirectMessage) {
                              setShowRedirectMessage(false);
                              setRedirectCountdown(0);
                              setError("");
                            }
                          }}
                          className="border-2 border-border p-3 bg-foreground/5 focus:border-primary transition-all duration-200 focus:shadow-sm w-full pr-10"
                        />
                      </div>
                    </motion.div>

                    <motion.div 
                      className="w-full"
                      variants={itemVariants}
                    >
                      <Button 
                        type="button"
                        variant="outline" 
                        className="w-full border-2 border-border hover:bg-muted transition-all duration-200"
                        onClick={handleSendOTP}
                        disabled={!isValidEmail(email) || isSendingOTP}
                      >
                        {isSendingOTP ? "Sending..." : "Send OTP"}
                      </Button>
                    </motion.div>

                    <motion.div 
                      className="flex items-center gap-4 w-full"
                      variants={itemVariants}
                    >
                      <div className="flex-1 h-px bg-border"></div>
                      <span className="text-sm text-muted-foreground">or</span>
                      <div className="flex-1 h-px bg-border"></div>
                    </motion.div>

                    <motion.div 
                      className="w-full"
                      variants={itemVariants}
                    >
                      <Button 
                        type="button"
                        variant="outline"
                        className="w-full border-2 border-border hover:bg-muted transition-all duration-200"
                        onClick={handleGoogleLogin}
                        disabled={loading}
                      >
                        {loading ? "Loading..." : "Sign in with Google"}
                      </Button>
                    </motion.div>
                  </>
                )}

                {step === "otp" && (
                  <AnimatePresence mode="wait">
                    <motion.div
                      key="otp-section"
                      variants={slideInVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      className="space-y-4"
                    >
                      <motion.div 
                        className="text-center"
                        variants={itemVariants}
                      >
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-medium">Enter OTP:</Label>
                          {countdown > 0 && (
                            <p className="text-sm text-muted-foreground mt-1">
                              OTP expires in: {formatTime(countdown)}
                            </p>
                          )}
                        </div>
                      </motion.div>

                      <motion.div 
                        className="flex justify-center"
                        variants={itemVariants}
                      >
                        <InputOTP 
                          maxLength={6} 
                          value={otp} 
                          onChange={setOtp} 
                          disabled={verified}
                        >
                          <InputOTPGroup>
                            <InputOTPSlot index={0} className="border-2 border-border" />
                            <InputOTPSlot index={1} className="border-2 border-border" />
                            <InputOTPSlot index={2} className="border-2 border-border" />
                          </InputOTPGroup>
                          <InputOTPSeparator />
                          <InputOTPGroup>
                            <InputOTPSlot index={3} className="border-2 border-border" />
                            <InputOTPSlot index={4} className="border-2 border-border" />
                            <InputOTPSlot index={5} className="border-2 border-border" />
                          </InputOTPGroup>
                        </InputOTP> 
                      </motion.div>
                      
                      <motion.div 
                        className="flex gap-2 w-full"
                        variants={itemVariants}
                      >
                        <Button 
                          type="button"
                          variant="outline" 
                          className="w-1/2 border-2 border-border hover:bg-muted transition-all duration-200"
                          onClick={handleSendOTP}
                          disabled={countdown > 0 || !email || verified || isSendingOTP}
                        >
                          {verified ? "Verified!" :
                           isSendingOTP ? "Sending..." :
                           countdown > 0 ? `Resend in ${Math.ceil(countdown/60)}m` : 
                           "Resend OTP"}
                        </Button>

                        <Button 
                          type="button"
                          variant={verified ? "default" : "outline"}
                          className={`w-1/2 border-2 transition-all duration-200 ${
                            verified 
                              ? "bg-green-600 hover:bg-green-700 border-green-600" 
                              : "border-border hover:bg-muted"
                          }`}
                          onClick={handleVerifyOTP}
                          disabled={!otp || !email || verified || isVerifyingOTP}
                        >
                          {verified ? "Verified!" :
                           isVerifyingOTP ? "Verifying..." :
                           "Verify"}
                        </Button>
                      </motion.div>

                      <motion.div 
                        className="w-full"
                        variants={itemVariants}
                      >
                        <p className="text-sm text-muted-foreground mt-1 mb-2 text-center">
                          OTP sent to: <span className="font-medium text-foreground">{email}</span>
                        </p>
                        <Button 
                          type="button"
                          variant="ghost" 
                          className="w-full text-muted-foreground hover:text-foreground transition-all duration-200"
                          onClick={() => {
                            setStep("email");
                            setOtp("");
                            setVerified(false);
                            setCountdown(0);
                            setError("");
                            setShowRedirectMessage(false);
                            setRedirectCountdown(0);
                          }}
                          disabled={verified}
                        >
                          Wrong email? Go back to change it
                        </Button>
                      </motion.div>
                    </motion.div>
                  </AnimatePresence>
                )}
                
                <AnimatePresence mode="wait">
                  {error ? (
                    <motion.div 
                      key="error"
                      variants={slideInVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      className="text-foreground text-sm text-center bg-red-900/10 p-3 rounded-lg border border-red-800"
                    >
                      {error}
                      {showRedirectMessage && redirectCountdown > 0 && (
                        <div className="mt-2 text-xs">
                          Redirecting to signup page in {redirectCountdown} seconds...
                        </div>
                      )}
                    </motion.div>
                  ) : verified ? (
                    <motion.div 
                      key="success"
                      variants={slideInVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      className="text-green-600 text-sm text-center bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200 dark:border-green-800"
                    >
                      Login successful! Redirecting...
                    </motion.div>
                  ) : step === "otp" ? (
                    <motion.div 
                      key="otp-info"
                      variants={slideInVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      className="text-muted-foreground text-sm text-center bg-muted/20 p-3 rounded-lg border border-muted"
                    >
                      ∴ Please verify your email to continue!
                    </motion.div>
                  ) : (
                    <motion.div 
                      key="info"
                      variants={slideInVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      className="text-muted-foreground text-sm text-center bg-muted/20 p-3 rounded-lg border border-muted"
                    >
                      ∴ Use your college email for access.
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </CardContent>
          </Card>

          <motion.div 
            className="text-center text-sm"
            variants={itemVariants}
          >
            Don&apos;t have an account?{" "}
            <a href="/signup" className="underline underline-offset-4 text-primary hover:text-primary/80">
              Sign up
            </a>
          </motion.div>
        </motion.div>
      </motion.div>
    </motion.div>
    </div>
  );
}
