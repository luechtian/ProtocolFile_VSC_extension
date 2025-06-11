# ProtocolFile VSCode Extension

A comprehensive VSCode extension for laboratory testing teams to create, validate, and run ProtocolFile and TestDataProtocolFile configurations with ease.

## 🎯 Key Features

### 🔧 Integrated Test Runner
- **No External Dependencies**: Built-in JSON schema validation replaces ConfigValidator.exe
- **Automatic Configuration Management**: Backup and restore server/client configurations
- **Process Management**: Start and monitor server/client applications
- **Real-time Control Panel**: Monitor and control running tests

### 📄 Smart Templates & Snippets
- **Laboratory-Focused Templates**: Purpose-built for medical/laboratory protocols
- **Multiple Assay Types**: NL1XT, AD1XT, AntiHIV protocol templates
- **Test Data Scenarios**: Pre-built simulation scenarios (Happy Path, BRE, NCE, WCE, etc.)
- **IntelliSense Support**: Rich autocomplete and validation

### ✅ Advanced Validation
- **Dual Schema Support**: Separate validation for ProtocolFile and TestDataProtocolFile
- **Real-time Validation**: Live validation while typing
- **Detailed Error Reporting**: Precise error locations with helpful messages
- **Batch Validation**: Validate multiple files at once

## 🚀 Quick Start

### Installation
1. Install the extension from the VSCode marketplace
2. Open a workspace containing your protocol files
3. Configure test paths: `Ctrl+Shift+P` → "ProtocolFile: Configure Test Paths"

### First Protocol
1. Press `Ctrl+Shift+N` or use Command Palette → "ProtocolFile: Generate Template"
2. Choose from available templates (Basic, NL1XT, AD1XT, AntiHIV, TestData)
3. Enter protocol name and save the file

### Running Tests
1. Open a ProtocolFile or TestDataProtocolFile
2. Press `Ctrl+Shift+T` or use "ProtocolFile: Run Integrated Test"
3. The extension will:
   - Validate your protocol file
   - Backup existing configurations
   - Update server/client configurations
   - Start applications
   - Show test control panel

## 📋 Commands & Shortcuts

| Command | Shortcut | Description |
|---------|----------|-------------|
| Generate Template | `Ctrl+Shift+N` | Create new protocol templates |
| Validate File | `Ctrl+Shift+V` | Validate current protocol file |
| Run Integrated Test | `Ctrl+Shift+T` | Start complete test scenario |
| Configure Test Paths | - | Set up server/client directories |
| Generate Test Data | - | Create simulation test scenarios |
| Compare Files | - | Side-by-side protocol comparison |
| Quick Actions | Click status bar | Access all features quickly |

## 🎨 Available Templates

### ProtocolFile Templates
- **📄 Basic ProtocolFile**: Standard laboratory protocol structure
- **🧪 NL1XT Protocol**: NL1XT assay-specific template
- **🧪 AD1XT Protocol**: AD1XT assay-specific template  
- **🧪 AntiHIV Protocol**: AntiHIV assay-specific template

### TestDataProtocolFile Templates
- **📊 Basic Test Data**: Simple simulation template
- **✅ Happy Path Scenarios**: Error-free test scenarios
- **❌ Error Scenarios**: BRE, NCE, WCE, UIE error simulations
- **🔄 Complete Test Sets**: Multi-track simulation scenarios

## 🎯 Snippets Reference

### ProtocolFile Snippets
- `protocol-basic` - Complete basic protocol template
- `method-info` - Method information block
- `assay-info` - Assay information configuration
- `calibrator-rule` - Calibrator layout rule
- `control-rule` - Control layout rule
- `loading-step` - Loading workflow step
- `processing-step` - Processing workflow step
- `required-plate` - Required plate configuration
- `required-calibrator` - Required calibrator setup

### TestData Snippets
- `testdata-basic` - Basic test data template
- `counterweight-happy` - Counterweight happy path
- `counterweight-bre` - Counterweight barcode read error
- `patient-happy` - Patient sample happy path
- `patient-nce` - Patient sample no carrier error
- `patient-wce` - Patient sample wrong carrier error
- `mfx-happy` - MFX carrier happy path
- `labware-item` - Single labware item
- `error-codes` - Error code reference

## ⚙️ Configuration

Configure the extension through VSCode settings (`Ctrl+,`):

```json
{
  "protocolfile.serverDirectory": "../../software.comm",
  "protocolfile.clientDirectory": "../../software.gui", 
  "protocolfile.serverExecutable": "software.comm.exe.bat",
  "protocolfile.clientExecutable": "software.gui.exe.bat",
  "protocolfile.serverConfigFile": "appsettings.json",
  "protocolfile.clientConfigFile": "app.config",
  "protocolfile.startupDelay": 5,
  "protocolfile.enableDatabaseOperations": false,
  "protocolfile.validationOnSave": true,
  "protocolfile.enableLiveValidation": true
}
```

## 📊 File Types Supported

| File Pattern | Schema | Description |
|--------------|--------|-------------|
| `**/ProtocolFile*.json` | ProtocolFile.schema.json | Laboratory protocol definitions |
| `**/TestDataProtocolFile*.json` | testDataProtocolFile.schema.json | Simulation test data |
| `**/*.protocol.json` | ProtocolFile.schema.json | Protocol files with custom extension |

## 🔧 Integrated Test Runner

The extension replaces the need for external batch scripts and ConfigValidator.exe:

### What it does:
1. **Validates** protocol files using built-in JSON schema validation
2. **Locates** server and client configuration files
3. **Backs up** original configurations automatically
4. **Updates** server configuration (JSON) with protocol path
5. **Updates** client configuration (XML) with simulation mode
6. **Starts** server application and waits for startup
7. **Starts** client application
8. **Provides** real-time test control panel
9. **Restores** original configurations when test stops

### Benefits:
- ✅ No external dependencies
- ✅ Automatic error recovery
- ✅ Real-time process monitoring
- ✅ One-click test execution
- ✅ Configuration safety (automatic backup/restore)

## 🎯 Error Scenarios

The extension includes pre-built test scenarios for common error conditions:

| Error Code | Abbreviation | Description |
|------------|--------------|-------------|
| 0 | Happy Path | No errors, normal operation |
| 5 | BRE | Barcode Read Error |
| 9 | NCE | No Carrier Error |
| 100 | WCE | Wrong Carrier Error |
| - | UIE | Unknown Item Error |
| - | NECE | Missing Item Error |
| - | WOE | Wrong Item Order Error |
| - | REE | RegEx Error |

## 🚀 Advanced Features

### Test Control Panel
- Real-time test status monitoring
- One-click test stop/restart
- Configuration status display
- Process management controls

### Batch Operations
- Validate multiple protocol files
- Compare protocol versions
- Export protocols to different formats

### Integration Support
- Git change tracking
- CI/CD pipeline integration
- Automated report generation

## 🛠️ Development

### Building the Extension
```bash
npm install
npm run compile
npm run package
```

### Testing
```bash
npm test
```

## 📝 Changelog

### Version 2.0.0
- ✨ **NEW**: Integrated test runner (no external dependencies)
- ✨ **NEW**: Built-in JSON schema validation
- ✨ **NEW**: Laboratory-focused templates and snippets
- ✨ **NEW**: TestDataProtocolFile support
- ✨ **NEW**: Real-time test control panel
- ✨ **NEW**: Automatic configuration backup/restore
- ✨ **NEW**: Process management for server/client applications
- 🔧 **IMPROVED**: Error reporting with precise locations
- 🔧 **IMPROVED**: User experience for non-developers
- 🔧 **IMPROVED**: Configuration management

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

- **Documentation**: Press `F1` → "ProtocolFile: Show Help"
- **Quick Actions**: Click the "ProtocolFile" text in the status bar
- **Issues**: Report bugs through the VSCode extension marketplace

## 🎉 What's New

### 🔧 No More External Dependencies
The extension now includes everything needed to validate and run tests. No more missing ConfigValidator.exe or complex batch script setup!

### 🎯 Built for Testing Teams
Every feature is designed with non-developer testing teams in mind:
- Simple one-click operations
- Clear error messages
- Automatic configuration management
- Visual test control panel

### 📊 Complete Laboratory Support
Templates and validation are specifically designed for laboratory protocols with proper support for:
- Method and assay information
- Loading and processing workflows
- Calibrator and control layouts
- Simulation test data scenarios

---

**Ready to streamline your laboratory testing workflow? Install the ProtocolFile Master Suite today!** 🚀
