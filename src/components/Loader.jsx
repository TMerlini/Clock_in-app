import './Loader.css';

export function Loader() {
  return (
    <div className="loader-container">
      <div className="loader-content">
        <div className="loader-circle">
          <img src="/images/animated white.gif" alt="Loading..." className="loader-gif" />
        </div>
        <h1 className="loader-title">Clock In</h1>
        <p className="loader-subtitle">Intelligent Time Manager</p>
      </div>
    </div>
  );
}
