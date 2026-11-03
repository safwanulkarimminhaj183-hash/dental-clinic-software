import React, { useState, useEffect, useRef } from 'react';
import { 
  Phone, 
  ChevronDown, 
  Shield, 
  LogIn, 
  CalendarCheck, 
  LayoutDashboard,
  Users,
  BarChart3,
  MessageSquare,
  CreditCard
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState('home');

  // Desktop dropdown states
  const [homeDropdown, setHomeDropdown] = useState(false);
  const [adminDropdown, setAdminDropdown] = useState(false);
  const [aboutDropdown, setAboutDropdown] = useState(false);

  // Mobile / Tablet dropdown states
  const [mobileHomeDropdown, setMobileHomeDropdown] = useState(false);
  const [mobileAdminDropdown, setMobileAdminDropdown] = useState(false);
  const [mobileAboutDropdown, setMobileAboutDropdown] = useState(false);

  const navRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Close dropdowns on route change
  useEffect(() => {
    setIsOpen(false);
    setHomeDropdown(false);
    setAdminDropdown(false);
    setAboutDropdown(false);
    setMobileHomeDropdown(false);
    setMobileAdminDropdown(false);
    setMobileAboutDropdown(false);
  }, [location.pathname]);

  // Close desktop dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (navRef.current && !navRef.current.contains(event.target)) {
        setHomeDropdown(false);
        setAdminDropdown(false);
        setAboutDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Helper function to handle hash/section navigation smoothly across pages
  const handleSectionClick = (e, href) => {
    if (href.startsWith('/#')) {
      e.preventDefault();
      const targetId = href.substring(2);

      const scrollToTarget = () => {
        const element = document.getElementById(targetId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          return true;
        }
        return false;
      };
      
      if (location.pathname !== '/') {
        navigate('/');
        // Poll briefly until the target section mounts on the homepage
        let attempts = 0;
        const interval = setInterval(() => {
          attempts++;
          if (scrollToTarget() || attempts >= 20) {
            clearInterval(interval);
          }
        }, 50);
      } else {
        scrollToTarget();
      }
    }
    setAboutDropdown(false);
    setIsOpen(false);
  };

  const aboutLinks = [
    { name: "Our Clinic", path: "/about" },
    { name: "Dental Specialists", path: "/specialists" },
    { name: "Patient Records (EMR/EHR)", path: "/patient-records" },
    { name: "Treatment Plans", path: "/treatment-plans" },
    { name: "Smile Gallery", path: "/smile-gallery" },
    { name: "Patient Help", path: "/patient-help" }
  ];

  const adminLinks = [
    { name: "Booking and Payments", path: "/bookings", icon: CreditCard, description: "Treatment bookings & payments" },
    { name: "Enquiries", path: "/enquiries", icon: MessageSquare, description: "Treatment plan inquiries" },
    { name: "Appointments", path: "/appointments", icon: CalendarCheck, description: "Urgent & booking requests" },
    { name: "Patients", path: "/patients", icon: Users, description: "Patient records, EMR & charts" },
    { name: "Reports", path: "/dashboard?tab=reports", icon: BarChart3, description: "Analytics & export reports" },
    { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard, description: "Full schedule overview" },
    { name: "Admin", path: "/admin", icon: Shield, description: "Admin appointment hub" },
    { name: "Book", path: "/book", icon: CalendarCheck, description: "Patient reservation form" },
    { name: "Login", path: "/login", icon: LogIn, description: "Staff & admin sign in" },
  ];

  return (
    <nav ref={navRef} className="bg-white h-[80px] md:h-[90px] w-full flex items-center justify-between px-6 md:px-12 lg:px-16 shadow-sm sticky top-0 z-[999]">
      
      {/* Logo Section */}
      <Link to="/" className="flex items-center gap-2 cursor-pointer shrink-0">
        <div className="w-10 h-10 bg-[#3ec1d3] rounded-tl-xl rounded-br-xl flex items-center justify-center shadow-md">
          <span className="text-white text-2xl font-bold">D</span>
        </div>
        <span className="text-2xl md:text-3xl font-extrabold text-[#0e2a47]">DentoCare</span>
      </Link>

      {/* Desktop Navigation Links */}
      <ul className="hidden lg:flex items-center gap-6 xl:gap-8 text-[#0e2a47] font-bold text-[15px]">
        {/* Home Dropdown */}
        <li 
          className="relative cursor-pointer transition-colors"
          onClick={() => {
            setActiveMenu('home');
            setHomeDropdown(!homeDropdown);
            setAdminDropdown(false);
            setAboutDropdown(false);
          }}
        >
          <button className={`flex items-center gap-1 font-bold text-[15px] outline-none transition-colors cursor-pointer ${activeMenu === 'home' ? 'text-[#3ec1d3]' : 'text-[#0e2a47] hover:text-[#3ec1d3]'}`}>
            Home <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${homeDropdown ? "rotate-180" : ""}`} />
          </button>

          {homeDropdown && (
            <ul className="absolute top-full left-0 mt-2 w-44 bg-white border border-gray-100 shadow-xl rounded-lg overflow-hidden z-[1000] py-1">
              <li>
                <Link 
                  to="/audience-based" 
                  className="block px-4 py-2.5 text-sm text-[#0e2a47] hover:bg-[#f0f9fa] hover:text-[#3ec1d3] font-semibold transition-colors"
                >
                  Audience-Based
                </Link>
              </li>
              <li>
                <Link 
                  to="/service-focus" 
                  className="block px-4 py-2.5 text-sm text-[#0e2a47] hover:bg-[#f0f9fa] hover:text-[#3ec1d3] font-semibold transition-colors"
                >
                  Service Focus
                </Link>
              </li>
              <li>
                <Link 
                  to="/multi-location" 
                  className="block px-4 py-2.5 text-sm text-[#0e2a47] hover:bg-[#f0f9fa] hover:text-[#3ec1d3] font-semibold transition-colors"
                >
                  Multi-Location
                </Link>
              </li>
              <li>
                <Link 
                  to="/urgency-based" 
                  className="block px-4 py-2.5 text-sm text-[#0e2a47] hover:bg-[#f0f9fa] hover:text-[#3ec1d3] font-semibold transition-colors"
                >
                  Urgency-Based
                </Link>
              </li>
            </ul>
          )}
        </li>

        {/* Dashboard Dropdown */}
        <li 
          className="relative cursor-pointer transition-colors"
          onClick={() => {
            setActiveMenu('admin');
            setAdminDropdown(!adminDropdown);
            setHomeDropdown(false);
            setAboutDropdown(false);
          }}
        >
          <button className={`flex items-center gap-1 font-bold text-[15px] outline-none transition-colors cursor-pointer ${activeMenu === 'admin' ? 'text-[#3ec1d3]' : 'text-[#0e2a47] hover:text-[#3ec1d3]'}`}>
            <span>Overview</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${adminDropdown ? "rotate-180" : ""}`} />
          </button>

          {adminDropdown && (
            <ul className="absolute top-full left-0 mt-2 w-52 bg-white border border-gray-100 shadow-2xl rounded-xl overflow-hidden z-[1000] py-1.5">
              {adminLinks.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <li key={idx}>
                    <Link 
                      to={item.path}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#0e2a47] hover:bg-[#f0f9fa] hover:text-[#3ec1d3] font-semibold transition-colors group"
                      onClick={(e) => {
                        e.stopPropagation();
                        setAdminDropdown(false);
                      }}
                    >
                      <div className="w-7 h-7 rounded-md bg-[#3ec1d3]/10 text-[#3ec1d3] flex items-center justify-center group-hover:bg-[#3ec1d3] group-hover:text-white transition-colors">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col text-left">
                        <span className="leading-tight">{item.name}</span>
                        <span className="text-[11px] text-gray-400 font-normal">{item.description}</span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </li>

        {/* About Us Dropdown */}
        <li 
          className="relative cursor-pointer transition-colors"
          onClick={() => {
            setActiveMenu('about');
            setAboutDropdown(!aboutDropdown);
            setHomeDropdown(false); 
            setAdminDropdown(false);
          }}
        >
          <button className={`flex items-center gap-1 font-bold text-[15px] outline-none transition-colors cursor-pointer ${activeMenu === 'about' ? 'text-[#3ec1d3]' : 'text-[#0e2a47] hover:text-[#3ec1d3]'}`}>
            About Us <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${aboutDropdown ? "rotate-180" : ""}`} />
          </button>

          {aboutDropdown && (
            <ul className="absolute top-full left-0 mt-2 w-56 bg-white border border-gray-100 shadow-xl rounded-lg overflow-hidden z-[1000] py-1 text-left">
              {aboutLinks.map((item, idx) => (
                <li key={idx} className="border-b border-gray-50 last:border-0">
                  {item.path ? (
                    <Link
                      to={item.path}
                      className="block px-4 py-2 text-sm text-[#0e2a47] hover:bg-[#f0f9fa] hover:text-[#3ec1d3] font-semibold transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        setAboutDropdown(false);
                      }}
                    >
                      {item.name}
                    </Link>
                  ) : (
                    <a 
                      href={item.href} 
                      onClick={(e) => handleSectionClick(e, item.href)}
                      className="block px-4 py-2 text-sm text-[#0e2a47] hover:bg-[#f0f9fa] hover:text-[#3ec1d3] font-semibold transition-colors"
                    >
                      {item.name}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}
        </li>

        <li className={`cursor-pointer transition-colors ${activeMenu === 'services' ? 'text-[#3ec1d3]' : 'hover:text-[#3ec1d3]'}`} onClick={() => setActiveMenu('services')}>
          <a href="/#services" onClick={(e) => handleSectionClick(e, '/#services')} className="flex items-center gap-0.5">Services</a>
        </li>

        <li className={`cursor-pointer transition-colors ${activeMenu === 'blog' ? 'text-[#3ec1d3]' : 'hover:text-[#3ec1d3]'}`} onClick={() => setActiveMenu('blog')}>
          <Link to="/blog" className="flex items-center gap-0.5">Blog</Link>
        </li>

        <li className={`cursor-pointer transition-colors ${activeMenu === 'contact' ? 'text-[#3ec1d3]' : 'hover:text-[#3ec1d3]'}`} onClick={() => setActiveMenu('contact')}>
          <a href="/#contact" onClick={(e) => handleSectionClick(e, '/#contact')}>Contact</a>
        </li>
      </ul>

      {/* Right Side Section */}
      <div className="flex items-center gap-4 md:gap-6 ml-auto lg:ml-0">
        <div className="hidden xl:flex items-center gap-3 border-r pr-6 border-gray-200">
          <div className="w-11 h-11 border border-gray-100 rounded-full flex items-center justify-center shadow-sm">
            <Phone className="text-[#3ec1d3] w-5 h-5" />
          </div>
          <div className="whitespace-nowrap">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Call Us</p>
            <p className="text-[15px] font-bold text-[#0e2a47]">512-205-1826</p>
          </div>
        </div>

        <div className="hidden sm:block">
          <Link to="/book">
            <button className="bg-[#3ec1d3] hover:bg-[#34adb9] text-white px-6 md:px-8 py-3 rounded-md font-bold text-sm transition-all shadow-md hover:shadow-lg whitespace-nowrap cursor-pointer">
              Get Appointment
            </button>
          </Link>
        </div>

        <div className="flex lg:hidden items-center">
          <button 
            onClick={() => setIsOpen(!isOpen)} 
            aria-label="Toggle navigation menu"
            className="flex flex-col gap-1.5 justify-center items-center p-2 w-10 h-10 border border-[#3ec1d3]/30 rounded-lg hover:bg-gray-50 focus:outline-none cursor-pointer"
          >
            {isOpen ? (
              <span className="text-2xl text-[#3ec1d3] font-bold leading-none">✕</span>
            ) : (
              <>
                <span className="block w-6 h-[2.5px] bg-[#0e2a47] rounded-full"></span>
                <span className="block w-6 h-[2.5px] bg-[#3ec1d3] rounded-full"></span>
                <span className="block w-6 h-[2.5px] bg-[#0e2a47] rounded-full"></span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Responsive Mobile and Tablet Dropdown Drawer */}
      <div className={`${isOpen ? "max-h-[85vh] opacity-100 shadow-2xl border-t border-gray-700/40" : "max-h-0 opacity-0 pointer-events-none"} lg:hidden absolute top-full left-0 w-full bg-[#0e2a47] overflow-y-auto transition-all duration-300 ease-in-out z-50`}>
        <ul className="flex flex-col text-white font-bold text-[15px] divide-y divide-gray-700/50">
          
          {/* Mobile Home Dropdown */}
          <li>
            <div 
              className="flex items-center justify-between py-3.5 px-6 cursor-pointer text-gray-200 hover:text-[#3ec1d3]"
              onClick={() => {
                setMobileHomeDropdown(!mobileHomeDropdown);
                setMobileAdminDropdown(false);
                setMobileAboutDropdown(false);
              }}
            >
              <span>Home</span>
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${mobileHomeDropdown ? "rotate-180 text-[#3ec1d3]" : ""}`} />
            </div>
            
            <div className={`${mobileHomeDropdown ? "max-h-96 opacity-100" : "max-h-0 opacity-0"} overflow-hidden bg-[#123559] transition-all duration-300 ease-in-out`}>
              <ul className="text-sm pl-4">
                <li className="border-b border-gray-700/30">
                  <Link to="/audience-based" onClick={() => setIsOpen(false)} className="block py-2.5 px-6 text-gray-300 hover:text-white">
                    Audience-Based
                  </Link>
                </li>
                <li className="border-b border-gray-700/30">
                  <Link to="/service-focus" onClick={() => setIsOpen(false)} className="block py-2.5 px-6 text-gray-300 hover:text-white">
                    Service Focus
                  </Link>
                </li>
                <li className="border-b border-gray-700/30">
                  <Link to="/multi-location" onClick={() => setIsOpen(false)} className="block py-2.5 px-6 text-gray-300 hover:text-white">
                    Multi-Location
                  </Link>
                </li>
                <li>
                  <Link to="/urgency-based" onClick={() => setIsOpen(false)} className="block py-2.5 px-6 text-gray-300 hover:text-white">
                    Urgency-Based
                  </Link>
                </li>
              </ul>
            </div>
          </li>

          {/* Mobile Dashboard Dropdown */}
          <li className="bg-[#102e4d]">
            <div 
              className="flex items-center justify-between py-3.5 px-6 cursor-pointer text-[#3ec1d3] font-bold"
              onClick={() => {
                setMobileAdminDropdown(!mobileAdminDropdown);
                setMobileHomeDropdown(false);
                setMobileAboutDropdown(false);
              }}
            >
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#3ec1d3]" />
                <span>Overview</span>
              </div>
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${mobileAdminDropdown ? "rotate-180" : ""}`} />
            </div>
            
            <div className={`${mobileAdminDropdown ? "max-h-[40rem] opacity-100" : "max-h-0 opacity-0"} overflow-hidden bg-[#123559] transition-all duration-300 ease-in-out`}>
              <ul className="text-sm divide-y divide-gray-700/30">
                {adminLinks.map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <li key={idx}>
                      <Link
                        to={item.path}
                        className="flex items-center justify-between py-3 px-8 text-gray-300 hover:text-white hover:bg-[#1a446e] transition-colors"
                        onClick={() => { 
                          setIsOpen(false); 
                          setMobileAdminDropdown(false); 
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="w-4 h-4 text-[#3ec1d3]" />
                          <span>{item.name}</span>
                        </div>
                        <span className="text-[11px] text-gray-400 font-normal">{item.description}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          </li>

          {/* Mobile About Us Dropdown */}
          <li>
            <div 
              className="flex items-center justify-between py-3.5 px-6 cursor-pointer text-gray-200 hover:text-[#3ec1d3]"
              onClick={() => {
                setMobileAboutDropdown(!mobileAboutDropdown);
                setMobileHomeDropdown(false);
                setMobileAdminDropdown(false);
              }}
            >
              <span>About Us</span>
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${mobileAboutDropdown ? "rotate-180 text-[#3ec1d3]" : ""}`} />
            </div>
            
            <div className={`${mobileAboutDropdown ? "max-h-[32rem] opacity-100" : "max-h-0 opacity-0"} overflow-hidden bg-[#123559] transition-all duration-300 ease-in-out`}>
              <ul className="text-sm pl-4 divide-y divide-gray-700/30 text-left">
                {aboutLinks.map((item, idx) => (
                  <li key={idx}>
                    {item.path ? (
                      <Link
                        to={item.path}
                        className="block py-2.5 px-6 text-[#3ec1d3] hover:text-white font-medium transition-colors"
                        onClick={() => setIsOpen(false)}
                      >
                        {item.name}
                      </Link>
                    ) : (
                      <a 
                        href={item.href} 
                        onClick={(e) => handleSectionClick(e, item.href)}
                        className="block py-2.5 px-6 text-gray-300 hover:text-white transition-colors"
                      >
                        {item.name}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </li>

          <li>
            <a href="/#services" onClick={(e) => handleSectionClick(e, '/#services')} className="block py-3.5 px-6 text-gray-200 hover:text-white">
              Services
            </a>
          </li>
          <li>
            <Link to="/blog" onClick={() => setIsOpen(false)} className="block py-3.5 px-6 text-gray-200 hover:text-white">
              Blog
            </Link>
          </li>
          <li>
            <a href="/#contact" onClick={(e) => handleSectionClick(e, '/#contact')} className="block py-3.5 px-6 text-gray-200 hover:text-white">
              Contact
            </a>
          </li>
          
          <li className="p-6">
            <Link to="/book" onClick={() => setIsOpen(false)}>
              <button className="w-full bg-[#3ec1d3] hover:bg-[#34adb9] text-[#0c1c2b] py-3.5 rounded-lg font-bold text-sm shadow-xl transition-all cursor-pointer">
                Get Appointment
              </button>
            </Link>
          </li>
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;