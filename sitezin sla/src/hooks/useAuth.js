import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase.js';

const SESSION_IDLE_TIMEOUT_MS = 30 * 60 * 1000;
const SUPABASE_UNAVAILABLE_MESSAGE = 'Autenticacao indisponivel no momento. Verifique a configuracao do Supabase.';

const ensureSupabase = () => {
  if (!supabase) {
    throw new Error(SUPABASE_UNAVAILABLE_MESSAGE);
  }
};

export function useAuth() {
  const [user, setUser] = useState(null);
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
    ensureSupabase();
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    return data;
  };

  const signIn = async (email, password) => {
    ensureSupabase();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    ensureSupabase();
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const requestPasswordReset = async (email) => {
    ensureSupabase();
    const redirectTo = `${window.location.origin}/`;
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) throw error;
    return data;
  };

  const updatePassword = async (newPassword) => {
    ensureSupabase();
    const { data, error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
    setIsRecoveryMode(false);
    return data;
  };

  return {
    user,
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

