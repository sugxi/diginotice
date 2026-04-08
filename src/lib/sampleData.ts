export interface Notice {
  id: string;
  title: string;
  content: string;
  author: string;
  date: string;
  category: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  status: 'pending' | 'in-progress' | 'completed';
  noticeId?: string;
}

export const sampleNotices: Notice[] = [
  {
    id: '1',
    title: 'URGENT: Final Exam Schedule Released',
    content: 'The final exam schedule has been released. All students must check their exam dates immediately. Failure to appear will result in automatic failure. This is an urgent notice - please act now!',
    author: 'Academic Office',
    date: '2026-04-08',
    category: 'Academic',
  },
  {
    id: '2',
    title: 'Assignment Submission Deadline Extended',
    content: 'The submission deadline for the Database Management assignment has been extended to April 15th. Please ensure all submissions are uploaded before the deadline. Late submissions will not be accepted.',
    author: 'Prof. Smith',
    date: '2026-04-07',
    category: 'Academic',
  },
  {
    id: '3',
    title: 'Workshop on Cloud Computing',
    content: 'A workshop on cloud computing fundamentals will be held on April 12th in the seminar hall. Topics include AWS, Azure, and Google Cloud. Registration is optional but recommended for all CS students.',
    author: 'IT Department',
    date: '2026-04-06',
    category: 'Event',
  },
  {
    id: '4',
    title: 'Library Hours Update',
    content: 'The library will have extended hours during the exam period. General information: the library will be open from 7 AM to 11 PM on weekdays.',
    author: 'Library Staff',
    date: '2026-04-05',
    category: 'General',
  },
  {
    id: '5',
    title: 'Emergency: Campus Power Outage Alert',
    content: 'Emergency alert! There will be a scheduled power outage on campus today from 2 PM to 5 PM. All critical systems will be on backup power. Please save your work immediately.',
    author: 'Facilities Management',
    date: '2026-04-08',
    category: 'Alert',
  },
  {
    id: '6',
    title: 'Social Club Meeting - FYI',
    content: 'The social club will hold a casual meeting this Friday. This is optional and open to all students. Come join us for some fun activities and snacks!',
    author: 'Student Council',
    date: '2026-04-04',
    category: 'Social',
  },
];

export const sampleTasks: Task[] = [
  { id: '1', title: 'Prepare for Final Exams', description: 'Review all course materials for upcoming final exams', dueDate: '2026-04-15', status: 'pending', noticeId: '1' },
  { id: '2', title: 'Submit DB Assignment', description: 'Complete and submit the Database Management assignment', dueDate: '2026-04-15', status: 'in-progress', noticeId: '2' },
  { id: '3', title: 'Register for Cloud Workshop', description: 'Sign up for the cloud computing workshop', dueDate: '2026-04-11', status: 'completed', noticeId: '3' },
  { id: '4', title: 'Save work before outage', description: 'Ensure all work is saved before the power outage', dueDate: '2026-04-08', status: 'pending', noticeId: '5' },
];
