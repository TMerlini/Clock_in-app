import { useState, useEffect, useRef, memo } from 'react';
import { Menu, X, Home, Calendar, BarChart3, Info, Settings, HelpCircle, Bot, Crown, Shield } from 'lucide-react';
import { isAdmin } from '../lib/adminUtils';
import './Navigation.css';

export const Navigation = memo(function Navigation({ currentPage, onPageChange, user }) {
  const [isOpen, setIsOpen] = useState(false);
  const [buttonPosition, setButtonPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const buttonRef = useRef(null);
  const dragTimeout = useRef(null);

  const menuItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'ai-advisor', label: 'AI Advisor', icon: Bot },
    { id: 'premium-plus', label: 'Premium+', icon: Crown },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'faq', label: 'Frequent Questions', icon: HelpCircle },
    { id: 'about', label: 'About', icon: Info }
  ];

  // Add Admin menu item if user is admin
  const finalMenuItems = [...menuItems];
  if (user && isAdmin(user)) {
    finalMenuItems.push({ id: 'admin', label: 'Admin', icon: Shield });
  }

  const handleNavigate = (pageId) => {
    onPageChange(pageId);
    setIsOpen(false);
  };

  // Handle button drag start
  const handleButtonDragStart = (e) => {
    const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
    const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
    
    // Start a timeout - if user holds for 100ms, it's a drag, not a click
    dragTimeout.current = setTimeout(() => {
      setIsDragging(true);
      
      const buttonRect = buttonRef.current?.getBoundingClientRect();
      if (buttonRect) {
        setDragStart({
          x: clientX - buttonRect.left,
          y: clientY - buttonRect.top
        });
      }
    }, 100);
  };

  // Handle dragging the button
  useEffect(() => {
    if (!isDragging) return;

    const handleDrag = (e) => {
      e.preventDefault();
      const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
      const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;

      const newX = clientX - dragStart.x;
      const newY = clientY - dragStart.y;

      // Constrain to viewport
      const buttonSize = buttonRef.current?.offsetWidth || 48;
      
      const maxX = window.innerWidth - buttonSize;
      const maxY = window.innerHeight - buttonSize;

      setButtonPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY))
      });
    };

    const handleDragEnd = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleDrag);
    document.addEventListener('mouseup', handleDragEnd);
    document.addEventListener('touchmove', handleDrag, { passive: false });
    document.addEventListener('touchend', handleDragEnd);

    return () => {
      document.removeEventListener('mousemove', handleDrag);
      document.removeEventListener('mouseup', handleDragEnd);
      document.removeEventListener('touchmove', handleDrag);
      document.removeEventListener('touchend', handleDragEnd);
    };
  }, [isDragging, dragStart]);

  // Handle button click (toggle menu)
  const handleButtonClick = () => {
    if (!isDragging) {
      setIsOpen(!isOpen);
    }
  };

  // Clear drag timeout on mouse/touch end
  const handleButtonEnd = () => {
    if (dragTimeout.current) {
      clearTimeout(dragTimeout.current);
      dragTimeout.current = null;
    }
  };

  return (
    <>
      <button
        ref={buttonRef}
        className={`hamburger-button ${isDragging ? 'dragging' : ''}`}
        onClick={handleButtonClick}
        onMouseDown={handleButtonDragStart}
        onMouseUp={handleButtonEnd}
        onTouchStart={handleButtonDragStart}
        onTouchEnd={handleButtonEnd}
        aria-label="Toggle menu"
        style={{
          left: buttonPosition.x !== 0 ? `${buttonPosition.x}px` : undefined,
          top: buttonPosition.y !== 0 ? `${buttonPosition.y}px` : undefined,
          cursor: isDragging ? 'grabbing' : 'grab'
        }}
      >
        {isOpen ? <X /> : <Menu />}
      </button>

      <div className={`nav-overlay ${isOpen ? 'active' : ''}`} onClick={() => setIsOpen(false)} />

      <nav className={`nav-menu ${isOpen ? 'open' : ''}`}>
        <div className="nav-header">
          <h2>Menu</h2>
          <button className="nav-close" onClick={() => setIsOpen(false)}>
            <X />
          </button>
        </div>

        <ul className="nav-list">
          {finalMenuItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.id}>
                <button
                  className={`nav-item ${currentPage === item.id ? 'active' : ''} ${item.id === 'admin' ? 'admin-item' : ''}`}
                  onClick={() => handleNavigate(item.id)}
                >
                  <Icon />
                  <span>{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
});
