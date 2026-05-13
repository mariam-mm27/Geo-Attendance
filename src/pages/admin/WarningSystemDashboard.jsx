/**
 * Warning System Dashboard
 * 
 * Admin dashboard for managing the unified attendance warning system.
 * Features:
 * - View warning statistics
 * - Configure course rules
 * - View warning history
 * - Manual warning triggers
 * - Email configuration testing
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './WarningSystemDashboard.css';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const WarningSystemDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [rules, setRules] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [courseRules, setCourseRules] = useState(null);
  const [warningHistory, setWarningHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [emailConfig, setEmailConfig] = useState(null);

  // Fetch system statistics
  useEffect(() => {
    if (activeTab === 'overview') {
      fetchSystemStats();
    }
  }, [activeTab]);

  const fetchSystemStats = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/api/warnings/system-status`);
      setStats(response.data.data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch system statistics');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllRules = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/api/warnings/rules`);
      setRules(response.data.data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch rules');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCourseRules = async (courseId) => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/api/warnings/rules/${courseId}`);
      setCourseRules(response.data.data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch course rules');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCourseHistory = async (courseId) => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/api/warnings/history/course/${courseId}`);
      setWarningHistory(response.data.data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch warning history');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateCourseRules = async (courseId, newRules) => {
    try {
      setLoading(true);
      const adminId = localStorage.getItem('userId'); // Get current admin ID
      const response = await axios.put(
        `${API_BASE}/api/warnings/rules/${courseId}`,
        { ...newRules, adminId }
      );
      setCourseRules(response.data.data);
      setSuccess('Rules updated successfully');
      setTimeout(() => setSuccess(null), 3000);
      setError(null);
    } catch (err) {
      setError('Failed to update rules');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const testEmailConfig = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/api/warnings/email-config`);
      setEmailConfig(response.data.data);
      setError(null);
    } catch (err) {
      setError('Failed to test email configuration');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const sendTestEmail = async (email) => {
    try {
      setLoading(true);
      await axios.post(`${API_BASE}/api/warnings/test-email`, { toEmail: email });
      setSuccess(`Test email sent to ${email}`);
      setTimeout(() => setSuccess(null), 3000);
      setError(null);
    } catch (err) {
      setError('Failed to send test email');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const batchProcessCourse = async (courseId) => {
    try {
      setLoading(true);
      const adminId = localStorage.getItem('userId');
      const response = await axios.post(`${API_BASE}/api/warnings/batch-process`, {
        courseId,
        adminId
      });
      setSuccess(`Batch processing completed: ${response.data.warned} warnings sent`);
      setTimeout(() => setSuccess(null), 3000);
      setError(null);
    } catch (err) {
      setError('Failed to batch process course');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="warning-dashboard">
      <h1>Attendance Warning System Dashboard</h1>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={`tab ${activeTab === 'rules' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('rules');
            fetchAllRules();
          }}
        >
          Rules Management
        </button>
        <button
          className={`tab ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          Warning History
        </button>
        <button
          className={`tab ${activeTab === 'email' ? 'active' : ''}`}
          onClick={() => setActiveTab('email')}
        >
          Email Configuration
        </button>
      </div>

      <div className="tab-content">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="overview-section">
            {loading ? (
              <p>Loading...</p>
            ) : stats ? (
              <>
                <div className="stats-grid">
                  <div className="stat-card">
                    <h3>Total Warnings</h3>
                    <p className="stat-value">{stats.warnings.totalWarnings}</p>
                  </div>
                  <div className="stat-card">
                    <h3>First Warnings</h3>
                    <p className="stat-value">{stats.warnings.byLevel.FIRST_WARNING}</p>
                  </div>
                  <div className="stat-card">
                    <h3>Second Warnings</h3>
                    <p className="stat-value">{stats.warnings.byLevel.SECOND_WARNING}</p>
                  </div>
                  <div className="stat-card">
                    <h3>Deprivation Warnings</h3>
                    <p className="stat-value">{stats.warnings.byLevel.DEPRIVATION}</p>
                  </div>
                  <div className="stat-card">
                    <h3>Delivery Rate</h3>
                    <p className="stat-value">{stats.warnings.deliveryRate}%</p>
                  </div>
                  <div className="stat-card">
                    <h3>Delivered</h3>
                    <p className="stat-value">{stats.warnings.byStatus.DELIVERED}</p>
                  </div>
                </div>

                <div className="status-section">
                  <h3>System Status</h3>
                  <div className="status-grid">
                    <div className="status-item">
                      <span>Sent:</span>
                      <span className="status-value">{stats.warnings.byStatus.SENT}</span>
                    </div>
                    <div className="status-item">
                      <span>Failed:</span>
                      <span className="status-value">{stats.warnings.byStatus.FAILED}</span>
                    </div>
                    <div className="status-item">
                      <span>Permanently Failed:</span>
                      <span className="status-value">{stats.warnings.byStatus.PERMANENTLY_FAILED}</span>
                    </div>
                  </div>
                </div>

                <div className="rules-summary">
                  <h3>Rules Summary</h3>
                  <div className="summary-grid">
                    <div className="summary-item">
                      <span>Custom Rules:</span>
                      <span>{stats.rules.customRules}</span>
                    </div>
                    <div className="summary-item">
                      <span>Avg First Warning Threshold:</span>
                      <span>{stats.rules.averageFirstWarningThreshold}%</span>
                    </div>
                    <div className="summary-item">
                      <span>Avg Second Warning Threshold:</span>
                      <span>{stats.rules.averageSecondWarningThreshold}%</span>
                    </div>
                    <div className="summary-item">
                      <span>Instant First Warning Enabled:</span>
                      <span>{stats.rules.instantFirstWarningEnabled}</span>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <p>No data available</p>
            )}
          </div>
        )}

        {/* Rules Management Tab */}
        {activeTab === 'rules' && (
          <div className="rules-section">
            <h2>Course Rules Management</h2>
            {loading ? (
              <p>Loading...</p>
            ) : (
              <>
                <div className="rules-list">
                  {rules.length > 0 ? (
                    rules.map(rule => (
                      <div key={rule.id} className="rule-card">
                        <h3>Course: {rule.courseId}</h3>
                        <div className="rule-details">
                          <p>
                            <strong>First Warning:</strong> {rule.firstWarningThreshold}%
                          </p>
                          <p>
                            <strong>Second Warning:</strong> {rule.secondWarningThreshold}%
                          </p>
                          <p>
                            <strong>Deprivation:</strong> {rule.deprivationThreshold}%
                          </p>
                          <p>
                            <strong>Cooldown:</strong> {rule.cooldownPeriod / 3600000} hours
                          </p>
                          <p>
                            <strong>Instant First Warning:</strong>{' '}
                            {rule.enableInstantFirstWarning ? 'Enabled' : 'Disabled'}
                          </p>
                        </div>
                        <button
                          className="btn btn-primary"
                          onClick={() => {
                            setSelectedCourse(rule.id);
                            fetchCourseRules(rule.id);
                          }}
                        >
                          Edit Rules
                        </button>
                        <button
                          className="btn btn-secondary"
                          onClick={() => batchProcessCourse(rule.id)}
                        >
                          Batch Process
                        </button>
                      </div>
                    ))
                  ) : (
                    <p>No custom rules configured. Using default rules for all courses.</p>
                  )}
                </div>

                {selectedCourse && courseRules && (
                  <div className="edit-rules-form">
                    <h3>Edit Rules for Course: {selectedCourse}</h3>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        updateCourseRules(selectedCourse, courseRules);
                      }}
                    >
                      <div className="form-group">
                        <label>First Warning Threshold (%)</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={courseRules.firstWarningThreshold}
                          onChange={(e) =>
                            setCourseRules({
                              ...courseRules,
                              firstWarningThreshold: parseInt(e.target.value)
                            })
                          }
                        />
                      </div>

                      <div className="form-group">
                        <label>Second Warning Threshold (%)</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={courseRules.secondWarningThreshold}
                          onChange={(e) =>
                            setCourseRules({
                              ...courseRules,
                              secondWarningThreshold: parseInt(e.target.value)
                            })
                          }
                        />
                      </div>

                      <div className="form-group">
                        <label>Deprivation Threshold (%)</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={courseRules.deprivationThreshold}
                          onChange={(e) =>
                            setCourseRules({
                              ...courseRules,
                              deprivationThreshold: parseInt(e.target.value)
                            })
                          }
                        />
                      </div>

                      <div className="form-group">
                        <label>Cooldown Period (hours)</label>
                        <input
                          type="number"
                          min="0"
                          value={courseRules.cooldownPeriod / 3600000}
                          onChange={(e) =>
                            setCourseRules({
                              ...courseRules,
                              cooldownPeriod: parseInt(e.target.value) * 3600000
                            })
                          }
                        />
                      </div>

                      <div className="form-group">
                        <label>
                          <input
                            type="checkbox"
                            checked={courseRules.enableInstantFirstWarning}
                            onChange={(e) =>
                              setCourseRules({
                                ...courseRules,
                                enableInstantFirstWarning: e.target.checked
                              })
                            }
                          />
                          Enable Instant First Warning
                        </label>
                      </div>

                      <button type="submit" className="btn btn-success">
                        Save Rules
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => {
                          setSelectedCourse(null);
                          setCourseRules(null);
                        }}
                      >
                        Cancel
                      </button>
                    </form>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Warning History Tab */}
        {activeTab === 'history' && (
          <div className="history-section">
            <h2>Warning History</h2>
            <div className="history-filters">
              <input
                type="text"
                placeholder="Enter Course ID"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    fetchCourseHistory(e.target.value);
                  }
                }}
              />
            </div>

            {loading ? (
              <p>Loading...</p>
            ) : warningHistory.length > 0 ? (
              <div className="history-table">
                <table>
                  <thead>
                    <tr>
                      <th>Student ID</th>
                      <th>Course ID</th>
                      <th>Warning Level</th>
                      <th>Attendance Rate</th>
                      <th>Status</th>
                      <th>Created At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {warningHistory.map(warning => (
                      <tr key={warning.id}>
                        <td>{warning.studentId}</td>
                        <td>{warning.courseId}</td>
                        <td>
                          <span className={`badge badge-${warning.warningLevel.toLowerCase()}`}>
                            {warning.warningLevel}
                          </span>
                        </td>
                        <td>{warning.attendanceRate}%</td>
                        <td>
                          <span className={`status status-${warning.status.toLowerCase()}`}>
                            {warning.status}
                          </span>
                        </td>
                        <td>{new Date(warning.createdAt?.toDate?.()).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p>No warning history found</p>
            )}
          </div>
        )}

        {/* Email Configuration Tab */}
        {activeTab === 'email' && (
          <div className="email-section">
            <h2>Email Configuration</h2>
            <button className="btn btn-primary" onClick={testEmailConfig}>
              Test Email Configuration
            </button>

            {emailConfig && (
              <div className="email-config-results">
                <h3>Configuration Status</h3>
                {Object.entries(emailConfig).map(([provider, status]) => (
                  <div key={provider} className="config-item">
                    <span className="provider-name">{provider}</span>
                    <span className={`status status-${status.status.toLowerCase()}`}>
                      {status.status}
                    </span>
                    <span className="message">{status.message}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="test-email-form">
              <h3>Send Test Email</h3>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const email = e.target.email.value;
                  sendTestEmail(email);
                }}
              >
                <input
                  type="email"
                  name="email"
                  placeholder="Enter email address"
                  required
                />
                <button type="submit" className="btn btn-primary">
                  Send Test Email
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WarningSystemDashboard;
