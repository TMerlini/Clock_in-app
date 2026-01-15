import { memo } from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { Calendar } from './ui/calendar';
import './ClockInApp.css';

export const DatePickerSection = memo(function DatePickerSection({
  selectedDate,
  onDateSelect,
  modifiers,
  modifiersClassNames
}) {
  return (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title">
          <CalendarIcon style={{ display: 'inline', width: '20px', height: '20px', marginRight: '8px' }} />
          Select Date
        </h2>
        <p className="card-description">View your sessions for any date</p>
      </div>
      <div className="calendar-wrapper">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={onDateSelect}
          modifiers={modifiers}
          modifiersClassNames={modifiersClassNames}
        />
      </div>
    </div>
  );
});
