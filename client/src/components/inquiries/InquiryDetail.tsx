import React, { useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Divider,
  Chip,
  Button,
  TextField,
  Grid,
  CircularProgress,
  Alert,
  Avatar,
  Card,
  CardContent,
  FormControlLabel,
  Switch,
  useTheme
} from '@mui/material';
import {
  Person as PersonIcon,
  SmartToy as BotIcon,
  Send as SendIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import useInquiryStore from '@/store/inquiryStore';
import useAuthStore from '@/store/authStore';
import { Inquiry, InquiryStatus, Response } from '@/types';

interface InquiryDetailProps {
  inquiryId: number;
}

const InquiryDetail: React.FC<InquiryDetailProps> = ({ inquiryId }) => {
  const theme = useTheme();
  const [responseText, setResponseText] = useState('');
  const [useAI, setUseAI] = useState(true);
  
  const { user, isAuthenticated } = useAuthStore();
  const { 
    currentInquiry, 
    responses, 
    isLoading, 
    error,
    fetchInquiry, 
    fetchResponses, 
    submitResponse, 
    generateAIResponse,
    updateInquiryStatus
  } = useInquiryStore();
  
  useEffect(() => {
    if (inquiryId) {
      fetchInquiry(inquiryId);
      fetchResponses(inquiryId);
    }
  }, [inquiryId, fetchInquiry, fetchResponses]);
  
  if (isLoading && !currentInquiry) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }
  
  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 3 }}>
        {error}
      </Alert>
    );
  }
  
  if (!currentInquiry) {
    return (
      <Alert severity="info">
        Inquiry not found or still loading...
      </Alert>
    );
  }
  
  const handleSendResponse = async () => {
    if (!responseText.trim()) return;
    
    if (useAI) {
      await generateAIResponse(inquiryId);
    } else {
      await submitResponse({
        content: responseText,
        inquiryId: inquiryId,
        agentId: user?.id,
        isAutomated: false
      });
    }
    
    setResponseText('');
  };
  
  const handleStatusChange = async (newStatus: InquiryStatus) => {
    await updateInquiryStatus(inquiryId, { status: newStatus });
  };
  
  // Get status chip color
  const getStatusColor = (status: InquiryStatus) => {
    switch (status) {
      case InquiryStatus.NEW:
        return 'primary';
      case InquiryStatus.IN_PROGRESS:
        return 'info';
      case InquiryStatus.AWAITING_CUSTOMER:
        return 'warning';
      case InquiryStatus.ESCALATED:
        return 'error';
      case InquiryStatus.RESOLVED:
        return 'success';
      case InquiryStatus.CLOSED:
        return 'default';
      default:
        return 'default';
    }
  };
  
  // Get inquiry type label
  const getInquiryTypeLabel = (type: string) => {
    switch (type) {
      case 'technical':
        return 'Technical';
      case 'billing':
        return 'Billing';
      case 'general':
        return 'General';
      case 'feature_request':
        return 'Feature Request';
      case 'complaint':
        return 'Complaint';
      case 'other':
        return 'Other';
      default:
        return type;
    }
  };
  
  return (
    <Paper elevation={2} sx={{ p: 3, maxWidth: 900, mx: 'auto' }}>
      {/* Inquiry Header */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Typography variant="h5" component="h1">
            {currentInquiry.subject}
          </Typography>
          <Chip 
            label={currentInquiry.status} 
            color={getStatusColor(currentInquiry.status as InquiryStatus)}
            sx={{ textTransform: 'capitalize' }}
          />
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
          <Chip 
            label={getInquiryTypeLabel(currentInquiry.inquiry_type)} 
            variant="outlined" 
            size="small"
          />
          {currentInquiry.escalated && (
            <Chip 
              label="Escalated" 
              color="error" 
              variant="outlined" 
              size="small"
            />
          )}
          <Typography variant="caption" color="text.secondary">
            Created {format(new Date(currentInquiry.created_at), 'MMM d, yyyy h:mm a')}
          </Typography>
        </Box>
        
        <Card variant="outlined" sx={{ mb: 3, bgcolor: theme.palette.background.default }}>
          <CardContent>
            <Typography variant="body1">
              {currentInquiry.content}
            </Typography>
          </CardContent>
        </Card>
        
        {/* Escalation Reason */}
        {currentInquiry.escalated && currentInquiry.escalation_reason && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            <Typography variant="subtitle2">Escalation Reason:</Typography>
            {currentInquiry.escalation_reason}
          </Alert>
        )}
      </Box>
      
      <Divider sx={{ mb: 3 }} />
      
      {/* Responses */}
      <Typography variant="h6" sx={{ mb: 2 }}>
        Responses
      </Typography>
      
      {responses.length === 0 ? (
        <Alert severity="info" sx={{ mb: 3 }}>
          No responses yet.
        </Alert>
      ) : (
        <Box sx={{ mb: 3 }}>
          {responses.map((response) => (
            <Box
              key={response.id}
              sx={{
                display: 'flex',
                mb: 2,
                flexDirection: response.is_automated ? 'row' : 'row-reverse'
              }}
            >
              <Avatar
                sx={{
                  bgcolor: response.is_automated ? theme.palette.info.main : theme.palette.primary.main,
                  mr: response.is_automated ? 2 : 0,
                  ml: response.is_automated ? 0 : 2
                }}
              >
                {response.is_automated ? <BotIcon /> : <PersonIcon />}
              </Avatar>
              
              <Card 
                sx={{ 
                  maxWidth: '80%',
                  bgcolor: response.is_automated ? theme.palette.info.light : theme.palette.primary.light,
                  color: theme.palette.getContrastText(
                    response.is_automated ? theme.palette.info.light : theme.palette.primary.light
                  )
                }}
              >
                <CardContent>
                  <Typography variant="body1">
                    {response.content}
                  </Typography>
                  <Typography variant="caption" sx={{ mt: 1, display: 'block', textAlign: 'right' }}>
                    {format(new Date(response.created_at), 'MMM d, yyyy h:mm a')} - 
                    {response.is_automated ? ' AI Assistant' : ' Human Agent'}
                  </Typography>
                </CardContent>
              </Card>
            </Box>
          ))}
        </Box>
      )}
      
      <Divider sx={{ mb: 3 }} />
      
      {/* Response Input */}
      {currentInquiry.status !== InquiryStatus.CLOSED && isAuthenticated && (
        <Box>
          <Grid container spacing={2} alignItems="center" sx={{ mb: 2 }}>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle1">
                Reply to this inquiry:
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6} sx={{ textAlign: 'right' }}>
              {user?.is_admin && (
                <FormControlLabel
                  control={
                    <Switch
                      checked={useAI}
                      onChange={(e) => setUseAI(e.target.checked)}
                      disabled={currentInquiry.escalated}
                    />
                  }
                  label="Use AI to generate response"
                />
              )}
            </Grid>
          </Grid>
          
          {currentInquiry.escalated && (
            <Alert severity="info" sx={{ mb: 2 }}>
              This inquiry has been escalated and requires a human response.
            </Alert>
          )}
          
          {!useAI && (
            <TextField
              fullWidth
              multiline
              rows={4}
              placeholder="Type your response..."
              value={responseText}
              onChange={(e) => setResponseText(e.target.value)}
              sx={{ mb: 2 }}
            />
          )}
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Box>
              {/* Status change buttons */}
              {user?.is_admin && (
                <Box sx={{ display: 'flex', gap: 1 }}>
                  {currentInquiry.status !== InquiryStatus.RESOLVED && (
                    <Button
                      size="small"
                      variant="outlined"
                      color="success"
                      onClick={() => handleStatusChange(InquiryStatus.RESOLVED)}
                    >
                      Mark Resolved
                    </Button>
                  )}
                  
                  {currentInquiry.status !== InquiryStatus.CLOSED && (
                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      onClick={() => handleStatusChange(InquiryStatus.CLOSED)}
                    >
                      Close Inquiry
                    </Button>
                  )}
                </Box>
              )}
            </Box>
            
            <Button
              variant="contained"
              color="primary"
              endIcon={<SendIcon />}
              onClick={handleSendResponse}
              disabled={isLoading || (!useAI && !responseText.trim())}
            >
              {isLoading ? (
                <CircularProgress size={24} color="inherit" />
              ) : useAI ? (
                'Generate AI Response'
              ) : (
                'Send Response'
              )}
            </Button>
          </Box>
        </Box>
      )}
    </Paper>
  );
};

export default InquiryDetail;