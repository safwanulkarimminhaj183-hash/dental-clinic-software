import React, { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import heroImg1 from '../assets/dentist-picture.jpg';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const Hero = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [heroData, setHeroData] = useState(null);

  const fallbackImages = [heroImg1, heroImg1];

  // ─── Backend Fetch: GET /api/home1/hero ─────────────────────────────────────
  useEffect(() => {
    const fetchHeroData = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/home1/hero`);
        const json = await res.json();
        if (res.ok && json.success) {
          setHeroData(json.data);
        }
      } catch (err) {
        console.warn('⚠️ [Home 1] Backend fetch failed, using static fallback:', err.message);
      }
    };
    fetchHeroData();
  }, []);

  const hero = heroData?.hero || {};
  const title = hero.title || 'Let Us Brighten Your Smile';
  const subtitle = hero.subtitle || 'WE USE LATEST MEDICAL TECHNOLOGY';
  const ctaText = hero.ctaText || 'Who We Are';
  const images = fallbackImages; // Always use local images for the slider

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  return (
    <section id="home-1" className="relative w-full overflow-hidden bg-[#f0f9fa]">
      <div className="relative h-[600px] md:h-[85vh] flex items-center">
        {images.map((img, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-all duration-1000 ease-in-out ${
              index === currentSlide ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full'
            }`}
          >
            <img
              src={img}
              className="w-full h-full object-cover object-right opacity-90"
              alt="Carousel"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-white/70 via-white/30 to-transparent"></div>
          </div>
        ))}

        <div className="container mx-auto px-6 md:px-20 relative z-10">
          <div className="max-w-3xl">
            <h5 className="text-[#0e2a47] font-bold tracking-[4px] uppercase text-xs md:text-sm mb-6">
              {subtitle}
            </h5>
            <h1 className="text-5xl md:text-[85px] font-bold text-[#0e2a47] leading-[1.1] mb-10">
              {title.includes('Brighten') ? (
                <>Let Us Brighten <br /> Your Smile</>
              ) : (
                title
              )}
            </h1>
            <button className="bg-[#3ec1d3] hover:bg-[#0e2a47] text-white font-bold py-4 px-10 rounded-sm shadow-xl transition-all duration-500 uppercase text-xs tracking-widest">
              {ctaText}
            </button>
          </div>
        </div>

        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-6 md:px-12 z-20">
          <button onClick={prevSlide} className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-md text-[#0e2a47] hover:bg-[#3ec1d3] hover:text-white transition-all transform hover:scale-110">
            <ArrowLeft size={20} />
          </button>
          <button onClick={nextSlide} className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-md text-[#0e2a47] hover:bg-[#3ec1d3] hover:text-white transition-all transform hover:scale-110">
            <ArrowRight size={20} />
          </button>
        </div>

        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex gap-2 z-20">
          {images.map((_, i) => (
            <div
              key={i}
              onClick={() => setCurrentSlide(i)}
              className={`w-3 h-3 cursor-pointer rounded-sm transition-all ${
                i === currentSlide ? 'bg-[#0e2a47] w-6' : 'bg-gray-300'
              }`}
            ></div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Hero;