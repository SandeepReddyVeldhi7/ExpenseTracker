import { signIn } from 'next-auth/react'
import { useRouter } from 'next/router'
import { useState } from 'react'
import Link from 'next/link'

export default function SignIn() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    const result = await signIn('credentials', {
      redirect: false,
      email,
      password
    })

    if (result.error) {
      console.log("error ",result.error);
      setError(result.error)
    } else {
      router.replace(result.url ?? '/');
      
    }
  }

  return (
    <div className="auth-container">
      <h1>Sign In</h1>
      
      {error && <div className="error-message">{error}</div>}
      
      <button 
        onClick={() => signIn('google')}
        className="google-btn"
      >
        Sign in with Google
      </button>
      
      <div className="divider">OR</div>
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        
        <div className="form-group">
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        
        <button type="submit">Sign In</button>
      </form>
      
      <div className="auth-footer">
        Don't have an account? <Link href="/auth/signup">Sign up</Link>
      </div>
    </div>
  )
}