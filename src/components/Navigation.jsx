import { useState } from 'react';
import { Menu, X, Home, Calendar, BarChart3, Info, Settings } from 'lucide-react';
import './Navigation.css';

export function Navigation({ currentPage, onPageChange }) {
  const [isOpen, setIsOpen] = useState(false);

  const menuItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'about', label: 'About', icon: Info }
  ];

  const handleNavigate = (pageId) => {
    onPageChange(pageId);
    setIsOpen(false);
  };

  return (
    <>
      <button
        className="hamburger-button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle menu"
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
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.id}>
                <button
                  className={`nav-item ${currentPage === item.id ? 'active' : ''}`}
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
}
