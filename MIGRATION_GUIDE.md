# Migration Guide: VSCode Extension v1.x to v2.0

This guide will help you migrate from the legacy VSCode ProtocolFile extension to the new enhanced version with sophisticated configuration management.

## 🎯 What's New in v2.0

### Enhanced Features
- **Configuration-Based Testing**: Replace hardcoded paths with flexible JSON configuration
- **Database Integration**: SQL script execution for setup/cleanup operations  
- **Custom Commands**: Pre/post-test command execution
- **Advanced Reporting**: HTML and JSON reports with detailed metrics
- **Profile Management**: Multiple configuration profiles for different environments
- **Better Error Handling**: Automatic rollback and retry mechanisms
- **Comprehensive Logging**: Structured logging with configurable levels

### Breaking Changes
- Configuration now uses `protocolfile-config.json` instead of VSCode settings
- Database operations require explicit configuration
- Test execution flow includes additional phases
- Some command names have changed

## 📋 Migration Steps

### Step 1: Backup Your Current Setup

Before migrating, backup your current configuration:

```bash
# Backup your workspace settings
cp .vscode/settings.json .vscode/settings.json.backup

# Backup your run_test.bat if you have one
cp run_test.bat run_test.bat.backup
```

### Step 2: Install Enhanced Extension

1. Uninstall the old ProtocolFile extension
2. Install the new "ProtocolFile Enhanced Testing Suite" extension
3. Reload VSCode

### Step 3: Create Configuration File

#### Option A: Use the Command Palette
1. Press `Ctrl+Shift+P`
2. Run "ProtocolFile: Open Configuration Editor"
3. This creates a default `protocolfile-config.json` file

#### Option B: Use Configuration Snippets
1. Create a new file: `protocolfile-config.json`
2. Type `config-basic` and press `Tab` to insert basic template
3. Customize the paths and settings

### Step 4: Migrate Existing Settings

Transform your old VSCode settings to the new configuration format:

#### Old VSCode Settings (settings.json)
```json
{
  "protocolfile.serverDirectory": "../../software.comm",
  "protocolfile.clientDirectory": "../../software.gui", 
  "protocolfile.serverExecutable": "software.comm.exe.bat",
  "protocolfile.clientExecutable": "software.gui.exe.bat",
  "protocolfile.startupDelay": 5
}
```

#### New Configuration (protocolfile-config.json)
```json
{
  "$schema": "./schemas/protocolfile-config.schema.json",
  "configVersion": "2.0",
  "projectName": "Your Laboratory Protocol Testing",
  
  "applicationPaths": {
    "serverDirectory": "../../software.comm",
    "clientDirectory": "../../software.gui",
    "serverExecutable": "software.comm.exe.bat", 
    "clientExecutable": "software.gui.exe.bat"
  },
  
  "configurationFiles": {
    "serverConfigFile": "appsettings.json",
    "clientConfigFile": "app.config"
  },
  
  "testExecution": {
    "startupDelay": 5
  }
}
```

### Step 5: Migrate run_test.bat Logic

If you have custom `run_test.bat` logic, migrate it to the new system:

#### Database Operations
Old batch script database calls:
```batch
sqlcmd -S localhost -E -i setup.sql
```

New configuration:
```json
{
  "databaseOperations": {
    "enabled": true,
    "connectionString": "Server=localhost;Database=TestDB;Trusted_Connection=true;",
    "setupScripts": [
      {
        "name": "Initialize Database",
        "path": "./sql/setup.sql",
        "required": true
      }
    ]
  }
}
```

#### Custom Commands
Old batch script commands:
```batch
echo "Starting test preparation..."
powershell -Command "Some-CustomCommand"
```

New configuration:
```json
{
  "testExecution": {
    "preTestCommands": [
      {
        "name": "Test Preparation",
        "command": "echo",
        "args": ["Starting test preparation..."]
      },
      {
        "name": "Custom PowerShell",
        "command": "powershell",
        "args": ["-Command", "Some-CustomCommand"]
      }
    ]
  }
}
```

## 🔧 Configuration Migration Examples

### Basic Migration
```json
{
  "$schema": "./schemas/protocolfile-config.schema.json",
  "configVersion": "2.0",
  "projectName": "Migrated Laboratory Testing",
  
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

### Advanced Migration with Database
```json
{
  "$schema": "./schemas/protocolfile-config.schema.json",
  "configVersion": "2.0",
  "projectName": "Advanced Laboratory Testing Suite",
  
  "applicationPaths": {
    "serverDirectory": "../../software.comm",
    "clientDirectory": "../../software.gui",
    "serverExecutable": "software.comm.exe.bat",
    "clientExecutable": "software.gui.exe.bat"
  },
  
  "configurationFiles": {
    "serverConfigFile": "appsettings.json", 
    "clientConfigFile": "app.config"
  },
  
  "databaseOperations": {
    "enabled": true,
    "connectionString": "Server=localhost;Database=TestDB;Trusted_Connection=true;",
    "setupScripts": [
      {
        "name": "Initialize Test Database",
        "path": "./sql/setup_test_db.sql",
        "required": true
      },
      {
        "name": "Clear Previous Data", 
        "path": "./sql/clear_data.sql",
        "required": false
      }
    ],
    "cleanupScripts": [
      {
        "name": "Cleanup Test Data",
        "path": "./sql/cleanup_test_data.sql", 
        "required": true
      }
    ]
  },
  
  "testExecution": {
    "startupDelay": 5,
    "retryAttempts": 3,
    "preTestCommands": [
      {
        "name": "Verify Prerequisites",
        "command": "powershell",
        "args": ["-Command", "Test-Path '../../software.comm' -PathType Container"],
        "description": "Verify server directory exists"
      }
    ]
  },
  
  "reporting": {
    "generateReports": true,
    "reportDirectory": "./reports",
    "reportFormats": ["json", "html"],
    "includeTimestamp": true
  }
}
```

## 📁 Directory Structure

Organize your project with the new structure:

```
your-project/
├── protocolfile-config.json          # Main configuration
├── schemas/                           # JSON schemas
│   ├── protocolfile-config.schema.json
│   ├── ProtocolFile.schema.json
│   └── testDataProtocolFile.schema.json
├── profiles/                          # Configuration profiles
│   ├── development.protocolfile-config.json
│   ├── staging.protocolfile-config.json
│   └── production.protocolfile-config.json
├── sql/                              # Database scripts
│   ├── setup_test_db.sql
│   ├── clear_data.sql
│   └── cleanup_test_data.sql
├── logs/                             # Test execution logs
├── reports/                          # Generated reports
├── protocols/                        # Your protocol files
│   ├── BasicProtocol.json
│   └── TestDataProtocol.json
└── .vscode/
    ├── tasks.json                    # VSCode tasks
    └── settings.json                 # VSCode settings
```

## 🔄 Command Mapping

Old commands → New commands:

| Old Command | New Command |
|-------------|-------------|
| `protocolfile.runIntegratedTest` | `protocolfile.runIntegratedTest` (enhanced) |
| `protocolfile.configureTestPaths` | `protocolfile.openConfigurationEditor` |
| N/A | `protocolfile.createConfigurationProfile` |
| N/A | `protocolfile.showTestLogs` |
| N/A | `protocolfile.exportConfiguration` |
| N/A | `protocolfile.importConfiguration` |

## ⌨️ Keyboard Shortcuts

New shortcuts available:

| Shortcut | Command |
|----------|---------|
| `Ctrl+Shift+C` | Open Configuration Editor |
| `Ctrl+Shift+T` | Run Enhanced Integrated Test |
| `Ctrl+Shift+V` | Validate Current File |
| `Ctrl+Shift+N` | Generate Template |

## 🧪 Testing Your Migration

1. **Validate Configuration**:
   ```
   Ctrl+Shift+P → "ProtocolFile: Open Configuration Editor"
   ```
   Look for any schema validation errors.

2. **Test Basic Functionality**:
   - Open a protocol file
   - Press `Ctrl+Shift+V` to validate
   - Press `Ctrl+Shift+T` to run test

3. **Verify Database Operations** (if enabled):
   - Check that SQL scripts exist at specified paths
   - Test database connection string
   - Run a test to verify database operations work

4. **Check Custom Commands**:
   - Review pre/post-test commands in configuration
   - Run a test to verify commands execute correctly

## 🚨 Troubleshooting

### Configuration Not Loading
- Ensure `protocolfile-config.json` is in workspace root
- Check JSON syntax with schema validation
- Verify file permissions

### Database Connection Issues
- Test connection string separately
- Ensure SQL Server is accessible
- Check that SQL script files exist

### Path Resolution Problems
- Use relative paths from workspace root
- Verify all executable paths exist
- Check file permissions on executables

### Legacy Settings Conflicts
- Remove old settings from `.vscode/settings.json`
- Clear extension cache: `Ctrl+Shift+P` → "Developer: Reload Window"

## 🔧 Advanced Configuration

### Multiple Environments
Create profile-specific configurations:

```json
// profiles/development.protocolfile-config.json
{
  "configVersion": "2.0",
  "projectName": "Development Environment",
  "applicationPaths": {
    "serverDirectory": "../../dev/software.comm",
    "clientDirectory": "../../dev/software.gui"
  },
  "databaseOperations": {
    "enabled": true,
    "connectionString": "Server=dev-server;Database=DevTestDB;Trusted_Connection=true;"
  }
}
```

### Custom Validation Rules
Extend validation with business rules:

```json
{
  "validation": {
    "enableSchemaValidation": true,
    "enableBusinessRuleValidation": true,
    "customValidationRules": [
      {
        "name": "ProtocolFileNaming",
        "rule": "filename must contain 'Protocol'",
        "severity": "warning"
      }
    ]
  }
}
```

## 📞 Support

If you encounter issues during migration:

1. Check the extension output: `View` → `Output` → `ProtocolFile`
2. Validate your configuration against the schema
3. Review the migration checklist above
4. Create an issue with your configuration file (anonymized)

## ✅ Migration Checklist

- [ ] Backup existing configuration
- [ ] Install new extension version
- [ ] Create `protocolfile-config.json`
- [ ] Migrate VSCode settings to configuration file
- [ ] Set up database scripts (if needed)
- [ ] Configure custom commands (if needed)
- [ ] Test basic validation
- [ ] Test integrated test execution
- [ ] Verify database operations (if enabled)
- [ ] Check reporting functionality
- [ ] Remove old settings from VSCode
- [ ] Update documentation/README

## 🎉 Benefits After Migration

After successful migration, you'll have access to:

- **Flexible Configuration**: Easy to modify without changing extension settings
- **Environment Profiles**: Different configurations for dev/staging/production
- **Database Integration**: Automated database setup and cleanup
- **Enhanced Reporting**: Detailed HTML and JSON reports
- **Better Error Handling**: Automatic rollback on failures
- **Comprehensive Logging**: Structured logs for debugging
- **Custom Workflows**: Pre/post-test command execution
- **Team Collaboration**: Configuration files can be version controlled

The enhanced extension provides a more robust, flexible, and maintainable testing environment for your laboratory protocols.