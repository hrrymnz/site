import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase.js';

const SESSION_IDLE_TIMEOUT_MS = 30 * 60 * 1000;

export function useAuth() {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authStatus, setAuthStatus] = useState('loading');
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const hasUserRef = useRef(false);

  useEffect(() => {
    if (!supabase) {
      setAuthStatus('unavailable');
      setLoading(false);
      return;
    }

    let idleTimer = null;

    const syncFromSession = (nextSession, status = null) => {
      setSession(nextSession ?? null);
      setUser(nextSession?.user ?? null);
      hasUserRef.current = !!nextSession?.user;
      if (status) {
        setAuthStatus(status);
      } else {
        setAuthStatus(nextSession?.user ? 'authenticated' : 'unauthenticated');
      }
    };

    const clearIdleTimer = () => {
      if (idleTimer) {
        clearTimeout(idleTimer);
        idleTimer = null;
      }
    };

    const resetIdleTimer = () => {
      clearIdleTimer();
      if (!hasUserRef.current) return;
      idleTimer = setTimeout(async () => {
        try {
          setAuthStatus('expired');
          await supabase.auth.signOut();
        } catch {
          // noop
        }
      }, SESSION_IDLE_TIMEOUT_MS);
    };

    const activityEvents = ['click', 'keydown', 'touchstart'];
    const onActivity = () => resetIdleTimer();
    activityEvents.forEach((eventName) => window.addEventListener(eventName, onActivity, { passive: true }));

    supabase.auth.getSession()
      .then(({ data: { session: currentSession } }) => {
        syncFromSession(currentSession);
        setLoading(false);
        resetIdleTimer();
      })
      .catch(() => {
        setLoading(false);
        setAuthStatus('unauthenticated');
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecoveryMode(true);
      }
      if (event === 'TOKEN_REFRESHED') {
        syncFromSession(nextSession, nextSession?.user ? 'refreshing' : 'unauthenticated');
        window.setTimeout(() => {
          setAuthStatus(nextSession?.user ? 'authenticated' : 'unauthenticated');
        }, 300);
      } else {
        syncFromSession(nextSession);
      }
      if (event === 'SIGNED_OUT') {
        setIsRecoveryMode(false);
      }
      resetIdleTimer();
    });

    return () => {
      subscription.unsubscribe();
      clearIdleTimer();
      activityEvents.forEach((eventName) => window.removeEventListener(eventName, onActivity));
    };
  }, []);

  const signUp = async (email, password) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    return data;
  };

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const requestPasswordReset = async (email) => {
    const redirectTo = `${window.location.origin}/`;
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) throw error;
    return data;
  };

  const updatePassword = async (newPassword) => {
    const { data, error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
    setIsRecoveryMode(false);
    return data;
  };

  return {
    user,
    session,
    loading,
    authStatus,
    isRecoveryMode,
    signUp,
    signIn,
    signOut,
    requestPasswordReset,
    updatePassword
  };
}