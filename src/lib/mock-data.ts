export type Role = 'student' | 'teacher' | 'admin';

export type NavItem = {
  href: string;
  label: string;
};

export function getRoleNavigation(role: Role): NavItem[] {
  switch (role) {
    case 'student':
      return [
        { href: '/student', label: 'Dashboard' },
        { href: '/student/classes', label: 'My Classes' },
        { href: '/student/classwork', label: 'Classwork' },
        { href: '/student/assignments', label: 'Assignments' },
        { href: '/student/exams', label: 'Exams' },
        { href: '/student/calendar', label: 'Calendar' },
        { href: '/student/grades', label: 'Grades' },
        { href: '/results', label: 'My Results' },
        { href: '/rankings', label: 'Rankings' },
        { href: '/student/resources', label: 'Resources' },
        { href: '/support', label: 'Support' },
        { href: '/account', label: 'Profile' },
      ];
    case 'teacher':
      return [
        { href: '/teacher', label: 'Dashboard' },
        { href: '/teacher/classes', label: 'My Classes' },
        { href: '/teacher/assignments', label: 'Assignments' },
        { href: '/teacher/exams', label: 'Exams' },
        { href: '/teacher/question-bank', label: 'Question Bank' },
        { href: '/teacher/grades', label: 'Grades' },
        { href: '/teacher/resources', label: 'Resources' },
        { href: '/teacher/reports', label: 'Reports' },
        { href: '/rankings', label: 'Rankings' },
        { href: '/account', label: 'Profile' },
      ];
    case 'admin':
      return [
        { href: '/admin', label: 'Dashboard' },
        { href: '/admin/users', label: 'Users' },
        { href: '/admin/students', label: 'Students' },
        { href: '/admin/classes', label: 'Classes' },
        { href: '/admin/competitions', label: 'Competitions' },
      ];
    default:
      return [];
  }
}
