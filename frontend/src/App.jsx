import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute   from './components/ProtectedRoute'
import Landing          from './pages/Landing'
import RoleSelect       from './pages/RoleSelect'
import Login            from './pages/Login'
import Home             from './pages/Home'
import CreateEvent      from './pages/CreateEvent'
import Weddings         from './pages/Weddings'
import Birthdays        from './pages/Birthdays'
import Gallery          from './pages/Gallery'
import InvitationEditor from './pages/InvitationEditor'
import InvitationSite   from './pages/InvitationSite'
import BirthdayEditor   from './pages/BirthdayEditor'
import BirthdaySite     from './pages/BirthdaySite'
import CustomEvents         from './pages/CustomEvents'
import CustomEventDashboard from './pages/CustomEventDashboard'
import PlanningSuite        from './pages/PlanningSuite'

function App() {
  return (
    <BrowserRouter useTransitions={false}>
      <AuthProvider>
        <Routes>
          {/* Public */}
          <Route path="/"             element={<Landing />} />
          <Route path="/select-role"  element={<RoleSelect />} />
          <Route path="/login"        element={<Login />} />
          <Route path="/invite/:id"   element={<InvitationSite />} />
          <Route path="/birthday/:id" element={<BirthdaySite />} />

          {/* Protected — dashboard/editor pages require a signed-in user */}
          <Route path="/home"                 element={<ProtectedRoute><Home /></ProtectedRoute>} />
          <Route path="/create-event"         element={<ProtectedRoute><CreateEvent /></ProtectedRoute>} />
          <Route path="/weddings"             element={<ProtectedRoute><Weddings /></ProtectedRoute>} />
          <Route path="/birthdays"            element={<ProtectedRoute><Birthdays /></ProtectedRoute>} />
          <Route path="/gallery"              element={<ProtectedRoute><Gallery /></ProtectedRoute>} />
          <Route path="/weddings/editor/:id"  element={<ProtectedRoute><InvitationEditor /></ProtectedRoute>} />
          <Route path="/birthdays/editor/:id" element={<ProtectedRoute><BirthdayEditor /></ProtectedRoute>} />
          <Route path="/custom-events"        element={<ProtectedRoute><CustomEvents /></ProtectedRoute>} />
          <Route path="/custom-events/:id"    element={<ProtectedRoute><CustomEventDashboard /></ProtectedRoute>} />
          <Route path="/planning"             element={<ProtectedRoute><PlanningSuite /></ProtectedRoute>} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
