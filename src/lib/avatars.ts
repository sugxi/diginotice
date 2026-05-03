// Flat illustrated people avatars - friendly, colorful, suitable for students/teachers.
// Uses DiceBear "personas" style which produces clean flat-illustration characters
// similar to common avatar packs (rounded shoulders, simple faces, bright shirts).

const persona = (seed: string) =>
  `https://api.dicebear.com/7.x/personas/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf,c4f1be&backgroundType=solid`;

const SHARED = [
  persona('Arjun'),
  persona('Rohan'),
  persona('Vikram'),
  persona('Ananya'),
  persona('Priya'),
  persona('Meera'),
];

export const DEFAULT_AVATARS = {
  student: SHARED,
  teacher: SHARED,
};

export const DEPARTMENTS = ['CSE', 'IT', 'CSBS', 'AIML', 'AIDS', 'ECE', 'EEE', 'MECH', 'CIVIL'] as const;
export type Department = typeof DEPARTMENTS[number];
