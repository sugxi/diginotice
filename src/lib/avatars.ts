// Flat illustrated people avatars sourced from the user-provided reference set.
import m1 from '@/assets/avatars/m1.png';
import m2 from '@/assets/avatars/m2.png';
import m3 from '@/assets/avatars/m3.png';
import m4 from '@/assets/avatars/m4.png';
import f1 from '@/assets/avatars/f1.png';
import f2 from '@/assets/avatars/f2.png';
import f3 from '@/assets/avatars/f3.png';
import f4 from '@/assets/avatars/f4.png';
import f5 from '@/assets/avatars/f5.png';

const SHARED = [m1, m2, m3, m4, f1, f2, f3, f4, f5];

export const DEFAULT_AVATARS = {
  student: SHARED,
  teacher: SHARED,
};

export const DEPARTMENTS = ['CSE', 'IT', 'CSBS', 'AIML', 'AIDS', 'ECE', 'EEE', 'MECH', 'CIVIL'] as const;
export type Department = typeof DEPARTMENTS[number];
