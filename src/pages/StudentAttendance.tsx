import { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function StudentAttendanceCard() {
  const [studentRoll, setStudentRoll] = useState('');
  const [email, setEmail] = useState('');
  const [attendancePercentage, setAttendancePercentage] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchAttendance = async () => {
    // Reset previous state
    setError(null);
    setAttendancePercentage(null);
    
    // Validate inputs
    if (!studentRoll.trim() || !email.trim()) {
      setError('Please enter both Roll Number and Email');
      return;
    }

    setLoading(true);

    try {
      // Call the SQL function
      const { data, error } = await supabase.rpc('get_student_attendance_percentage', {
        input_roll_number: studentRoll,
        input_email: email
      });

      if (error) {
        throw error;
      }

      // Check if data is returned and access the 'ap' value
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
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-2xl font-bold text-center mb-6">Student Attendance</h2>
        
        <div className="space-y-4">
          <input 
            type="text"
            placeholder="Enter Roll Number" 
            value={studentRoll}
            onChange={(e) => setStudentRoll(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input 
            type="email"
            placeholder="Enter Email" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          
          <button 
            onClick={fetchAttendance} 
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition-colors duration-300 disabled:opacity-50"
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
      </div>
    </div>
  );
}