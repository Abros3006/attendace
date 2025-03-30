import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface ClassDetails {
  id: string;
  name: string;
  description: string;
  faculty_name: string; // Changed from nested faculty object to match DB response
}

export default function JoinClass() {
  const { inviteCode } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [classDetails, setClassDetails] = useState<ClassDetails | null>(null);
  const [formData, setFormData] = useState({
    fullName: '',
    studentId: '',
    email: '',
    phone: '',
  });

  useEffect(() => {
    fetchClassDetails();
  }, [inviteCode]);

  const fetchClassDetails = async () => {
    if (!inviteCode) {
      toast.error('Invalid registration code');
      navigate('/');
      return;
    }

    try {
      console.log('Fetching class details for invite code:', inviteCode);
      const { data, error } = await supabase
        .rpc('get_class_details_by_code', { invite_code: inviteCode });

      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error('Class not found or registration code is invalid');
      }

      setClassDetails(data[0]);
    } catch (error: any) {
      console.log(error);
      toast.error('Invalid or expired registration code');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!classDetails) return;

    setSubmitting(true);
    try {
      // Validate email format
      if (!formData.email.toLowerCase().endsWith('.edu.in')) {
        throw new Error('Please use your university email address (.edu.in)');
      }

      // First check if student exists
      const { data: existingStudent, error: checkError } = await supabase
        .from('students')
        .select('id')
        .or(`email.eq.${formData.email},student_roll.eq.${formData.studentId}`)
        .maybeSingle();

      if (checkError) throw checkError;

      let studentId;

      if (existingStudent) {
        // Update existing student
        const { error: updateError } = await supabase
          .from('students')
          .update({
            name: formData.fullName,
            phone: formData.phone,
          })
          .eq('id', existingStudent.id);

        if (updateError) throw updateError;
        studentId = existingStudent.id;
      } else {
        // Create new student
        const { data: newStudent, error: createError } = await supabase
          .from('students')
          .insert({
            name: formData.fullName,
            student_roll: formData.studentId,
            email: formData.email,
            phone: formData.phone,
          })
          .select('id')
          .single();

        if (createError) throw createError;
        studentId = newStudent.id;
      }

      // Enroll student in class
      const { error: enrollError } = await supabase
        .from('class_students')
        .insert({
          class_id: classDetails.id,
          student_id: studentId,
        });

      if (enrollError) {
        if (enrollError.code === '23505') { // Unique violation
          throw new Error('You are already enrolled in this class');
        }
        throw enrollError;
      }

      toast.success('Successfully enrolled in class!');
      navigate('/');
    } catch (error: any) {
      toast.error(error.message || 'Failed to join class');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg">
        <div>
          <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-full bg-gradient-to-r from-blue-600 to-indigo-600">
            <GraduationCap className="h-10 w-10 text-white" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Join Class
          </h2>
          {classDetails && (
            <div className="mt-4 text-center">
              <h3 className="text-xl font-semibold text-gray-800">{classDetails.name}</h3>
              <p className="mt-1 text-sm text-gray-600">by {classDetails.faculty_name}</p>
              {classDetails.description && (
                <p className="mt-2 text-sm text-gray-500">{classDetails.description}</p>
              )}
            </div>
          )}
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md space-y-4">
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
                Full Name (as per admission record)
              </label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                value={formData.fullName}
                onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                disabled={submitting}
              />
            </div>

            <div>
              <label htmlFor="studentId" className="block text-sm font-medium text-gray-700">
                Student ID Number
              </label>
              <input
                id="studentId"
                name="studentId"
                type="text"
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                value={formData.studentId}
                onChange={(e) => setFormData(prev => ({ ...prev, studentId: e.target.value }))}
                disabled={submitting}
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                University Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                disabled={submitting}
                placeholder="student@university.edu.in"
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                Phone Number
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                disabled={submitting}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              disabled={submitting}
            >
              {submitting ? 'Joining class...' : 'Join Class'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}