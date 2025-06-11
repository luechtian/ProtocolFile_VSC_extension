# ProtocolFile Enhanced Testing Suite

A comprehensive VSCode extension for laboratory testing teams to create, validate, and run ProtocolFile and TestDataProtocolFile configurations with sophisticated automation, database integration, and enterprise-grade configuration management.

## 🎯 Key Features

### 🔧 Advanced Configuration Management
- **JSON-Based Configuration**: Centralized `protocolfile-config.json` for all settings
- **Configuration Profiles**: Multiple environments (dev/staging/production)
- **Schema Validation**: Built-in validation for configuration files
- **Visual Configuration Editor**: Easy-to-use configuration interface

### 🗄️ Database Integration
- **SQL Script Execution**: Automated database setup and cleanup
- **Connection Management**: Configurable database connections
- **Transaction Support**: Rollback on failures
- **Performance Metrics**: Database operation tracking

### 🚀 Enhanced Test Runner
- **Multi-Phase Execution**: Database setup → Pre-commands → Test → Post-commands → Cleanup
- **Process Management**: Advanced server/client application lifecycle management
- **Retry Logic**: Configurable retry attempts with intelligent backoff
- **Real-time Monitoring**: Live test execution dashboard

### 📊 Advanced Reporting
- **Multiple Formats**: JSON, HTML, CSV report generation
- **Test Metrics**: Performance tracking and analytics
- **Execution Logs**: Comprehensive structured logging
- **Historical Data**: Test execution history and trends

### 🛡️ Enterprise Features
- **Error Recovery**: Automatic configuration backup and restore
- **Custom Commands**: Pre/post-test command execution
- **Email Notifications**: Success/failure alerts
- **Audit Trails**: Complete test execution tracking

## 🚀 Quick Start

### Installation
1. Install "ProtocolFile Enhanced Testing Suite" from VSCode marketplace
2. Open your laboratory protocol workspace
3. Run `Ctrl+Shift+C` to create initial configuration

### First Configuration
1. **Create Configuration**: `Ctrl+Shift+P` → "ProtocolFile: Open Configuration Editor"
2. **Basic Setup**:
   ```json
   {
     "$schema": "./schemas/protocolfile-config.schema.json",
     "configVersion": "2.0",
     "projectName": "My Laboratory Testing",
     
     "applicationPaths": {
       "serverDirectory": "../../software.comm",
       "clientDirectory": "../../software.gui",
       "serverExecutable": "software.comm.exe.bat",
       "clientExecutable": "software.gui.exe.bat"
     },
     
     "configurationFiles": {
       "serverConfigFile": "appsettings.json",
       "clientConfigFile": "app.config"
     }
   }
   ```

### Running Your First Enhanced Test
1. Open a ProtocolFile or TestDataProtocolFile
2. Press `Ctrl+Shift+T` or run "ProtocolFile: Run Enhanced Integrated Test"
3. Monitor progress in the Enhanced Test Control Panel
4. View detailed logs and reports

## 📋 Configuration Reference

### Basic Configuration Structure
```json
{
  "$schema": "./schemas/protocolfile-config.schema.json",
  "configVersion": "2.0",
  "projectName": "Laboratory Protocol Testing",
  
  "applicationPaths": { /* Application executable paths */ },
  "configurationFiles": { /* Configuration file settings */ },
  "serverConfiguration": { /* Server-specific settings */ },
  "clientConfiguration": { /* Client-specific settings */ },
  "databaseOperations": { /* Database integration */ },
  "testExecution": { /* Test execution parameters */ },
  "validation": { /* Validation settings */ },
  "logging": { /* Logging configuration */ },
  "errorHandling": { /* Error handling rules */ },
  "reporting": { /* Report generation */ },
  "customCommands": { /* Custom command hooks */ }
}
```

### Application Paths
```json
{
  "applicationPaths": {
    "serverDirectory": "../../software.comm",
    "clientDirectory": "../../software.gui",
    "serverExecutable": "software.comm.exe.bat",
    "serverExecutableAlt": "software.comm.exe",
    "clientExecutable": "software.gui.exe.bat",
    "clientExecutableAlt": "software.gui.exe"
  }
}
```

### Database Integration
```json
{
  "databaseOperations": {
    "enabled": true,
    "connectionString": "Server=localhost;Database=TestDB;Trusted_Connection=true;",
    "setupScripts": [
      {
        "name": "Initialize Test Database",
        "path": "./sql/setup_test_db.sql",
        "description": "Creates test database and tables",
        "required": true
      }
    ],
    "cleanupScripts": [
      {
        "name": "Cleanup Test Data",
        "path": "./sql/cleanup_test_data.sql",
        "required": true
      }
    ]
  }
}
```

### Custom Commands
```json
{
  "testExecution": {
    "preTestCommands": [
      {
        "name": "Environment Check",
        "command": "powershell",
        "args": ["-Command", "Test-Path './dependencies' -PathType Container"],
        "description": "Verify dependencies exist"
      }
    ],
    "postTestCommands": [
      {
        "name": "Generate Summary",
        "command": "node",
        "args": ["scripts/generate-summary.js"],
        "description": "Generate test summary"
      }
    ]
  }
}
```

## 📋 Commands & Shortcuts

### Essential Commands
| Command | Shortcut | Description |
|---------|----------|-------------|
| Open Configuration Editor | `Ctrl+Shift+C` | Edit main configuration file |
| Run Enhanced Test | `Ctrl+Shift+T` | Execute full test scenario |
| Validate File | `Ctrl+Shift+V` | Validate current protocol file |
| Generate Template | `Ctrl+Shift+N` | Create new protocol templates |

### Advanced Commands
| Command | Description |
|---------|-------------|
| Create Configuration Profile | Create environment-specific configurations |
| Show Test Logs | View detailed execution logs |
| Export Configuration | Export current configuration |
| Import Configuration | Import configuration from file |
| Validate All Files | Batch validate all protocol files |

## 🎨 Configuration Templates & Snippets

### Configuration Snippets
- `config-basic` - Basic configuration template
- `config-database` - Database-enabled configuration
- `config-advanced` - Full-featured configuration
- `sql-script` - SQL script definition
- `custom-command` - Custom command definition

### Protocol File Snippets
- `protocol-basic` - Basic ProtocolFile template
- `testdata-basic` - Basic TestDataProtocolFile template
- `method-info` - Method information block
- `assay-info` - Assay information configuration

## 🏗️ Project Structure

### Recommended Directory Layout
```
your-laboratory-project/
├── protocolfile-config.json              # Main configuration
├── schemas/                               # JSON schemas
│   ├── protocolfile-config.schema.json
│   ├── ProtocolFile.schema.json
│   └── testDataProtocolFile.schema.json
├── profiles/                              # Environment profiles
│   ├── development.protocolfile-config.json
│   ├── staging.protocolfile-config.json
│   └── production.protocolfile-config.json
├── sql/                                   # Database scripts
│   ├── setup_test_db.sql
│   ├── clear_data.sql
│   └── cleanup_test_data.sql
├── protocols/                             # Protocol files
│   ├── NL1XT_Protocol.json
│   ├── AD1XT_Protocol.json
│   └── TestData_Happy_Path.json
├── logs/                                  # Test execution logs
├── reports/                               # Generated reports
└── .vscode/
    ├── tasks.json                         # VSCode tasks
    └── settings.json                      # VSCode settings
```

## 🔧 Database Integration

### Setup Database Operations
1. **Enable Database Operations**:
   ```json
   {
     "databaseOperations": {
       "enabled": true,
       "connectionString": "Server=localhost;Database=TestDB;Trusted_Connection=true;"
     }
   }
   ```

2. **Create SQL Scripts**:
   - `sql/setup_test_db.sql` - Database initialization
   - `sql/clear_data.sql` - Clear previous test data
   - `sql/cleanup_test_data.sql` - Post-test cleanup

3. **Configure Script Execution**:
   ```json
   {
     "setupScripts": [
       {
         "name": "Initialize Database",
         "path": "./sql/setup_test_db.sql",
         "required": true,
         "timeout": 300
       }
     ]
   }
   ```

### Example SQL Operations
```sql
-- Create test session tracking
CREATE TABLE TestSessions (
    SessionId NVARCHAR(50) PRIMARY KEY,
    ProtocolFileName NVARCHAR(255) NOT NULL,
    StartTime DATETIME2 NOT NULL,
    Status NVARCHAR(20) NOT NULL
);

-- Log test execution
INSERT INTO TestSessions (SessionId, ProtocolFileName, StartTime, Status)
VALUES (@SessionId, @ProtocolFile, GETDATE(), 'Running');
```

## 📊 Reporting & Analytics

### Report Configuration
```json
{
  "reporting": {
    "generateReports": true,
    "reportDirectory": "./reports",
    "reportFormats": ["json", "html"],
    "includeTimestamp": true,
    "includeSystemInfo": true
  }
}
```

### Generated Reports
- **JSON Reports**: Machine-readable test results
- **HTML Reports**: Human-readable test summaries
- **CSV Reports**: Data for analysis tools
- **Log Files**: Detailed execution traces

### Report Contents
- Test execution summary
- Performance metrics
- Validation results
- Error analysis
- System information
- Configuration snapshot

## 🛡️ Error Handling & Recovery

### Automatic Recovery
```json
{
  "errorHandling": {
    "autoRestoreOnFailure": true,
    "continueOnNonCriticalErrors": false,
    "emailNotifications": {
      "enabled": true,
      "recipients": ["admin@lab.com"],
      "onFailure": true
    }
  }
}
```

### Recovery Features
- **Configuration Backup**: Automatic backup before modifications
- **Process Cleanup**: Terminate hanging processes
- **Database Rollback**: Undo database changes on failure
- **Retry Logic**: Configurable retry attempts
- **Notification System**: Email alerts for failures

## 🧪 Testing Workflows

### Development Workflow
1. **Create Protocol**: Use templates and snippets
2. **Validate Schema**: Real-time validation while typing
3. **Test Locally**: Run with development profile
4. **Debug Issues**: Use detailed logs and error reporting
5. **Commit Changes**: Version control configuration

### CI/CD Integration
```json
// VSCode Tasks for automation
{
  "label": "CI: Validate All Protocols",
  "type": "protocolfile",
  "action": "validate-all",
  "group": "test"
}
```

### Multi-Environment Testing
```bash
# Development
code --command "protocolfile.runTest" --profile development

# Staging  
code --command "protocolfile.runTest" --profile staging

# Production
code --command "protocolfile.runTest" --profile production
```

## 🔧 Advanced Configuration

### Profile Management
Create environment-specific configurations:

```bash
# Create development profile
Ctrl+Shift+P → "ProtocolFile: Create Configuration Profile" → "development"

# Use profile for testing
Select profile in test execution
```

### Custom Validation Rules
```json
{
  "validation": {
    "enableSchemaValidation": true,
    "enableBusinessRuleValidation": true,
    "customValidationRules": [
      {
        "name": "RequiredFields",
        "rule": "MethodInformation.Id must not be empty",
        "severity": "error"
      }
    ]
  }
}
```

### Logging Configuration
```json
{
  "logging": {
    "enableTestLogging": true,
    "logDirectory": "./logs",
    "logLevel": "info",
    "retainLogDays": 30,
    "logFormat": "timestamp"
  }
}
```

## 🚀 Performance Optimization

### Configuration Best Practices
- Use relative paths for portability
- Enable only needed database operations
- Configure appropriate timeouts
- Use profiles for different environments
- Regular cleanup of logs and reports

### Resource Management
- Process lifecycle management
- Memory usage monitoring
- Database connection pooling
- Log rotation and cleanup
- Report archival

## 🆘 Troubleshooting

### Common Issues

**Configuration Not Loading**
- Verify `protocolfile-config.json` syntax
- Check schema validation errors
- Ensure file is in workspace root

**Database Connection Failed**
- Test connection string separately
- Verify SQL Server accessibility
- Check authentication credentials

**Process Startup Issues**
- Verify executable paths exist
- Check file permissions
- Review startup delay settings

**Test Execution Hanging**
- Check timeout configurations
- Review process management settings
- Examine detailed logs

### Debug Information
1. **View Output**: `View` → `Output` → `ProtocolFile`
2. **Check Logs**: Review files in `./logs/` directory
3. **Validate Configuration**: Use schema validation
4. **Test Connection**: Use database connection test

## 📚 Migration from v1.x

See [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md) for detailed migration instructions from legacy versions.

### Quick Migration Steps
1. **Backup Settings**: Export current VSCode settings
2. **Create Configuration**: Use configuration editor
3. **Migrate Paths**: Copy application paths to new format
4. **Test Migration**: Validate with simple test execution

## 🤝 Contributing

### Development Setup
```bash
git clone https://github.com/your-org/protocolfile-enhanced
cd protocolfile-enhanced
npm install
npm run compile
```

### Building Extension
```bash
npm run package
```

### Testing
```bash
npm test
```

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: Press `F1` → "ProtocolFile: Show Help"
- **Configuration Help**: Use IntelliSense in configuration files
- **Quick Actions**: Click "ProtocolFile" in status bar
- **Issues**: Report via GitHub Issues
- **Discussions**: GitHub Discussions for questions

## 🎉 What's New in v2.0

### 🔧 Revolutionary Configuration System
- Replace hardcoded paths with flexible JSON configuration
- Multiple environment profiles (dev/staging/production)
- Schema-validated configuration with IntelliSense
- Visual configuration editor with validation

### 🗄️ Database Integration
- SQL script execution for setup and cleanup
- Transaction support with automatic rollback
- Performance metrics and monitoring
- Connection management and pooling

### 📊 Enterprise Reporting
- Multiple report formats (JSON, HTML, CSV)
- Historical test execution data
- Performance analytics and trends
- Customizable report templates

### 🛡️ Advanced Error Handling
- Automatic configuration backup and restore
- Intelligent retry logic with backoff
- Comprehensive error tracking
- Email notification system

### 🚀 Enhanced Test Runner
- Multi-phase test execution
- Custom pre/post-test commands
- Real-time test monitoring dashboard
- Process lifecycle management

The Enhanced ProtocolFile extension transforms your laboratory testing workflow with enterprise-grade automation, comprehensive error handling, and sophisticated configuration management.