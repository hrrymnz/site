import { useEffect, useState } from 'react';

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

  useEffect(() => {
    if (isRecoveryMode) {
      setMode('recovery');
      setError('');
      setSuccess('Defina sua nova senha para concluir a recuperacao.');
    }
  }, [isRecoveryMode]);

  const getFriendlyError = (message) => {
    if (message === 'Invalid login credentials') return 'Email ou senha incorretos';
    if (message?.toLowerCase().includes('email not confirmed')) return 'Confirme seu email antes de entrar.';
    return message || 'Ocorreu um erro. Tente novamente.';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (mode === 'signup') {
        await signUp(email, password);
        setSuccess('Conta criada! Verifique seu email para confirmar.');
      } else if (mode === 'signin') {
        await signIn(email, password);
      } else if (mode === 'forgot') {
        await requestPasswordReset(email);
        setSuccess('Enviamos um link de recuperacao para seu email.');
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
    <div className="login-page">
      <div className="login-card">
        <h1 className="login-brand">TaylorSwift.</h1>
        <p className="login-subtitle">{title}</p>

        {authStatus === 'expired' && (
          <p className="login-error">Sua sessao expirou por inatividade. Faca login novamente.</p>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          {mode !== 'recovery' && (
            <div className="login-field">
              <label htmlFor="email">Email</label>
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

          <button type="submit" className="login-btn" disabled={loading}>
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
                Nao tem conta?{' '}
                <button type="button" onClick={() => { setMode('signup'); setError(''); setSuccess(''); }}>
                  Criar conta
                </button>
              </p>
            )}

            {mode === 'signup' && (
              <p className="login-toggle">
                Ja tem conta?{' '}
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