import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Calendar, Clock, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

interface AttendanceRecord {
  session_date: string;
  attended: boolean;
  class_name: string;
}

interface AttendanceSummary {
  class_id: string;
  class_name: string;
  total_sessions: number;
  attended_sessions: number;
  attendance_percentage: number;
}

export default function StudentAttendance() {
  const [searchParams] = useSearchParams();
  const studentId = searchParams.get('id');
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [summary, setSummary] = useState<AttendanceSummary[]>([]);

  useEffect(() => {
    if (studentId) {
      fetchAttendanceData();
    }
  }, [studentId]);

  const fetchAttendanceData = async () => {
    try {
      // Fetch attendance summary
      const { data: summaryData, error: summaryError } = await supabase
        .from('student_attendance_summary')
        .select(`
          class_id,
          total_sessions,
          attended_sessions,
          attendance_percentage,
          classes (
            name
          )
        `)
        .eq('student_id', studentId);

      if (summaryError) throw summaryError;

      // Format summary data
      const formattedSummary = (summaryData || []).map(record => ({
        class_id: record.class_id,
        class_name: record.classes.name,
        total_sessions: record.total_sessions,
        attended_sessions: record.attended_sessions,
        attendance_percentage: record.attendance_percentage,
      }));

      setSummary(formattedSummary);

      // Fetch detailed attendance records
      const { data: recordsData, error: recordsError } = await supabase
        .from('attendance_sessions')
        .select(`
          created_at,
          classes (
            name
          ),
          attendance_records!inner (
            student_id
          )
        `)
        .eq('attendance_records.student_id', studentId)
        .order('created_at', { ascending: false });

      if (recordsError) throw recordsError;

      // Format records data
      const formattedRecords = (recordsData || []).map(record => ({
        session_date: record.created_at,
        attended: true, // If we have a record, it means the student attended
        class_name: record.classes.name,
      }));

      setRecords(formattedRecords);
    } catch (error: any) {
      toast.error('Failed to load attendance data');
      console.error('Error loading attendance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAttendanceColor = (percentage: number) => {
    if (percentage >= 90) return 'text-green-600 bg-green-100';
    if (percentage >= 75) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  if (!studentId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">Invalid Request</h2>
          <p className="mt-2 text-gray-600">No student ID provided.</p>
          <Link
            to="/"
            className="mt-4 inline-flex items-center text-indigo-600 hover:text-indigo-500"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go back
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <Link
            to="/"
            className="inline-flex items-center text-indigo-600 hover:text-indigo-500"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Link>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-8">Attendance Report</h1>

        {/* Attendance Summary Cards */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 mb-8">
          {summary.map((classSummary) => (
            <div
              key={classSummary.class_id}
              className="bg-white rounded-lg shadow p-6"
            >
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {classSummary.class_name}
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Total Sessions</span>
                  <span className="font-medium">{classSummary.total_sessions}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Sessions Attended</span>
                  <span className="font-medium">{classSummary.attended_sessions}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Attendance</span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    getAttendanceColor(classSummary.attendance_percentage)
                  }`}>
                    {classSummary.attendance_percentage}%
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Detailed Attendance Records */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-4 py-5 border-b border-gray-200 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Attendance History
            </h3>
          </div>
          <div className="bg-white">
            <ul className="divide-y divide-gray-200">
              {records.map((record, index) => (
                <li key={index} className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Calendar className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {record.class_name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {format(new Date(record.session_date), 'PPP')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-500">
                        {format(new Date(record.session_date), 'p')}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
              {records.length === 0 && (
                <li className="px-4 py-8 text-center text-gray-500">
                  No attendance records found
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}