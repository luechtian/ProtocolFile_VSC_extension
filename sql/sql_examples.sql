-- ============================================================================
-- sql/setup_test_db.sql
-- Database setup script for laboratory testing
-- ============================================================================

-- Create test database if it doesn't exist
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'ProtocolFileTestDB')
BEGIN
    CREATE DATABASE ProtocolFileTestDB
END
GO

USE ProtocolFileTestDB
GO

-- Create test session tracking table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='TestSessions' AND xtype='U')
BEGIN
    CREATE TABLE TestSessions (
        SessionId NVARCHAR(50) PRIMARY KEY,
        ProtocolFileName NVARCHAR(255) NOT NULL,
        StartTime DATETIME2 NOT NULL,
        EndTime DATETIME2 NULL,
        Status NVARCHAR(20) NOT NULL DEFAULT 'Running',
        ConfigurationName NVARCHAR(100) NULL,
        ServerProcessId INT NULL,
        ClientProcessId INT NULL,
        ErrorMessage NVARCHAR(MAX) NULL,
        CreatedBy NVARCHAR(100) NOT NULL DEFAULT SYSTEM_USER,
        CreatedDate DATETIME2 NOT NULL DEFAULT GETDATE()
    )
END
GO

-- Create test execution log table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='TestExecutionLogs' AND xtype='U')
BEGIN
    CREATE TABLE TestExecutionLogs (
        LogId INT IDENTITY(1,1) PRIMARY KEY,
        SessionId NVARCHAR(50) NOT NULL,
        LogLevel NVARCHAR(10) NOT NULL,
        LogMessage NVARCHAR(MAX) NOT NULL,
        LogTimestamp DATETIME2 NOT NULL DEFAULT GETDATE(),
        Component NVARCHAR(50) NULL,
        FOREIGN KEY (SessionId) REFERENCES TestSessions(SessionId)
    )
END
GO

-- Create protocol file validation results table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ValidationResults' AND xtype='U')
BEGIN
    CREATE TABLE ValidationResults (
        ValidationId INT IDENTITY(1,1) PRIMARY KEY,
        SessionId NVARCHAR(50) NOT NULL,
        FileName NVARCHAR(255) NOT NULL,
        IsValid BIT NOT NULL,
        ValidationErrors NVARCHAR(MAX) NULL,
        SchemaVersion NVARCHAR(20) NULL,
        ValidatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        FOREIGN KEY (SessionId) REFERENCES TestSessions(SessionId)
    )
END
GO

-- Create test metrics table for performance tracking
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='TestMetrics' AND xtype='U')
BEGIN
    CREATE TABLE TestMetrics (
        MetricId INT IDENTITY(1,1) PRIMARY KEY,
        SessionId NVARCHAR(50) NOT NULL,
        MetricName NVARCHAR(100) NOT NULL,
        MetricValue NVARCHAR(255) NOT NULL,
        MetricType NVARCHAR(50) NOT NULL, -- 'Duration', 'Count', 'Size', etc.
        RecordedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        FOREIGN KEY (SessionId) REFERENCES TestSessions(SessionId)
    )
END
GO

-- Create indexes for better performance
CREATE NONCLUSTERED INDEX IX_TestSessions_StartTime ON TestSessions(StartTime)
CREATE NONCLUSTERED INDEX IX_TestExecutionLogs_SessionId_Timestamp ON TestExecutionLogs(SessionId, LogTimestamp)
CREATE NONCLUSTERED INDEX IX_ValidationResults_SessionId ON ValidationResults(SessionId)
CREATE NONCLUSTERED INDEX IX_TestMetrics_SessionId ON TestMetrics(SessionId)
GO

-- Insert initial test data if needed
IF NOT EXISTS (SELECT * FROM TestSessions WHERE SessionId = 'SYSTEM_INIT')
BEGIN
    INSERT INTO TestSessions (SessionId, ProtocolFileName, StartTime, Status, ConfigurationName)
    VALUES ('SYSTEM_INIT', 'SystemInitialization.json', GETDATE(), 'Completed', 'System')
    
    INSERT INTO TestExecutionLogs (SessionId, LogLevel, LogMessage, Component)
    VALUES ('SYSTEM_INIT', 'INFO', 'Database initialized successfully', 'Database')
END
GO

PRINT 'Test database setup completed successfully'

-- ============================================================================
-- sql/clear_data.sql
-- Clear previous test data while preserving structure
-- ============================================================================

USE ProtocolFileTestDB
GO

-- Clear test data from previous runs (keep last 24 hours for reference)
DECLARE @CutoffDate DATETIME2 = DATEADD(HOUR, -24, GETDATE())

-- Delete old test metrics
DELETE FROM TestMetrics 
WHERE SessionId IN (
    SELECT SessionId FROM TestSessions 
    WHERE StartTime < @CutoffDate AND Status IN ('Completed', 'Failed', 'Stopped')
)

-- Delete old validation results  
DELETE FROM ValidationResults
WHERE SessionId IN (
    SELECT SessionId FROM TestSessions 
    WHERE StartTime < @CutoffDate AND Status IN ('Completed', 'Failed', 'Stopped')
)

-- Delete old execution logs
DELETE FROM TestExecutionLogs 
WHERE SessionId IN (
    SELECT SessionId FROM TestSessions 
    WHERE StartTime < @CutoffDate AND Status IN ('Completed', 'Failed', 'Stopped')
)

-- Delete old test sessions
DELETE FROM TestSessions 
WHERE StartTime < @CutoffDate AND Status IN ('Completed', 'Failed', 'Stopped')

PRINT 'Previous test data cleared successfully'

-- ============================================================================
-- sql/cleanup_test_data.sql  
-- Cleanup script to run after test completion
-- ============================================================================

USE ProtocolFileTestDB
GO

-- Update any running sessions that might have been left hanging
UPDATE TestSessions 
SET Status = 'Stopped', 
    EndTime = GETDATE(),
    ErrorMessage = 'Session terminated during cleanup'
WHERE Status = 'Running' 
  AND StartTime < DATEADD(HOUR, -1, GETDATE())

-- Log cleanup operation
INSERT INTO TestExecutionLogs (SessionId, LogLevel, LogMessage, Component)
SELECT 'CLEANUP_' + CONVERT(NVARCHAR(20), GETDATE(), 112), 
       'INFO', 
       'Cleanup operation completed - updated ' + CAST(@@ROWCOUNT AS NVARCHAR(10)) + ' hanging sessions',
       'Cleanup'

PRINT 'Test data cleanup completed successfully'

-- ============================================================================
-- sql/test_metrics_insert.sql
-- Example script for inserting test metrics during execution
-- ============================================================================

USE ProtocolFileTestDB
GO

-- This script would be called by the extension to log metrics
-- Parameters would be passed in by the extension

DECLARE @SessionId NVARCHAR(50) = '$(SessionId)'
DECLARE @MetricName NVARCHAR(100) = '$(MetricName)'  
DECLARE @MetricValue NVARCHAR(255) = '$(MetricValue)'
DECLARE @MetricType NVARCHAR(50) = '$(MetricType)'

INSERT INTO TestMetrics (SessionId, MetricName, MetricValue, MetricType)
VALUES (@SessionId, @MetricName, @MetricValue, @MetricType)

PRINT 'Metric logged: ' + @MetricName + ' = ' + @MetricValue

-- ============================================================================
-- sql/get_test_statistics.sql
-- Query to retrieve test execution statistics
-- ============================================================================

USE ProtocolFileTestDB
GO

-- Test execution summary for the last 30 days
SELECT 
    ConfigurationName,
    COUNT(*) as TotalTests,
    SUM(CASE WHEN Status = 'Completed' THEN 1 ELSE 0 END) as SuccessfulTests,
    SUM(CASE WHEN Status = 'Failed' THEN 1 ELSE 0 END) as FailedTests,
    SUM(CASE WHEN Status = 'Stopped' THEN 1 ELSE 0 END) as StoppedTests,
    AVG(DATEDIFF(SECOND, StartTime, ISNULL(EndTime, GETDATE()))) as AvgDurationSeconds,
    MIN(StartTime) as FirstTest,
    MAX(StartTime) as LastTest
FROM TestSessions 
WHERE StartTime >= DATEADD(DAY, -30, GETDATE())
  AND SessionId != 'SYSTEM_INIT'
GROUP BY ConfigurationName
ORDER BY LastTest DESC

-- Most common validation errors
SELECT TOP 10
    LEFT(ValidationErrors, 100) as ErrorSnippet,
    COUNT(*) as Occurrences,
    MAX(ValidatedAt) as LastOccurrence
FROM ValidationResults 
WHERE IsValid = 0 
  AND ValidatedAt >= DATEADD(DAY, -30, GETDATE())
  AND ValidationErrors IS NOT NULL
GROUP BY LEFT(ValidationErrors, 100)
ORDER BY Occurrences DESC

-- Performance metrics trend
SELECT 
    MetricName,
    AVG(CAST(MetricValue AS FLOAT)) as AverageValue,
    MIN(CAST(MetricValue AS FLOAT)) as MinValue,
    MAX(CAST(MetricValue AS FLOAT)) as MaxValue,
    COUNT(*) as SampleCount
FROM TestMetrics 
WHERE RecordedAt >= DATEADD(DAY, -7, GETDATE())
  AND MetricType = 'Duration'
  AND ISNUMERIC(MetricValue) = 1
GROUP BY MetricName
ORDER BY MetricName