// Default avatars are deterministic SVG data URIs from DiceBear-style endpoint
// (uses dicebear.com public API – no auth required). Indexed by role for variety.

export const DEFAULT_AVATARS = {
  student: [
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Aiden',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Bella',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Cole',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Diya',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Eli',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Faye',
  ],
  teacher: [
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Mentor',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Professor',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Scholar',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Teacher',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Tutor',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Lecturer',
  ],
};

export const DEPARTMENTS = ['CSE', 'IT', 'CSBS', 'AIML', 'AIDS', 'ECE', 'EEE', 'MECH', 'CIVIL'] as const;
export type Department = typeof DEPARTMENTS[number];
