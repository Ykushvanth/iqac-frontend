import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './index.css';
const SERVER_URL = process.env.REACT_APP_SERVER_URL || "https://iqac-backend-1.onrender.com";

const Analysis = () => {
    const navigate = useNavigate();
    const [filters, setFilters] = useState({
        degree: '',
        department: '',
        course: ''
    });
    
    const [options, setOptions] = useState({
        degrees: [],
        departments: [],
        courses: []
    });

    const [reportFormat, setReportFormat] = useState('excel');
    const [faculty, setFaculty] = useState([]);
    const [staffIdSearch, setStaffIdSearch] = useState('');
    const [loadingAnalysis, setLoadingAnalysis] = useState(false);
    const [loadingDeptReport, setLoadingDeptReport] = useState(false);
    const [selectedBatch, setSelectedBatch] = useState('all'); // For batch filtering in reports

    const handleLogout = () => {
        localStorage.removeItem('user');
        navigate('/login');
    };

    const getInitials = (fullName) => {
        if (!fullName || typeof fullName !== 'string') return '?';
        const parts = fullName.trim().split(/\s+/);
        const first = parts[0]?.[0] || '';
        const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
        const initials = (first + last).toUpperCase();
        return initials || '?';
    };

    const handleGenerateDepartmentReport = async () => {
        if (!filters.degree || !filters.department) {
            alert('Please select Degree and Department.');
            return;
        }
        
        if (selectedBatch === 'all') {
            // Generate report for all batches
            handleGenerateDepartmentAllBatches();
            return;
        }
        
        try {
            setLoadingDeptReport(true);
            const resp = await fetch(`${SERVER_URL}/api/reports/generate-department-report`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    degree: filters.degree,
                    dept: filters.department,
                    batch: selectedBatch,
                    format: reportFormat
                })
            });
            if (!resp.ok) {
                const msg = await resp.text();
                throw new Error(msg || 'Failed to generate department report');
            }
            const blob = await resp.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const fileExtension = reportFormat === 'pdf' ? 'pdf' : 'xlsx';
            a.download = `department_feedback_${filters.department}_${selectedBatch}.${fileExtension}`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (e) {
            console.error('Department report error:', e);
            alert('Error generating department report.');
        } finally {
            setLoadingDeptReport(false);
        }
    };

    const handleGenerateDepartmentAllBatches = async () => {
        if (!filters.degree || !filters.department) {
            alert('Please select Degree and Department.');
            return;
        }
        try {
            setLoadingDeptReport(true);
            const resp = await fetch(`${SERVER_URL}/api/reports/generate-department-report-all-batches`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    degree: filters.degree,
                    dept: filters.department,
                    format: reportFormat
                })
            });
            if (!resp.ok) {
                const msg = await resp.text();
                throw new Error(msg || 'Failed to generate department report (all batches)');
            }
            const blob = await resp.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const fileExtension = reportFormat === 'pdf' ? 'pdf' : 'xlsx';
            a.download = `department_feedback_${filters.department}_ALL_BATCHES.${fileExtension}`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (e) {
            console.error('Department all-batches report error:', e);
            alert('Error generating department report (all batches).');
        } finally {
            setLoadingDeptReport(false);
        }
    };

    // Fetch initial degree options and restore state
    useEffect(() => {
        fetchDegrees();
        
        // Restore previous state if returning from results page
        const savedFilters = sessionStorage.getItem('analysisFilters');
        const savedFaculty = sessionStorage.getItem('savedFaculty');
        const savedStaffIdSearch = sessionStorage.getItem('savedStaffIdSearch');
        
        if (savedFilters) {
            try {
                const filters = JSON.parse(savedFilters);
                setFilters(filters);
                
                // Restore faculty data if available
                if (savedFaculty) {
                    const faculty = JSON.parse(savedFaculty);
                    setFaculty(faculty);
                }
                
                // Restore staff ID search if available
                if (savedStaffIdSearch) {
                    setStaffIdSearch(savedStaffIdSearch);
                }
                
                // Clear saved data after restoring
                sessionStorage.removeItem('analysisFilters');
                sessionStorage.removeItem('savedFaculty');
                sessionStorage.removeItem('savedStaffIdSearch');
            } catch (error) {
                console.error('Error restoring analysis state:', error);
            }
        }
    }, []);

    // Fetch departments when degree changes
    useEffect(() => {
        if (filters.degree) {
            fetchDepartments(filters.degree);
        }
    }, [filters.degree]);

    // Fetch courses when department changes
    useEffect(() => {
        if (filters.department) {
            fetchCourses(filters.degree, filters.department);
        }
    }, [filters.department]);

    // Fetch faculty when course or staffIdSearch changes
    useEffect(() => {
        if (filters.course) {
            fetchFaculty(filters.degree, filters.department, filters.course, staffIdSearch);
        } else {
            setFaculty([]);
        }
    }, [filters.course, staffIdSearch]);

    const fetchDegrees = async () => {
        try {
            console.log('Fetching degrees...');
            const response = await fetch(`${SERVER_URL}/api/analysis/degrees`);
            const data = await response.json();
            console.log('Degrees received:', data);
            if (Array.isArray(data)) {
                setOptions(prev => ({ ...prev, degrees: data }));
            } else {
                console.error('Invalid degrees data:', data);
            }
        } catch (error) {
            console.error('Error fetching degrees:', error);
        }
    };

    const fetchDepartments = async (degree) => {
        try {
            const response = await fetch(`${SERVER_URL}/api/analysis/departments?degree=${degree}`);
            const data = await response.json();
            setOptions(prev => ({ ...prev, departments: data }));
        } catch (error) {
            console.error('Error fetching departments:', error);
        }
    };

    const fetchCourses = async (degree, department) => {
        try {
            const response = await fetch(
                `${SERVER_URL}/api/analysis/courses?degree=${degree}&dept=${department}`
            );
            const data = await response.json();
            setOptions(prev => ({ ...prev, courses: data }));
        } catch (error) {
            console.error('Error fetching courses:', error);
        }
    };

    const fetchFaculty = async (degree, department, course, staffId) => {
        try {
            const params = new URLSearchParams({ degree, dept: department, course });
            if (staffId && staffId.trim() !== '') {
                params.append('staffId', staffId.trim());
            }
            const response = await fetch(`${SERVER_URL}/api/analysis/faculty?${params.toString()}`);
            const data = await response.json();
            if (Array.isArray(data)) setFaculty(data);
            else setFaculty([]);
        } catch (error) {
            console.error('Error fetching faculty:', error);
            setFaculty([]);
        }
    };
    
    const handleFacultyCardClick = async (facultyData) => {
        setLoadingAnalysis(true);
        
        try {
            // Save current state before navigating
            sessionStorage.setItem('analysisFilters', JSON.stringify(filters));
            sessionStorage.setItem('savedFaculty', JSON.stringify(faculty));
            sessionStorage.setItem('savedStaffIdSearch', staffIdSearch);
            
            // For each batch this faculty teaches, we'll get the analysis
            // But for now, let's get the first batch or combined analysis
            const batchToUse = facultyData.batches && facultyData.batches.length > 0 
                ? facultyData.batches[0] 
                : null;
            
            if (!batchToUse) {
                alert('No batch information available for this faculty');
                setLoadingAnalysis(false);
                return;
            }
            
            const params = new URLSearchParams({
                degree: filters.degree,
                dept: filters.department,
                batch: batchToUse,
                course: filters.course,
                staffId: facultyData.staff_id || facultyData.staffid || ''
            });
            
            const response = await fetch(`${SERVER_URL}/api/analysis/feedback?${params.toString()}`);
            const data = await response.json();
            
            if (data.success) {
                // Store analysis data and faculty data for the results page
                sessionStorage.setItem('analysisResults', JSON.stringify(data));
                sessionStorage.setItem('facultyData', JSON.stringify(facultyData));
                
                // Navigate to analysis results page
                navigate('/analysis-results');
            } else {
                console.error('Analysis failed:', data.message);
                alert('Failed to fetch analysis data: ' + (data.message || 'Unknown error'));
            }
        } catch (error) {
            console.error('Error fetching analysis:', error);
            alert('Error fetching analysis data. Please try again.');
        } finally {
            setLoadingAnalysis(false);
        }
    };

    // Get available batches for batch filter dropdown
    const getAvailableBatches = () => {
        if (!filters.course) return [];
        
        const selectedCourse = options.courses.find(c => c.code === filters.course);
        if (!selectedCourse || !selectedCourse.batches) return [];
        
        return ['all', ...selectedCourse.batches];
    };

    return (
        <div className="analysis-container">
            <header className="header">
                <div className="logo-container">
                    <img 
                        src="https://www.kalasalingam.ac.in/wp-content/uploads/2022/02/Logo.png" 
                        alt="Kalasalingam Logo" 
                        className="logo" 
                    />
                    <div className="header-text">
                        <h1>Office of IQAC, KARE</h1>
                        <p>Internal Quality Assurance Compliance</p>
                    </div>
                </div>
                <div className="header-actions">
                    <button className="home-btn" onClick={() => navigate('/')}>
                        <span>🏠</span> Home
                    </button>
                    <button className="logout-btn" onClick={handleLogout}>
                        <span>🚪</span> Logout
                    </button>
                </div>
            </header>

            <main className="main-content">
                <h1 className="portal-title">Student Feedback Analysis Portal</h1>
                <h2 className="institution">Kalasalingam Academy of Research and Education</h2>
                <p className="portal-description">
                    Use the filters below to analyze student feedback by degree, department, and course.
                </p>

                <div className="filters-section">
                    <div className="filter-group">
                        <label>Degree</label>
                        <select 
                            value={filters.degree}
                            onChange={(e) => setFilters({ 
                                ...filters, 
                                degree: e.target.value,
                                department: '',
                                course: ''
                            })}
                        >
                            <option value="">Select Degree</option>
                            {options.degrees.map(degree => (
                                <option key={degree} value={degree}>{degree}</option>
                            ))}
                        </select>
                    </div>

                    <div className="filter-group">
                        <label>Department</label>
                        <select 
                            value={filters.department}
                            onChange={(e) => setFilters({
                                ...filters,
                                department: e.target.value,
                                course: ''
                            })}
                            disabled={!filters.degree}
                        >
                            <option value="">Select Department</option>
                            {options.departments.map(dept => (
                                <option key={dept} value={dept}>{dept}</option>
                            ))}
                        </select>
                    </div>

                    <div className="filter-group">
                        <label>Course</label>
                        <select 
                            value={filters.course}
                            onChange={(e) => setFilters({
                                ...filters,
                                course: e.target.value
                            })}
                            disabled={!filters.department}
                        >
                            <option value="">Select Course</option>
                            {options.courses.map(course => (
                                <option key={course.code} value={course.code}>
                                    {course.code} - {course.name} (Batches: {course.batches.join(', ')})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="dept-report-actions">
                        <div className="format-selection">
                            <label>Report Format:</label>
                            <div className="format-options">
                                <label className="format-option">
                                    <input
                                        type="radio"
                                        name="reportFormat"
                                        value="excel"
                                        checked={reportFormat === 'excel'}
                                        onChange={() => setReportFormat('excel')}
                                    />
                                    <span>Excel</span>
                                </label>
                                <label className="format-option">
                                    <input
                                        type="radio"
                                        name="reportFormat"
                                        value="pdf"
                                        checked={reportFormat === 'pdf'}
                                        onChange={() => setReportFormat('pdf')}
                                    />
                                    <span>PDF</span>
                                </label>
                            </div>
                        </div>
                        
                        {filters.course && (
                            <div className="filter-group" style={{marginLeft: '1rem'}}>
                                <label>Batch for Report:</label>
                                <select 
                                    value={selectedBatch}
                                    onChange={(e) => setSelectedBatch(e.target.value)}
                                >
                                    <option value="all">All Batches</option>
                                    {getAvailableBatches().filter(b => b !== 'all').map(batch => (
                                        <option key={batch} value={batch}>{batch}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        
                        <button
                            type="button"
                            className="generate-dept-btn"
                            onClick={handleGenerateDepartmentReport}
                            disabled={!filters.degree || !filters.department || loadingDeptReport}
                        >
                            {loadingDeptReport ? 'Generating…' : 'Generate Department Report'}
                        </button>
                    </div>
                </div>

                {filters.course && (
                    <div className="faculty-section">
                        <div className="faculty-header">
                            <div className="faculty-search">
                                <label>Search by Staff ID</label>
                                <input
                                    type="text"
                                    placeholder="Enter staff_id..."
                                    value={staffIdSearch}
                                    onChange={(e) => setStaffIdSearch(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="faculty-grid">
                            {faculty.length === 0 ? (
                                <p>No faculty found.</p>
                            ) : (
                                faculty.map((fac, idx) => (
                                    <div 
                                        key={`${fac.staff_id || fac.staffid}-${idx}`} 
                                        className="faculty-card clickable-card"
                                        onClick={() => handleFacultyCardClick(fac)}
                                    >
                                        <div className="faculty-card-header">
                                            <div className="faculty-avatar" aria-hidden="true">{getInitials(fac.faculty_name || fac.name)}</div>
                                            <div className="faculty-header-info">
                                                <div className="faculty-name">{fac.faculty_name || fac.name || 'Unknown'}</div>
                                                <div className="faculty-sub">
                                                    <strong>{filters.degree || '-'}</strong> · {filters.department || '-'}
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="faculty-card-body">
                                            <div className="info-section">
                                                <div className="section-header">
                                                    <div className="section-icon">
                                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                                            <path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9zM17 15.99l-5 2.73-5-2.73v-3.72L12 15l5-2.73v3.72z"/>
                                                        </svg>
                                                    </div>
                                                    <div className="section-label">Course Information</div>
                                                </div>
                                                <div className="info-grid">
                                                    <div className="info-label">Code:</div>
                                                    <div className="info-value">
                                                        <div className="badge code">{fac.course_code || '-'}</div>
                                                    </div>
                                                    <div className="info-label">Name:</div>
                                                    <div className="info-value course-name">{fac.course_name || '-'}</div>
                                                    <div className="info-label">Batches:</div>
                                                    <div className="info-value">
                                                        <div className="badge">{fac.batches_text || fac.batches?.join(', ') || '-'}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="faculty-card-footer">
                                            {(fac.staff_id || fac.staffid) && (
                                                <div className="id-section">
                                                    <div className="section-icon">
                                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                                            <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V6h16v12zM4 0h16v2H4zm0 22h16v2H4zm8-10a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zm0-3.5c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm5 7.5h-10v-1c0-1.66 3.34-2.5 5-2.5s5 .84 5 2.5v1z"/>
                                                        </svg>
                                                    </div>
                                                    <div className="id-container">
                                                        <div className="id-label">Staff Identifier</div>
                                                        <div className="id-value">
                                                            {fac.staff_id || fac.staffid}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                            
                                            <button
                                                type="button"
                                                className="copy-btn"
                                                title="Copy faculty ID to clipboard"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    const value = fac.staff_id || fac.staffid || '';
                                                    if (navigator && navigator.clipboard && value) {
                                                        navigator.clipboard.writeText(value)
                                                            .then(() => {
                                                                console.log('ID copied to clipboard');
                                                            })
                                                            .catch(() => {});
                                                    }
                                                }}
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                                </svg>
                                                Copy ID
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {/* Loading overlay for analysis */}
                {loadingAnalysis && (
                    <div className="analysis-loading-overlay">
                        <div className="loading-spinner">
                            <div className="spinner"></div>
                            <p>Fetching analysis data...</p>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default Analysis;