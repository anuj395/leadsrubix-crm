import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface CalendarDatePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectDate: (dateStr: string) => void;
  currentValue?: string;
  title?: string;
  includeTime?: boolean;
}

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const DAYS_OF_WEEK = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const QUICK_TIMES = [
  '10:00 AM',
  '11:30 AM',
  '01:00 PM',
  '02:30 PM',
  '04:00 PM',
  '05:30 PM',
  '07:00 PM',
];

export const CalendarDatePickerModal: React.FC<CalendarDatePickerModalProps> = ({
  visible,
  onClose,
  onSelectDate,
  currentValue,
  title = 'Select Date',
  includeTime = false,
}) => {
  const initialDate = useMemo(() => {
    if (currentValue) {
      const parsed = new Date(currentValue);
      if (!isNaN(parsed.getTime())) return parsed;
    }
    return new Date();
  }, [currentValue, visible]);

  const [currentYear, setCurrentYear] = useState<number>(initialDate.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(initialDate.getMonth());
  const [selectedDate, setSelectedDate] = useState<Date>(initialDate);
  const [selectedTime, setSelectedTime] = useState<string>('10:00 AM');

  // Days in month calculation
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
    const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();
    const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate();

    const days: Array<{
      day: number;
      month: number;
      year: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      isSelected: boolean;
    }> = [];

    const today = new Date();

    // Previous month padding
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const m = currentMonth === 0 ? 11 : currentMonth - 1;
      const y = currentMonth === 0 ? currentYear - 1 : currentYear;
      days.push({
        day: d,
        month: m,
        year: y,
        isCurrentMonth: false,
        isToday:
          today.getDate() === d &&
          today.getMonth() === m &&
          today.getFullYear() === y,
        isSelected:
          selectedDate.getDate() === d &&
          selectedDate.getMonth() === m &&
          selectedDate.getFullYear() === y,
      });
    }

    // Current month days
    for (let i = 1; i <= totalDays; i++) {
      days.push({
        day: i,
        month: currentMonth,
        year: currentYear,
        isCurrentMonth: true,
        isToday:
          today.getDate() === i &&
          today.getMonth() === currentMonth &&
          today.getFullYear() === currentYear,
        isSelected:
          selectedDate.getDate() === i &&
          selectedDate.getMonth() === currentMonth &&
          selectedDate.getFullYear() === currentYear,
      });
    }

    // Next month padding (total cells to 35 or 42)
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const m = currentMonth === 11 ? 0 : currentMonth + 1;
      const y = currentMonth === 11 ? currentYear + 1 : currentYear;
      days.push({
        day: i,
        month: m,
        year: y,
        isCurrentMonth: false,
        isToday:
          today.getDate() === i &&
          today.getMonth() === m &&
          today.getFullYear() === y,
        isSelected:
          selectedDate.getDate() === i &&
          selectedDate.getMonth() === m &&
          selectedDate.getFullYear() === y,
      });
    }

    return days;
  }, [currentYear, currentMonth, selectedDate]);

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((prev) => prev - 1);
    } else {
      setCurrentMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((prev) => prev + 1);
    } else {
      setCurrentMonth((prev) => prev + 1);
    }
  };

  const handleSelectDay = (dayObj: (typeof calendarDays)[0]) => {
    const newDate = new Date(dayObj.year, dayObj.month, dayObj.day);
    setSelectedDate(newDate);
    if (dayObj.month !== currentMonth) {
      setCurrentMonth(dayObj.month);
      setCurrentYear(dayObj.year);
    }
  };

  const applyPreset = (daysOffset: number) => {
    const target = new Date();
    target.setDate(target.getDate() + daysOffset);
    setSelectedDate(target);
    setCurrentMonth(target.getMonth());
    setCurrentYear(target.getFullYear());
  };

  const handleConfirm = () => {
    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const day = String(selectedDate.getDate()).padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}`;

    if (includeTime) {
      onSelectDate(`${formattedDate}, ${selectedTime}`);
    } else {
      onSelectDate(formattedDate);
    }
    onClose();
  };

  const formattedSelectedHeader = useMemo(() => {
    const monthsShort = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    return `${selectedDate.getDate()} ${monthsShort[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`;
  }, [selectedDate]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={styles.modalBottomSheet}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.modalTitle}>{title}</Text>
              <Text style={styles.selectedDateBadge}>
                {formattedSelectedHeader} {includeTime ? `• ${selectedTime}` : ''}
              </Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Quick Shortcuts */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.presetsRow}
          >
            <TouchableOpacity
              style={styles.presetChip}
              onPress={() => applyPreset(0)}
            >
              <Text style={styles.presetChipText}>Today</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.presetChip}
              onPress={() => applyPreset(1)}
            >
              <Text style={styles.presetChipText}>Tomorrow</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.presetChip}
              onPress={() => applyPreset(3)}
            >
              <Text style={styles.presetChipText}>In 3 Days</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.presetChip}
              onPress={() => applyPreset(7)}
            >
              <Text style={styles.presetChipText}>Next Week</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.presetChip}
              onPress={() => applyPreset(15)}
            >
              <Text style={styles.presetChipText}>In 15 Days</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.presetChip}
              onPress={() => applyPreset(30)}
            >
              <Text style={styles.presetChipText}>In 1 Month</Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Month & Year Bar */}
          <View style={styles.monthNavRow}>
            <TouchableOpacity
              style={styles.monthNavBtn}
              onPress={handlePrevMonth}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-back" size={18} color="#1E293B" />
            </TouchableOpacity>
            <Text style={styles.monthYearText}>
              {MONTHS[currentMonth]} {currentYear}
            </Text>
            <TouchableOpacity
              style={styles.monthNavBtn}
              onPress={handleNextMonth}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-forward" size={18} color="#1E293B" />
            </TouchableOpacity>
          </View>

          {/* Day of Week Headers */}
          <View style={styles.daysOfWeekRow}>
            {DAYS_OF_WEEK.map((d, idx) => (
              <Text
                key={d}
                style={[
                  styles.dayOfWeekText,
                  idx === 0 && { color: '#EF4444' }, // Sunday in red
                ]}
              >
                {d}
              </Text>
            ))}
          </View>

          {/* Calendar Grid */}
          <View style={styles.calendarGrid}>
            {calendarDays.map((item, idx) => {
              return (
                <TouchableOpacity
                  key={`${item.year}_${item.month}_${item.day}_${idx}`}
                  style={[
                    styles.dayCell,
                    item.isSelected && styles.dayCellSelected,
                    item.isToday && !item.isSelected && styles.dayCellToday,
                  ]}
                  onPress={() => handleSelectDay(item)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.dayCellText,
                      !item.isCurrentMonth && styles.dayCellTextDim,
                      item.isSelected && styles.dayCellTextSelected,
                      item.isToday && !item.isSelected && styles.dayCellTextToday,
                    ]}
                  >
                    {item.day}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Time Picker Bar (if includeTime is true) */}
          {includeTime && (
            <View style={styles.timeSection}>
              <Text style={styles.timeSectionLabel}>SELECT TIME</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.timeChipsRow}
              >
                {QUICK_TIMES.map((t) => {
                  const isTimeSelected = selectedTime === t;
                  return (
                    <TouchableOpacity
                      key={t}
                      style={[
                        styles.timeChip,
                        isTimeSelected && styles.timeChipSelected,
                      ]}
                      onPress={() => setSelectedTime(t)}
                    >
                      <Text
                        style={[
                          styles.timeChipText,
                          isTimeSelected && styles.timeChipTextSelected,
                        ]}
                      >
                        {t}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Bottom Action Buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.confirmBtn}
              onPress={handleConfirm}
              activeOpacity={0.88}
            >
              <Ionicons
                name="checkmark-circle-sharp"
                size={18}
                color="#FFFFFF"
              />
              <Text style={styles.confirmBtnText}>Apply Date</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
  },
  modalBackdrop: {
    flex: 1,
  },
  modalBottomSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 38 : 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  selectedDateBadge: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284C7',
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 12,
    marginBottom: 6,
  },
  presetChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  presetChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  monthNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  monthNavBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  monthYearText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  daysOfWeekRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  dayOfWeekText: {
    width: 38,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    marginBottom: 14,
  },
  dayCell: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 3,
  },
  dayCellSelected: {
    backgroundColor: '#272944',
    shadowColor: '#272944',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  dayCellToday: {
    borderWidth: 1.5,
    borderColor: '#0284C7',
    backgroundColor: '#EFF6FF',
  },
  dayCellText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#1E293B',
  },
  dayCellTextDim: {
    color: '#CBD5E1',
    fontWeight: '400',
  },
  dayCellTextSelected: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  dayCellTextToday: {
    color: '#0284C7',
    fontWeight: '800',
  },
  timeSection: {
    marginTop: 4,
    marginBottom: 14,
  },
  timeSectionLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#64748B',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  timeChipsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  timeChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  timeChipSelected: {
    backgroundColor: '#0284C7',
    borderColor: '#0284C7',
  },
  timeChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  timeChipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 6,
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  confirmBtn: {
    flex: 2,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#272944',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#272944',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmBtnText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
