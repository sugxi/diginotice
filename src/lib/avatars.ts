// Clean, minimal, professional default avatars.
// Uses DiceBear "notionists-neutral" + "lorelei" styles, which produce
// elegant flat illustrations suitable for student/teacher profiles.

const male = (seed: string) =>
  `https://api.dicebear.com/7.x/notionists-neutral/svg?seed=${seed}&backgroundColor=c0aede,d1d4f9,b6e3f4&backgroundType=solid`;
const female = (seed: string) =>
  `https://api.dicebear.com/7.x/lorelei/svg?seed=${seed}&backgroundColor=c0aede,d1d4f9,ffd5dc&backgroundType=solid&hairColor=variant01,variant02,variant03`;

const SHARED = [
  male('Arjun'),
  male('Rohan'),
  male('Vikram'),
  female('Ananya'),
  female('Priya'),
  female('Meera'),
];

export const DEFAULT_AVATARS = {
  student: SHARED,
  teacher: SHARED,
};

export const DEPARTMENTS = ['CSE', 'IT', 'CSBS', 'AIML', 'AIDS', 'ECE', 'EEE', 'MECH', 'CIVIL'] as const;
export type Department = typeof DEPARTMENTS[number];
