import { useState, useEffect } from 'react';
import { Plus, Clock, Link as LinkIcon, Copy, Check, UserPlus, QrCode, ExternalLink } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';

// Keep all existing interface and type definitions
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
const TIME_SLOTS = Array.from({ length: 14 }, (_, i) => {
  const hour = Math.floor(i / 2) + 8; // Start from 8 AM
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
        .or(`email.eq.${newStudent.email},student_id.eq.${newStudent.studentId}`)
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
            student_id: newStudent.studentId,
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
    <div className="space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Classes</h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage your classes and timetable.
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Class
        </button>
      </header>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {classes.map(cls => (
          <div
            key={cls.id}
            className={`bg-white rounded-lg shadow p-6 cursor-pointer transition-all ${
              selectedClass === cls.id ? 'ring-2 ring-indigo-500' : ''
            }`}
            onClick={() => setSelectedClass(cls.id)}
          >
            <h3 className="text-lg font-medium text-gray-900">{cls.name}</h3>
            <p className="mt-1 text-sm text-gray-500">{cls.description}</p>
            
            {/* Registration Link */}
            <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <LinkIcon className="h-4 w-4 text-indigo-500" />
                  <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                    {cls.registration_code}
                  </span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    copyRegistrationLink(cls.registration_code, cls.id);
                  }}
                  className="inline-flex items-center px-2 py-1 text-sm text-indigo-600 hover:text-indigo-700"
                >
                  {copiedInvites[cls.id] ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-500">
                Registration code for this class
              </p>
            </div>

            {/* Attendance Report Link */}
            <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <ExternalLink className="h-4 w-4 text-indigo-500" />
                  <span className="text-sm">Attendance Report</span>
                </div>
                <a
                  href={`${window.location.origin}/student-attendance`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center px-2 py-1 text-sm text-indigo-600 hover:text-indigo-700"
                >
                  View
                </a>
              </div>
              <p className="text-xs text-gray-500">
                Share this link with students to view their attendance
              </p>
            </div>

            {/* Attendance Session */}
            <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-gray-900">Attendance</h4>
                {!activeAttendanceSessions[cls.id] && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      createAttendanceSession(cls.id);
                    }}
                    className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200"
                  >
                    <QrCode className="h-4 w-4 mr-1" />
                    Start Session
                  </button>
                )}
              </div>
              
              {activeAttendanceSessions[cls.id] && (
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="font-mono text-2xl font-bold text-indigo-600">
                      {activeAttendanceSessions[cls.id].code}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <LinkIcon className="h-4 w-4 text-indigo-500" />
                      <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                        {`${window.location.origin}/attendance`}
                      </span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigator.clipboard.writeText(`${window.location.origin}/attendance`);
                        toast.success('Attendance URL copied to clipboard');
                      }}
                      className="inline-flex items-center px-2 py-1 text-sm text-indigo-600 hover:text-indigo-700"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="text-xs text-gray-500">
                    Expires in {Math.max(0, Math.floor((new Date(activeAttendanceSessions[cls.id].expires_at).getTime() - new Date().getTime()) / 60000))} minutes
                  </p>
                </div>
              )}
            </div>

            <div className="mt-4 flex items-center justify-between">
              <span className="text-sm text-gray-500">
                Max Students: {cls.max_students}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedClassForStudent(cls.id);
                  setIsAddStudentModalOpen(true);
                }}
                className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200"
              >
                <UserPlus className="h-4 w-4 mr-1" />
                Add Student
              </button>
            </div>

            {selectedClass === cls.id && (
              <div className="mt-4 space-y-4">
                {/* Week View Timetable */}
                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-4">Weekly Schedule</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead>
                        <tr>
                          <th className="px-2 py-2 bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                            Time
                          </th>
                          {DAYS_OF_WEEK.map(day => (
                            <th key={day} className="px-2 py-2 bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wider">
                              {day.slice(0, 3)}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {TIME_SLOTS.map((time, i) => (
                          <tr key={time} className={i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                            <td className="px-2 py-2 text-xs text-gray-500 whitespace-nowrap">
                              {format(new Date(`2000-01-01T${time}`), 'h:mm a')}
                            </td>
                            {DAYS_OF_WEEK.map((_, dayIndex) => {
                              const slot = getClassForTimeSlot(dayIndex, time);
                              return (
                                <td key={dayIndex} className="px-2 py-2">
                                  {slot && (
                                    <div className="text-xs bg-indigo-100 text-indigo-800 rounded px-2 py-1">
                                      {format(new Date(`2000-01-01T${slot.start_time}`), 'h:mm a')} -{' '}
                                      {format(new Date(`2000-01-01T${slot.end_time}`), 'h:mm a')}
                                      {slot.room_number && <div className="text-xs text-indigo-600">Room {slot.room_number}</div>}
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
                <div className="border-t border-gray-200 pt-6 space-y-5">
                  <h4 className="text-lg font-semibold text-gray-800">Add Time Slot</h4>
                  <div className="space-y-4">
                    <select
                      value={newTimeSlot.day_of_week}
                      onChange={(e) => setNewTimeSlot(prev => ({ ...prev, day_of_week: parseInt(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 ease-in-out"
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
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 ease-in-out"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-sm font-medium text-gray-700">End Time</label>
                        <input
                          type="time"
                          value={newTimeSlot.end_time}
                          onChange={(e) => setNewTimeSlot(prev => ({ ...prev, end_time: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 ease-in-out"
                        />
                      </div>
                    </div>
                    
                    <input
                      type="text"
                      placeholder="Room number (optional)"
                      value={newTimeSlot.room_number}
                      onChange={(e) => setNewTimeSlot(prev => ({ ...prev, room_number: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 ease-in-out"
                    />
                    
                    <div className="space-y-3">
                      <button
                        onClick={addTimeSlot}
                        className="w-full flex justify-center items-center px-4 py-2.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200 ease-in-out"
                      >
                        <Clock className="h-5 w-5 mr-2" />
                        Add Time Slot
                      </button>
                      
                      <button
                        onClick={deleteClass}
                        className="w-full flex justify-center items-center px-4 py-2.5 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-200 ease-in-out"
                      >
                        Delete Class
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add Student Modal */}
      {isAddStudentModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
        <div 
          className="bg-white rounded-xl shadow-2xl max-w-md w-full p-8 space-y-6 
          transform transition-all duration-300 ease-in-out scale-100 hover:shadow-3xl"
        >
          <h3 className="text-2xl font-bold text-gray-900 border-b pb-3 border-gray-200">
            Add Student
          </h3>
          
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
          <h3 className="text-xl font-semibold text-gray-900 text-center">Create New Class</h3>
          <div className="mt-4 space-y-4">
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
  );
}