import { memo } from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { Calendar } from './ui/calendar';
import { useTranslation } from 'react-i18next';
import { getDateFnsLocale } from '../lib/i18n';
import './ClockInApp.css';

export const DatePickerSection = memo(function DatePickerSection({
  selectedDate,
  onDateSelect,
  modifiers,
  modifiersClassNames
}) {
  const { t } = useTranslation();
  return (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title">
          <CalendarIcon style={{ display: 'inline', width: '20px', height: '20px', marginRight: '8px' }} />
          {t('sessionList.selectDate')}
        </h2>
        <p className="card-description">{t('sessionList.viewSessionsDate')}</p>
      </div>
      <div className="calendar-wrapper">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={onDateSelect}
          modifiers={modifiers}
          modifiersClassNames={modifiersClassNames}
          locale={getDateFnsLocale()}
        />
      </div>
    </div>
  );
});
