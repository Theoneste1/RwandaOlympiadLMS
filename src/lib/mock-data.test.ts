import { describe, expect, it } from 'vitest';
import { getRoleNavigation } from './mock-data';

describe('role navigation', () => {
  it('exposes student portal navigation entries backed by real pages', () => {
    expect(getRoleNavigation('student')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ href: '/student', label: 'Dashboard' }),
        expect.objectContaining({ href: '/student/classes', label: 'My Classes' }),
        expect.objectContaining({ href: '/student/exams', label: 'Exams' }),
        expect.objectContaining({ href: '/student/classwork', label: 'Classwork' }),
        expect.objectContaining({ href: '/student/assignments', label: 'Assignments' }),
        expect.objectContaining({ href: '/results', label: 'My Results' }),
        expect.objectContaining({ href: '/support', label: 'Support' }),
        expect.objectContaining({ href: '/account', label: 'Profile' }),
      ]),
    );
  });

  it('exposes teacher portal navigation entries backed by real pages', () => {
    expect(getRoleNavigation('teacher')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ href: '/teacher', label: 'Dashboard' }),
        expect.objectContaining({ href: '/teacher/classes', label: 'My Classes' }),
        expect.objectContaining({ href: '/teacher/exams', label: 'Exams' }),
        expect.objectContaining({ href: '/teacher/grades', label: 'Grades' }),
      ]),
    );
  });

  it('exposes admin portal navigation entries', () => {
    expect(getRoleNavigation('admin')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ href: '/admin', label: 'Dashboard' }),
        expect.objectContaining({ href: '/admin/users', label: 'Users' }),
      ]),
    );
  });
});
