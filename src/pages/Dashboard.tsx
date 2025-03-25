import { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import {
  GraduationCap,
  Users,
  Calendar,
  LogOut,
  Menu,
  X,
  ChevronDown
} from 'lucide-react';
import toast from 'react-hot-toast';

// Import dashboard pages
import Overview from './dashboard/Overview';
import Classes from './dashboard/Classes';
import Students from './dashboard/Students';

interface FacultyProfile {
  name: string;
  email: string;
}

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [profile, setProfile] = useState<FacultyProfile | null>(null);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

  useEffect(() => {
    const getProfile = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('faculty_profiles')
          .select('name, email')
          .eq('id', user.id)
          .maybeSingle();

        if (error) throw error;
        
        if (!data) {
          toast.error('Profile not found. Please register first.');
          await signOut();
          navigate('/register');
          return;
        }

        setProfile(data);
      } catch (error: any) {
        toast.error('Failed to load profile: ' + (error.message || 'Unknown error'));
        console.error('Profile loading error:', error);
      }
    };

    getProfile();
  }, [user, navigate, signOut]);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error: any) {
      toast.error(error.message || 'Failed to sign out');
    }
  };

  const navigation = [
    { name: 'Overview', path: '/dashboard', icon: GraduationCap },
    { name: 'Classes', path: '/dashboard/classes', icon: Calendar },
    { name: 'Students', path: '/dashboard/students', icon: Users },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <GraduationCap className="h-8 w-8 text-indigo-600" />
                <span className="ml-2 text-xl font-bold text-gray-900">QuickAttendance</span>
              </div>
              
              {/* Desktop Navigation */}
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                {navigation.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`${
                      location.pathname === item.path
                        ? 'border-indigo-500 text-gray-900'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                  >
                    <item.icon className="h-4 w-4 mr-2" />
                    {item.name}
                  </Link>
                ))}
              </div>
            </div>

            {/* Profile dropdown */}
            <div className="hidden sm:ml-6 sm:flex sm:items-center">
              <div className="relative">
                <button
                  onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                  className="flex items-center space-x-2 text-sm text-gray-700 hover:text-gray-900 focus:outline-none"
                >
                  <span>{profile?.name}</span>
                  <ChevronDown className="h-4 w-4" />
                </button>

                {isProfileDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5">
                    <div className="py-1">
                      <button
                        onClick={handleSignOut}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Mobile menu button */}
            <div className="sm:hidden flex items-center">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none"
              >
                {isMenuOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="sm:hidden">
            <div className="pt-2 pb-3 space-y-1">
              {navigation.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`${
                    location.pathname === item.path
                      ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                      : 'border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700'
                  } block pl-3 pr-4 py-2 border-l-4 text-base font-medium`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  <div className="flex items-center">
                    <item.icon className="h-4 w-4 mr-2" />
                    {item.name}
                  </div>
                </Link>
              ))}
              <button
                onClick={handleSignOut}
                className="w-full text-left border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700 block pl-3 pr-4 py-2 border-l-4 text-base font-medium"
              >
                <div className="flex items-center">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign out
                </div>
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Main content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <Routes>
          <Route path="/" element={<Overview />} />
          <Route path="/classes" element={<Classes />} />
          <Route path="/students" element={<Students />} />
        </Routes>
      </main>
    </div>
  );
}