'use client';

import styles from "./page.module.css";
import Login from "./login/login";

export default function Home() {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.title}>
         <h1>Inventario</h1>
         <br />
         <h1>purina</h1>
        </div>
      </div>
      <Login/>
    </div>
  );
}