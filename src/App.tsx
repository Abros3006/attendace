import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import JoinClass from './pages/JoinClass';
import SubmitAttendance from './pages/SubmitAttendance';
import StudentAttendance from './pages/StudentAttendance';
import PrivateRoute from './components/PrivateRoute';
import ClassStudents from './pages/ClassStudentList';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/join/:inviteCode" element={<JoinClass />} />
          <Route path="/classes/:classId" element={<ClassStudents/>} />
          <Route path="/attendance" element={<SubmitAttendance />} />
          <Route path="/student-attendance" element={<StudentAttendance />} />
          <Route path="/dashboard/*" element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          } />
          <Route path="/" element={<Navigate to="/student-attendance" replace />} />
        </Routes>
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 5000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              duration: 3000,
            },
          }}
        />
      </AuthProvider>
    </Router>
  );
}

export default App;