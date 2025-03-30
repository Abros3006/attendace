import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Search, ArrowLeft, Trash2, AlertCircle } from 'lucide-react';
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
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const { classId } = useParams();
  const navigate = useNavigate();

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

  const handleDeleteStudent = async (studentId: string) => {
    setDeleteId(studentId);
    setShowConfirmModal(true);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    
    setIsDeleting(true);
    
    try {
      // First remove the student from the class enrollment
      const { error } = await supabase
        .from('class_students')
        .delete()
        .eq('student_id', deleteId)
        .eq('class_id', classId);
        
      if (error) throw error;
      
      // Update the local state to remove the deleted student
      setStudents(students.filter(student => student.student_id !== deleteId));
    } catch (error) {
      console.error('Error deleting student:', error);
    } finally {
      setIsDeleting(false);
      setShowConfirmModal(false);
      setDeleteId(null);
    }
  };

  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.student_id_num.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.attendance_percentage.toString().includes(searchTerm.toLowerCase())
  );

  const getAttendanceStatusColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-green-100 text-green-800';
    if (percentage >= 75) return 'bg-blue-100 text-blue-800';
    if (percentage >= 60) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <button 
        onClick={() => navigate(-1)} 
        className="flex items-center text-indigo-600 hover:text-indigo-900 mb-4 transition-colors duration-200"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        <span>Back to Class</span>
      </button>
      
      <div className="bg-white shadow-md rounded-lg overflow-hidden border border-gray-200">
        <div className="p-6 bg-gradient-to-r from-indigo-500 to-purple-600">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h1 className="text-2xl font-bold text-white">Students Attendance</h1>
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                placeholder="Search students..."
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 w-full bg-white/90 backdrop-blur-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-500" />
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Roll Number</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Attended</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Attendance</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredStudents.length > 0 ? (
                filteredStudents.map((student) => (
                  <tr key={student.student_id} className="hover:bg-gray-50 transition-colors duration-150">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{student.name}</div>
                      <div className="text-sm text-gray-500">{student.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">{student.student_id_num}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.attended_sessions}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.total_sessions}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getAttendanceStatusColor(student.attendance_percentage)}`}>
                        {student.attendance_percentage.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleDeleteStudent(student.student_id)}
                        className="text-red-600 hover:text-red-900 transition-colors duration-200 flex items-center ml-auto"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete</span>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center">
                      <AlertCircle className="h-8 w-8 text-gray-400 mb-2" />
                      <p className="text-gray-600">No students found matching your search criteria</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {students.length === 0 && !searchTerm && (
          <div className="py-12 text-center text-gray-500">
            <div className="flex flex-col items-center justify-center">
              <AlertCircle className="h-12 w-12 text-gray-400 mb-3" />
              <p className="text-lg text-gray-600 mb-1">No students enrolled</p>
              <p className="text-sm text-gray-500">Students enrolled in this class will appear here</p>
            </div>
          </div>
        )}
      </div>
      
      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Confirm Deletion</h3>
            <p className="text-sm text-gray-500 mb-6">
              Are you sure you want to remove this student from the class? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors duration-200"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors duration-200 flex items-center"
                disabled={isDeleting}
              >
                {isDeleting ? 'Removing...' : 'Remove Student'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}