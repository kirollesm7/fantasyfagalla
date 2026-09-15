import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useUI } from '../context/UIContext';
import { BrandGlyph } from '../components/Brand';

export default function Login() {
  const { signup, login } = useApp();
  const { showToast } = useUI();
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const uname = username.trim();
    const pass = password;
    if (!uname || !pass) { showToast('اكتب اسم مستخدم وباسورد', 'error'); return; }
    setBusy(true);
    try {
      if (mode === 'signup') {
        if (pass !== password2) { showToast('الباسورد وتأكيد الباسورد مش متطابقين', 'error'); return; }
        if (pass.length < 4) { showToast('اكتب باسورد 4 حروف/أرقام على الأقل', 'error'); return; }
        await signup(uname, pass);
        showToast('اتعمل الحساب! أهلاً بيك', 'success');
      } else {
        await login(uname, pass);
      }
    } catch (err) {
      showToast(String(err.message || err), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-box">
      <div className="ball"><BrandGlyph /></div>
      <h1 className="disp">فانتازي فچالة ليج</h1>
      <div className="card" style={{ textAlign: 'right' }}>
        <div className="viewtoggle" style={{ margin: '0 auto 16px' }}>
          <button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')} type="button">دخول</button>
          <button className={mode === 'signup' ? 'active' : ''} onClick={() => setMode('signup')} type="button">حساب جديد</button>
        </div>
        <form onSubmit={submit}>
          <label>اسم المستخدم</label>
          <input placeholder="مثال: جورج" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} />
          <div style={{ height: 10 }} />
          <label>الباسورد</label>
          <input type="password" placeholder="اكتب الباسورد" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} value={password} onChange={(e) => setPassword(e.target.value)} />
          {mode === 'signup' && (
            <>
              <div style={{ height: 10 }} />
              <label>تأكيد الباسورد</label>
              <input type="password" placeholder="اكتب الباسورد تاني" autoComplete="new-password" value={password2} onChange={(e) => setPassword2(e.target.value)} />
            </>
          )}
          <div style={{ height: 14 }} />
          <button className="btn" type="submit" style={{ width: '100%' }} disabled={busy}>
            {mode === 'signup' ? 'اعمل حساب' : 'دخول'}
          </button>
        </form>
      </div>
      <p style={{ color: '#8fae9c', fontSize: 12 }}>لو انت الهوست، سجل دخول أو اعمل حساب عادي وبعدين دوس على "دخول كـ Host" فوق</p>
    </div>
  );
}
