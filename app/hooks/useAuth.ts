'use client';

import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 현재 세션 가져오기
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    };

    getSession();

    // 인증 상태 변화 감지
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // 새 사용자 등록 시 프로필 생성
        if (event === 'SIGNED_IN' && session?.user) {
          // 사용자가 새로 등록된 경우에만 프로필 생성
          const { data: existingProfile } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', session.user.id)
            .single();
          
          if (!existingProfile) {
            await createUserProfile(session.user);
          }
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // 사용자 프로필 생성
  const createUserProfile = async (user: User) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          username: user.email?.split('@')[0] || 'user',
          full_name: '',
        });

      if (error) {
        console.error('프로필 생성 실패:', error);
      }

      // 기본 사용자 설정 생성
      await supabase
        .from('user_settings')
        .insert({
          id: user.id,
        });

    } catch (error) {
      console.error('프로필 생성 중 오류:', error);
    }
  };

  // 이메일 회원가입
  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    return { data, error };
  };

  // 이메일 로그인
  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    return { data, error };
  };

  // 구글 로그인
  const signInWithGoogle = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    return { data, error };
  };

  // 로그아웃
  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  // 비밀번호 재설정
  const resetPassword = async (email: string) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    return { data, error };
  };

  return {
    user,
    session,
    loading,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    resetPassword,
  };
}
