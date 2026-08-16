'use client';

import { useState } from 'react';
import { MedicationForm } from './MedicationForm';
import styles from '../admin.module.css';

export function AddMedication() {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button className={styles.outlineButton} onClick={() => setOpen(true)}>
        + ახალი წამალი
      </button>
    );
  }

  return <MedicationForm onDone={() => setOpen(false)} />;
}
