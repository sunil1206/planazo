import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { PlanningEventProvider } from './context/PlanningEventContext'
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
import PlanningOverview     from './pages/planning/PlanningOverview'
import PlanningChecklist    from './pages/planning/PlanningChecklist'
import PlanningBudget       from './pages/planning/PlanningBudget'
import PlanningGuests       from './pages/planning/PlanningGuests'
import PlanningVendors      from './pages/planning/PlanningVendors'
import PlanningFindVendors  from './pages/planning/PlanningFindVendors'

// PlanningEventProvider wraps all /planning/* routes as a sibling layer
// (not per-page like before) so the selected event survives navigating
// between Checklist/Budget/Guests/Vendors instead of resetting on every
// route change — one <Routes> element per module, all sharing one context.
function PlanningRoutes() {
  return (
    <PlanningEventProvider>
      <Routes>
        <Route path="/"             element={<PlanningOverview />} />
        <Route path="/checklist"    element={<PlanningChecklist />} />
        <Route path="/budget"       element={<PlanningBudget />} />
        <Route path="/guests"       element={<PlanningGuests />} />
        <Route path="/vendors"      element={<PlanningVendors />} />
        <Route path="/find-vendors" element={<PlanningFindVendors />} />
      </Routes>
    </PlanningEventProvider>
  )
}

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
          <Route path="/planning/*"           element={<ProtectedRoute><PlanningRoutes /></ProtectedRoute>} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
