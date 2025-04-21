import React, { useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  useTheme,
  SelectChangeEvent
} from '@mui/material';
import {
  FilterList as FilterIcon,
  Search as SearchIcon,
  Visibility as ViewIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { useRouter } from 'next/router';
import useInquiryStore from '@/store/inquiryStore';
import { Inquiry, InquiryStatus, InquiryType } from '@/types';

interface InquiryListProps {
  filterByStatus?: InquiryStatus;
  filterByEscalated?: boolean;
  title?: string;
}

const InquiryList: React.FC<InquiryListProps> = ({
  filterByStatus,
  filterByEscalated,
  title = 'Inquiries'
}) => {
  const theme = useTheme();
  const router = useRouter();
  const { inquiries, isLoading, error, fetchInquiries } = useInquiryStore();
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>(filterByStatus || 'all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [escalatedFilter, setEscalatedFilter] = useState<string>(
    filterByEscalated !== undefined 
      ? filterByEscalated ? 'yes' : 'no'
      : 'all'
  );
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Apply filters on mount and when filter props change
  useEffect(() => {
    const filters: {
      status?: string;
      escalated?: boolean;
      type?: string;
    } = {};
    
    if (filterByStatus) {
      filters.status = filterByStatus;
      setStatusFilter(filterByStatus);
    }
    
    if (filterByEscalated !== undefined) {
      filters.escalated = filterByEscalated;
      setEscalatedFilter(filterByEscalated ? 'yes' : 'no');
    }
    
    fetchInquiries(filters);
  }, [filterByStatus, filterByEscalated, fetchInquiries]);
  
  // Apply filters when changed by user
  const applyFilters = () => {
    const filters: {
      status?: string;
      escalated?: boolean;
      type?: string;
    } = {};
    
    if (statusFilter !== 'all') {
      filters.status = statusFilter;
    }
    
    if (escalatedFilter !== 'all') {
      filters.escalated = escalatedFilter === 'yes';
    }
    
    if (typeFilter !== 'all') {
      filters.type = typeFilter;
    }
    
    fetchInquiries(filters);
  };
  
  // Handle filter changes
  const handleStatusChange = (event: SelectChangeEvent) => {
    setStatusFilter(event.target.value);
  };
  
  const handleTypeChange = (event: SelectChangeEvent) => {
    setTypeFilter(event.target.value);
  };
  
  const handleEscalatedChange = (event: SelectChangeEvent) => {
    setEscalatedFilter(event.target.value);
  };
  
  // Handle search
  const handleSearch = () => {
    // In a real application, you would implement search functionality
    // This could be a server-side search or a client-side filter
    console.log('Searching for:', searchQuery);
  };
  
  // View inquiry detail
  const handleViewInquiry = (id: number) => {
    router.push(`/inquiries/${id}`);
  };
  
  // Filter inquiries by search query (client-side filtering example)
  const filteredInquiries = inquiries.filter(inquiry => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      inquiry.subject.toLowerCase().includes(query) ||
      inquiry.content.toLowerCase().includes(query)
    );
  });
  
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
    <Paper elevation={2} sx={{ p: 3 }}>
      <Typography variant="h5" component="h1" gutterBottom>
        {title}
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {/* Filters */}
      <Box sx={{ mb: 3, display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel id="status-filter-label">Status</InputLabel>
          <Select
            labelId="status-filter-label"
            id="status-filter"
            value={statusFilter}
            label="Status"
            onChange={handleStatusChange}
          >
            <MenuItem value="all">All</MenuItem>
            <MenuItem value={InquiryStatus.NEW}>New</MenuItem>
            <MenuItem value={InquiryStatus.IN_PROGRESS}>In Progress</MenuItem>
            <MenuItem value={InquiryStatus.AWAITING_CUSTOMER}>Awaiting Customer</MenuItem>
            <MenuItem value={InquiryStatus.ESCALATED}>Escalated</MenuItem>
            <MenuItem value={InquiryStatus.RESOLVED}>Resolved</MenuItem>
            <MenuItem value={InquiryStatus.CLOSED}>Closed</MenuItem>
          </Select>
        </FormControl>
        
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel id="type-filter-label">Type</InputLabel>
          <Select
            labelId="type-filter-label"
            id="type-filter"
            value={typeFilter}
            label="Type"
            onChange={handleTypeChange}
          >
            <MenuItem value="all">All</MenuItem>
            <MenuItem value={InquiryType.TECHNICAL}>Technical</MenuItem>
            <MenuItem value={InquiryType.BILLING}>Billing</MenuItem>
            <MenuItem value={InquiryType.GENERAL}>General</MenuItem>
            <MenuItem value={InquiryType.FEATURE_REQUEST}>Feature Request</MenuItem>
            <MenuItem value={InquiryType.COMPLAINT}>Complaint</MenuItem>
            <MenuItem value={InquiryType.OTHER}>Other</MenuItem>
          </Select>
        </FormControl>
        
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel id="escalated-filter-label">Escalated</InputLabel>
          <Select
            labelId="escalated-filter-label"
            id="escalated-filter"
            value={escalatedFilter}
            label="Escalated"
            onChange={handleEscalatedChange}
          >
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="yes">Yes</MenuItem>
            <MenuItem value="no">No</MenuItem>
          </Select>
        </FormControl>
        
        <Button 
          variant="contained" 
          startIcon={<FilterIcon />}
          onClick={applyFilters}
          size="small"
        >
          Apply Filters
        </Button>
        
        <Box sx={{ flexGrow: 1 }} />
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            size="small"
            placeholder="Search inquiries..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Button 
            variant="outlined" 
            startIcon={<SearchIcon />}
            onClick={handleSearch}
            size="small"
          >
            Search
          </Button>
        </Box>
      </Box>
      
      {/* Inquiries Table */}
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : filteredInquiries.length === 0 ? (
        <Alert severity="info">
          No inquiries found matching the current filters.
        </Alert>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: theme.palette.action.hover }}>
                <TableCell>ID</TableCell>
                <TableCell>Subject</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Created</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredInquiries.map((inquiry) => (
                <TableRow 
                  key={inquiry.id}
                  hover
                  sx={inquiry.escalated ? { bgcolor: 'rgba(255, 0, 0, 0.05)' } : {}}
                >
                  <TableCell>{inquiry.id}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {inquiry.escalated && (
                        <Tooltip title="Escalated">
                          <ErrorIcon color="error" fontSize="small" />
                        </Tooltip>
                      )}
                      {inquiry.subject}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={getInquiryTypeLabel(inquiry.inquiry_type)} 
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={inquiry.status}
                      color={getStatusColor(inquiry.status as InquiryStatus)}
                      size="small"
                      sx={{ textTransform: 'capitalize' }}
                    />
                  </TableCell>
                  <TableCell>
                    {format(new Date(inquiry.created_at), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="View Details">
                      <IconButton 
                        size="small"
                        color="primary" 
                        onClick={() => handleViewInquiry(inquiry.id)}
                      >
                        <ViewIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Paper>
  );
};

export default InquiryList;