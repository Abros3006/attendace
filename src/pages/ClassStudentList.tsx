import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface StudentAttendance {
  student_id: string;
  name: string;
  student_id_num: string;
  email: string;
  attended_sessions: number;
  total_sessions: number;
  attendance_percentage: number;
}

export default function ClassStudents() {
  const [students, setStudents] = useState<StudentAttendance[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const { classId } = useParams();

  useEffect(() => {
    fetchClassStudentsAttendance();
  }, [classId]);

  const fetchClassStudentsAttendance = async () => {
    const { data, error } = await supabase
      .rpc('get_class_students_attendance', { p_class_id: classId });
  
    if (error) {
      console.error('Error fetching students attendance:', error);
      return;
    }
  
    setStudents(data);
  };

  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.student_id_num.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.attendance_percentage.toString().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Students Attendance</h1>
        <div className="relative">
          <input
            type="text"
            placeholder="Search students..."
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 w-64"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
        </div>
      </div>
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Roll Number</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Attended Sessions</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Sessions</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Attendance %</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredStudents.map((student) => (
              <tr key={student.student_id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{student.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.student_id_num}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.attended_sessions}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.total_sessions}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {student.attendance_percentage.toFixed(2)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}