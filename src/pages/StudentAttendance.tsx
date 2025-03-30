import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';

export default function StudentAttendanceCard() {
  const [studentRoll, setStudentRoll] = useState('');
  const [email, setEmail] = useState('');
  const [attendancePercentage, setAttendancePercentage] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchAttendance = async () => {
    setError(null);
    setAttendancePercentage(null);
    
    if (!studentRoll.trim() || !email.trim()) {
      setError('Please enter both Roll Number and Email');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.rpc('get_student_attendance_percentage', {
        input_roll_number: studentRoll,
        input_email: email
      });

      if (error) {
        throw error;
      }

      if (data && data.length > 0) {
        setAttendancePercentage(data[0].ap);
      } else {
        setError('No attendance data found for this student');
      }
    } catch (err) {
      console.error('Error fetching attendance:', err);
      setError('Failed to fetch attendance. Please check your details.');
    } finally {
      setLoading(false);
    }
  };

  const getAttendanceColor = (percentage: number | null) => {
    if (percentage === null) return 'text-gray-500';
    if (percentage >= 75) return 'text-green-600';
    if (percentage >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg">
        <div>
          <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-full bg-gradient-to-r from-blue-600 to-indigo-600">
            <svg className="h-10 w-10 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"></path></svg>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Student Attendance
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Enter your roll number and email to check attendance
          </p>
        </div>

        <div className="mt-8 space-y-2">
          <label className="block text-sm font-medium text-gray-700">Roll Number</label>
          <input 
            type="text"
            placeholder="Enter Roll Number" 
            value={studentRoll}
            onChange={(e) => setStudentRoll(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <input 
            type="email"
            placeholder="Enter Email" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
          
          <button 
            onClick={fetchAttendance} 
            disabled={loading}
            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            {loading ? 'Fetching...' : 'Check Attendance'}
          </button>

          {error && (
            <div className="bg-red-50 border border-red-300 text-red-600 px-4 py-3 rounded-md">
              {error}
            </div>
          )}

          {attendancePercentage !== null && (
            <div className="mt-4 text-center">
              <div className={`text-3xl font-bold ${getAttendanceColor(attendancePercentage)}`}>
                {attendancePercentage}%
              </div>
              <p className="text-sm text-gray-600 mt-2">
                {attendancePercentage >= 75 
                  ? 'Great attendance! Keep it up.' 
                  : attendancePercentage >= 50 
                    ? 'Attendance is below recommended level.' 
                    : 'Low attendance. Take immediate action.'}
              </p>
            </div>
          )}
        </div>
        <div className="text-center space-y-2 border-t pt-2">
          <Link to="/attendance" className="text-sm text-indigo-600 hover:text-indigo-500 flex items-center justify-center">
            Mark your attendance →
          </Link>
        </div>
      </div>
    </div>
  );
}
