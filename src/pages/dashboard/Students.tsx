import React, { useState, useEffect } from 'react';
import { Users, Search, GraduationCap, Calendar } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

interface Student {
  id: string;
  name: string;
  student_id: string;
  email: string;
  phone: string;
  attendance: {
    total_sessions: number;
    attended_sessions: number;
    attendance_percentage: number;
    recent_sessions: {
      date: string;
      attended: boolean;
    }[];
  };
}

interface Class {
  id: string;
  name: string;
  students: Student[];
}

export default function Students() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchClassesWithStudents();
  }, []);

  const fetchClassesWithStudents = async () => {
    try {
      // First fetch all classes
      const { data: classesData, error: classesError } = await supabase
        .from('classes')
        .select('id, name')
        .order('name');

      if (classesError) throw classesError;

      // Then fetch students and their attendance for each class
      const classesWithStudents = await Promise.all(
        (classesData || []).map(async (cls) => {
          // Fetch students in the class
          const { data: studentsData, error: studentsError } = await supabase
            .from('class_students')
            .select(`
              student:students (
                id,
                name,
                student_id,
                email,
                phone
              )
            `)
            .eq('class_id', cls.id);

          if (studentsError) throw studentsError;

          // Fetch attendance summary for each student
          const studentsWithAttendance = await Promise.all(
            (studentsData || []).map(async ({ student }) => {
              // Get attendance summary
              const { data: summaryData, error: summaryError } = await supabase
                .from('student_attendance_summary')
                .select('*')
                .eq('student_id', student.id)
                .eq('class_id', cls.id)
                .single();

              if (summaryError) throw summaryError;

              // Get recent attendance records
              const { data: recentSessions, error: recentError } = await supabase
                .from('attendance_sessions')
                .select(`
                  id,
                  created_at,
                  attendance_records!inner (
                    student_id
                  )
                `)
                .eq('class_id', cls.id)
                .order('created_at', { ascending: false })
                .limit(5);

              if (recentError) throw recentError;

              const recentAttendance = (recentSessions || []).map(session => ({
                date: session.created_at,
                attended: session.attendance_records.some(
                  record => record.student_id === student.id
                ),
              }));

              return {
                ...student,
                attendance: {
                  total_sessions: summaryData?.total_sessions || 0,
                  attended_sessions: summaryData?.attended_sessions || 0,
                  attendance_percentage: summaryData?.attendance_percentage || 0,
                  recent_sessions: recentAttendance,
                },
              };
            })
          );

          return {
            ...cls,
            students: studentsWithAttendance.sort((a, b) => a.name.localeCompare(b.name)),
          };
        })
      );

      setClasses(classesWithStudents);
    } catch (error: any) {
      toast.error('Failed to load students');
      console.error('Error loading students:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredClasses = classes.map(cls => ({
    ...cls,
    students: cls.students.filter(student =>
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.student_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email.toLowerCase().includes(searchTerm.toLowerCase())
    ),
  })).filter(cls => cls.students.length > 0);

  const getAttendanceColor = (percentage: number) => {
    if (percentage >= 90) return 'text-green-600 bg-green-100';
    if (percentage >= 75) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Students</h1>
          <p className="mt-2 text-sm text-gray-600">
            View and manage students enrolled in your classes.
          </p>
        </div>
        <div className="relative">
          <input
            type="text"
            placeholder="Search students..."
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
        </div>
      </header>

      {classes.length === 0 ? (
        <div className="bg-white shadow rounded-lg">
          <div className="p-6">
            <div className="text-center">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No Classes</h3>
              <p className="mt-1 text-sm text-gray-500">
                You haven't created any classes yet.
              </p>
            </div>
          </div>
        </div>
      ) : filteredClasses.length === 0 ? (
        <div className="bg-white shadow rounded-lg">
          <div className="p-6">
            <div className="text-center">
              <Search className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No Results</h3>
              <p className="mt-1 text-sm text-gray-500">
                No students found matching your search.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredClasses.map((cls) => (
            <div key={cls.id} className="bg-white shadow rounded-lg overflow-hidden">
              <div className="px-4 py-5 border-b border-gray-200 sm:px-6">
                <div className="flex items-center">
                  <GraduationCap className="h-5 w-5 text-indigo-600 mr-2" />
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    {cls.name}
                  </h3>
                  <span className="ml-2 text-sm text-gray-500">
                    ({cls.students.length} students)
                  </span>
                </div>
              </div>
              <div className="bg-white">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Name
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Student ID
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Email
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Recent Attendance
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total Attendance
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {cls.students.map((student) => (
                        <tr key={student.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{student.name}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">{student.student_id}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">{student.email}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex space-x-1">
                              {student.attendance.recent_sessions.map((session, index) => (
                                <div
                                  key={index}
                                  className="group relative"
                                  title={`${format(new Date(session.date), 'MMM d, yyyy')}: ${session.attended ? 'Present' : 'Absent'}`}
                                >
                                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                                    session.attended ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                                  }`}>
                                    <Calendar className="w-4 h-4" />
                                  </div>
                                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                    {format(new Date(session.date), 'MMM d, yyyy')}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center space-x-2">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                getAttendanceColor(student.attendance.attendance_percentage)
                              }`}>
                                {student.attendance.attendance_percentage}%
                              </span>
                              <span className="text-sm text-gray-500">
                                ({student.attendance.attended_sessions}/{student.attendance.total_sessions} sessions)
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}