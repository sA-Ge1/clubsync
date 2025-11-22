"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from "@/components/ui/input-otp";
import { motion, AnimatePresence } from "framer-motion";
import { InteractiveHoverButton } from "@/components/ui/interactive-hover-button";
import { useUserInfo } from "@/hooks/useUserInfo";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ReactFormState } from "react-dom/client";
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

export default function SignUpPage() {
  const router = useRouter();
  const {refresh}= useUserInfo();
  const [usn,setUsn]= useState("");
  const [userType,setUserType] = useState("")
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"email" | "otp" | "finalDetails">  ("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [verified, setVerified] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [isSendingOTP, setIsSendingOTP] = useState(false);
  const [isVerifyingOTP, setIsVerifyingOTP] = useState(false);
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [googleUser, setGoogleUser] = useState<any>(null);
  const [authMethod, setAuthMethod] = useState<"email" | "google">("email");

  // Email validation
  const isValidEmail = (email: string) => {
    const rvceRegex = /^[^\s@]+@rvce\.edu\.in$/i;
    
    return rvceRegex.test(email);

  };
  

  // Handle Google auth callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    
    // Handle Google auth error
    if (urlParams.get('error')) {
      const errorMessage = urlParams.get('error');
      setError(errorMessage || 'Google authentication failed');
      setStep("email");
      // Clear URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }
    
    // Handle Google auth success
    if (urlParams.get('google_success') === 'true') {
      const checkGoogleAuth = async () => {
        try {
          const { data } = await supabase.auth.getSession();
          if (data?.session?.user) {
            // Check if this user already has a profile (existing user)
            const userExists = await checkUserExists(data.session.user.email || '');
            
            if (userExists) {
              setError("An account with this email already exists. You have been logged in instead.");
              // Redirect existing users to the main page
              refresh();
              setTimeout(() => {
                
                router.push("/");
              }, 2000);
              return;
            }

            // New Google user - proceed with signup completion
            setGoogleUser(data.session.user);
            // Set username from Google user data
            setEmail(data.session.user.email || '');
            setStep("finalDetails");
            setAuthMethod("google");
            setVerified(true); // Google users are pre-verified
            setError(""); // Clear any previous errors
          } else {
            setError('Failed to get user session');
            setStep("email");
          }
        } catch (err: any) {
          setError('Failed to verify Google authentication');
          setStep("email");
        }
      };
      checkGoogleAuth();
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

  // Format countdown time (5 minutes = 300 seconds)
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Reset form state
  const resetForm = () => {
    setError("");
    setOtp("");
    setVerified(false);
    setCountdown(0);
  };

  // Check if user exists in database
  const checkUserExists = async (email: string) => {
    try {
      const { data, error } = await supabase
        .from('auth')
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

  // 1. Send OTP via email
  const handleSendOTP = async () => {
    if (!isValidEmail(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setIsSendingOTP(true);
    setError("");

    try {
      // Check if user already exists
      const userExists = await checkUserExists(email);
      if (userExists) {
        setError("An account with this email already exists. Please log in instead.");
        setIsSendingOTP(false);
        return;
      }

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true },
      });

      if (error) {
        if (error.message.includes('already registered')) {
          setError("An account with this email already exists. Please log in instead.");
        } else {
          setError(`Failed to send OTP: ${error.message}`);
        }
      } else {
        setCountdown(300); // 5 minutes countdown
        setStep("otp");
        setAuthMethod("email");
        setError(""); // Clear any previous errors
      }
    } catch (err: any) {
      setError(`Unexpected error: ${err.message || 'Failed to send OTP'}`);
    } finally {
      setIsSendingOTP(false);
    }
  };

  // 2. Verify OTP
  const handleVerifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      setError("Please enter the complete 6-digit OTP");
      return;
    }

    setIsVerifyingOTP(true);
    setError("");

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: "email",
      });

      if (error) {
        setError(`OTP verification failed: ${error.message}`);
        setIsVerifyingOTP(false);
        return;
      } 
      
      if (data.user) {
        // Set all states first
        setVerified(true);
        setError("");
        setAuthMethod("email");
        setStep("finalDetails")
        setIsVerifyingOTP(false);
        
        return; // Exit early to avoid setting isVerifyingOTP to false again
      } else {
        setError("OTP verification failed: No user data received");
      }
    } catch (err: any) {
      setError(`Unexpected error: ${err.message || 'OTP verification failed'}`);
    } finally {
      setIsVerifyingOTP(false);
    }
  };

  // 3. Sign in with Google
  const handleGoogleSignUp = async () => {
    setLoading(true);
    setError("");

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?source=signup`
        }
      });

      if (error) {
        setError(`Google sign-up failed: ${error.message}`);
      }
    } catch (err: any) {
      setError(`Unexpected error: ${err.message || 'Google sign-up failed'}`);
    } finally {
      setLoading(false);
    }
  };


  // 4. Final sign up (with validation)
  const handleSignUp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    // Validation checks - only check verification for email auth method
    if (authMethod === "email" && !verified) {
      setError("Please verify your email first");
      return;
    }
    router.push("/")
  };

  // Handle back to email step
  const handleBackToEmail = () => {
    setStep("email");
    resetForm();
    setAuthMethod("email");
  };

  const completeGoogleSignup = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError("")
    setIsSigningUp(true)
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError) {
        setError(`Authentication error: ${userError.message}`);
        setIsSigningUp(false);
        setStep("email")
        return;
      }

      if (!user) {
        setError("User not found. Please authenticate again.");
        setIsSigningUp(false);
        setStep("email");
        setVerified(false);
        setAuthMethod("email");
        return;
      }
  
    if (!userType || !usn) {
      setError("Select ID type and enter valid ID");
      setIsSigningUp(false)
      return;
    }
  
    let table = "";
    let idColumn = "";
    let role = "";
    let matchField = "";
  
    // Identify which table to validate
    if (userType === "student_id") {
      table = "students";
      idColumn = "usn";
      role = "student";
      matchField = "student_id";
    } else if (userType === "faculty_id") {
      table = "faculty";
      idColumn = "faculty_id";
      role = "faculty";
      matchField = "faculty_id";
    } else if (userType === "club_id") {
      table = "clubs";
      idColumn = "club_id";
      role = "club";
      matchField = "club_id";
    }
  
    // Validate user exists in chosen table
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .eq(idColumn, usn)
      .eq("email", email)
      .maybeSingle();
  
    if (error || !data) {
      setError("No matching record found for email + ID.");
      setIsSigningUp(false);
      return;
    }
  
    // Update your auth table entry
    const updates: Record<string, any> = {
      role: role,
      email: email,
      id:user.id
    };
  
    // Add the matching student_id / faculty_id / club_id
    updates[matchField] = usn;
  
    const { error: updateError } = await supabase
      .from("auth") // your custom table
      .upsert(updates, { onConflict: "id" });
  
    if (updateError) {
      console.log(updateError);
      setError("Failed to update user profile.");
      return;
    }
  
    console.log("Signup Completed!", updates);
    router.push("/")
    setIsSigningUp(false)
  };
  

  return (
    <div>
      <motion.div 
        className="flex mt-15 w-full items-center justify-center p-6 md:p-10 mb-10"
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
                      className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent"
                      variants={itemVariants}
                    >
                      Sign-Up
                    </motion.h1>
                    <motion.p 
                      className="text-balance text-muted-foreground"
                      variants={itemVariants}
                    >
                      Finish signing up to get started!
                    </motion.p>
                  </div>
                </CardHeader>
              </motion.div>
              
              <CardContent className="">
                <form onSubmit={handleSignUp}>
                  <motion.div 
                    className="flex flex-col gap-6"
                    variants={containerVariants}
                  >
                    {step === "email" && (
                      <>
                        <motion.div 
                          className="grid gap-3 relative"
                          animate="visible"
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
                              onChange={(e) => setEmail(e.target.value)}
                              className="border-2 border-border p-3 bg-foreground/5 focus:border-primary transition-all duration-200 focus:shadow-sm w-full pr-10"
                            />
                          {(!isValidEmail(email)&&email!="")&&(
                            <p className="text-sm text-red-500 mx-2">Invalid email. Use rvce mail.</p>
                          )}
                          </div>
                        </motion.div>

                        <motion.div 
                          className="w-full"
                          variants={itemVariants}
                          animate="visible"
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
                          animate="visible"
                        >
                          <div className="flex-1 h-px bg-border"></div>
                          <span className="text-sm text-muted-foreground">or</span>
                          <div className="flex-1 h-px bg-border"></div>
                        </motion.div>

                        <motion.div 
                          className="w-full"
                          variants={itemVariants}
                          animate="visible"
                        >
                          <Button 
                            type="button"
                            variant="outline"
                            className="w-full border-2 border-border hover:bg-muted transition-all duration-200"
                            onClick={handleGoogleSignUp}
                            disabled={loading}
                          >
                            {loading ? "Loading..." : "Sign up with Google"}
                          </Button>
                        </motion.div>
                      </>
                    )}

                    {step === "finalDetails" && (
                      <AnimatePresence mode="wait">
                        <motion.div
                          key="finalDetails-section"
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
                            <div className="flex items-center justify-center mb-4">
                              <div className="rounded-full h-12 w-12 border-2 border-green-500 flex items-center justify-center">
                                <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                            </div>
                            <p className="text-sm font-medium w-full text-center">Authentication successful!</p>
                          </motion.div>

                          <motion.div 
                            className="grid gap-3"
                            variants={itemVariants}
                            animate="visible"
                          >
                            
                            <Select onValueChange={(value)=>{setUserType(value); console.log(value)}} required>
                              Link
                              <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Select User Type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectGroup>
                                  <SelectLabel>ID Type</SelectLabel>
                                  <SelectItem value="student_id">Student USN</SelectItem>
                                  <SelectItem value="faculty_id">Faculty ID</SelectItem>
                                  <SelectItem value="club_id">Club ID</SelectItem>
                                </SelectGroup>
                              </SelectContent>
                              
                            </Select>
                            <Label htmlFor="usn" className="text-sm font-medium">{userType==""?"ID":(userType=="student_id"?"Enter USN":(userType=="faculty_id"?"Enter Faculty ID":"Enter CLub ID"))}</Label>
                            <Input
                              id="usn"
                              type="text"
                              placeholder="Enter"
                              required
                              value={usn}
                              onChange={(e) => setUsn(e.target.value)}
                              className="border-2 p-3 bg-foreground/5 border-border focus:border-primary transition-all duration-200 focus:shadow-sm"
                            />
                          </motion.div>

                          <motion.div 
                            className="flex flex-col gap-3 justify-center items-center"
                            variants={itemVariants}
                          >
                            <Button 
                              disabled={isSigningUp}  
                              onClick={completeGoogleSignup}
                              className="w-full border-2 bg-primary hover:bg-primary/90 border-primary text-primary-foreground rounded-md transition-all duration-200 hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
                            >
                              <motion.span
                                animate={isSigningUp ? { opacity: [1, 0.5, 1] } : { opacity: 1 }}
                                transition={isSigningUp ? { duration: 1, repeat: Infinity } : {}}
                              >
                                {isSigningUp ? "Completing Sign Up..." : "Complete Sign Up"}
                              </motion.span>
                            </Button> 
                          </motion.div>
                        </motion.div>
                      </AnimatePresence>
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
                                  Expires in: {formatTime(countdown)}
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
                              disabled={verified || isVerifyingOTP}
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
                              disabled={!otp || otp.length !== 6 || !email || verified || isVerifyingOTP}
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
                              onClick={handleBackToEmail}
                              disabled={verified || isVerifyingOTP}
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
                          className="space-y-3"
                        >
                          <div className="text-foreground text-sm text-center bg-red-900/10 p-3 rounded-lg border border-red-900">
                            {error}
                          </div>
                          {error.includes("already exists") && (
                            <Button 
                              type="button"
                              variant="outline"
                              className="w-full border-2 border-primary text-primary hover:bg-primary transition-all duration-200"
                              onClick={() => router.push('/login')}
                            >
                              Go to Login Page
                            </Button>
                          )}
                        </motion.div>
                      ) : verified && step === "otp" ? (
                        <motion.div 
                          key="success"
                          variants={slideInVariants}
                          initial="hidden"
                          animate="visible"
                          exit="exit"
                          className="text-green-600 text-sm text-center bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200 dark:border-green-800"
                        >
                          Email verified successfully! Completing sign-up...
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
                      ) : step === "email" ? (
                        <motion.div 
                          key="info"
                          variants={slideInVariants}
                          initial="hidden"
                          animate="visible"
                          exit="exit"
                          className="text-muted-foreground text-sm text-center bg-muted/20 p-3 rounded-lg border border-muted"
                        >
                          ∴ Use your educational email ID
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                  </motion.div>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
}