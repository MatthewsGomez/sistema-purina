'use client';

import styles from './login.module.css';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

try {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    console.error('Response error:', response.status);
    setError('Error del servidor. Por favor intenta de nuevo.');
    setLoading(false);
    return;
  }

  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    console.error('Invalid content type:', contentType);
    setError('Error en la respuesta del servidor');
    setLoading(false);
    return;
  }

  const data = await response.json();
  console.log('API Response:', data, 'Status:', response.status);

  if (data.success) {
    console.log('Login exitoso');
    login(data.user);
    
    setTimeout(() => {
      if (data.user.rol === 'inventario') {
        router.push('/dashboard/inventario');
      } else if (data.user.rol === 'bodega') {
        router.push('/dashboard/bodega');
      } else {
        router.push('/dashboard');
      }
    }, 100);
  } else {
    setError(data.message || 'Error en el login');
  }

} catch (error) {
  console.error('Error:', error);
  setError('Error de conexión con el servidor');
} finally {
  setLoading(false);
}
  };

  return (
    <div className={styles.login}>
      <h2>Iniciar sesión</h2>
      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.formGroup}>
          <label htmlFor="email" className={styles.label}>Correo electrónico</label>
          <input 
            type="email" 
            id="email" 
            name="email" 
            className={styles.input} 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required 
            placeholder="ingresa tu correo electronico"
          />
        </div>
        
        <div className={styles.formGroup}>
          <label htmlFor="password" className={styles.label}>Contraseña</label>
          <input 
            type="password" 
            id="password" 
            name="password" 
            className={styles.input} 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required 
            placeholder="Ingresa tu contraseña"
          />
        </div>

        {error && (
          <div className={styles.error}>
            {error}
          </div>
        )}
        
        <button 
          type="submit" 
          className={styles.button} 
          disabled={loading}
        >
          {loading ? 'Cargando...' : 'Ingresar'}
        </button> 
      </form>
    </div>
  );
}