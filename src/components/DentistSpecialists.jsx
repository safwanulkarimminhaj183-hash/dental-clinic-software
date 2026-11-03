import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, Phone, Mail, Star, Users, Clock, Video,
  BookOpen, ChevronRight, Search, Loader2, AlertCircle,
  Award, Stethoscope, CalendarDays, Globe, Heart, RefreshCw,
} from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────

const API_BASE = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api`;

// Inline mock data — served when the backend is unreachable
const MOCK_SPECIALISTS = [
  {
    _id: 'mock-1',
    name: 'Dr. Adrian Thorne',
    specialization: 'Senior Orthodontist',
    degrees: [
      { degree: 'BDS', institution: 'Harvard School of Dental Medicine', passingYear: 2005 },
      { degree: 'MDS – Orthodontics', institution: 'Johns Hopkins University', passingYear: 2008 },
    ],
    experienceYears: 18,
    bio: 'Board-certified orthodontist with 18+ years specialising in clear aligner therapy, lingual braces, and complex malocclusion corrections.',
    languages: ['English', 'French'],
    rating: 4.9,
    totalPatients: 3200,
    consultationFee: 150,
    telemedicineAvailable: true,
    expertise: ['Clear Aligners (Invisalign)', 'Ceramic Braces', 'Lingual Braces', 'Jaw Correction'],
    availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    chambers: [{ name: 'DentoCare Main Clinic', city: 'Austin, TX', schedule: 'Mon–Thu: 9 AM – 5 PM' }],
    profileImage: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?q=80&w=400&auto=format&fit=crop',
    social: { facebook: '#', twitter: '#', linkedin: '#', instagram: '#' },
    isFeatured: true,
  },
  {
    _id: 'mock-2',
    name: 'Dr. Eliana Vance',
    specialization: 'Pediatric Dentist',
    degrees: [
      { degree: 'DDS', institution: 'University of Michigan', passingYear: 2010 },
      { degree: 'MS – Pediatric Dentistry', institution: 'Boston University', passingYear: 2013 },
    ],
    experienceYears: 13,
    bio: 'Passionate about creating positive dental experiences for children from infancy through adolescence using behaviour-management techniques.',
    languages: ['English', 'Spanish'],
    rating: 4.8,
    totalPatients: 2800,
    consultationFee: 120,
    telemedicineAvailable: true,
    expertise: ['Infant Oral Health', 'Space Maintainers', 'Sealants', 'Fluoride Treatments'],
    availableDays: ['Monday', 'Wednesday', 'Friday', 'Saturday'],
    chambers: [{ name: 'DentoCare Kids Wing', city: 'Austin, TX', schedule: 'Mon, Wed, Fri: 9 AM – 4 PM' }],
    profileImage: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?q=80&w=400&auto=format&fit=crop',
    social: { facebook: '#', instagram: '#', linkedin: '#' },
    isFeatured: true,
  },
  {
    _id: 'mock-3',
    name: 'Dr. Marcus Sterling',
    specialization: 'Maxillofacial Surgeon',
    degrees: [
      { degree: 'BDS', institution: 'UCLA School of Dentistry', passingYear: 2003 },
      { degree: 'MD – Oral & Maxillofacial Surgery', institution: 'Stanford', passingYear: 2008 },
    ],
    experienceYears: 21,
    bio: 'Dual-qualified surgeon with 20+ years in corrective jaw surgery, full-arch implant rehabilitation, and facial trauma reconstruction.',
    languages: ['English'],
    rating: 4.9,
    totalPatients: 1900,
    consultationFee: 200,
    telemedicineAvailable: false,
    expertise: ['Dental Implants (All-on-4)', 'Corrective Jaw Surgery', 'Bone Grafting', 'TMJ Disorders'],
    availableDays: ['Tuesday', 'Wednesday', 'Thursday'],
    chambers: [{ name: 'DentoCare Surgical Suite', city: 'Austin, TX', schedule: 'Tue, Thu: 8 AM – 3 PM' }],
    profileImage: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?q=80&w=400&auto=format&fit=crop',
    social: { facebook: '#', linkedin: '#' },
    isFeatured: true,
  },
  {
    _id: 'mock-4',
    name: 'Dr. Sophia Reyes',
    specialization: 'Cosmetic & Restorative Dentist',
    degrees: [
      { degree: 'DMD', institution: 'Tufts University School of Dental Medicine', passingYear: 2011 },
      { degree: 'AACD Accreditation', institution: 'American Academy of Cosmetic Dentistry', passingYear: 2015 },
    ],
    experienceYears: 15,
    bio: 'AACD-accredited cosmetic dentist combining artistry with precision for smile makeovers, veneers, and full-mouth rehabilitations.',
    languages: ['English', 'Spanish', 'Portuguese'],
    rating: 4.8,
    totalPatients: 2500,
    consultationFee: 130,
    telemedicineAvailable: true,
    expertise: ['Porcelain Veneers', 'Teeth Whitening', 'Composite Bonding', 'Smile Makeovers'],
    availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    chambers: [{ name: 'DentoCare Cosmetic Studio', city: 'Austin, TX', schedule: 'Mon–Fri: 10 AM – 6 PM' }],
    profileImage: 'https://images.unsplash.com/photo-1594824476967-48c8b964273f?q=80&w=400&auto=format&fit=crop',
    social: { instagram: '#', linkedin: '#' },
    isFeatured: false,
  },
  {
    _id: 'mock-5',
    name: 'Dr. Nathan Cross',
    specialization: 'Endodontist (Root Canal Specialist)',
    degrees: [
      { degree: 'BDS', institution: 'NYU College of Dentistry', passingYear: 2007 },
      { degree: 'MS – Endodontics', institution: 'University of Pennsylvania', passingYear: 2010 },
    ],
    experienceYears: 17,
    bio: 'Expert in microscope-assisted root canal therapy and retreatments — known for painless procedures and a near-zero reinfection rate.',
    languages: ['English', 'German'],
    rating: 4.7,
    totalPatients: 4100,
    consultationFee: 140,
    telemedicineAvailable: true,
    expertise: ['Root Canal Therapy', 'Microscopic Retreatment', 'Apicoectomy', 'Cracked Tooth Diagnosis'],
    availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    chambers: [{ name: 'DentoCare Endodontic Suite', city: 'Austin, TX', schedule: 'Mon–Fri: 9 AM – 4 PM' }],
    profileImage: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?q=80&w=400&auto=format&fit=crop',
    social: { linkedin: '#', twitter: '#' },
    isFeatured: false,
  },
  {
    _id: 'mock-6',
    name: 'Dr. Priya Sharma',
    specialization: 'Periodontist & Implantologist',
    degrees: [
      { degree: 'BDS', institution: 'UT Health Science Center', passingYear: 2009 },
      { degree: 'MS – Periodontics', institution: 'Case Western Reserve University', passingYear: 2013 },
    ],
    experienceYears: 15,
    bio: 'Holistic periodontist connecting systemic health with oral health through laser gum therapy and evidence-based implant placement.',
    languages: ['English', 'Hindi', 'Punjabi'],
    rating: 4.8,
    totalPatients: 2100,
    consultationFee: 160,
    telemedicineAvailable: true,
    expertise: ['Laser Gum Treatment', 'Scaling & Root Planing', 'Gum Grafting', 'Dental Implant Placement'],
    availableDays: ['Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    chambers: [{ name: 'DentoCare Periodontic Centre', city: 'Austin, TX', schedule: 'Tue–Sat: 9 AM – 5 PM' }],
    profileImage: 'https://images.unsplash.com/photo-1651008376811-b90baee60c1f?q=80&w=400&auto=format&fit=crop',
    social: { facebook: '#', instagram: '#', linkedin: '#' },
    isFeatured: false,
  },
];

const MOCK_BLOGS = [
  {
    _id: 'blog-1',
    title: 'Why Early Orthodontic Treatment Matters for Children',
    excerpt: "Starting orthodontic evaluation at age 7 can catch problems before they become expensive, complex corrections. Here's what every parent needs to know.",
    authorName: 'Dr. Adrian Thorne',
    authorRole: 'Senior Orthodontist',
    coverImage: 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?q=80&w=600&auto=format&fit=crop',
    category: 'Orthodontics',
    readTimeMinutes: 4,
    publishedAt: '2026-05-10',
    views: 342,
    likes: 28,
    slug: 'early-orthodontic-treatment-children',
  },
  {
    _id: 'blog-2',
    title: 'The Complete Guide to Dental Implants in 2026',
    excerpt: 'Dental implants have become the gold standard for tooth replacement. We break down everything — from candidacy to recovery — in plain language.',
    authorName: 'Dr. Marcus Sterling',
    authorRole: 'Maxillofacial Surgeon',
    coverImage: 'https://images.unsplash.com/photo-1606811841689-23dfddce3e95?q=80&w=600&auto=format&fit=crop',
    category: 'Implants',
    readTimeMinutes: 6,
    publishedAt: '2026-06-22',
    views: 891,
    likes: 67,
    slug: 'complete-guide-dental-implants-2026',
  },
  {
    _id: 'blog-3',
    title: 'Root Canal Therapy: Myths vs. Reality',
    excerpt: 'Root canals have an undeserved reputation for being painful. Dr. Cross sets the record straight with modern facts about this tooth-saving treatment.',
    authorName: 'Dr. Nathan Cross',
    authorRole: 'Endodontist',
    coverImage: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?q=80&w=600&auto=format&fit=crop',
    category: 'Root Canal',
    readTimeMinutes: 5,
    publishedAt: '2026-07-15',
    views: 712,
    likes: 55,
    slug: 'root-canal-myths-vs-reality',
  },
];

const TREATMENT_FEES = [
  { procedure: 'Root Canal Treatment', minFee: 6000, maxFee: 12000, icon: '🦷' },
  { procedure: 'Teeth Scaling & Cleaning', minFee: 1000, maxFee: 2500, icon: '✨' },
  { procedure: 'Dental Implant', minFee: 20000, maxFee: 35000, icon: '⚙️' },
  { procedure: 'Tooth Extraction', minFee: 1500, maxFee: 3500, icon: '🔧' },
  { procedure: 'Teeth Whitening', minFee: 3000, maxFee: 8000, icon: '💎' },
  { procedure: 'Dental Crown', minFee: 7000, maxFee: 15000, icon: '👑' },
  { procedure: 'Orthodontic Braces', minFee: 30000, maxFee: 60000, icon: '😁' },
  { procedure: 'Laser Gum Treatment', minFee: 8000, maxFee: 18000, icon: '⚡' },
  { procedure: 'Composite Filling', minFee: 1500, maxFee: 4000, icon: '🩹' },
  { procedure: 'Pediatric Checkup', minFee: 500, maxFee: 1200, icon: '👶' },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

const StarRating = ({ rating }) => {
  const full = Math.floor(rating);
  const hasHalf = rating % 1 >= 0.5;
  return (
    <span className="flex items-center gap-0.5">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          className={`w-3.5 h-3.5 ${
            i < full
              ? 'fill-amber-400 text-amber-400'
              : hasHalf && i === full
              ? 'fill-amber-200 text-amber-400'
              : 'fill-gray-200 text-gray-300'
          }`}
        />
      ))}
      <span className="ml-1 text-xs font-semibold text-gray-600">{rating.toFixed(1)}</span>
    </span>
  );
};

const SocialIcon = ({ href, type }) => {
  if (!href || href === '#' || !href.trim()) return null;
  const icons = {
    facebook: (
      <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
        <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c4.56-.93 8-4.96 8-9.8z" />
      </svg>
    ),
    twitter: (
      <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
    linkedin: (
      <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
        <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
      </svg>
    ),
    instagram: (
      <svg className="w-3.5 h-3.5 stroke-current fill-none stroke-[2]" viewBox="0 0 24 24">
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
      </svg>
    ),
  };
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={type}
      className="w-8 h-8 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-[#3ec1d3] hover:text-white hover:border-[#3ec1d3] transition-all duration-200"
    >
      {icons[type]}
    </a>
  );
};

// ─── Specialist Card ──────────────────────────────────────────────────────────
const SpecialistCard = ({ specialist, index }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.article
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ duration: 0.5, delay: index * 0.07 }}
      className="bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.06)] border border-slate-100 overflow-hidden flex flex-col group hover:shadow-[0_8px_32px_rgba(62,193,211,0.15)] hover:border-[#3ec1d3]/30 transition-all duration-300"
    >
      {/* Image + Featured Badge */}
      <div className="relative h-56 overflow-hidden bg-[#f0f4f8]">
        <img
          src={specialist.profileImage}
          alt={specialist.name}
          className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-105"
          onError={(e) => {
            e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(specialist.name)}&background=3ec1d3&color=fff&size=400`;
          }}
        />
        {specialist.isFeatured && (
          <span className="absolute top-3 left-3 bg-[#3ec1d3] text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-md">
            Featured
          </span>
        )}
        {specialist.telemedicineAvailable && (
          <span className="absolute top-3 right-3 bg-emerald-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-md">
            <Video className="w-3 h-3" /> Online
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-5 flex flex-col flex-1">
        {/* Name + Role */}
        <div className="mb-3">
          <h3 className="text-[17px] font-bold text-[#0e2a47] leading-tight mb-0.5">
            {specialist.name}
          </h3>
          <p className="text-[13px] text-[#3ec1d3] font-semibold uppercase tracking-wide">
            {specialist.specialization}
          </p>
        </div>

        {/* Rating + Stats */}
        <div className="flex items-center gap-4 mb-3">
          <StarRating rating={specialist.rating} />
          <span className="text-xs text-gray-400 flex items-center gap-1">
            <Users className="w-3.5 h-3.5" />
            {specialist.totalPatients?.toLocaleString()}+ patients
          </span>
        </div>

        {/* Degrees */}
        {specialist.degrees?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {specialist.degrees.map((d, i) => (
              <span key={i} className="bg-[#f0f9fa] text-[#0e2a47] text-[11px] font-semibold px-2.5 py-0.5 rounded-full border border-[#3ec1d3]/20">
                {d.degree}
              </span>
            ))}
          </div>
        )}

        {/* Bio */}
        <p className="text-[13px] text-slate-500 leading-relaxed mb-3 line-clamp-2">
          {specialist.bio}
        </p>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2 bg-[#f8fafc] rounded-xl p-3 mb-3 text-center">
          <div>
            <p className="text-[15px] font-bold text-[#0e2a47]">{specialist.experienceYears}+</p>
            <p className="text-[10px] text-slate-400 uppercase tracking-wide">Yrs Exp.</p>
          </div>
          <div className="border-x border-slate-200">
            <p className="text-[15px] font-bold text-[#0e2a47]">{specialist.availableDays?.length || 0}</p>
            <p className="text-[10px] text-slate-400 uppercase tracking-wide">Days/Wk</p>
          </div>
          <div>
            <p className="text-[15px] font-bold text-[#3ec1d3]">${specialist.consultationFee}</p>
            <p className="text-[10px] text-slate-400 uppercase tracking-wide">Fee</p>
          </div>
        </div>

        {/* Expandable Details */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              {/* Expertise */}
              {specialist.expertise?.length > 0 && (
                <div className="mb-3">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Stethoscope className="w-3.5 h-3.5" /> Expertise
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {specialist.expertise.map((e, i) => (
                      <span key={i} className="bg-slate-50 text-slate-600 text-[11px] px-2 py-0.5 rounded-md border border-slate-200">
                        {e}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Chamber */}
              {specialist.chambers?.length > 0 && (
                <div className="mb-3">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" /> Chamber
                  </p>
                  {specialist.chambers.slice(0, 2).map((ch, i) => (
                    <div key={i} className="text-[12px] text-slate-600 mb-1">
                      <span className="font-semibold text-[#0e2a47]">{ch.name}</span>
                      {ch.city && <span className="text-slate-400"> · {ch.city}</span>}
                      {ch.schedule && (
                        <p className="text-slate-400 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" /> {ch.schedule}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Available Days */}
              {specialist.availableDays?.length > 0 && (
                <div className="mb-3">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <CalendarDays className="w-3.5 h-3.5" /> Available
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((short, i) => {
                      const full = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'][i];
                      const active = specialist.availableDays.includes(full);
                      return (
                        <span key={short} className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${active ? 'bg-[#3ec1d3]/10 text-[#3ec1d3]' : 'bg-slate-100 text-slate-300'}`}>
                          {short}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Languages */}
              {specialist.languages?.length > 0 && (
                <p className="text-[12px] text-slate-500 flex items-center gap-1.5 mb-3">
                  <Globe className="w-3.5 h-3.5 text-slate-400" />
                  {specialist.languages.join(' · ')}
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* See More toggle */}
        <button
          onClick={() => setExpanded((p) => !p)}
          className="text-[12px] text-[#3ec1d3] font-semibold mb-3 flex items-center gap-1 hover:text-[#0e2a47] transition-colors self-start"
        >
          {expanded ? '▲ Less Info' : '▼ More Info'}
        </button>

        {/* Footer: Social + CTA */}
        <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-100">
          <div className="flex items-center gap-1.5">
            {specialist.social &&
              Object.entries(specialist.social)
                .filter(([, v]) => v)
                .map(([type, href]) => (
                  <SocialIcon key={type} type={type} href={href} />
                ))}
          </div>
          <div className="flex items-center gap-2">
            <Link
              to={`/doctor-portal/${specialist._id || specialist.slug || 'doc-1'}`}
              state={{ doctor: specialist }}
              onClick={() => {
                try {
                  sessionStorage.setItem(
                    `dentocare_portal_doctor_${specialist._id || specialist.slug}`,
                    JSON.stringify(specialist)
                  );
                } catch {
                  /* storage unavailable: router state is still used */
                }
              }}
              className="bg-slate-800 hover:bg-[#0e2a47] text-[#3ec1d3] text-[12px] font-bold px-3 py-2 rounded-lg transition-colors duration-200 flex items-center gap-1 whitespace-nowrap border border-slate-700"
            >
              <Stethoscope className="w-3.5 h-3.5 text-[#3ec1d3]" /> Portal
            </Link>
            <Link
              to="/book"
              className="bg-[#3ec1d3] hover:bg-[#0e2a47] text-white text-[12px] font-bold px-4 py-2 rounded-lg transition-colors duration-200 flex items-center gap-1.5 whitespace-nowrap"
            >
              <CalendarDays className="w-3.5 h-3.5" /> Book
            </Link>
          </div>
        </div>
      </div>
    </motion.article>
  );
};

// ─── Blog Card ────────────────────────────────────────────────────────────────
const BlogCard = ({ blog, index }) => (
  <motion.article
    initial={{ opacity: 0, y: 24 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, amount: 0.1 }}
    transition={{ duration: 0.5, delay: index * 0.1 }}
    className="bg-white rounded-xl overflow-hidden shadow-sm border border-slate-100 flex flex-col group hover:shadow-md transition-shadow duration-300"
  >
    <div className="h-44 overflow-hidden bg-slate-100">
      <img
        src={blog.coverImage}
        alt={blog.title}
        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1606811841689-23dfddce3e95?q=80&w=600&auto=format&fit=crop'; }}
      />
    </div>
    <div className="p-4 flex flex-col flex-1">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[10px] font-bold text-[#3ec1d3] uppercase tracking-wider bg-[#f0f9fa] px-2 py-0.5 rounded-full">
          {blog.category}
        </span>
        <span className="text-[11px] text-slate-400 flex items-center gap-1">
          <Clock className="w-3 h-3" /> {blog.readTimeMinutes} min read
        </span>
      </div>
      <h4 className="text-[14px] font-bold text-[#0e2a47] leading-snug mb-2 line-clamp-2 group-hover:text-[#3ec1d3] transition-colors">
        {blog.title}
      </h4>
      <p className="text-[12px] text-slate-500 line-clamp-2 mb-3 flex-1">{blog.excerpt}</p>
      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-slate-500 font-medium">{blog.authorName}</span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-slate-400">
          <span className="flex items-center gap-0.5"><Heart className="w-3 h-3" /> {blog.likes}</span>
          <span className="flex items-center gap-0.5">👁 {blog.views}</span>
        </div>
      </div>
    </div>
  </motion.article>
);

// ─── Pricing Card ─────────────────────────────────────────────────────────────
const PricingCard = ({ item, index }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    whileInView={{ opacity: 1, scale: 1 }}
    viewport={{ once: true, amount: 0.1 }}
    transition={{ duration: 0.4, delay: index * 0.05 }}
    className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm flex items-center gap-4 hover:border-[#3ec1d3]/40 hover:shadow-md transition-all duration-200"
  >
    <span className="text-2xl flex-shrink-0">{item.icon}</span>
    <div className="flex-1 min-w-0">
      <p className="text-[13px] font-bold text-[#0e2a47] truncate">{item.procedure}</p>
      <p className="text-[12px] text-slate-400">
        ${item.minFee.toLocaleString()} – ${item.maxFee.toLocaleString()}
      </p>
    </div>
    <Link
      to="/book"
      className="text-[#3ec1d3] hover:text-[#0e2a47] transition-colors flex-shrink-0"
      title="Book"
    >
      <ChevronRight className="w-4 h-4" />
    </Link>
  </motion.div>
);

// ─── Skeleton Loader ──────────────────────────────────────────────────────────
const SkeletonCard = () => (
  <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden animate-pulse">
    <div className="h-56 bg-slate-200" />
    <div className="p-5 space-y-3">
      <div className="h-4 bg-slate-200 rounded w-3/4" />
      <div className="h-3 bg-slate-100 rounded w-1/2" />
      <div className="flex gap-2">
        <div className="h-5 w-16 bg-slate-100 rounded-full" />
        <div className="h-5 w-12 bg-slate-100 rounded-full" />
      </div>
      <div className="h-3 bg-slate-100 rounded w-full" />
      <div className="h-3 bg-slate-100 rounded w-5/6" />
      <div className="grid grid-cols-3 gap-2 pt-2">
        {[0,1,2].map(i => <div key={i} className="h-10 bg-slate-100 rounded-xl" />)}
      </div>
    </div>
  </div>
);

// ─── Main Page Component ──────────────────────────────────────────────────────

const DentistSpecialists = () => {
  const [specialists, setSpecialists] = useState([]);
  const [blogs, setBlogs] = useState([]);
  const [fees, setFees] = useState(TREATMENT_FEES);
  const [loading, setLoading] = useState(true);
  const [blogsLoading, setBlogsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [usingMock, setUsingMock] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSpec, setFilterSpec] = useState('');
  const [activeTab, setActiveTab] = useState('specialists');

  // ── Fetch specialists ──────────────────────────────────────────────────────
  const fetchSpecialists = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (filterSpec) params.set('specialization', filterSpec);

      const res = await fetch(`${API_BASE}/specialists?${params.toString()}`, {
        signal: AbortSignal.timeout(6000),
      });

      if (!res.ok) throw new Error(`Server responded with ${res.status}`);
      const json = await res.json();

      if (json.success && json.data?.length > 0) {
        setSpecialists(json.data);
        setUsingMock(false);
      } else {
        // Empty DB — seed hasn't run yet, fall back to mock
        throw new Error('no_data');
      }
    } catch {
      setSpecialists(
        MOCK_SPECIALISTS.filter((s) => {
          const q = searchQuery.toLowerCase();
          const sp = filterSpec.toLowerCase();
          const matchQ = !q || s.name.toLowerCase().includes(q) || s.specialization.toLowerCase().includes(q);
          const matchSp = !sp || s.specialization.toLowerCase().includes(sp);
          return matchQ && matchSp;
        })
      );
      setUsingMock(true);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, filterSpec]);

  // ── Fetch blogs ────────────────────────────────────────────────────────────
  const fetchBlogs = useCallback(async () => {
    setBlogsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/dental-blogs?limit=3`, {
        signal: AbortSignal.timeout(6000),
      });
      if (!res.ok) throw new Error('blog_fetch_failed');
      const json = await res.json();
      if (json.success && json.data?.length > 0) {
        setBlogs(json.data);
      } else {
        throw new Error('no_blogs');
      }
    } catch {
      setBlogs(MOCK_BLOGS);
    } finally {
      setBlogsLoading(false);
    }
  }, []);

  // ── Fetch billing fees ─────────────────────────────────────────────────────
  const fetchFees = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/billing/fees`, {
        signal: AbortSignal.timeout(6000),
      });
      if (!res.ok) throw new Error('fees_fetch_failed');
      const json = await res.json();
      if (json.success && json.data?.length > 0) {
        const mapped = json.data.map((f, i) => ({
          procedure: f._id,
          minFee: Math.round(f.minFee),
          maxFee: Math.round(f.maxFee),
          icon: TREATMENT_FEES[i % TREATMENT_FEES.length]?.icon || '🦷',
        }));
        setFees(mapped);
      }
    } catch {
      // Keep static fallback
    }
  }, []);

  useEffect(() => { fetchSpecialists(); }, [fetchSpecialists]);
  useEffect(() => { fetchBlogs(); fetchFees(); }, [fetchBlogs, fetchFees]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => fetchSpecialists(), 400);
    return () => clearTimeout(timer);
  }, [searchQuery, filterSpec]); // eslint-disable-line react-hooks/exhaustive-deps

  const specializations = [...new Set(MOCK_SPECIALISTS.map((s) => s.specialization))];

  const tabs = [
    { id: 'specialists', label: 'Our Specialists', icon: Stethoscope },
    { id: 'pricing', label: 'Treatment Pricing', icon: Award },
    { id: 'blogs', label: 'Dental Health Blog', icon: BookOpen },
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc]">

      {/* ── Hero Banner ──────────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-[#0e2a47] via-[#133558] to-[#0e2a47] py-20 px-6 md:px-16 relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-[#3ec1d3]/10 pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full bg-[#3ec1d3]/5 pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.span
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-block text-[#3ec1d3] font-bold text-xs tracking-[0.3em] uppercase mb-4"
          >
            DentoCare · About Us
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-3xl md:text-5xl font-extrabold text-white mb-4 tracking-tight"
          >
            Meet Our Dental Specialists
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-slate-300 text-base md:text-lg max-w-2xl mx-auto mb-8 font-normal"
          >
            World-class dental experts dedicated to your smile, combining advanced technology with compassionate, personalized care.
          </motion.p>

          {/* Search & Filter Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="bg-white p-3 rounded-2xl shadow-xl flex flex-col md:flex-row gap-3 max-w-2xl mx-auto"
          >
            <div className="flex-1 flex items-center gap-2 px-3 bg-slate-50 rounded-xl border border-slate-200">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by doctor name..."
                className="w-full py-2.5 bg-transparent text-sm text-[#0e2a47] placeholder-slate-400 focus:outline-none"
              />
            </div>
            <div className="w-full md:w-52">
              <select
                value={filterSpec}
                onChange={(e) => setFilterSpec(e.target.value)}
                className="w-full py-3 px-3 bg-slate-50 rounded-xl border border-slate-200 text-sm text-[#0e2a47] focus:outline-none cursor-pointer font-medium"
              >
                <option value="">All Specializations</option>
                {specializations.map((spec) => (
                  <option key={spec} value={spec}>{spec}</option>
                ))}
              </select>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Tabs Navigation ──────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-200 sticky top-[80px] md:top-[90px] z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-6 md:px-12 flex gap-4 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-4 px-4 font-bold text-sm border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                  active
                    ? 'border-[#3ec1d3] text-[#3ec1d3]'
                    : 'border-transparent text-slate-500 hover:text-[#0e2a47]'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Main Content Area ────────────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-6 md:px-12 py-12">

        {/* TAB 1: SPECIALISTS */}
        {activeTab === 'specialists' && (
          <div>
            {usingMock && (
              <div className="mb-8 bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl flex items-center justify-between text-xs font-medium">
                <span className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  Showing curated clinic roster (Backend offline or syncing).
                </span>
                <button
                  onClick={fetchSpecialists}
                  className="flex items-center gap-1 text-amber-900 hover:text-black font-bold underline cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" /> Retry
                </button>
              </div>
            )}

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : specialists.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl border border-slate-100 shadow-xs">
                <Stethoscope className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-[#0e2a47] mb-1">No Specialists Found</h3>
                <p className="text-sm text-slate-400 mb-4">Try adjusting your search criteria or filters.</p>
                <button
                  onClick={() => { setSearchQuery(''); setFilterSpec(''); }}
                  className="bg-[#3ec1d3] text-white px-5 py-2 rounded-lg text-xs font-bold shadow-sm"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {specialists.map((doc, idx) => (
                  <SpecialistCard key={doc._id || idx} specialist={doc} index={idx} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: PRICING */}
        {activeTab === 'pricing' && (
          <div>
            <div className="text-center max-w-xl mx-auto mb-10">
              <h2 className="text-2xl font-bold text-[#0e2a47] mb-2">Transparent Treatment Pricing</h2>
              <p className="text-sm text-slate-500">
                At DentoCare, we believe in upfront pricing with no hidden fees. Below are our standard fee ranges for common procedures.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {fees.map((item, idx) => (
                <PricingCard key={idx} item={item} index={idx} />
              ))}
            </div>
            <div className="mt-10 text-center">
              <Link
                to="/book"
                className="inline-flex items-center gap-2 bg-[#0e2a47] hover:bg-[#3ec1d3] text-white text-sm font-bold px-8 py-3.5 rounded-xl transition-colors shadow-md"
              >
                <CalendarDays className="w-4 h-4" /> Book Consultation for Accurate Estimate
              </Link>
            </div>
          </div>
        )}

        {/* TAB 3: BLOGS */}
        {activeTab === 'blogs' && (
          <div>
            <div className="text-center max-w-xl mx-auto mb-10">
              <h2 className="text-2xl font-bold text-[#0e2a47] mb-2">From Our Dental Experts</h2>
              <p className="text-sm text-slate-500">
                Stay informed with the latest insights, preventive care tips, and advanced dental procedures written by our specialists.
              </p>
            </div>
            {blogsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-72 bg-slate-200 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {blogs.map((blog, idx) => (
                  <BlogCard key={blog._id || idx} blog={blog} index={idx} />
                ))}
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
};

export default DentistSpecialists;