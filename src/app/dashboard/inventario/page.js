'use client';

import styles from './inventario.module.css';
import { ProtectedRoute } from '@/app/components/ProtectedRoute';

export default function Page() {
  return (
    <ProtectedRoute requiredRole="inventario">
      <div className={styles.container}>
        <h1>Bienvenido al Dashboard de Inventario</h1>
      </div>
    </ProtectedRoute>
  );
}
