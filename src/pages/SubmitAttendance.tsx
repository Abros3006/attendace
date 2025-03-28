import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { QrCode } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

export default function SubmitAttendance() {
  const [code, setCode] = useState('');
  const [studentId, setStudentId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !studentId) return;

    setSubmitting(true);
    try {
      // First find the active session with this code
      const { data: session, error: sessionError } = await supabase
        .from('attendance_sessions')
        .select(`
          id,
          class_id,
          expires_at,
          classes (
            name
          )
        `)
        .eq('code', code.toUpperCase())
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

      if (sessionError) throw sessionError;
      if (!session) {
        throw new Error('Invalid or expired attendance code');
      }

      // Find the student
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('id')
        .eq('student_roll', studentId)
        .maybeSingle();

      if (studentError) throw studentError;
      if (!student) {
        throw new Error('Student ID not found');
      }

      // Check if student is enrolled in the class
      const { data: enrollment, error: enrollmentError } = await supabase
        .from('class_students')
        .select('id')
        .eq('class_id', session.class_id)
        .eq('student_id', student.id)
        .maybeSingle();

      if (enrollmentError) throw enrollmentError;
      if (!enrollment) {
        throw new Error('You are not enrolled in this class');
      }

      // Record attendance
      const { error: attendanceError } = await supabase
        .from('attendance_records')
        .insert({
          session_id: session.id,
          student_id: student.id,
        });

      if (attendanceError) {
        if (attendanceError.code === '23505') { // Unique violation
          throw new Error('Attendance already recorded for this session');
        }
        throw attendanceError;
      }

      toast.success(`Attendance recorded for ${session.classes}`);
      
      // After successful attendance submission, show the link to view attendance
      const viewAttendanceUrl = `/student-attendance?id=${student.id}`;
      toast.success(
        <div>
          Attendance recorded! 
          <Link 
            to={viewAttendanceUrl} 
            className="block mt-2 text-sm underline hover:text-blue-100"
          >
            View your attendance report →
          </Link>
        </div>,
        { duration: 5000 }
      );

      setCode('');
      setStudentId('');
    } catch (error: any) {
      toast.error(error.message || 'Failed to record attendance');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg">
        <div>
          <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-full bg-gradient-to-r from-blue-600 to-indigo-600">
            <QrCode className="h-10 w-10 text-white" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Submit Attendance
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Enter your attendance code and student ID
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md space-y-4">
            <div>
              <label htmlFor="code" className="block text-sm font-medium text-gray-700">
                Attendance Code
              </label>
              <input
                id="code"
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Enter the 6-digit code"
                maxLength={6}
                disabled={submitting}
              />
            </div>

            <div>
              <label htmlFor="studentId" className="block text-sm font-medium text-gray-700">
                Student ID
              </label>
              <input
                id="studentId"
                type="text"
                required
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Enter your student ID"
                disabled={submitting}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={submitting}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {submitting ? 'Submitting...' : 'Submit Attendance'}
            </button>
          </div>
        </form>

        <div className="text-center space-y-2">
          <button
            onClick={() => navigate('/join')}
            className="text-sm text-indigo-600 hover:text-indigo-500"
          >
            Need to join a class?
          </button>
          <div className="border-t pt-2">
            <Link
              to="/student-attendance"
              className="text-sm text-indigo-600 hover:text-indigo-500 flex items-center justify-center"
            >
              View your attendance report →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}