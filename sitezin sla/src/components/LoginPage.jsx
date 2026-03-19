import { useEffect, useState } from 'react';

// Uma unica tela cobre login, cadastro e recuperacao para reduzir troca de
// contexto durante a entrada na app.

export default function LoginPage({
  signIn,
  signUp,
  requestPasswordReset,
  updatePassword,
  isRecoveryMode,
  authStatus
}) {
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [themeMode, setThemeMode] = useState(() => localStorage.getItem('login_theme_mode') || 'light');

  useEffect(() => {
    localStorage.setItem('login_theme_mode', themeMode);
  }, [themeMode]);

  useEffect(() => {
    if (isRecoveryMode) {
      setMode('recovery');
      setError('');
      setSuccess('Defina sua nova senha para concluir a recuperação.');
    }
  }, [isRecoveryMode]);

  const getFriendlyError = (message) => {
    if (message === 'Invalid login credentials') return 'E-mail ou senha incorretos';
    if (message?.toLowerCase().includes('email not confirmed')) return 'Confirme seu e-mail antes de entrar.';
    if (message?.toLowerCase().includes('autenticacao indisponivel')) return 'Login indisponível agora. As chaves do Supabase não foram carregadas neste ambiente.';
    return message || 'Ocorreu um erro. Tente novamente.';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      // O mesmo form muda de comportamento conforme o modo ativo.
      if (mode === 'signup') {
        await signUp(email, password);
        setSuccess('Conta criada! Verifique seu e-mail para confirmar.');
      } else if (mode === 'signin') {
        await signIn(email, password);
      } else if (mode === 'forgot') {
        await requestPasswordReset(email);
        setSuccess('Enviamos um link de recuperação para seu e-mail.');
      } else if (mode === 'recovery') {
        await updatePassword(password);
        setSuccess('Senha atualizada com sucesso. Entre com sua nova senha.');
        setMode('signin');
        setPassword('');
      }
    } catch (err) {
      setError(getFriendlyError(err.message));
    } finally {
      setLoading(false);
    }
  };

  const title = {
    signin: 'Entre na sua conta',
    signup: 'Crie sua conta',
    forgot: 'Recuperar senha',
    recovery: 'Definir nova senha'
  }[mode];

  return (
    <div className={`login-page login-theme-${themeMode}`}>
      <div className="login-card">
        <button
          type="button"
          className="login-theme-toggle"
          onClick={() => setThemeMode((prev) => (prev === 'light' ? 'dark' : 'light'))}
          aria-label="Alternar modo da tela de login"
          aria-pressed={themeMode === 'dark'}
        >
          <span className="login-theme-switch" aria-hidden="true">
            <span className="login-theme-switch-icon login-theme-switch-icon-moon"></span>
            <span className="login-theme-switch-icon login-theme-switch-icon-sun"></span>
            <span className="login-theme-switch-thumb"></span>
          </span>
        </button>

        <h1 className="login-brand">Polaroom.</h1>
        <p className="login-subtitle">{title}</p>

        {authStatus === 'expired' && (
          <p className="login-error">Sua sessão expirou por inatividade. Faça login novamente.</p>
        )}
        {authStatus === 'unavailable' && (
          <p className="login-error">Login indisponível agora. As chaves do Supabase não foram carregadas neste ambiente.</p>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          {/* O e-mail so some na redefinicao, quando o token ja veio pelo link. */}
          {mode !== 'recovery' && (
            <div className="login-field">
              <label htmlFor="email">E-mail</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                autoComplete="email"
              />
            </div>
          )}

          <div className="login-field">
            <label htmlFor="password">Senha</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="********"
              required={mode !== 'forgot'}
              minLength={6}
              autoComplete={mode === 'signup' || mode === 'recovery' ? 'new-password' : 'current-password'}
            />
          </div>

          {error && <p className="login-error">{error}</p>}
          {success && <p className="login-success">{success}</p>}

          <button type="submit" className="login-btn" disabled={loading || authStatus === 'unavailable'}>
            {loading ? '...' : (
              mode === 'signup' ? 'Criar conta'
                : mode === 'forgot' ? 'Enviar link'
                  : mode === 'recovery' ? 'Salvar nova senha'
                    : 'Entrar'
            )}
          </button>
        </form>

        {!isRecoveryMode && (
          <>
            {mode === 'signin' && (
              <p className="login-toggle">
                Não tem conta?{' '}
                <button type="button" onClick={() => { setMode('signup'); setError(''); setSuccess(''); }}>
                  Criar conta
                </button>
              </p>
            )}

            {mode === 'signup' && (
              <p className="login-toggle">
                Já tem conta?{' '}
                <button type="button" onClick={() => { setMode('signin'); setError(''); setSuccess(''); }}>
                  Entrar
                </button>
              </p>
            )}

            {(mode === 'signin' || mode === 'signup') && (
              <p className="login-toggle">
                Esqueceu sua senha?{' '}
                <button type="button" onClick={() => { setMode('forgot'); setError(''); setSuccess(''); setPassword(''); }}>
                  Recuperar
                </button>
              </p>
            )}

            {mode === 'forgot' && (
              <p className="login-toggle">
                Voltar ao login?{' '}
                <button type="button" onClick={() => { setMode('signin'); setError(''); setSuccess(''); }}>
                  Entrar
                </button>
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}



