import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Users, Clock, UserPlus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

interface DashboardStats {
  activeClasses: number;
  totalStudents: number;
  todaySessions: {
    id: string;
    className: string;
    startTime: string;
    endTime: string;
    roomNumber: string | null;
  }[];
}

interface Class {
  id: string;
  name: string;
}

export default function Overview() {
  const [stats, setStats] = useState<DashboardStats>({
    activeClasses: 0,
    totalStudents: 0,
    todaySessions: [],
  });
  const [loading, setLoading] = useState(true);
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);
  const [classes, setClasses] = useState<Class[]>([]);
  const [newStudent, setNewStudent] = useState({
    name: '',
    studentId: '',
    email: '',
    phone: '',
    classId: '',
  });

  useEffect(() => {
    fetchDashboardStats();
    fetchClasses();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const dayOfWeek = new Date().getDay();
      
      const { data, error } = await supabase
        .rpc('get_dashboard_stats', { current_day: dayOfWeek });
        
      if (error) throw error;
      
      setStats(data as DashboardStats);
    } catch (error) {
      toast.error('Failed to load dashboard statistics');
      console.error('Error loading dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async () => {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('id, name')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setClasses(data || []);
    } catch (error: any) {
      toast.error('Failed to load classes');
      console.error('Error loading classes:', error);
    }
  };

  const addStudent = async () => {
    if (!newStudent.classId) {
      toast.error('Please select a class');
      return;
    }

    try {
      // First check if student exists
      const { data: existingStudent, error: checkError } = await supabase
        .from('students')
        .select('id')
        .or(`email.eq.${newStudent.email},student_id.eq.${newStudent.studentId}`)
        .maybeSingle();

      if (checkError) throw checkError;

      let studentId;

      if (existingStudent) {
        // Update existing student
        const { error: updateError } = await supabase
          .from('students')
          .update({
            name: newStudent.name,
            phone: newStudent.phone,
          })
          .eq('id', existingStudent.id);

        if (updateError) throw updateError;
        studentId = existingStudent.id;
      } else {
        // Create new student
        const { data: newStudentData, error: createError } = await supabase
          .from('students')
          .insert({
            name: newStudent.name,
            student_id: newStudent.studentId,
            email: newStudent.email,
            phone: newStudent.phone,
          })
          .select('id')
          .single();

        if (createError) throw createError;
        studentId = newStudentData.id;
      }

      // Enroll student in class
      const { error: enrollError } = await supabase
        .from('class_students')
        .insert({
          class_id: newStudent.classId,
          student_id: studentId,
        });

      if (enrollError) {
        if (enrollError.code === '23505') { // Unique violation
          throw new Error('Student is already enrolled in this class');
        }
        throw enrollError;
      }

      toast.success('Student added successfully');
      setIsAddStudentModalOpen(false);
      setNewStudent({
        name: '',
        studentId: '',
        email: '',
        phone: '',
        classId: '',
      });
      // Refresh stats
      fetchDashboardStats();
    } catch (error: any) {
      toast.error(error.message || 'Failed to add student');
    }
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
      <header>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard Overview</h1>
        <p className="mt-2 text-sm text-gray-600">
          Welcome back! Here's what's happening with your classes today.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Calendar className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Active Classes
                  </dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">
                      {stats.activeClasses}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm">
              <Link
                to="/dashboard/classes"
                className="font-medium text-indigo-600 hover:text-indigo-500"
              >
                View all classes
              </Link>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Students
                  </dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">
                      {stats.totalStudents}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm">
              <Link
                to="/dashboard/students"
                className="font-medium text-indigo-600 hover:text-indigo-500"
              >
                Manage students
              </Link>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Clock className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Today's Sessions
                  </dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">
                      {stats.todaySessions.length}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm">
              <Link
                to="/dashboard/classes"
                className="font-medium text-indigo-600 hover:text-indigo-500"
              >
                View schedule
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="sm:flex sm:items-center sm:justify-between">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Quick Actions
            </h3>
            <div className="mt-3 sm:mt-0 sm:ml-4">
              <button
                onClick={() => setIsAddStudentModalOpen(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Add Student
              </button>
            </div>
          </div>
        </div>
      </div>

      {stats.todaySessions.length > 0 && (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Today's Schedule
            </h3>
          </div>
          <div className="border-t border-gray-200">
            <ul className="divide-y divide-gray-200">
              {stats.todaySessions.map((session) => (
                <li key={session.id} className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <Clock className="h-5 w-5 text-gray-400" />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">
                          {session.className}
                        </p>
                        <p className="text-sm text-gray-500">
                        {(() => {
                          try {
                            return format(new Date(`2000-01-01T${session.startTime}`), 'h:mm a');
                          } catch (e) {
                            return session.startTime;
                          }
                        })()} - {' '}
                        {(() => {
                          try {
                            return format(new Date(`2000-01-01T${session.endTime}`), 'h:mm a');
                          } catch (e) {
                            return session.endTime;
                          }
                        })()}
                        </p>
                      </div>
                    </div>
                    {session.roomNumber && (
                      <div className="text-sm text-gray-500">
                        Room {session.roomNumber}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Add Student Modal */}
      {isAddStudentModalOpen && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Add Student</h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="class" className="block text-sm font-medium text-gray-700">
                  Select Class
                </label>
                <select
                  id="class"
                  value={newStudent.classId}
                  onChange={(e) => setNewStudent(prev => ({ ...prev, classId: e.target.value }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  <option value="">Select a class...</option>
                  {classes.map(cls => (
                    <option key={cls.id} value={cls.id}>{cls.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Full Name
                </label>
                <input
                  type="text"
                  id="name"
                  value={newStudent.name}
                  onChange={(e) => setNewStudent(prev => ({ ...prev, name: e.target.value }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
              <div>
                <label htmlFor="studentId" className="block text-sm font-medium text-gray-700">
                  Student ID
                </label>
                <input
                  type="text"
                  id="studentId"
                  value={newStudent.studentId}
                  onChange={(e) => setNewStudent(prev => ({ ...prev, studentId: e.target.value }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  value={newStudent.email}
                  onChange={(e) => setNewStudent(prev => ({ ...prev, email: e.target.value }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                  Phone
                </label>
                <input
                  type="tel"
                  id="phone"
                  value={newStudent.phone}
                  onChange={(e) => setNewStudent(prev => ({ ...prev, phone: e.target.value }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setIsAddStudentModalOpen(false);
                  setNewStudent({
                    name: '',
                    studentId: '',
                    email: '',
                    phone: '',
                    classId: '',
                  });
                }}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={addStudent}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
              >
                Add Student
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}