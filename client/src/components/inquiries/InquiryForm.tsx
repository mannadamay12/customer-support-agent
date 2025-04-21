import React, { useState } from 'react';
import { 
  Box, 
  TextField, 
  Button, 
  Typography, 
  Paper,
  CircularProgress,
  Alert,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  FormHelperText
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import useInquiryStore from '@/store/inquiryStore';
import useAuthStore from '@/store/authStore';
import { InquiryCreate } from '@/types';

interface InquiryFormProps {
  onSuccess?: (inquiryId: number) => void;
}

const InquiryForm: React.FC<InquiryFormProps> = ({ onSuccess }) => {
  const { user } = useAuthStore();
  const { submitInquiry, isLoading, error, clearError } = useInquiryStore();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  const { control, handleSubmit, reset, formState: { errors } } = useForm<{
    subject: string;
    content: string;
    inquiryType: string;
  }>({
    defaultValues: {
      subject: '',
      content: '',
      inquiryType: 'general'
    }
  });
  
  const onSubmit = async (data: { subject: string; content: string; inquiryType: string }) => {
    clearError();
    setSuccessMessage(null);
    
    const inquiryData: InquiryCreate = {
      subject: data.subject,
      content: data.content,
      customer_id: user?.id
    };
    
    const result = await submitInquiry(inquiryData);
    
    if (result) {
      setSuccessMessage('Your inquiry has been submitted successfully!');
      reset();
      
      if (onSuccess) {
        onSuccess(result.id);
      }
    }
  };
  
  return (
    <Paper elevation={3} sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
      <Typography variant="h5" component="h2" gutterBottom>
        Submit a New Inquiry
      </Typography>
      
      {successMessage && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {successMessage}
        </Alert>
      )}
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <Controller
          name="subject"
          control={control}
          rules={{ required: 'Subject is required' }}
          render={({ field }) => (
            <TextField
              {...field}
              margin="normal"
              required
              fullWidth
              id="subject"
              label="Subject"
              autoFocus
              error={!!errors.subject}
              helperText={errors.subject?.message}
            />
          )}
        />
        
        <Controller
          name="inquiryType"
          control={control}
          rules={{ required: 'Please select an inquiry type' }}
          render={({ field }) => (
            <FormControl fullWidth margin="normal" error={!!errors.inquiryType}>
              <InputLabel id="inquiry-type-label">Inquiry Type</InputLabel>
              <Select
                {...field}
                labelId="inquiry-type-label"
                id="inquiry-type"
                label="Inquiry Type"
              >
                <MenuItem value="technical">Technical Support</MenuItem>
                <MenuItem value="billing">Billing Question</MenuItem>
                <MenuItem value="general">General Information</MenuItem>
                <MenuItem value="feature_request">Feature Request</MenuItem>
                <MenuItem value="complaint">Complaint</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </Select>
              {errors.inquiryType && (
                <FormHelperText>{errors.inquiryType.message}</FormHelperText>
              )}
            </FormControl>
          )}
        />
        
        <Controller
          name="content"
          control={control}
          rules={{ 
            required: 'Message is required',
            minLength: {
              value: 20,
              message: 'Please provide more details (at least 20 characters)'
            }
          }}
          render={({ field }) => (
            <TextField
              {...field}
              margin="normal"
              required
              fullWidth
              id="content"
              label="Message"
              multiline
              rows={6}
              error={!!errors.content}
              helperText={errors.content?.message}
            />
          )}
        />
        
        <Button
          type="submit"
          fullWidth
          variant="contained"
          color="primary"
          sx={{ mt: 3, mb: 2 }}
          disabled={isLoading}
        >
          {isLoading ? (
            <CircularProgress size={24} color="inherit" />
          ) : (
            'Submit Inquiry'
          )}
        </Button>
      </Box>
    </Paper>
  );
};

export default InquiryForm;