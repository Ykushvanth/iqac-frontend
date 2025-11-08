import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './index.css';

const SERVER_URL = process.env.REACT_APP_SERVER_URL || "https://silver-lamington-b2e10d.netlify.app";

const Visualize = () => {
    const navigate = useNavigate();
    const [filters, setFilters] = useState({
        degree: '',
        department: ''
    });
    
    const [options, setOptions] = useState({
        degrees: [],
        departments: []
    });

    const [visualizationData, setVisualizationData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [performanceFilter, setPerformanceFilter] = useState('all');

    const handleLogout = () => {
        localStorage.removeItem('user');
        navigate('/login');
    };

    useEffect(() => {
        fetchDegrees();
    }, []);

    useEffect(() => {
        if (filters.degree) {
            fetchDepartments(filters.degree);
        }
    }, [filters.degree]);

    const fetchDegrees = async () => {
        try {
            const response = await fetch(`${SERVER_URL}/api/analysis/degrees`);
            const data = await response.json();
            if (Array.isArray(data)) {
                setOptions(prev => ({ ...prev, degrees: data }));
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

    const handleGenerateVisualization = async () => {
        if (!filters.degree || !filters.department) {
            setError('Please select both Degree and Department.');
            return;
        }

        try {
            setLoading(true);
            setError(null);
            
            const response = await fetch(
                `${SERVER_URL}/api/visualization/department?degree=${encodeURIComponent(filters.degree)}&dept=${encodeURIComponent(filters.department)}`
            );
            
            const data = await response.json();
            
            if (data.success) {
                setVisualizationData(data);
            } else {
                setError(data.error || 'Failed to fetch visualization data');
            }
        } catch (error) {
            console.error('Error generating visualization:', error);
            setError('Error generating visualization. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Filter faculty based on performance category
    const filterFacultyByPerformance = (faculty, filter) => {
        if (filter === 'all') return true;
        
        const score = faculty.overall_score || 0;
        
        switch (filter) {
            case 'excellent':
                return score >= 90;
            case 'good':
                return score >= 80 && score < 90;
            case 'average':
                return score >= 70 && score < 80;
            case 'needsImprovement':
                return score < 70;
            case 'highest':
                // Will be handled separately to show top performers
                return true;
            case 'lowest':
                // Will be handled separately to show bottom performers
                return true;
            default:
                return true;
        }
    };

    // Get filtered courses data
    const getFilteredData = () => {
        if (!visualizationData || !visualizationData.courses) return null;

        let filteredCourses = visualizationData.courses.map(course => ({
            ...course,
            faculties: course.faculties.filter(f => filterFacultyByPerformance(f, performanceFilter))
        })).filter(course => course.faculties.length > 0);

        // Handle highest/lowest filters
        if (performanceFilter === 'highest' || performanceFilter === 'lowest') {
            // Collect all faculty with their scores from original data
            const allFaculty = [];
            visualizationData.courses.forEach(course => {
                course.faculties.forEach(faculty => {
                    allFaculty.push({ ...faculty, course_code: course.course_code, course_name: course.course_name });
                });
            });

            // Sort by score
            allFaculty.sort((a, b) => {
                const scoreA = a.overall_score || 0;
                const scoreB = b.overall_score || 0;
                return performanceFilter === 'highest' ? scoreB - scoreA : scoreA - scoreB;
            });

            // Get top/bottom 10
            const topFaculty = allFaculty.slice(0, 10);
            
            // Group back by course
            const groupedByCourse = {};
            topFaculty.forEach(faculty => {
                if (!groupedByCourse[faculty.course_code]) {
                    groupedByCourse[faculty.course_code] = {
                        course_code: faculty.course_code,
                        course_name: faculty.course_name,
                        faculties: []
                    };
                }
                groupedByCourse[faculty.course_code].faculties.push(faculty);
            });

            filteredCourses = Object.values(groupedByCourse);
        }

        return filteredCourses;
    };

    const filteredCourses = getFilteredData();

    const getStatistics = () => {
        if (!visualizationData || !visualizationData.courses) return null;

        const allScores = [];
        const facultyByScore = { excellent: 0, good: 0, average: 0, needsImprovement: 0 };
        
        // Use filtered data if filter is applied, otherwise use all data
        const dataToUse = filteredCourses || visualizationData.courses;
        
        dataToUse.forEach(course => {
            course.faculties.forEach(faculty => {
                const score = faculty.overall_score || 0;
                allScores.push(score);
                
                if (score >= 90) facultyByScore.excellent++;
                else if (score >= 80) facultyByScore.good++;
                else if (score >= 70) facultyByScore.average++;
                else facultyByScore.needsImprovement++;
            });
        });

        const avgScore = allScores.length > 0 
            ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)
            : 0;

        return {
            totalFaculty: allScores.length,
            averageScore: avgScore,
            maxScore: allScores.length > 0 ? Math.max(...allScores) : 0,
            minScore: allScores.length > 0 ? Math.min(...allScores) : 0,
            facultyByScore
        };
    };

    const stats = getStatistics();

    const getPieChartData = () => {
        if (!stats) return null;
        const total = stats.totalFaculty;
        if (total === 0) return null;
        
        const circumference = 2 * Math.PI * 80;
        const excellent = (stats.facultyByScore.excellent / total) * circumference;
        const good = (stats.facultyByScore.good / total) * circumference;
        const average = (stats.facultyByScore.average / total) * circumference;
        const needsImprovement = (stats.facultyByScore.needsImprovement / total) * circumference;
        
        return {
            excellent,
            good,
            average,
            needsImprovement,
            totalCircumference: circumference,
            offsets: {
                excellent: 0,
                good: excellent,
                average: excellent + good,
                needsImprovement: excellent + good + average
            }
        };
    };

    const pieData = getPieChartData();

    return (
        <div className="visualize-container">
            <header className="visualize-header">
                <div className="header-content">
                    <div className="logo-section">
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
                </div>
            </header>

            <main className="visualize-main">
                <div className="page-header">
                    <h2 className="page-title">Feedback Analysis Dashboard</h2>
                    <p className="page-subtitle">Comprehensive performance metrics and insights</p>
                </div>

                <div className="filters-panel">
                    <div className="filter-row">
                        <div className="filter-item">
                            <label htmlFor="degree-select">Degree</label>
                            <select 
                                id="degree-select"
                                value={filters.degree}
                                onChange={(e) => setFilters({ 
                                    ...filters, 
                                    degree: e.target.value,
                                    department: ''
                                })}
                                className="filter-select"
                            >
                                <option value="">Select Degree</option>
                                {options.degrees.map(degree => (
                                    <option key={degree} value={degree}>{degree}</option>
                                ))}
                            </select>
                        </div>

                        <div className="filter-item">
                            <label htmlFor="dept-select">Department</label>
                            <select 
                                id="dept-select"
                                value={filters.department}
                                onChange={(e) => setFilters({
                                    ...filters,
                                    department: e.target.value
                                })}
                                disabled={!filters.degree}
                                className="filter-select"
                            >
                                <option value="">Select Department</option>
                                {options.departments.map(dept => (
                                    <option key={dept} value={dept}>{dept}</option>
                                ))}
                            </select>
                        </div>

                        <button
                            type="button"
                            className="generate-button"
                            onClick={handleGenerateVisualization}
                            disabled={!filters.degree || !filters.department || loading}
                        >
                            {loading ? 'Loading...' : 'Generate Report'}
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="error-alert">
                        <span className="error-icon">⚠</span>
                        <span>{error}</span>
                    </div>
                )}

                {loading && (
                    <div className="loading-container">
                        <div className="loading-spinner"></div>
                        <p>Processing data...</p>
                    </div>
                )}

                {visualizationData && visualizationData.success && (
                    <div className="dashboard-content">
                        {/* Performance Filter */}
                        <div className="performance-filter-panel">
                            <label htmlFor="performance-filter" className="filter-label">Filter by Performance:</label>
                            <select
                                id="performance-filter"
                                value={performanceFilter}
                                onChange={(e) => setPerformanceFilter(e.target.value)}
                                className="performance-filter-select"
                            >
                                <option value="all">All Faculty</option>
                                <option value="excellent">Excellent (≥90%)</option>
                                <option value="good">Good (80-89%)</option>
                                <option value="average">Average (70-79%)</option>
                                <option value="needsImprovement">Needs Improvement (&lt;70%)</option>
                                <option value="highest">Top 10 Highest</option>
                                <option value="lowest">Top 10 Lowest</option>
                            </select>
                            {performanceFilter !== 'all' && (
                                <span className="filter-badge">
                                    Showing {stats?.totalFaculty || 0} faculty
                                </span>
                            )}
                        </div>

                        {/* Summary Cards */}
                        {stats && (
                            <div className="summary-cards">
                                <div className="summary-card">
                                    <div className="card-header">
                                        <span className="card-icon">👥</span>
                                        <h3>Total Faculty</h3>
                                    </div>
                                    <div className="card-value">{stats.totalFaculty}</div>
                                </div>
                                <div className="summary-card">
                                    <div className="card-header">
                                        <span className="card-icon">📊</span>
                                        <h3>Average Score</h3>
                                    </div>
                                    <div className="card-value">{stats.averageScore}%</div>
                                    <div className="card-progress">
                                        <div 
                                            className="progress-fill" 
                                            style={{ width: `${stats.averageScore}%` }}
                                        ></div>
                                    </div>
                                </div>
                                <div className="summary-card">
                                    <div className="card-header">
                                        <span className="card-icon">⭐</span>
                                        <h3>Highest Score</h3>
                                    </div>
                                    <div className="card-value">{stats.maxScore}%</div>
                                </div>
                                <div className="summary-card">
                                    <div className="card-header">
                                        <span className="card-icon">📈</span>
                                        <h3>Lowest Score</h3>
                                    </div>
                                    <div className="card-value">{stats.minScore}%</div>
                                </div>
                            </div>
                        )}

                        {/* Charts Section */}
                        {stats && (
                            <div className="charts-panel">
                                {/* Pie Chart */}
                                {pieData && (
                                    <div className="chart-card">
                                        <div className="chart-title">
                                            <h3>Performance Distribution</h3>
                                            <p>Faculty categorized by performance levels</p>
                                        </div>
                                        <div className="pie-chart-container">
                                            <svg className="pie-chart" viewBox="0 0 200 200">
                                                <circle 
                                                    cx="100" 
                                                    cy="100" 
                                                    r="80" 
                                                    fill="none" 
                                                    stroke="#e8e9eb" 
                                                    strokeWidth="30" 
                                                />
                                                {stats.facultyByScore.excellent > 0 && (
                                                    <circle 
                                                        cx="100" 
                                                        cy="100" 
                                                        r="80" 
                                                        fill="none" 
                                                        stroke="#2e7d32" 
                                                        strokeWidth="30"
                                                        strokeDasharray={`${pieData.excellent} ${pieData.totalCircumference}`}
                                                        strokeDashoffset={-pieData.offsets.excellent}
                                                        transform="rotate(-90 100 100)"
                                                        className="pie-segment"
                                                    />
                                                )}
                                                {stats.facultyByScore.good > 0 && (
                                                    <circle 
                                                        cx="100" 
                                                        cy="100" 
                                                        r="80" 
                                                        fill="none" 
                                                        stroke="#1976d2" 
                                                        strokeWidth="30"
                                                        strokeDasharray={`${pieData.good} ${pieData.totalCircumference}`}
                                                        strokeDashoffset={-pieData.offsets.good}
                                                        transform="rotate(-90 100 100)"
                                                        className="pie-segment"
                                                    />
                                                )}
                                                {stats.facultyByScore.average > 0 && (
                                                    <circle 
                                                        cx="100" 
                                                        cy="100" 
                                                        r="80" 
                                                        fill="none" 
                                                        stroke="#ed6c02" 
                                                        strokeWidth="30"
                                                        strokeDasharray={`${pieData.average} ${pieData.totalCircumference}`}
                                                        strokeDashoffset={-pieData.offsets.average}
                                                        transform="rotate(-90 100 100)"
                                                        className="pie-segment"
                                                    />
                                                )}
                                                {stats.facultyByScore.needsImprovement > 0 && (
                                                    <circle 
                                                        cx="100" 
                                                        cy="100" 
                                                        r="80" 
                                                        fill="none" 
                                                        stroke="#d32f2f" 
                                                        strokeWidth="30"
                                                        strokeDasharray={`${pieData.needsImprovement} ${pieData.totalCircumference}`}
                                                        strokeDashoffset={-pieData.offsets.needsImprovement}
                                                        transform="rotate(-90 100 100)"
                                                        className="pie-segment"
                                                    />
                                                )}
                                                <text x="100" y="95" textAnchor="middle" className="pie-center-value">
                                                    {stats.totalFaculty}
                                                </text>
                                                <text x="100" y="110" textAnchor="middle" className="pie-center-label">
                                                    Faculty
                                                </text>
                                            </svg>
                                            <div className="pie-legend">
                                                <div className="legend-row">
                                                    <div className="legend-item">
                                                        <span className="legend-dot excellent"></span>
                                                        <span className="legend-text">Excellent (≥90%)</span>
                                                        <span className="legend-count">{stats.facultyByScore.excellent}</span>
                                                    </div>
                                                    <div className="legend-item">
                                                        <span className="legend-dot good"></span>
                                                        <span className="legend-text">Good (80-89%)</span>
                                                        <span className="legend-count">{stats.facultyByScore.good}</span>
                                                    </div>
                                                </div>
                                                <div className="legend-row">
                                                    <div className="legend-item">
                                                        <span className="legend-dot average"></span>
                                                        <span className="legend-text">Average (70-79%)</span>
                                                        <span className="legend-count">{stats.facultyByScore.average}</span>
                                                    </div>
                                                    <div className="legend-item">
                                                        <span className="legend-dot needs-improvement"></span>
                                                        <span className="legend-text">Needs Improvement (&lt;70%)</span>
                                                        <span className="legend-count">{stats.facultyByScore.needsImprovement}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Bar Chart */}
                                <div className="chart-card">
                                    <div className="chart-title">
                                        <h3>Performance Breakdown</h3>
                                        <p>Distribution across performance categories</p>
                                    </div>
                                    <div className="bar-chart-container">
                                        <div className="bar-item">
                                            <div className="bar-label-row">
                                                <span className="bar-label">Excellent (≥90%)</span>
                                                <span className="bar-count">{stats.facultyByScore.excellent}</span>
                                            </div>
                                            <div className="bar-track">
                                                <div 
                                                    className="bar-fill excellent" 
                                                    style={{ 
                                                        width: `${stats.totalFaculty > 0 ? (stats.facultyByScore.excellent / stats.totalFaculty) * 100 : 0}%` 
                                                    }}
                                                >
                                                    <span className="bar-percentage">
                                                        {stats.totalFaculty > 0 ? Math.round((stats.facultyByScore.excellent / stats.totalFaculty) * 100) : 0}%
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="bar-item">
                                            <div className="bar-label-row">
                                                <span className="bar-label">Good (80-89%)</span>
                                                <span className="bar-count">{stats.facultyByScore.good}</span>
                                            </div>
                                            <div className="bar-track">
                                                <div 
                                                    className="bar-fill good" 
                                                    style={{ 
                                                        width: `${stats.totalFaculty > 0 ? (stats.facultyByScore.good / stats.totalFaculty) * 100 : 0}%` 
                                                    }}
                                                >
                                                    <span className="bar-percentage">
                                                        {stats.totalFaculty > 0 ? Math.round((stats.facultyByScore.good / stats.totalFaculty) * 100) : 0}%
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="bar-item">
                                            <div className="bar-label-row">
                                                <span className="bar-label">Average (70-79%)</span>
                                                <span className="bar-count">{stats.facultyByScore.average}</span>
                                            </div>
                                            <div className="bar-track">
                                                <div 
                                                    className="bar-fill average" 
                                                    style={{ 
                                                        width: `${stats.totalFaculty > 0 ? (stats.facultyByScore.average / stats.totalFaculty) * 100 : 0}%` 
                                                    }}
                                                >
                                                    <span className="bar-percentage">
                                                        {stats.totalFaculty > 0 ? Math.round((stats.facultyByScore.average / stats.totalFaculty) * 100) : 0}%
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="bar-item">
                                            <div className="bar-label-row">
                                                <span className="bar-label">Needs Improvement (&lt;70%)</span>
                                                <span className="bar-count">{stats.facultyByScore.needsImprovement}</span>
                                            </div>
                                            <div className="bar-track">
                                                <div 
                                                    className="bar-fill needs-improvement" 
                                                    style={{ 
                                                        width: `${stats.totalFaculty > 0 ? (stats.facultyByScore.needsImprovement / stats.totalFaculty) * 100 : 0}%` 
                                                    }}
                                                >
                                                    <span className="bar-percentage">
                                                        {stats.totalFaculty > 0 ? Math.round((stats.facultyByScore.needsImprovement / stats.totalFaculty) * 100) : 0}%
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Course-wise Performance */}
                        <div className="courses-section">
                            <div className="section-title">
                                <h3>Course-wise Faculty Performance</h3>
                                <p>Detailed analysis for each course</p>
                            </div>
                            {filteredCourses && filteredCourses.length > 0 ? (
                                <div className="courses-list">
                                    {filteredCourses.map((course, idx) => {
                                    const courseAvg = course.faculties.length > 0
                                        ? Math.round(course.faculties.reduce((sum, f) => sum + (f.overall_score || 0), 0) / course.faculties.length)
                                        : 0;
                                    return (
                                        <div key={idx} className="course-card">
                                            <div className="course-card-header">
                                                <div>
                                                    <div className="course-code">{course.course_code}</div>
                                                    <h4>{course.course_name}</h4>
                                                </div>
                                                <div className="course-meta">
                                                    <span className="meta-item">{course.faculties.length} Faculty</span>
                                                    <span className="meta-item">Avg: {courseAvg}%</span>
                                                </div>
                                            </div>
                                            <div className="faculty-table">
                                                {course.faculties
                                                    .sort((a, b) => (b.overall_score || 0) - (a.overall_score || 0))
                                                    .map((faculty, fIdx) => (
                                                    <div key={fIdx} className="faculty-row">
                                                        <div className="faculty-details">
                                                            <div className="faculty-name">{faculty.faculty_name}</div>
                                                            <div className="faculty-info">
                                                                <span>{faculty.staffid || faculty.staff_id}</span>
                                                                
                                                                <span>{faculty.total_responses} responses</span>
                                                            </div>
                                                        </div>
                                                        <div className="faculty-score">
                                                            <div className="score-value">{faculty.overall_score}%</div>
                                                            <div className="score-bar-container">
                                                                <div 
                                                                    className={`score-bar ${faculty.overall_score >= 80 ? 'high' : faculty.overall_score >= 70 ? 'medium' : 'low'}`}
                                                                    style={{ width: `${faculty.overall_score}%` }}
                                                                ></div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                    })}
                                </div>
                            ) : (
                                <div className="no-results">
                                    <p>No faculty found matching the selected performance filter.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default Visualize;
