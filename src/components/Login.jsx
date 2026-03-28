import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { auth, googleProvider, db } from '../lib/firebase';
import { ContactFormSlide } from './ContactFormSlide';
import { PlansSlide } from './PlansSlide';
import { CarouselSlide } from './CarouselSlide';
import './Login.css';

function extractYouTubeId(url) {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

const isPlainImage = (img) =>
  !img.mediaType || img.mediaType === 'image';

export function Login({ onLogin }) {
  const [loginImages, setLoginImages] = useState([]);
  const [visibleSlides, setVisibleSlides] = useState(new Set());
  const [activeVideo, setActiveVideo] = useState(null);
  const slideRefs = useRef([]);

  useEffect(() => {
    const loadImages = async () => {
      try {
        const q = query(collection(db, 'loginImages'), orderBy('order', 'asc'));
        const snap = await getDocs(q);
        const imgs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setLoginImages(imgs);
      } catch (err) {
        console.error('Error loading login images:', err);
      }
    };
    loadImages();
  }, []);

  // Group consecutive plain images into carousel slides
  const groupedSlides = useMemo(() => {
    const result = [];
    let imageGroup = [];

    const flushGroup = () => {
      if (imageGroup.length === 0) return;
      result.push({
        type: 'carousel',
        images: imageGroup,
        id: 'carousel-' + imageGroup[0].id,
      });
      imageGroup = [];
    };

    for (const img of loginImages) {
      if (isPlainImage(img)) {
        imageGroup.push(img);
      } else {
        flushGroup();
        result.push({ type: img.mediaType, img, id: img.id });
      }
    }
    flushGroup();
    return result;
  }, [loginImages]);

  const observerCallback = useCallback((entries) => {
    setVisibleSlides(prev => {
      const next = new Set(prev);
      entries.forEach(entry => {
        const idx = entry.target.dataset.slideIndex;
        if (entry.isIntersecting) {
          next.add(idx);
        } else {
          next.delete(idx);
        }
      });
      return next;
    });
  }, []);

  useEffect(() => {
    if (!groupedSlides.length) return;
    const observer = new IntersectionObserver(observerCallback, {
      threshold: 0.15,
    });
    slideRefs.current.forEach(el => {
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [groupedSlides, observerCallback]);

  const handleGoogleSignIn = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      onLogin(result.user);
    } catch (error) {
      console.error("Error signing in with Google:", error);
      alert("Failed to sign in. Please try again.");
    }
  };

  const hasImages = loginImages.length > 0;

  if (!hasImages) {
    return (
      <div className="login-container">
        <div className="login-card">
          <LoginContent onSignIn={handleGoogleSignIn} />
        </div>
      </div>
    );
  }

  return (
    <div className="login-wrapper">
      <div className="login-card-sticky">
        <div className="login-card">
          <LoginContent onSignIn={handleGoogleSignIn} />
        </div>
      </div>

      <div className="login-slideshow">
        {groupedSlides.map((slide, idx) => {
          const visibleClass = visibleSlides.has(String(idx)) ? 'login-slide--visible' : '';
          const slideRef = el => { slideRefs.current[idx] = el; };

          // Carousel: group of plain images
          if (slide.type === 'carousel') {
            return (
              <div
                key={slide.id}
                className={`login-slide ${visibleClass}`}
                data-slide-index={idx}
                ref={slideRef}
              >
                <CarouselSlide images={slide.images} />
              </div>
            );
          }

          // Contact form
          if (slide.type === 'contact') {
            return (
              <div
                key={slide.id}
                className={`login-slide ${visibleClass}`}
                data-slide-index={idx}
                ref={slideRef}
              >
                <ContactFormSlide title={slide.img.title} description={slide.img.description} />
              </div>
            );
          }

          // Plans
          if (slide.type === 'plans') {
            return (
              <div
                key={slide.id}
                className={`login-slide ${visibleClass}`}
                data-slide-index={idx}
                ref={slideRef}
              >
                <PlansSlide title={slide.img.title} description={slide.img.description} />
              </div>
            );
          }

          // YouTube / remaining single-image slides
          const img = slide.img;
          const hasText = img.title || img.description;
          const alignment = img.alignment || 'right';
          const isYoutube = slide.type === 'youtube';
          const videoId = isYoutube ? extractYouTubeId(img.youtubeUrl) : null;
          const isVideoActive = activeVideo === img.id;
          const isFullScreen = img.fullScreen === true;

          const mediaElement = isYoutube && videoId ? (
            isVideoActive ? (
              <div className="login-slide-youtube-player">
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`}
                  title={img.title || `Video ${idx + 1}`}
                  allow="autoplay; encrypted-media"
                  allowFullScreen
                />
              </div>
            ) : (
              <div
                className="login-slide-youtube"
                onClick={() => setActiveVideo(img.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') setActiveVideo(img.id); }}
              >
                <img
                  src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
                  alt={img.title || `Video ${idx + 1}`}
                />
                <div className="login-slide-youtube-play">
                  <svg viewBox="0 0 68 48" width="68" height="48">
                    <path d="M66.52 7.74c-.78-2.93-2.49-5.41-5.42-6.19C55.79.13 34 0 34 0S12.21.13 6.9 1.55c-2.93.78-4.63 3.26-5.42 6.19C.06 13.05 0 24 0 24s.06 10.95 1.48 16.26c.78 2.93 2.49 5.41 5.42 6.19C12.21 47.87 34 48 34 48s21.79-.13 27.1-1.55c2.93-.78 4.64-3.26 5.42-6.19C67.94 34.95 68 24 68 24s-.06-10.95-1.48-16.26z" fill="#212121" fillOpacity="0.8" />
                    <path d="M45 24L27 14v20" fill="#fff" />
                  </svg>
                </div>
              </div>
            )
          ) : img.linkUrl ? (
            <a href={img.linkUrl} target="_blank" rel="noopener noreferrer" className="login-slide-link">
              <img src={img.url} alt={img.fileName || `Slide ${idx + 1}`} />
            </a>
          ) : (
            <img src={img.url} alt={img.fileName || `Slide ${idx + 1}`} />
          );

          return (
            <div
              key={slide.id}
              className={`login-slide ${visibleClass} ${isFullScreen ? 'login-slide--fullscreen' : ''}`}
              data-slide-index={idx}
              ref={slideRef}
            >
              {hasText ? (
                <div className={`login-slide-content ${alignment === 'left' ? 'login-slide-content--text-left' : 'login-slide-content--text-right'}`}>
                  <div className="login-slide-text">
                    {img.title && <h2 style={img.titleColor ? { color: img.titleColor } : undefined}>{img.title}</h2>}
                    {img.description && <p>{img.description}</p>}
                  </div>
                  <div className={`login-slide-media ${isFullScreen ? 'login-slide-media--fullscreen' : ''}`}>
                    {mediaElement}
                  </div>
                </div>
              ) : (
                <div className={`login-slide-media login-slide-media--full ${isFullScreen ? 'login-slide-media--fullscreen' : ''}`}>
                  {mediaElement}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LoginContent({ onSignIn }) {
  return (
    <>
      <div className="login-header">
        <div className="login-icon">
          <img src="/images/animated white.gif" alt="Clock In" className="login-gif" />
        </div>
        <h1 className="login-title">Clock In</h1>
        <p className="login-description">
          Intelligent Time Manager
        </p>
      </div>

      <button onClick={onSignIn} className="google-button">
        <svg viewBox="0 0 24 24">
          <path
            fill="currentColor"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="currentColor"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="currentColor"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="currentColor"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        Sign in with Google
      </button>

      <p className="login-footer">
        Sign in to track and manage your work sessions
        {' · '}
        <a href="/privacy" target="_blank" rel="noopener noreferrer" className="login-privacy-link">Privacy Policy</a>
        {' · '}
        <a href="/terms" target="_blank" rel="noopener noreferrer" className="login-privacy-link">Terms of Service</a>
        {' · '}
        <a href="mailto:contacto@clock-in.pt" className="login-privacy-link">Contact</a>
      </p>
    </>
  );
}
