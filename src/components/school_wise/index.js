import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './index.css';

const SERVER_URL = process.env.REACT_APP_SERVER_URL || "https://iqac-backend-1.onrender.com";

const SchoolWise = () => {
    const navigate = useNavigate();
    const [schools, setSchools] = useState([]);
    const [selectedSchool, setSelectedSchool] = useState('');
    const [departments, setDepartments] = useState([]);
    const [degrees, setDegrees] = useState([]);
    const [selectedDegree, setSelectedDegree] = useState('');
    const [selectedBatch, setSelectedBatch] = useState('all');
    const [reportFormat, setReportFormat] = useState('excel');
    const [loading, setLoading] = useState(false);
    const [loadingSchools, setLoadingSchools] = useState(true);
    const [loadingDepartments, setLoadingDepartments] = useState(false);

    const handleLogout = () => {
        localStorage.removeItem('user');
        navigate('/login');
    };

    // Fetch schools on component mount
    useEffect(() => {
        fetchSchools();
        fetchDegrees();
    }, []);

    // Fetch departments when school changes
    useEffect(() => {
        if (selectedSchool) {
            fetchDepartments(selectedSchool);
        } else {
            setDepartments([]);
        }
    }, [selectedSchool]);

    const fetchSchools = async () => {
        try {
            setLoadingSchools(true);
            const response = await fetch(`${SERVER_URL}/api/school-reports/schools`);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                throw new Error(errorData.error || `HTTP ${response.status}: Failed to fetch schools`);
            }
            const data = await response.json();
            if (Array.isArray(data)) {
                setSchools(data);
            } else {
                throw new Error('Invalid response format');
            }
        } catch (error) {
            console.error('Error fetching schools:', error);
            alert(`Error fetching schools: ${error.message}. Please check the server console for more details.`);
        } finally {
            setLoadingSchools(false);
        }
    };

    const fetchDepartments = async (school) => {
        try {
            setLoadingDepartments(true);
            const response = await fetch(`${SERVER_URL}/api/school-reports/schools/${encodeURIComponent(school)}/departments`);
            if (!response.ok) {
                throw new Error('Failed to fetch departments');
            }
            const data = await response.json();
            setDepartments(data);
        } catch (error) {
            console.error('Error fetching departments:', error);
            alert('Error fetching departments. Please try again.');
        } finally {
            setLoadingDepartments(false);
        }
    };

    const fetchDegrees = async () => {
        try {
            const response = await fetch(`${SERVER_URL}/api/analysis/degrees`);
            if (!response.ok) {
                throw new Error('Failed to fetch degrees');
            }
            const data = await response.json();
            setDegrees(data);
        } catch (error) {
            console.error('Error fetching degrees:', error);
        }
    };

    const handleGenerateReport = async () => {
        if (!selectedSchool) {
            alert('Please select a school.');
            return;
        }

        try {
            setLoading(true);
            const response = await fetch(`${SERVER_URL}/api/school-reports/generate-school-report`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    school: selectedSchool,
                    degree: selectedDegree || '',
                    batch: selectedBatch === 'all' ? 'ALL' : selectedBatch,
                    format: reportFormat
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || 'Failed to generate school report');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const fileExtension = reportFormat === 'pdf' ? 'pdf' : 'xlsx';
            const safeSchoolName = selectedSchool.replace(/[^a-z0-9]/gi, '_');
            a.download = `${safeSchoolName}_school_report.${fileExtension}`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error('School report error:', error);
            alert('Error generating school report: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="school-wise-container">
            <header className="header">
                <div className="logo-container">
                    <img 
                        src="https://www.kalasalingam.ac.in/wp-content/uploads/2022/02/Logo.png" 
                        alt="Kalasalingam Logo" 
                        className="logo" 
                    />
                    <div className="header-text">
                        <h1>Office of IQAC, KARE</h1>
                        <p>School-wise Feedback Analysis</p>
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
                <h1 className="page-title">School-wise Report Generation</h1>
                <p className="page-description">
                    Generate comprehensive feedback analysis reports for all departments within a school.
                    Reports can be generated in Excel (multiple sheets) or PDF (multiple pages) format.
                </p>

                <div className="filters-section">
                    <div className="filter-group">
                        <label htmlFor="school-select">School *</label>
                        <select
                            id="school-select"
                            value={selectedSchool}
                            onChange={(e) => setSelectedSchool(e.target.value)}
                            disabled={loadingSchools}
                            className="filter-select"
                        >
                            <option value="">Select School</option>
                            {schools.map((school, index) => (
                                <option key={index} value={school}>
                                    {school}
                                </option>
                            ))}
                        </select>
                        {loadingSchools && <span className="loading-text">Loading schools...</span>}
                    </div>

                    {selectedSchool && (
                        <div className="filter-group">
                            <label>Departments in {selectedSchool}</label>
                            <div className="departments-list">
                                {loadingDepartments ? (
                                    <span className="loading-text">Loading departments...</span>
                                ) : departments.length > 0 ? (
                                    <div className="departments-badges">
                                        {departments.map((dept, index) => (
                                            <span key={index} className="department-badge">
                                                {dept}
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    <span className="no-data-text">No departments found</span>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="filter-group">
                        <label htmlFor="degree-select">Degree (Optional)</label>
                        <select
                            id="degree-select"
                            value={selectedDegree}
                            onChange={(e) => setSelectedDegree(e.target.value)}
                            className="filter-select"
                        >
                            <option value="">All Degrees</option>
                            {degrees.map((degree, index) => (
                                <option key={index} value={degree}>
                                    {degree}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="filter-group">
                        <label htmlFor="batch-select">Batch (Optional)</label>
                        <select
                            id="batch-select"
                            value={selectedBatch}
                            onChange={(e) => setSelectedBatch(e.target.value)}
                            className="filter-select"
                        >
                            <option value="all">All Batches</option>
                            <option value="2022">2022</option>
                            <option value="2023">2023</option>
                            <option value="2024">2024</option>
                            <option value="2025">2025</option>
                        </select>
                    </div>

                    <div className="filter-group">
                        <label htmlFor="format-select">Report Format</label>
                        <select
                            id="format-select"
                            value={reportFormat}
                            onChange={(e) => setReportFormat(e.target.value)}
                            className="filter-select"
                        >
                            <option value="excel">Excel (Multiple Sheets)</option>
                            <option value="pdf">PDF (Multiple Pages)</option>
                        </select>
                    </div>

                    <div className="action-buttons">
                        <button
                            className="generate-btn"
                            onClick={handleGenerateReport}
                            disabled={!selectedSchool || loading}
                        >
                            {loading ? (
                                <>
                                    <span className="spinner"></span>
                                    Generating Report...
                                </>
                            ) : (
                                <>
                                    <span>📊</span>
                                    Generate School Report
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default SchoolWise;

