"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function AuthCallback() {
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        
        // Get the source from URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const source = urlParams.get('source') || 'login'; // Default to login if no source specified
        
        if (error) {
          setStatus('error');
          setErrorMessage(error.message);
          
          // Check for specific error types and provide appropriate messages
          let redirectMessage = error.message;
          if (error.message.includes('User not found') || 
              error.message.includes('Invalid login credentials') ||
              error.message.includes('Email not confirmed')) {
            redirectMessage = 'Account not present. Please sign up first.';
          }
          
          // Redirect back to the appropriate page with error
          setTimeout(() => {
            if (source === 'signup') {
              router.push('/signup?error=' + encodeURIComponent(redirectMessage));
            } else {
              router.push('/login?error=' + encodeURIComponent(redirectMessage));
            }
          }, 2000);
          return;
        }

        if (data.session) {
          setStatus('success');
          // Redirect based on source page
          setTimeout(async () => {
            if (source === 'signup') {
              // For signup, redirect back to signup with success flag
              router.push('/signup?google_success=true');
            } else {
              // For login, check if user exists in database first
              const userEmail = data.session.user.email;
              if (userEmail) {
                const { data: profileData, error: profileError } = await supabase
                  .from('auth')
                  .select('id')
                  .eq('email', userEmail)
                  .single();
                
                if (profileError || !profileData) {
                  // User doesn't exist in database, redirect to signup
                  router.push('/login?error=' + encodeURIComponent('Account not present. Please sign up first.'));
                } else {
                  // User exists, proceed to user page
                  router.push('/');
                }
              } else {
                router.push('/');
              }
            }
          }, 2000);
        } else {
          setStatus('error');
          setErrorMessage('No session found');
          setTimeout(() => {
            if (source === 'signup') {
              router.push('/signup?error=' + encodeURIComponent('Authentication failed'));
            } else {
              router.push('/login?error=' + encodeURIComponent('Account not present. Please sign up first.'));
            }
          }, 2000);
        }
      } catch (err) {
        setStatus('error');
        setErrorMessage('Unexpected error occurred');
        setTimeout(() => {
          router.push('/login?error=' + encodeURIComponent('Authentication failed. Please try again.'));
        }, 2000);
      }
    };

    handleAuthCallback();
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      {status === 'loading' && (
        <>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-2 mt-2">Completing Google authentication...</span>
        </>
      )}
      {status === 'success' && (
        <>
          <div className="rounded-full h-8 w-8 border-2 border-green-500 flex items-center justify-center">
            <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <span className="ml-2 mt-2 text-green-600"> Google Authentication successful! Redirecting...</span>
        </>
      )}
      {status === 'error' && (
        <>
          <div className="rounded-full h-8 w-8 border-2 border-red-500 flex items-center justify-center">
            <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <span className="ml-2 mt-2 text-red-600">Authentication failed. Redirecting...</span>
          {errorMessage && (
            <p className="text-sm text-red-500 mt-1 text-center max-w-md">{errorMessage}</p>
          )}
        </>
      )}
    </div>
  );
}