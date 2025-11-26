import React, { useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { AdapterLuxon } from '@mui/x-date-pickers/AdapterLuxon';
import { DateTime } from 'luxon';
import { mjdToDateTime, dateTimeToMJD } from '../../utils/timeConversion';

interface TimePickerDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (mjd: number) => void;
  initialMJD: number;
  title: string;
}

export const TimePickerDialog: React.FC<TimePickerDialogProps> = ({
  open,
  onClose,
  onSave,
  initialMJD,
  title
}) => {
  const [selectedDate, setSelectedDate] = React.useState<DateTime | null>(
    mjdToDateTime(initialMJD)
  );

  // Update selected date when initialMJD changes
  useEffect(() => {
    if (open) {
      setSelectedDate(mjdToDateTime(initialMJD));
    }
  }, [initialMJD, open]);

  const handleSave = () => {
    if (selectedDate && selectedDate.isValid) {
      onSave(dateTimeToMJD(selectedDate));
      onClose();
    }
  };

  const handleCancel = () => {
    setSelectedDate(mjdToDateTime(initialMJD));
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleCancel} maxWidth="xs" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <DateTimePicker
          value={selectedDate}
          onChange={(newValue) => setSelectedDate(newValue)}
          views={['year', 'month', 'day', 'hours', 'minutes', 'seconds']}
          format="yyyy-MM-dd HH:mm:ss"
          ampm={false}
          sx={{ mt: 2, width: '100%' }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCancel}>Cancel</Button>
        <Button 
          onClick={handleSave} 
          variant="contained" 
          color="primary"
          disabled={!selectedDate?.isValid}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}; 