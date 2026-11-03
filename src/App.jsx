import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import About from './components/About'; 
import Services from './components/Services';
import Features from './components/Features';
import Doctors from './components/Doctors';
import Portfolio from './components/Portfolio';
import Stats from './components/Stats';
import WorkProcess from './components/WorkProcess';
import ContactForm from './components/ContactForm';
import BlogSection from './components/BlogSection';
import Footer from './components/Footer';
import HeroTwo from './components/HeroTwo';
import AboutSection from './components/AboutSection';
import ServicesSectionTwo from './components/ServicesSectionTwo';
import StatsSectionTwo from './components/StatsSectionTwo';
import Testimonials from './components/Testimonials';
import CaseStudy from './components/CaseStudy';
import TeamSection from './components/TeamSection';
import OurMethod from './components/OurMethod';
import ArticlesSection from './components/ArticlesSection';
import AboutBanner from './components/AboutBanner';
import AdminDashboard from './components/AdminDashboard'; 
import Login from './components/Login';
import BookAppointment from './components/BookAppointment';
import SpecialistsPage from './pages/SpecialistsPage';
import PatientRecords from './components/PatientRecords';
import TreatmentPlansPage from './components/TreatmentPlansPage';
import ProtectedRoute from './components/ProtectedRoute';
import DentistPortal from './components/DentistPortal';
import PatientHelp from './pages/PatientHelp';
import SmileGalleryPage from './pages/SmileGalleryPage';
import ServicesPage from './pages/ServicesPage';
import BlogPage from './pages/BlogPage';
import BlogDetail from './pages/BlogDetail';
import AudienceBasedPage from './pages/AudienceBasedPage';
import ServiceFocusPage from './pages/ServiceFocusPage';
import MultiLocationPage from './pages/MultiLocationPage';
import UrgencyBasedPage from './pages/UrgencyBasedPage';
import AppointmentsPage from './pages/AppointmentsPage';
import EnquiriesPage from './pages/EnquiriesPage';
import BookingsPaymentsPage from './pages/BookingsPaymentsPage';
import OurClinicPage from './pages/OurClinicPage';

import { useState, useEffect } from 'react';

function MainWebsite() {
  const [currentHome, setCurrentHome] = useState(1);
  const [loadMoreSections, setLoadMoreSections] = useState(false);
  const [showClinicBanner, setShowClinicBanner] = useState(false);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash === '#home-2') {
        setCurrentHome(2);
        setLoadMoreSections(false);
        setShowClinicBanner(false);
      } else if (hash === '#about') {
        setShowClinicBanner(true);
      } else {
        if (hash === '#home-1' || hash === '') {
          setCurrentHome(1);
          setShowClinicBanner(false);
        }
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    if (currentHome !== 2) return;

    const handleScroll = () => {
      if (window.scrollY > 100) {
        setLoadMoreSections(true);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [currentHome]);

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main>
        <div id="home">
          {showClinicBanner ? <AboutBanner /> : currentHome === 1 ? <Hero /> : <HeroTwo />}
        </div>

        {currentHome === 1 ? (
          <>
            <div id="about"><About /></div>
            <div id="services">
              <Services />
              <Features />
            </div>
            <Doctors />
            <div id="portfolio"><Portfolio /></div>
            <div id="stats"><Stats /></div>
            <WorkProcess />
            <div id="appointment"><ContactForm /></div>
            <div id="blog"><BlogSection /></div>
            <div id="contact"><Footer /></div>
          </>
        ) : (
          <>
            <div id="about"><AboutSection /></div>
            {loadMoreSections && (
              <div className="animate-fade-in duration-500">
                <div id="services"><ServicesSectionTwo /></div>
                <div id="stats"><StatsSectionTwo /></div>
                <div id="Testimonails"><Testimonials/></div>
                <div id="CaseStudy"><CaseStudy/></div>
                <div id="TeamSection"><TeamSection/></div>
                <div id="OurMethod"><OurMethod/></div>
                <div id="ArticlesSection"><ArticlesSection/></div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function App() {
  return (
    <Routes>
      {/* Root Route: Working Home Page */}
      <Route path="/" element={<MainWebsite />} />
      <Route path="/home" element={<Navigate to="/" replace />} />
      <Route path="/audience-based" element={<AudienceBasedPage />} />
      <Route path="/service-focus" element={<ServiceFocusPage />} />
      <Route path="/multi-location" element={<MultiLocationPage />} />
      <Route path="/urgency-based" element={<UrgencyBasedPage />} />
      <Route path="/appointments" element={<AppointmentsPage />} />
      <Route path="/enquiries" element={<EnquiriesPage />} />
      <Route path="/bookings" element={<BookingsPaymentsPage />} />
      <Route path="/bookings-payments" element={<Navigate to="/bookings" replace />} />
      <Route path="/overview/bookings" element={<Navigate to="/bookings" replace />} />
      <Route path="/overview/bookings-payments" element={<Navigate to="/bookings" replace />} />
      <Route path="/overview/enquiries" element={<Navigate to="/enquiries" replace />} />

      {/* Our Clinic / About Routes */}
      <Route path="/about" element={<OurClinicPage />} />
      <Route path="/our-clinic" element={<Navigate to="/about" replace />} />

      {/* Protected Admin and Dashboard Routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/patients"
        element={<PatientRecords />}
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      {/* Auth / Login Route */}
      <Route path="/login" element={<Login />} />

      {/* Standalone Book Appointment Route */}
      <Route
        path="/book"
        element={
          <div className="min-h-screen bg-[#0c1c2b]">
            <Navbar />
            <div className="py-12 px-4 flex items-center justify-center">
              <BookAppointment />
            </div>
          </div>
        }
      />
      <Route path="/appointment" element={<Navigate to="/book" replace />} />

      {/* Patient Records (EMR/EHR) */}
      <Route path="/patient-records" element={<PatientRecords />} />
      <Route path="/treatment-plans" element={<TreatmentPlansPage />} />
      <Route path="/specialists" element={<SpecialistsPage />} />
      <Route path="/doctor-portal/:id" element={<DentistPortal />} />
      <Route path="/doctor-portal" element={<DentistPortal />} />

      {/* Patient Help & Support Center */}
      <Route path="/patient-help" element={<PatientHelp />} />

      {/* Smile Gallery & Case Management */}
      <Route path="/smile-gallery" element={<SmileGalleryPage />} />
      <Route path="/gallery" element={<Navigate to="/smile-gallery" replace />} />

      {/* Services & Treatment Options Flow */}
      <Route path="/services" element={<ServicesPage />} />

      {/* Blog Routes */}
      <Route path="/blog" element={<BlogPage />} />
      <Route path="/blog/:slug" element={<BlogDetail />} />

      {/* Wildcard Fallback: Redirect all unmatched routes back to Home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;