/**
 * Finance Calculator Library
 * Calculates salary, overtime, and deductions based on Portuguese labor law
 */

import { 
  startOfDay, 
  endOfDay, 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth,
  startOfYear,
  endOfYear,
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval,
  eachYearOfInterval,
  format
} from 'date-fns';

/**
 * Calculate base salary from regular hours
 * @param {number} regularHours - Regular hours worked
 * @param {number} hourlyRate - Hourly rate in €
 * @returns {number} Base salary in €
 */
export function calculateBaseSalary(regularHours, hourlyRate) {
  return regularHours * hourlyRate;
}

/**
 * Calculate Isenção salary (IHT - Isenção de Horário de Trabalho)
 * Can be calculated as percentage-based (per working day) or fixed monthly amount
 * @param {number} hourlyRate - Base hourly rate in €
 * @param {number} isencaoRate - Isenção rate (percentage if method is 'percentage', or fixed amount if method is 'fixed')
 * @param {number} workingDays - Number of unique working days (used only for percentage method)
 * @param {string} calculationMethod - 'percentage' or 'fixed' (default: 'percentage')
 * @returns {number} Isenção earnings in €
 */
export function calculateIsencaoSalary(hourlyRate, isencaoRate, workingDays, calculationMethod = 'percentage') {
  if (isencaoRate === 0) return 0;
  
  if (calculationMethod === 'fixed') {
    // For fixed amount, return the fixed monthly amount directly
    return isencaoRate;
  }
  
  // Percentage method: (Hourly rate × Isenção percentage / 100) × Working days
  if (workingDays === 0) return 0;
  const hourlySupplement = hourlyRate * (isencaoRate / 100);
  return hourlySupplement * workingDays;
}

/**
 * Calculate overtime salary based on Portuguese labor law
 * @param {number} paidExtraHours - Paid extra hours worked
 * @param {number} hourlyRate - Base hourly rate in €
 * @param {boolean} isWeekend - Whether this is weekend work
 * @param {boolean} isHoliday - Whether this is holiday work
 * @param {Object} settings - Finance settings with overtime rates
 * @returns {number} Overtime earnings in €
 */
export function calculateOvertimeSalary(paidExtraHours, hourlyRate, isWeekend, isHoliday, settings) {
  if (paidExtraHours <= 0) return 0;

  const {
    overtimeFirstHourRate = 1.25,
    overtimeSubsequentRate = 1.50,
    weekendOvertimeRate = 1.50,
    holidayOvertimeRate = 2.00
  } = settings || {};

  // Holiday work gets highest rate
  if (isHoliday) {
    return paidExtraHours * hourlyRate * holidayOvertimeRate;
  }

  // Weekend work gets weekend rate
  if (isWeekend) {
    return paidExtraHours * hourlyRate * weekendOvertimeRate;
  }

  // Regular overtime: first hour at firstHourRate, rest at subsequentRate
  if (paidExtraHours <= 1) {
    return paidExtraHours * hourlyRate * overtimeFirstHourRate;
  }

  const firstHourEarning = 1 * hourlyRate * overtimeFirstHourRate;
  const subsequentHours = paidExtraHours - 1;
  const subsequentEarning = subsequentHours * hourlyRate * overtimeSubsequentRate;

  return firstHourEarning + subsequentEarning;
}

/**
 * Calculate weekend bonus earnings
 * @param {Array} sessions - Array of session objects with weekendBonus
 * @returns {number} Total weekend bonuses in €
 */
export function calculateWeekendBonus(sessions) {
  return sessions.reduce((sum, session) => {
    return sum + (session.weekendBonus || 0);
  }, 0);
}

/**
 * Calculate total meal allowances
 * @param {Array} sessions - Array of session objects with lunchAmount and dinnerAmount
 * @param {boolean} includeMeals - Whether to include meal allowances
 * @returns {number} Total meal allowances in €
 */
export function calculateMealAllowances(sessions, includeMeals) {
  if (!includeMeals) return 0;

  return sessions.reduce((sum, session) => {
    const lunchAmount = session.lunchAmount || 0;
    const dinnerAmount = session.hadDinner ? (session.dinnerAmount || 0) : 0;
    return sum + lunchAmount + dinnerAmount;
  }, 0);
}

/**
 * Calculate gross salary (sum of all earnings)
 * @param {number} baseSalary - Base salary
 * @param {number} isencaoSalary - Isenção earnings
 * @param {number} overtimeSalary - Overtime earnings
 * @param {number} weekendBonus - Weekend bonus
 * @param {number} mealAllowances - Meal allowances
 * @returns {number} Gross salary in €
 */
export function calculateGrossSalary(baseSalary, isencaoSalary, overtimeSalary, weekendBonus, mealAllowances) {
  return baseSalary + isencaoSalary + overtimeSalary + weekendBonus + mealAllowances;
}

/**
 * Calculate tax deductions based on settings
 * Social Security is calculated on Base Salary + IHT only (excludes meal subsidy, bonus, overtime)
 * IRS can have separate rates for base salary, IHT, and overtime
 * @param {number} baseSalary - Base salary in €
 * @param {number} isencaoSalary - Isenção (IHT) earnings in €
 * @param {number} overtimeSalary - Overtime earnings in €
 * @param {Object} settings - Finance settings with tax rates
 * @returns {Object} Object with breakdown: { irs: number, irsBaseSalary: number, irsIht: number, irsOvertime: number, socialSecurity: number, custom: number, total: number }
 */
export function calculateTaxDeductions(baseSalary, isencaoSalary, overtimeSalary, settings) {
  const {
    taxDeductionType = 'both',
    irsBaseSalaryRate = 0,
    irsIhtRate = 0,
    irsOvertimeRate = 0,
    irsRate = 0, // Legacy: single IRS rate (used if separate rates are not set)
    socialSecurityRate = 11,
    customTaxRate = 0
  } = settings || {};

  const deductions = {
    irs: 0,
    irsBaseSalary: 0,
    irsIht: 0,
    irsOvertime: 0,
    socialSecurity: 0,
    custom: 0,
    total: 0
  };

  // Calculate Social Security base: Base Salary + IHT only (excludes meal subsidy, bonus, overtime)
  const socialSecurityBase = baseSalary + isencaoSalary;

  // Calculate Social Security deduction
  if (taxDeductionType === 'social_security' || taxDeductionType === 'both') {
    deductions.socialSecurity = socialSecurityBase * (socialSecurityRate / 100);
  }

  // Calculate IRS deduction with separate rates
  if (taxDeductionType === 'irs' || taxDeductionType === 'both') {
    // Check if separate rates are configured (at least one is non-zero)
    const hasSeparateRates = irsBaseSalaryRate > 0 || irsIhtRate > 0 || irsOvertimeRate > 0;
    
    if (hasSeparateRates) {
      // Use separate rates for each income type
      deductions.irsBaseSalary = baseSalary * (irsBaseSalaryRate / 100);
      deductions.irsIht = isencaoSalary * (irsIhtRate / 100);
      deductions.irsOvertime = overtimeSalary * (irsOvertimeRate / 100);
      deductions.irs = deductions.irsBaseSalary + deductions.irsIht + deductions.irsOvertime;
    } else {
      // Fallback to single IRS rate (legacy behavior)
      const totalGrossForIRS = baseSalary + isencaoSalary + overtimeSalary;
      deductions.irs = totalGrossForIRS * (irsRate / 100);
    }
  }

  // Calculate custom tax deduction (applied to total gross)
  const totalGross = baseSalary + isencaoSalary + overtimeSalary;
  if (taxDeductionType === 'custom') {
    deductions.custom = totalGross * (customTaxRate / 100);
  } else if (taxDeductionType === 'both' && customTaxRate > 0) {
    // If both is selected and custom rate is set, apply custom rate to remaining after IRS
    const remainingAfterIRS = totalGross - deductions.irs;
    deductions.custom = remainingAfterIRS * (customTaxRate / 100);
  }

  deductions.total = deductions.irs + deductions.socialSecurity + deductions.custom;

  return deductions;
}

/**
 * Calculate net salary (gross - deductions)
 * @param {number} grossSalary - Gross salary in €
 * @param {number} deductions - Total deductions in €
 * @returns {number} Net salary in €
 */
export function calculateNetSalary(grossSalary, deductions) {
  return Math.max(0, grossSalary - deductions);
}

/**
 * Calculate finance for a period with multiple sessions
 * @param {Array} sessions - Array of session objects
 * @param {Object} dateRange - { start: Date, end: Date }
 * @param {Object} settings - Finance settings
 * @returns {Object} Finance breakdown object
 */
export function calculatePeriodFinance(sessions, dateRange, settings) {
  const {
    hourlyRate = 0,
    isencaoRate = 0, // Percentage or fixed amount depending on calculationMethod
    isencaoCalculationMethod = 'percentage', // 'percentage' or 'fixed'
    isencaoFixedAmount = 0, // Fixed monthly amount when method is 'fixed'
    mealAllowanceIncluded = false,
    overtimeFirstHourRate = 1.25,
    overtimeSubsequentRate = 1.50,
    weekendOvertimeRate = 1.50,
    holidayOvertimeRate = 2.00,
    fixedBonus = 0,
    dailyMealSubsidy = 0,
    mealCardDeduction = 0 // Meal card deduction amount (deducted from gross)
  } = settings || {};

  // Filter sessions by date range
  const filteredSessions = sessions.filter(s => {
    let clockInTime;
    if (s.clockIn?.toDate) {
      // Firestore Timestamp
      clockInTime = s.clockIn.toDate().getTime();
    } else if (s.clockIn instanceof Date) {
      // Date object
      clockInTime = s.clockIn.getTime();
    } else {
      // Number timestamp
      clockInTime = s.clockIn;
    }
    return clockInTime >= dateRange.start.getTime() && clockInTime <= dateRange.end.getTime();
  });

  // Aggregate hours and earnings
  let totalRegularHours = 0;
  let totalIsencaoHours = 0;
  let totalPaidExtraHours = 0;
  let totalOvertimeEarnings = 0;

  filteredSessions.forEach(session => {
    totalRegularHours += session.regularHours || 0;
    totalIsencaoHours += session.unpaidExtraHours || 0;
    totalPaidExtraHours += session.paidExtraHours || 0;

    // Calculate overtime per session (handles weekend/holiday rates)
    const sessionOvertime = calculateOvertimeSalary(
      session.paidExtraHours || 0,
      hourlyRate,
      session.isWeekend || false,
      session.isBankHoliday || false,
      {
        overtimeFirstHourRate,
        overtimeSubsequentRate,
        weekendOvertimeRate,
        holidayOvertimeRate
      }
    );
    totalOvertimeEarnings += sessionOvertime;
  });

  // Calculate number of unique working days (days with at least one session)
  const workingDays = new Set();
  filteredSessions.forEach(s => {
    let clockInTime;
    if (s.clockIn?.toDate) {
      clockInTime = s.clockIn.toDate();
    } else if (s.clockIn instanceof Date) {
      clockInTime = s.clockIn;
    } else {
      clockInTime = new Date(s.clockIn);
    }
    // Use date string (YYYY-MM-DD) as key for unique days
    const dateKey = clockInTime.toISOString().split('T')[0];
    workingDays.add(dateKey);
  });
  const totalWorkingDays = workingDays.size;

  // Calculate meal subsidy (daily subsidy × number of working days)
  const totalMealSubsidy = dailyMealSubsidy * totalWorkingDays;

  // Calculate components
  const baseSalary = calculateBaseSalary(totalRegularHours, hourlyRate);
  
  // Isenção (IHT) calculation based on method
  let isencaoSalary;
  if (isencaoCalculationMethod === 'fixed') {
    // Use fixed amount (for monthly periods, or prorated for other periods)
    // For now, use fixed amount directly for monthly reports
    isencaoSalary = calculateIsencaoSalary(hourlyRate, isencaoFixedAmount, totalWorkingDays, 'fixed');
  } else {
    // Percentage method: calculated on all working days
    isencaoSalary = calculateIsencaoSalary(hourlyRate, isencaoRate, totalWorkingDays, 'percentage');
  }
  
  const overtimeSalary = totalOvertimeEarnings;
  const weekendBonus = calculateWeekendBonus(filteredSessions);
  const mealAllowances = calculateMealAllowances(filteredSessions, mealAllowanceIncluded);

  // Calculate base gross (without bonus and meal subsidy)
  const baseGrossSalary = calculateGrossSalary(
    baseSalary,
    isencaoSalary,
    overtimeSalary,
    weekendBonus,
    mealAllowances
  );

  // Calculate gross (includes fixed bonus and meal subsidy)
  const grossSalary = baseGrossSalary + fixedBonus + totalMealSubsidy;

  // Calculate deductions (SS base is Base Salary + IHT only, IRS has separate rates)
  const deductions = calculateTaxDeductions(baseSalary, isencaoSalary, overtimeSalary, settings);

  // Calculate net (gross - deductions - meal card deduction)
  const totalDeductions = deductions.total + mealCardDeduction;
  const netSalary = calculateNetSalary(grossSalary, totalDeductions);

  return {
    period: {
      start: dateRange.start,
      end: dateRange.end,
      totalDays: filteredSessions.length
    },
    hours: {
      regular: totalRegularHours,
      isencao: totalIsencaoHours,
      paidExtra: totalPaidExtraHours,
      total: totalRegularHours + totalIsencaoHours + totalPaidExtraHours
    },
    earnings: {
      baseSalary,
      isencaoSalary,
      overtimeSalary,
      weekendBonus,
      mealAllowances,
      fixedBonus,
      mealSubsidy: totalMealSubsidy,
      grossSalary
    },
    workingDays: totalWorkingDays,
    deductions: {
      ...deductions,
      mealCardDeduction
    },
    netSalary,
    sessions: (() => {
      // Track which dates have already been counted for Isenção earnings
      const isencaoDatesProcessed = new Set();
      
      // Calculate per-day Isenção supplement based on method
      let dailyIsencaoSupplement = 0;
      if (isencaoCalculationMethod === 'fixed') {
        // For fixed amount, we need to prorate per day (only for session breakdown display)
        // In practice, this is typically a monthly fixed amount, but for display we can show it as 0 per session
        // or prorate based on working days
        dailyIsencaoSupplement = totalWorkingDays > 0 ? (isencaoFixedAmount / totalWorkingDays) : 0;
      } else {
        // Percentage method: hourly supplement per day
        dailyIsencaoSupplement = isencaoRate > 0 ? hourlyRate * (isencaoRate / 100) : 0;
      }
      
      return filteredSessions.map(s => {
        let sessionDate;
        if (s.clockIn?.toDate) {
          sessionDate = s.clockIn.toDate();
        } else if (s.clockIn instanceof Date) {
          sessionDate = s.clockIn;
        } else {
          sessionDate = new Date(s.clockIn);
        }
        const dateKey = sessionDate.toISOString().split('T')[0];
        
        // For individual session display, calculate Isenção earnings per day
        // Isenção (IHT) is paid for ALL working days, regardless of whether Isenção hours were worked
        // This is a fixed supplement per working day for being in IHT regime
        let isencaoEarnings = 0;
        if ((isencaoRate > 0 || isencaoFixedAmount > 0) && !isencaoDatesProcessed.has(dateKey)) {
          // Count Isenção earnings once per working day (for any working day, not just days with Isenção hours)
          isencaoEarnings = dailyIsencaoSupplement;
          isencaoDatesProcessed.add(dateKey);
        }
        
        return {
          id: s.id,
          date: sessionDate,
          regularHours: s.regularHours || 0,
          isencaoHours: s.unpaidExtraHours || 0,
          paidExtraHours: s.paidExtraHours || 0,
          isWeekend: s.isWeekend || false,
          isHoliday: s.isBankHoliday || false,
          weekendBonus: s.weekendBonus || 0,
          lunchAmount: s.lunchAmount || 0,
          dinnerAmount: s.hadDinner ? (s.dinnerAmount || 0) : 0,
          baseEarnings: calculateBaseSalary(s.regularHours || 0, hourlyRate),
          isencaoEarnings,
          overtimeEarnings: calculateOvertimeSalary(
            s.paidExtraHours || 0,
            hourlyRate,
            s.isWeekend || false,
            s.isBankHoliday || false,
            {
              overtimeFirstHourRate,
              overtimeSubsequentRate,
              weekendOvertimeRate,
              holidayOvertimeRate
            }
          ),
          mealEarnings: mealAllowanceIncluded ? ((s.lunchAmount || 0) + (s.hadDinner ? (s.dinnerAmount || 0) : 0)) : 0,
          totalEarnings: 0 // Will be calculated below
        };
      }).map(s => ({
        ...s,
        totalEarnings: s.baseEarnings + s.isencaoEarnings + s.overtimeEarnings + s.weekendBonus + s.mealEarnings
      }));
    })()
  };
}

/**
 * Aggregate finance data by time periods for chart display
 * @param {Array} sessions - Array of session objects
 * @param {Object} dateRange - { start: Date, end: Date }
 * @param {string} reportType - 'daily' | 'weekly' | 'monthly' | 'yearly'
 * @param {Object} settings - Finance settings
 * @param {Object} locale - date-fns locale for date formatting
 * @returns {Array} Array of data points with date, grossIncome, netIncome, taxes
 */
export function aggregateFinanceByPeriod(sessions, dateRange, reportType, settings, locale = null) {
  if (!sessions.length) return [];

  const { start, end } = dateRange;
  const dataPoints = [];

  const localeOptions = locale ? { locale } : {};

  let periods = [];

  try {
    switch (reportType) {
      case 'daily':
        // For daily, show each day in the range
        periods = eachDayOfInterval({ start, end }).map(day => ({
          start: startOfDay(day),
          end: endOfDay(day),
          dateObj: day
        }));
        break;
      
      case 'weekly':
        // For weekly, show each week in the range
        periods = eachWeekOfInterval({ start, end }, { weekStartsOn: 1 }).map(week => ({
          start: startOfWeek(week, { weekStartsOn: 1 }),
          end: endOfWeek(week, { weekStartsOn: 1 }),
          dateObj: week
        }));
        break;
      
      case 'monthly':
        // For monthly, show each month in the range
        periods = eachMonthOfInterval({ start, end }).map(month => ({
          start: startOfMonth(month),
          end: endOfMonth(month),
          dateObj: month
        }));
        break;
      
      case 'yearly':
        // For yearly, show each year in the range
        periods = eachYearOfInterval({ start, end }).map(year => ({
          start: startOfYear(year),
          end: endOfYear(year),
          dateObj: year
        }));
        break;
      
      default:
        return [];
    }

    // Calculate finance for each period
    periods.forEach(period => {
      try {
        const periodFinance = calculatePeriodFinance(sessions, period, settings);
        
        // Format date label based on report type
        let dateLabel;
        switch (reportType) {
          case 'daily':
            dateLabel = format(period.dateObj, 'MMM dd, yyyy', localeOptions);
            break;
          case 'weekly':
            dateLabel = format(period.dateObj, 'MMM dd, yyyy', localeOptions);
            break;
          case 'monthly':
            dateLabel = format(period.dateObj, 'MMM yyyy', localeOptions);
            break;
          case 'yearly':
            dateLabel = format(period.dateObj, 'yyyy', localeOptions);
            break;
          default:
            dateLabel = format(period.dateObj, 'MMM dd, yyyy', localeOptions);
        }
        
        // Always add data point, even if periodFinance is null or has zero values
        if (periodFinance) {
          const totalDeductions = periodFinance.deductions.total + (periodFinance.deductions.mealCardDeduction || 0);
          
          dataPoints.push({
            date: dateLabel,
            grossIncome: periodFinance.earnings.grossSalary || 0,
            netIncome: periodFinance.netSalary || 0,
            taxes: totalDeductions || 0
          });
        } else {
          // Add zero values for periods with no sessions
          dataPoints.push({
            date: dateLabel,
            grossIncome: 0,
            netIncome: 0,
            taxes: 0
          });
        }
      } catch (error) {
        console.error('Error calculating finance for period:', error, period);
        // Still add a data point with zero values if there's an error
        let dateLabel;
        try {
          switch (reportType) {
            case 'daily':
              dateLabel = format(period.dateObj, 'MMM dd, yyyy', localeOptions);
              break;
            case 'weekly':
              dateLabel = format(period.dateObj, 'MMM dd, yyyy', localeOptions);
              break;
            case 'monthly':
              dateLabel = format(period.dateObj, 'MMM yyyy', localeOptions);
              break;
            case 'yearly':
              dateLabel = format(period.dateObj, 'yyyy', localeOptions);
              break;
            default:
              dateLabel = format(period.dateObj, 'MMM dd, yyyy', localeOptions);
          }
          dataPoints.push({
            date: dateLabel,
            grossIncome: 0,
            netIncome: 0,
            taxes: 0
          });
        } catch (formatError) {
          console.error('Error formatting date label:', formatError);
        }
      }
    });
  } catch (error) {
    console.error('Error aggregating finance by period:', error);
    return [];
  }

  return dataPoints;
}
