import { useState, useEffect } from 'react';
import { Users, Search, GraduationCap } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';

interface Class {
  id: string;
  name: string;
  students_count: number;
}

export default function Classes() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchFacultyClasses();
  }, []);

  const fetchFacultyClasses = async () => {
    try {
      // Get the current user's session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('No active session');
        setLoading(false);
        return;
      }

      // Fetch classes for the current faculty member with student count
      const { data: classesData, error } = await supabase
        .from('classes')
        .select(`
          id, 
          name, 
          students:class_students(student_id)
        `)
        .eq('faculty_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform data to include student count
      const formattedClasses = (classesData || []).map(cls => ({
        id: cls.id,
        name: cls.name,
        students_count: cls.students.length
      }));

      setClasses(formattedClasses);
    } catch (error: any) {
      toast.error('Failed to load classes');
      console.error('Error loading classes:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredClasses = classes.filter(cls =>
    cls.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          <h1 className="text-3xl font-bold text-gray-900">My Classes</h1>
          <p className="mt-2 text-sm text-gray-600">
            View and manage the classes you teach.
          </p>
        </div>
        <div className="relative">
          <input
            type="text"
            placeholder="Search classes..."
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
                No classes found matching your search.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredClasses.map((cls) => (
            <Link 
              to={`/classes/${cls.id}`} 
              key={cls.id} 
              className="block bg-white shadow rounded-lg overflow-hidden hover:bg-gray-50 transition-colors"
            >
              <div className="px-4 py-5 border-b border-gray-200 sm:px-6">
                <div className="flex items-center">
                  <GraduationCap className="h-5 w-5 text-indigo-600 mr-2" />
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    {cls.name}
                  </h3>
                  <span className="ml-2 text-sm text-gray-500">
                    ({cls.students_count} students)
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}