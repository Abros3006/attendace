import { useState, useEffect } from 'react';
import { Plus, Clock, Link as LinkIcon, Copy, Check, UserPlus, QrCode, ExternalLink, Trash2, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';

interface Class {
  id: string;
  name: string;
  description: string;
  max_students: number;
  is_active: boolean;
  registration_code: string;
}

interface TimeSlot {
  id: string;
  class_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  room_number: string;
}

interface AttendanceSession {
  id: string;
  code: string;
  expires_at: string;
}

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const TIME_SLOTS = Array.from({ length: 24 }, (_, i) => {
  const hour = Math.floor(i / 2) + 7; 
  const minute = (i % 2) * 30;
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
});

export default function Classes() {
  // Keep all existing state definitions and hooks
  const { user } = useAuth();
  const [classes, setClasses] = useState<Class[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newClass, setNewClass] = useState({
    name: '',
    description: '',
    max_students: 50,
    day_of_week: 1,
    start_time: '09:00',
    end_time: '10:30',
  });
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [newTimeSlot, setNewTimeSlot] = useState({
    day_of_week: 1,
    start_time: '09:00',
    end_time: '10:30',
    room_number: '',
  });
  const [copiedInvites, setCopiedInvites] = useState<Record<string, boolean>>({});
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);
  const [selectedClassForStudent, setSelectedClassForStudent] = useState<string | null>(null);
  const [newStudent, setNewStudent] = useState({
    name: '',
    studentId: '',
    email: '',
    phone: '',
  });
  const [activeAttendanceSessions, setActiveAttendanceSessions] = useState<Record<string, AttendanceSession>>({});

  // Keep all existing useEffect hooks and functions
  useEffect(() => {
    if (user) {
      fetchClasses();
    }
  }, [user]);

  useEffect(() => {
    if (selectedClass) {
      fetchTimeSlots(selectedClass);
      fetchActiveAttendanceSession(selectedClass);
    }
  }, [selectedClass]);

  // Keep all existing function implementations
  const fetchClasses = async () => {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClasses(data || []);
    } catch (error: any) {
      toast.error('Failed to load classes');
      console.error('Error loading classes:', error);
    }
  };

  const fetchTimeSlots = async (classId: string) => {
    try {
      const { data, error } = await supabase
        .from('timetable_slots')
        .select('*')
        .eq('class_id', classId)
        .order('day_of_week', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) throw error;
      setTimeSlots(data || []);
    } catch (error: any) {
      toast.error('Failed to load timetable');
      console.error('Error loading timetable:', error);
    }
  };

  const fetchActiveAttendanceSession = async (classId: string) => {
    try {
      const { data, error } = await supabase
        .from('attendance_sessions')
        .select('*')
        .eq('class_id', classId)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setActiveAttendanceSessions(prev => ({
          ...prev,
          [classId]: data
        }));
      } else {
        setActiveAttendanceSessions(prev => {
          const newSessions = { ...prev };
          delete newSessions[classId];
          return newSessions;
        });
      }
    } catch (error: any) {
      console.error('Error fetching active attendance session:', error);
    }
  };

  const createAttendanceSession = async (classId: string) => {
    try {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 15);

      const { data, error } = await supabase
        .from('attendance_sessions')
        .insert({
          class_id: classId,
          code,
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      setActiveAttendanceSessions(prev => ({
        ...prev,
        [classId]: data
      }));

      toast.success('Attendance session created');
    } catch (error: any) {
      toast.error('Failed to create attendance session');
      console.error('Error creating attendance session:', error);
    }
  };

  const copyRegistrationLink = async (code: string, classId: string) => {
    try {
      const registrationLink = `${window.location.origin}/join/${code}`;
      await navigator.clipboard.writeText(registrationLink);
      setCopiedInvites(prev => ({ ...prev, [classId]: true }));
      toast.success('Registration link copied to clipboard');
      
      setTimeout(() => {
        setCopiedInvites(prev => ({ ...prev, [classId]: false }));
      }, 2000);
    } catch (error) {
      toast.error('Failed to copy registration link');
    }
  };


  const createClass = async () => {
    if (!user) return;

    try {
      const { data: classData, error: classError } = await supabase
        .from('classes')
        .insert([{
          name: newClass.name,
          description: newClass.description,
          max_students: newClass.max_students,
          is_active: true,
        }])
        .select()
        .single();

      if (classError) throw classError;

      const { error: timeSlotError } = await supabase
        .from('timetable_slots')
        .insert([{
          class_id: classData.id,
          day_of_week: newClass.day_of_week,
          start_time: newClass.start_time,
          end_time: newClass.end_time,
        }]);

      if (timeSlotError) throw timeSlotError;
      
      setClasses(prev => [classData, ...prev]);
      setIsCreateModalOpen(false);
      setNewClass({
        name: '',
        description: '',
        max_students: 50,
        day_of_week: 1,
        start_time: '09:00',
        end_time: '10:30',
      });
      toast.success('Class created successfully');
    } catch (error: any) {
      toast.error('Failed to create class');
      console.error('Error creating class:', error);
    }
  };

  const deleteClass = async () => {
    if (!selectedClass) return;

    try {
      const { error: deleteError } = await supabase
        .from('classes')
        .delete()
        .eq('id', selectedClass);

      if (deleteError) throw deleteError;

      setClasses(prev => prev.filter(cls => cls.id !== selectedClass));
      setSelectedClass(null);
      toast.success('Class deleted successfully');
    }
    catch (error: any) {
      toast.error('Failed to delete class');
      console.error('Error deleting class:', error);
    }
  };

  const addTimeSlot = async () => {
    if (!selectedClass) return;

    try {
      const { data: existingSlots, error: checkError } = await supabase
        .from('timetable_slots')
        .select('*')
        .eq('class_id', selectedClass)
        .eq('day_of_week', newTimeSlot.day_of_week)
        .eq('start_time', newTimeSlot.start_time);

      if (checkError) throw checkError;

      if (existingSlots && existingSlots.length > 0) {
        toast.error(`A time slot already exists for ${DAYS_OF_WEEK[newTimeSlot.day_of_week]} at ${format(new Date(`2000-01-01T${newTimeSlot.start_time}`), 'h:mm a')}`);
        return;
      }

      const { data, error } = await supabase
        .from('timetable_slots')
        .insert([{ ...newTimeSlot, class_id: selectedClass }])
        .select()
        .single();

      if (error) throw error;
      
      setTimeSlots(prev => [...prev, data]);
      setNewTimeSlot({
        day_of_week: 1,
        start_time: '09:00',
        end_time: '10:30',
        room_number: '',
      });
      toast.success('Time slot added successfully');
    } catch (error: any) {
      toast.error('Failed to add time slot');
      console.error('Error adding time slot:', error);
    }
  };

  const addStudent = async () => {
    if (!selectedClassForStudent) return;

    try {
      const { data: existingStudent, error: checkError } = await supabase
        .from('students')
        .select('id')
        .or(`email.eq.${newStudent.email},student_roll.eq.${newStudent.studentId}`)
        .maybeSingle();

      if (checkError) throw checkError;

      let studentId;

      if (existingStudent) {
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
        const { data: newStudentData, error: createError } = await supabase
          .from('students')
          .insert({
            name: newStudent.name,
            student_roll: newStudent.studentId,
            email: newStudent.email,
            phone: newStudent.phone,
          })
          .select('id')
          .single();

        if (createError) throw createError;
        studentId = newStudentData.id;
      }

      const { error: enrollError } = await supabase
        .from('class_students')
        .insert({
          class_id: selectedClassForStudent,
          student_id: studentId,
        });

      if (enrollError) {
        if (enrollError.code === '23505') {
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
      });
      fetchClasses();
    } catch (error: any) {
      toast.error(error.message || 'Failed to add student');
    }
  };

  const getClassForTimeSlot = (day: number, time: string) => {
    return timeSlots.find(slot => 
      slot.day_of_week === day && 
      slot.start_time <= time && 
      slot.end_time > time
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
  <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
    <div>
      <h1 className="text-3xl font-bold tracking-tight text-gray-900">Classes</h1>
      <p className="mt-2 text-sm text-gray-600">
        Manage your classes, schedules, and student attendance
      </p>
    </div>
    <button
      onClick={() => setIsCreateModalOpen(true)}
      className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
    >
      <Plus className="h-4 w-4 mr-2" />
      Create Class
    </button>
  </header>

  <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
    {classes.map(cls => (
      <div
        key={cls.id}
        className={`bg-white rounded-xl border overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 ${
          selectedClass === cls.id ? 'ring-2 ring-indigo-500' : ''
        }`}
      >
        <div 
          className="p-6 cursor-pointer"
          onClick={() => setSelectedClass(cls.id)}
        >
          <div className="flex justify-between items-start">
            <h3 className="text-lg font-semibold text-gray-900">{cls.name}</h3>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
              {cls.max_students} max
            </span>
          </div>
          <p className="mt-2 text-sm text-gray-600">{cls.description}</p>
          
          {/* Registration Code */}
          <div className="mt-5 flex flex-col space-y-4">
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <LinkIcon className="h-4 w-4 text-indigo-600" />
                  <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                    {cls.registration_code}
                  </span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    copyRegistrationLink(cls.registration_code, cls.id);
                  }}
                  className="inline-flex items-center p-1.5 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-full transition-colors"
                >
                  {copiedInvites[cls.id] ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Registration code for this class
              </p>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-3">
              <a
                href={`${window.location.origin}/student-attendance`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center justify-center px-3 py-2 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 text-sm font-medium text-gray-700 transition-colors"
              >
                <ExternalLink className="h-4 w-4 mr-2 text-indigo-500" />
                Attendance Report
              </a>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedClassForStudent(cls.id);
                  setIsAddStudentModalOpen(true);
                }}
                className="flex items-center justify-center px-3 py-2 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 text-sm font-medium text-gray-700 transition-colors"
              >
                <UserPlus className="h-4 w-4 mr-2 text-indigo-500" />
                Add Student
              </button>
            </div>
          </div>

          {/* Attendance Session */}
          <div className="mt-5 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-gray-900">Attendance Session</h4>
              {!activeAttendanceSessions[cls.id] && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    createAttendanceSession(cls.id);
                  }}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
                >
                  <QrCode className="h-4 w-4 mr-1.5" />
                  Start Session
                </button>
              )}
            </div>
            
            {activeAttendanceSessions[cls.id] && (
              <div>
                <div className="flex justify-center mb-3">
                  <span className="font-mono text-3xl font-bold text-indigo-600">
                    {activeAttendanceSessions[cls.id].code}
                  </span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2 flex-1 overflow-hidden">
                    <LinkIcon className="h-4 w-4 flex-shrink-0 text-indigo-500" />
                    <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded truncate">
                      {`${window.location.origin}/attendance`}
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigator.clipboard.writeText(`${window.location.origin}/attendance`);
                      toast.success('Attendance URL copied to clipboard');
                    }}
                    className="inline-flex items-center ml-2 p-1.5 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-full transition-colors"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex items-center space-x-2 text-xs text-gray-500">
                  <Clock className="h-3.5 w-3.5" />
                  <span>
                    Expires in {Math.max(0, Math.floor((new Date(activeAttendanceSessions[cls.id].expires_at).getTime() - new Date().getTime()) / 60000))} minutes
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {selectedClass === cls.id && (
          <div className="border-t border-gray-200 bg-gray-50 p-6 space-y-6">
            {/* Schedule List View */}
            <div className="border rounded-lg shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600">
                <h4 className="text-sm font-semibold text-white">Weekly Schedule</h4>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-3 py-3 bg-gray-100 text-xs font-medium text-gray-600 uppercase tracking-wider w-20 border-r border-gray-200">
                        Time
                      </th>
                      {DAYS_OF_WEEK.map(day => (
                        <th key={day} className="px-3 py-3 bg-gray-100 text-xs font-medium text-gray-600 uppercase tracking-wider border-r last:border-r-0 border-gray-200">
                          {day.slice(0, 3)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {TIME_SLOTS.map((time, i) => (
                      <tr key={time} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-3 py-3 text-xs font-medium text-gray-600 whitespace-nowrap border-r border-gray-200">
                          {format(new Date(`2000-01-01T${time}`), 'h:mm a')}
                        </td>
                        {DAYS_OF_WEEK.map((_, dayIndex) => {
                          const slot = getClassForTimeSlot(dayIndex, time);
                          return (
                            <td key={dayIndex} className="px-2 py-2 border-r last:border-r-0 border-gray-200">
                              {slot && (
                                <div className="text-xs bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 text-indigo-800 rounded-md px-3 py-2 shadow-sm hover:shadow transition duration-150">
                                  <div className="font-medium">
                                    {format(new Date(`2000-01-01T${slot.start_time}`), 'h:mm a')} -{' '}
                                    {format(new Date(`2000-01-01T${slot.end_time}`), 'h:mm a')}
                                  </div>
                                  {slot.room_number && (
                                    <div className="text-xs text-indigo-600 mt-1 flex items-center">
                                      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                                        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"></path>
                                      </svg>
                                      Room {slot.room_number}
                                    </div>
                                  )}
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Add Time Slot Form */}
            <div className="space-y-4">
              <h4 className="text-lg font-medium text-gray-900">Add Time Slot</h4>
              <div className="p-4 bg-white rounded-lg border border-gray-200 space-y-4">
                <select
                  value={newTimeSlot.day_of_week}
                  onChange={(e) => setNewTimeSlot(prev => ({ ...prev, day_of_week: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                >
                  {DAYS_OF_WEEK.map((day, index) => (
                    <option key={day} value={index}>{day}</option>
                  ))}
                </select>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">Start Time</label>
                    <input
                      type="time"
                      value={newTimeSlot.start_time}
                      onChange={(e) => setNewTimeSlot(prev => ({ ...prev, start_time: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">End Time</label>
                    <input
                      type="time"
                      value={newTimeSlot.end_time}
                      onChange={(e) => setNewTimeSlot(prev => ({ ...prev, end_time: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                    />
                  </div>
                </div>
                
                <input
                  type="text"
                  placeholder="Room number (optional)"
                  value={newTimeSlot.room_number}
                  onChange={(e) => setNewTimeSlot(prev => ({ ...prev, room_number: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                />
                
                <button
                  onClick={addTimeSlot}
                  className="w-full flex justify-center items-center px-4 py-2.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                >
                  <Clock className="h-5 w-5 mr-2" />
                  Add Time Slot
                </button>
              </div>
              
              <button
                onClick={deleteClass}
                className="w-full flex justify-center items-center px-4 py-2.5 text-red-600 border border-red-200 bg-red-50 rounded-md hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
              >
                <Trash2 className="h-5 w-5 mr-2" />
                Delete Class
              </button>
            </div>
          </div>
        )}
      </div>
    ))}
  </div>

  {/* Add Student Modal */}
  {isAddStudentModalOpen && (
    <div className="fixed inset-0 z-50 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div 
        className="bg-white rounded-xl shadow-2xl max-w-md w-full p-8 space-y-6 
        transform transition-all duration-300 ease-in-out scale-100"
      >
        <div className="flex items-center justify-between border-b pb-3 border-gray-200">
          <h3 className="text-xl font-bold text-gray-900">
            Add Student
          </h3>
          <button
            onClick={() => {
              setIsAddStudentModalOpen(false);
              setNewStudent({
                name: '',
                studentId: '',
                email: '',
                phone: '',
              });
            }}
            className="text-gray-400 hover:text-gray-500 focus:outline-none"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="space-y-5">
          <div className="space-y-1.5">
            <label 
              htmlFor="name" 
              className="block text-sm font-medium text-gray-700"
            >
              Full Name
            </label>
            <input
              type="text"
              id="name"
              value={newStudent.name}
              onChange={(e) => setNewStudent(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-md 
              focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 
              transition-all duration-200 ease-in-out"
              placeholder="Enter full name"
            />
          </div>
    
          <div className="space-y-1.5">
            <label 
              htmlFor="studentId" 
              className="block text-sm font-medium text-gray-700"
            >
              Student ID
            </label>
            <input
              type="text"
              id="studentId"
              value={newStudent.studentId}
              onChange={(e) => setNewStudent(prev => ({ ...prev, studentId: e.target.value }))}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-md 
              focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 
              transition-all duration-200 ease-in-out"
              placeholder="Enter student ID"
            />
          </div>
    
          <div className="space-y-1.5">
            <label 
              htmlFor="email" 
              className="block text-sm font-medium text-gray-700"
            >
              Email
            </label>
            <input
              type="email"
              id="email"
              value={newStudent.email}
              onChange={(e) => setNewStudent(prev => ({ ...prev, email: e.target.value }))}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-md 
              focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 
              transition-all duration-200 ease-in-out"
              placeholder="Enter email address"
            />
          </div>
    
          <div className="space-y-1.5">
            <label 
              htmlFor="phone" 
              className="block text-sm font-medium text-gray-700"
            >
              Phone
            </label>
            <input
              type="tel"
              id="phone"
              value={newStudent.phone}
              onChange={(e) => setNewStudent(prev => ({ ...prev, phone: e.target.value }))}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-md 
              focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 
              transition-all duration-200 ease-in-out"
              placeholder="Enter phone number"
            />
          </div>
        </div>
    
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <button
            onClick={() => {
              setIsAddStudentModalOpen(false);
              setNewStudent({
                name: '',
                studentId: '',
                email: '',
                phone: '',
              });
            }}
            className="px-4 py-2.5 border border-gray-300 rounded-md text-sm font-medium 
            text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 
            focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200"
          >
            Cancel
          </button>
          <button
            onClick={addStudent}
            className="px-4 py-2.5 border border-transparent rounded-md text-sm font-medium 
            text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none 
            focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 
            transition-all duration-200 ease-in-out"
          >
            Add Student
          </button>
        </div>
      </div>
    </div>
  )}

  {/* Create Class Modal */}
  {isCreateModalOpen && (
    <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
        <div className="flex items-center justify-between border-b pb-3 border-gray-200 mb-4">
          <h3 className="text-xl font-bold text-gray-900">Create New Class</h3>
          <button
            onClick={() => {
              setIsCreateModalOpen(false);
              setNewClass({
                name: '',
                description: '',
                max_students: 50,
                day_of_week: 1,
                start_time: '09:00',
                end_time: '10:30',
              });
            }}
            className="text-gray-400 hover:text-gray-500 focus:outline-none"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Class Name</label>
            <input
              type="text"
              value={newClass.name}
              onChange={(e) => setNewClass(prev => ({ ...prev, name: e.target.value }))}
              className="mt-1 w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm p-2"
              placeholder="Enter class name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              rows={3}
              value={newClass.description}
              onChange={(e) => setNewClass(prev => ({ ...prev, description: e.target.value }))}
              className="mt-1 w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm p-2"
              placeholder="Enter class description"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Maximum Students</label>
            <input
              type="number"
              value={newClass.max_students}
              onChange={(e) => setNewClass(prev => ({ ...prev, max_students: parseInt(e.target.value) }))}
              className="mt-1 w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm p-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Initial Class Schedule</label>
            <div className="mt-2 space-y-3">
              <select
                value={newClass.day_of_week}
                onChange={(e) => setNewClass(prev => ({ ...prev, day_of_week: parseInt(e.target.value) }))}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm p-2"
              >
                {DAYS_OF_WEEK.map((day, index) => (
                  <option key={day} value={index}>{day}</option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700">Start Time</label>
                  <input
                    type="time"
                    value={newClass.start_time}
                    onChange={(e) => setNewClass(prev => ({ ...prev, start_time: e.target.value }))}
                    className="mt-1 w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm p-2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700">End Time</label>
                  <input
                    type="time"
                    value={newClass.end_time}
                    onChange={(e) => setNewClass(prev => ({ ...prev, end_time: e.target.value }))}
                    className="mt-1 w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm p-2"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-6 flex justify-end space-x-3">
          <button
            onClick={() => {
              setIsCreateModalOpen(false);
              setNewClass({
                name: '',
                description: '',
                max_students: 50,
                day_of_week: 1,
                start_time: '09:00',
                end_time: '10:30',
              });
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={createClass}
            className="px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition"
          >
            Create Class
          </button>
        </div>
      </div>
    </div>
  )}
</div>
  )
}