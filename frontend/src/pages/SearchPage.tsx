import React, { useState, useEffect, KeyboardEvent, ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  IconButton,
  Tooltip,
  Chip,
  Slider,
  Switch,
  FormControlLabel,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  RadioGroup,
  Radio,
  Select,
  MenuItem,
  SelectChangeEvent,
  ToggleButtonGroup,
  ToggleButton,
  Link,
} from '@mui/material';
import {
  Search as SearchIcon,
  Language as LanguageIcon,
  Email as EmailIcon,
  Save as SaveIcon,
  Phone as PhoneIcon,
  Map as MapIcon,
  ExpandMore as ExpandMoreIcon,
  ViewModule as ViewModuleIcon,
  ViewList as ViewListIcon,
  Download as DownloadIcon,
  LocationOn as LocationOnIcon,
} from '@mui/icons-material';
import * as XLSX from 'xlsx';
import { useNotification } from '../hooks/useNotification';

interface BusinessResult {
  business_name: string;
  address: string;
  distance: number;
  website?: string;
  phone?: string;
  google_maps_url?: string;
  postal_code?: string;
  opening_hours?: string[];
  scraped_emails?: string[];
}

interface SaveLeadDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (listName: string, listId?: string) => void;
  existingLists: Array<{ id: string; name: string; }>;
  multiple?: boolean;
}

const SaveLeadDialog: React.FC<SaveLeadDialogProps> = ({
  open,
  onClose,
  onSave,
  existingLists = [],
  multiple
}) => {
  const [newListName, setNewListName] = useState('');
  const [selectedListId, setSelectedListId] = useState('');
  const [createNew, setCreateNew] = useState(true);

  const handleSave = () => {
    if (createNew) {
      if (!newListName.trim()) {
        return;
      }
      onSave(newListName);
    } else {
      const selectedList = existingLists.find(list => list.id === selectedListId);
      if (selectedList) {
        onSave(selectedList.name, selectedList.id);
      }
    }
  };

  const handleSaveDialogChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isNew = e.target.value === 'new';
    setCreateNew(isNew);
    if (!isNew && existingLists.length > 0) {
      setSelectedListId(existingLists[0].id);
    }
  };

  const handleListSelect = (e: SelectChangeEvent<string>) => {
    setSelectedListId(e.target.value);
  };

  useEffect(() => {
    if (existingLists.length > 0) {
      setSelectedListId(existingLists[0].id);
    }
  }, [existingLists]);

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>{multiple ? 'Save All Leads' : 'Save Lead'}</DialogTitle>
      <DialogContent>
        <FormControl component="fieldset">
          <RadioGroup
            value={createNew ? 'new' : 'existing'}
            onChange={handleSaveDialogChange}
          >
            <FormControlLabel
              value="new"
              control={<Radio />}
              label="Create new list"
            />
            {createNew && (
              <TextField
                autoFocus
                margin="dense"
                label="List Name"
                fullWidth
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                sx={{ ml: 4, width: 'calc(100% - 32px)' }}
              />
            )}
            
            <FormControlLabel
              value="existing"
              control={<Radio />}
              label="Add to existing list"
            />
            {!createNew && (
              <FormControl fullWidth sx={{ ml: 4, width: 'calc(100% - 32px)' }}>
                <Select
                  value={selectedListId}
                  onChange={handleListSelect}
                  displayEmpty
                >
                  {existingLists.map((list) => (
                    <MenuItem key={list.id} value={list.id}>
                      {list.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          </RadioGroup>
        </FormControl>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          onClick={handleSave}
          disabled={createNew ? !newListName.trim() : !selectedListId}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const SearchPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [locationInput, setLocationInput] = useState<string>('');
  const [locations, setLocations] = useState<string[]>([]);
  const [radius, setRadius] = useState<number>(5);
  const [exactPincodeSearch, setExactPincodeSearch] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<BusinessResult[]>([]);
  const [displayedResults, setDisplayedResults] = useState<BusinessResult[]>([]);
  const [showingAllResults, setShowingAllResults] = useState<boolean>(false);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isScrapingAll, setIsScrapingAll] = useState<boolean>(false);
  const [selectedBusiness, setSelectedBusiness] = useState<BusinessResult | null>(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState<boolean>(false);
  const [saveAllDialogOpen, setSaveAllDialogOpen] = useState<boolean>(false);
  const [savedLists, setSavedLists] = useState<Array<{ id: string; name: string; }>>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const resultsPerPage = 20;
  const navigate = useNavigate();
  const { showNotification } = useNotification();

  const handleLocationKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && locationInput.trim()) {
      event.preventDefault();
      setLocations([...locations, locationInput.trim()]);
      setLocationInput('');
    }
  };

  const handleDeleteLocation = (locationToDelete: string) => {
    setLocations(locations.filter(location => location !== locationToDelete));
  };

  const handleSearch = async () => {
    if (!searchTerm || locations.length === 0) {
      showNotification('Please enter search term and at least one location', 'warning');
      return;
    }

    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('query', searchTerm);
      queryParams.append('locations', JSON.stringify(locations));
      queryParams.append('radius', (radius * 1000).toString());
      queryParams.append('exactPincodeSearch', exactPincodeSearch.toString());

      const response = await fetch(`/api/search?${queryParams.toString()}`);
      if (!response.ok) throw new Error('Search failed');

      const data = await response.json();
      setSearchResults(data.results);
      setNextPageToken(data.next_page_token);
      setDisplayedResults(data.results);
      
      if (data.results.length === 0) {
        showNotification('No results found', 'info');
      } else {
        showNotification(`Found ${data.results.length} results`, 'success');
      }
    } catch (error) {
      console.error('Error searching:', error);
      showNotification('Failed to search businesses', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleScrapeEmails = async (business: BusinessResult) => {
    if (!business.website) return;

    try {
      const response = await fetch('/api/scrape-emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ website: business.website }),
      });

      if (!response.ok) {
        throw new Error('Failed to scrape emails');
      }

      const data = await response.json();
      const updatedResults = searchResults.map(b => {
        if (b === business) {
          return { ...b, scraped_emails: data.emails };
        }
        return b;
      });
      setSearchResults(updatedResults);
      setDisplayedResults(updatedResults.slice(0, displayedResults.length));
      showNotification('Emails scraped successfully', 'success');
    } catch (error) {
      console.error('Error scraping emails:', error);
      showNotification('Failed to scrape emails', 'error');
    }
  };

  const handleSaveClick = (business: BusinessResult) => {
    setSelectedBusiness(business);
    setSaveDialogOpen(true);
  };

  const handleSaveLead = async (listName: string, listId?: string) => {
    if (!selectedBusiness) return;

    try {
      const endpoint = listId ? `/api/lists/${listId}/leads` : '/api/lists';
      const method = listId ? 'PUT' : 'POST';
      const body = listId 
        ? { leads: [selectedBusiness] }
        : { name: listName, leads: [selectedBusiness] };

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) throw new Error('Failed to save lead');

      showNotification('Lead saved successfully', 'success');
      setSaveDialogOpen(false);
      setSelectedBusiness(null);
    } catch (error) {
      console.error('Error saving lead:', error);
      showNotification('Failed to save lead', 'error');
    }
  };

  const handleSaveAllLeads = async (listName: string, listId?: string) => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/save-business', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          list_name: listName,
          businesses: searchResults
        })
      });

      if (!response.ok) throw new Error('Failed to save leads');

      showNotification('All leads saved successfully', 'success');
      setSaveAllDialogOpen(false);
      
      // Refresh the lists after saving
      const listsResponse = await fetch('/api/lists');
      if (listsResponse.ok) {
        const lists = await listsResponse.json();
        setSavedLists(lists);
      }
    } catch (error) {
      console.error('Error saving leads:', error);
      showNotification('Failed to save leads', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadMore = async () => {
    if (!nextPageToken || isLoadingMore) return;
    
    setIsLoadingMore(true);
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('query', searchTerm);
      queryParams.append('locations', JSON.stringify(locations));
      queryParams.append('radius', (radius * 1000).toString());
      queryParams.append('exactPincodeSearch', exactPincodeSearch.toString());
      queryParams.append('pageToken', nextPageToken);

      const response = await fetch(`/api/search?${queryParams.toString()}`);
      if (!response.ok) throw new Error('Failed to load more results');

      const data = await response.json();
      const newResults = [...searchResults, ...data.results];
      setSearchResults(newResults);
      setNextPageToken(data.next_page_token);
      setDisplayedResults(newResults);
      
      if (data.results.length === 0) {
        showNotification('No more results found', 'info');
      } else {
        showNotification(`Loaded ${data.results.length} more results`, 'success');
      }
    } catch (error) {
      console.error('Error loading more results:', error);
      showNotification('Failed to load more results', 'error');
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleShowMore = () => {
    const currentLength = displayedResults.length;
    setDisplayedResults(searchResults.slice(0, currentLength + resultsPerPage));
    if (currentLength + resultsPerPage >= searchResults.length) {
      setShowingAllResults(true);
    }
  };

  const handleScrapeAllEmails = async () => {
    setIsScrapingAll(true);
    let totalEmails = 0;
    
    try {
      for (const business of searchResults) {
        if (business.website) {
          try {
            const response = await fetch('/api/scrape-email', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ website: business.website }),
            });
            
            const data = await response.json();
            if (data.success && data.emails.length > 0) {
              totalEmails += data.emails.length;
              business.scraped_emails = data.emails;
              setSearchResults([...searchResults]);
            }
          } catch (error) {
            console.error('Error scraping emails:', error);
          }
        }
      }
      
      if (totalEmails > 0) {
        showNotification(`Found ${totalEmails} new email(s)!`, 'success');
      } else {
        showNotification('No new emails found', 'info');
      }
    } catch (error) {
      console.error('Error in scrape all:', error);
      showNotification('Error scraping emails', 'error');
    } finally {
      setIsScrapingAll(false);
    }
  };

  const handleDownloadExcel = () => {
    try {
      // Prepare the data
      const excelData = searchResults.map(business => ({
        'Business Name': business.business_name,
        'Address': business.address,
        'Postal Code': business.postal_code || '',
        'Distance (km)': business.distance,
        'Phone': business.phone || '',
        'Website': business.website || '',
        'Emails': business.scraped_emails?.join(', ') || ''
      }));

      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Business Leads');

      // Save file
      XLSX.writeFile(wb, `business_leads_${new Date().toISOString().split('T')[0]}.xlsx`);
      showNotification('Excel file downloaded successfully', 'success');
    } catch (error) {
      console.error('Error generating Excel file:', error);
      showNotification('Error generating Excel file', 'error');
    }
  };

  useEffect(() => {
    setDisplayedResults(searchResults.slice(0, resultsPerPage));
    setShowingAllResults(false);
  }, [searchResults]);

  // Fetch saved lists on component mount
  useEffect(() => {
    const fetchSavedLists = async () => {
      try {
        const response = await fetch('/api/lists');
        if (!response.ok) throw new Error('Failed to fetch lists');
        const lists = await response.json();
        setSavedLists(lists);
      } catch (error) {
        console.error('Error fetching saved lists:', error);
        showNotification('Failed to fetch saved lists', 'error');
      }
    };
    fetchSavedLists();
  }, []);

  return (
    <Box sx={{ width: '100%', p: 3 }}>
      <Box sx={{ maxWidth: '100%', mx: 'auto' }}>
        {/* Search Section */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold' }}>
            Business Search
            <Typography variant="subtitle1" sx={{ mt: 1, color: 'text.secondary' }}>
              Find and connect with businesses in your target locations
            </Typography>
          </Typography>

          <Paper sx={{ p: 3, mt: 3 }}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Search Term"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Enter business type or category"
                  variant="outlined"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Location"
                  value={locationInput}
                  onChange={(e) => setLocationInput(e.target.value)}
                  onKeyDown={handleLocationKeyDown}
                  placeholder="Enter location or pincode and press Enter"
                  variant="outlined"
                />
                <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {locations.map((location, index) => (
                    <Chip
                      key={index}
                      label={location}
                      onDelete={() => handleDeleteLocation(location)}
                      sx={{ m: 0.5 }}
                    />
                  ))}
                </Box>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={exactPincodeSearch}
                      onChange={(e) => setExactPincodeSearch(e.target.checked)}
                    />
                  }
                  label="Exact Pincode Search"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Box sx={{ 
                  px: 2, 
                  opacity: exactPincodeSearch ? 0.5 : 1, 
                  pointerEvents: exactPincodeSearch ? 'none' : 'auto' 
                }}>
                  <Typography gutterBottom>Search Radius: {radius} km</Typography>
                  <Slider
                    value={radius}
                    onChange={(_, value) => setRadius(value as number)}
                    min={1}
                    max={50}
                    disabled={exactPincodeSearch}
                  />
                </Box>
              </Grid>
              <Grid item xs={12}>
                <Button
                  variant="contained"
                  onClick={handleSearch}
                  disabled={isLoading || !searchTerm || locations.length === 0}
                  startIcon={isLoading ? <CircularProgress size={20} /> : <SearchIcon />}
                  sx={{ px: 4, py: 1 }}
                >
                  Search
                </Button>
              </Grid>
            </Grid>
          </Paper>
        </Box>

        {/* Results Section */}
        {searchResults.length > 0 && (
          <Box sx={{ mt: 4 }}>
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              mb: 3 
            }}>
              <Typography variant="h6">
                Search Results ({searchResults.length})
              </Typography>
              <ToggleButtonGroup
                value={viewMode}
                exclusive
                onChange={(_, newMode) => newMode && setViewMode(newMode)}
                size="small"
              >
                <ToggleButton value="grid">
                  <ViewModuleIcon />
                </ToggleButton>
                <ToggleButton value="list">
                  <ViewListIcon />
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>

            {viewMode === 'grid' ? (
              <Grid container spacing={3}>
                {displayedResults.map((business, index) => (
                  <Grid item xs={12} sm={6} md={4} key={index}>
                    <Card sx={{ 
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      transition: 'all 0.2s ease-in-out',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: 6,
                      }
                    }}>
                      <CardContent sx={{ flexGrow: 1 }}>
                        <Typography variant="h6" gutterBottom>
                          {business.business_name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" paragraph>
                          {business.address}
                        </Typography>
                        {business.distance && (
                          <Typography variant="body2" color="text.secondary">
                            Distance: {business.distance.toFixed(2)} km
                          </Typography>
                        )}
                      </CardContent>
                      <CardActions sx={{ justifyContent: 'flex-end', p: 2 }}>
                        {business.website && (
                          <Tooltip title="Visit Website">
                            <IconButton 
                              href={business.website} 
                              target="_blank"
                              size="small"
                            >
                              <LanguageIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                        {business.phone && (
                          <Tooltip title={business.phone}>
                            <IconButton size="small">
                              <PhoneIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                        {business.google_maps_url && (
                          <Tooltip title="View on Google Maps">
                            <IconButton 
                              href={business.google_maps_url} 
                              target="_blank"
                              size="small"
                            >
                              <MapIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title="Save Lead">
                          <IconButton
                            onClick={() => handleSaveClick(business)}
                            size="small"
                          >
                            <SaveIcon />
                          </IconButton>
                        </Tooltip>
                      </CardActions>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            ) : (
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Business Name</TableCell>
                      <TableCell>Address</TableCell>
                      <TableCell>Distance</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {displayedResults.map((business, index) => (
                      <TableRow 
                        key={index}
                        sx={{
                          transition: 'background-color 0.2s ease-in-out',
                          '&:hover': {
                            backgroundColor: 'rgba(0, 0, 0, 0.04)',
                          }
                        }}
                      >
                        <TableCell>{business.business_name}</TableCell>
                        <TableCell>{business.address}</TableCell>
                        <TableCell>{business.distance?.toFixed(2)} km</TableCell>
                        <TableCell align="right">
                          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                            {business.website && (
                              <Tooltip title="Visit Website">
                                <IconButton 
                                  href={business.website} 
                                  target="_blank"
                                  size="small"
                                >
                                  <LanguageIcon />
                                </IconButton>
                              </Tooltip>
                            )}
                            {business.phone && (
                              <Tooltip title={business.phone}>
                                <IconButton size="small">
                                  <PhoneIcon />
                                </IconButton>
                              </Tooltip>
                            )}
                            {business.google_maps_url && (
                              <Tooltip title="View on Google Maps">
                                <IconButton 
                                  href={business.google_maps_url} 
                                  target="_blank"
                                  size="small"
                                >
                                  <MapIcon />
                                </IconButton>
                              </Tooltip>
                            )}
                            <Tooltip title="Save Lead">
                              <IconButton
                                onClick={() => handleSaveClick(business)}
                                size="small"
                              >
                                <SaveIcon />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            {nextPageToken && !showingAllResults && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                <Button
                  variant="outlined"
                  onClick={handleLoadMore}
                  disabled={isLoadingMore}
                  startIcon={isLoadingMore ? <CircularProgress size={20} /> : null}
                >
                  Load More Results
                </Button>
              </Box>
            )}
          </Box>
        )}

        <SaveLeadDialog
          open={saveDialogOpen}
          onClose={() => setSaveDialogOpen(false)}
          onSave={handleSaveLead}
          existingLists={savedLists}
        />
      </Box>
    </Box>
  );
};

export default SearchPage;
