import { useNavigate } from 'react-router-dom';
import AuthSide from '../components/AuthSide.jsx';
import { useApp } from '../store.jsx';

export default function Forgot() {
  const { toast } = useApp();
  const nav = useNavigate();
  return (
    <div className="auth-wrap">
      <AuthSide heading="Reset your password" />
      <div className="auth-form-wrap">
        <div className="auth-form">
          <h1>Forgot password?</h1>
          <p>Enter your email and we'll send a reset link.</p>
          <form onSubmit={(e) => { e.preventDefault(); toast('Reset link sent — check your inbox.', 'success'); setTimeout(() => nav('/login'), 1200); }}>
            <div className="field"><label>Email <span className="req">*</span></label><input className="input" type="email" required /></div>
            <button className="btn btn-primary" type="submit">Send Reset Link</button>
          </form>
          <div className="auth-foot"><a onClick={() => nav('/login')}>← Back to sign in</a></div>
        </div>
      </div>
    </div>
  );
}
