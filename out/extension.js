"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const child_process = __importStar(require("child_process"));
const ajv_1 = __importDefault(require("ajv"));
// ============================================================================
// GLOBAL VARIABLES
// ============================================================================
let diagnosticsCollection;
let statusBarItem;
let currentTestSession = null;
let testControlPanel = null;
let outputChannel;
// ============================================================================
// EXTENSION ACTIVATION
// ============================================================================
function activate(context) {
    console.log('Enhanced ProtocolFile extension is now active!');
    // Initialize components
    outputChannel = vscode.window.createOutputChannel('ProtocolFile');
    diagnosticsCollection = vscode.languages.createDiagnosticCollection('protocolfile');
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    setupStatusBar(statusBarItem);
    // Register commands
    const commands = [
        vscode.commands.registerCommand('protocolfile.generateTemplate', generateTemplate),
        vscode.commands.registerCommand('protocolfile.validateProtocolFile', validateProtocolFile),
        vscode.commands.registerCommand('protocolfile.runIntegratedTest', runIntegratedTest),
        vscode.commands.registerCommand('protocolfile.openConfigurationEditor', openConfigurationEditor),
        vscode.commands.registerCommand('protocolfile.createConfigurationProfile', createConfigurationProfile),
        vscode.commands.registerCommand('protocolfile.configureTestPaths', configureTestPaths),
        vscode.commands.registerCommand('protocolfile.stopRunningTest', stopRunningTest),
        vscode.commands.registerCommand('protocolfile.showQuickActions', showQuickActions),
        vscode.commands.registerCommand('protocolfile.validateAllFiles', quickValidateAllFiles),
        vscode.commands.registerCommand('protocolfile.compareProtocolFiles', compareProtocolFiles),
        vscode.commands.registerCommand('protocolfile.generateTestData', generateTestData),
        vscode.commands.registerCommand('protocolfile.showTestLogs', showTestLogs),
        vscode.commands.registerCommand('protocolfile.exportConfiguration', exportConfiguration),
        vscode.commands.registerCommand('protocolfile.importConfiguration', importConfiguration)
    ];
    // Register event handlers
    const eventHandlers = [
        vscode.workspace.onDidSaveTextDocument(onDocumentSaved),
        vscode.window.onDidChangeActiveTextEditor(updateStatusBar.bind(null, statusBarItem)),
        vscode.workspace.onDidChangeTextDocument(onDocumentChanged)
    ];
    // Add to subscriptions
    context.subscriptions.push(...commands, ...eventHandlers, diagnosticsCollection, statusBarItem, outputChannel);
    // Initial setup
    updateStatusBar(statusBarItem, vscode.window.activeTextEditor);
    showWelcomeMessage(context);
}
// ============================================================================
// CONFIGURATION MANAGEMENT
// ============================================================================
async function loadConfiguration() {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        vscode.window.showErrorMessage('No workspace folder found');
        return null;
    }
    const configPath = path.join(workspaceFolder.uri.fsPath, 'protocolfile-config.json');
    try {
        if (!fs.existsSync(configPath)) {
            logMessage('info', `Configuration file not found at ${configPath}. Using default settings.`);
            return getDefaultConfiguration();
        }
        const configContent = await fs.promises.readFile(configPath, 'utf8');
        const config = JSON.parse(configContent);
        // Validate configuration against schema
        const isValid = await validateConfiguration(config);
        if (!isValid) {
            vscode.window.showErrorMessage('Configuration file contains errors. Using default settings.');
            return getDefaultConfiguration();
        }
        logMessage('info', 'Configuration loaded successfully');
        return config;
    }
    catch (error) {
        logMessage('error', `Failed to load configuration: ${error}`);
        vscode.window.showErrorMessage(`Failed to load configuration: ${error}`);
        return getDefaultConfiguration();
    }
}
async function validateConfiguration(config) {
    try {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder)
            return false;
        const schemaPath = path.join(workspaceFolder.uri.fsPath, 'schemas', 'protocolfile-config.schema.json');
        if (!fs.existsSync(schemaPath)) {
            logMessage('warn', 'Configuration schema not found. Skipping validation.');
            return true;
        }
        const schemaContent = await fs.promises.readFile(schemaPath, 'utf8');
        const schema = JSON.parse(schemaContent);
        const ajv = new ajv_1.default();
        const validate = ajv.compile(schema);
        const valid = validate(config);
        if (!valid) {
            logMessage('error', `Configuration validation failed: ${JSON.stringify(validate.errors)}`);
            return false;
        }
        return true;
    }
    catch (error) {
        logMessage('error', `Configuration validation error: ${error}`);
        return false;
    }
}
function getDefaultConfiguration() {
    return {
        configVersion: "2.0",
        projectName: "Default Laboratory Protocol Testing",
        applicationPaths: {
            serverDirectory: "../../software.comm",
            clientDirectory: "../../software.gui",
            serverExecutable: "software.comm.exe.bat",
            serverExecutableAlt: "software.comm.exe",
            clientExecutable: "software.gui.exe.bat",
            clientExecutableAlt: "software.gui.exe"
        },
        configurationFiles: {
            serverConfigFile: "appsettings.json",
            clientConfigFile: "app.config",
            backupSuffix: ".backup"
        },
        serverConfiguration: {
            format: "json",
            simulationProtocolKey: "SimulationProtocol",
            simulationProtocolPrefix: "--SimulationMode true"
        },
        clientConfiguration: {
            format: "xml",
            simulationModeKey: "SimulationMode",
            simulationModeValue: "true"
        },
        testExecution: {
            startupDelay: 5,
            shutdownTimeout: 30,
            retryAttempts: 3
        },
        validation: {
            enableSchemaValidation: true,
            enableBusinessRuleValidation: true,
            validateOnSave: true,
            enableLiveValidation: true
        },
        logging: {
            enableTestLogging: true,
            logDirectory: "./logs",
            logLevel: "info",
            retainLogDays: 30,
            logFormat: "timestamp"
        },
        errorHandling: {
            autoRestoreOnFailure: true,
            continueOnNonCriticalErrors: false
        },
        reporting: {
            generateReports: true,
            reportDirectory: "./reports",
            reportFormats: ["json", "html"],
            includeTimestamp: true,
            includeSystemInfo: true
        }
    };
}
// ============================================================================
// NEW COMMANDS
// ============================================================================
async function openConfigurationEditor() {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        vscode.window.showErrorMessage('No workspace folder found');
        return;
    }
    const configPath = path.join(workspaceFolder.uri.fsPath, 'protocolfile-config.json');
    try {
        // Create config file if it doesn't exist
        if (!fs.existsSync(configPath)) {
            const defaultConfig = getDefaultConfiguration();
            await fs.promises.writeFile(configPath, JSON.stringify(defaultConfig, null, 2));
            vscode.window.showInformationMessage('Created new configuration file');
        }
        // Open the configuration file
        const doc = await vscode.workspace.openTextDocument(configPath);
        await vscode.window.showTextDocument(doc);
        vscode.window.showInformationMessage('Configuration editor opened. Edit and save to apply changes.');
    }
    catch (error) {
        vscode.window.showErrorMessage(`Failed to open configuration editor: ${error}`);
    }
}
async function createConfigurationProfile() {
    const profileName = await vscode.window.showInputBox({
        prompt: 'Enter configuration profile name',
        validateInput: (value) => {
            if (!value || value.trim() === '') {
                return 'Profile name cannot be empty';
            }
            if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
                return 'Profile name can only contain letters, numbers, hyphens, and underscores';
            }
            return null;
        }
    });
    if (!profileName)
        return;
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        vscode.window.showErrorMessage('No workspace folder found');
        return;
    }
    try {
        const profilesDir = path.join(workspaceFolder.uri.fsPath, 'profiles');
        if (!fs.existsSync(profilesDir)) {
            await fs.promises.mkdir(profilesDir, { recursive: true });
        }
        const profilePath = path.join(profilesDir, `${profileName}.protocolfile-config.json`);
        if (fs.existsSync(profilePath)) {
            const overwrite = await vscode.window.showWarningMessage(`Profile '${profileName}' already exists. Overwrite?`, 'Yes', 'No');
            if (overwrite !== 'Yes')
                return;
        }
        const defaultConfig = getDefaultConfiguration();
        defaultConfig.projectName = `${profileName} Laboratory Protocol Testing`;
        defaultConfig.description = `Configuration profile for ${profileName}`;
        await fs.promises.writeFile(profilePath, JSON.stringify(defaultConfig, null, 2));
        const action = await vscode.window.showInformationMessage(`Configuration profile '${profileName}' created successfully!`, 'Open Profile', 'Copy to Main Config');
        if (action === 'Open Profile') {
            const doc = await vscode.workspace.openTextDocument(profilePath);
            await vscode.window.showTextDocument(doc);
        }
        else if (action === 'Copy to Main Config') {
            const mainConfigPath = path.join(workspaceFolder.uri.fsPath, 'protocolfile-config.json');
            await fs.promises.copyFile(profilePath, mainConfigPath);
            vscode.window.showInformationMessage('Profile copied to main configuration');
        }
    }
    catch (error) {
        vscode.window.showErrorMessage(`Failed to create configuration profile: ${error}`);
    }
}
// ============================================================================
// ENHANCED TEST EXECUTION
// ============================================================================
async function runIntegratedTest() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage('❌ No active editor found');
        return;
    }
    if (currentTestSession) {
        const action = await vscode.window.showWarningMessage('⚠️ A test is already running. Stop it first?', 'Stop Current Test', 'Cancel');
        if (action === 'Stop Current Test') {
            await stopRunningTest();
        }
        else {
            return;
        }
    }
    try {
        // Load configuration
        const config = await loadConfiguration();
        if (!config) {
            vscode.window.showErrorMessage('Failed to load configuration');
            return;
        }
        // Validate protocol file first
        const isValid = await validateProtocolFileInternal(editor.document);
        if (!isValid) {
            vscode.window.showErrorMessage('Protocol file validation failed');
            return;
        }
        // Create test session
        currentTestSession = {
            id: generateSessionId(),
            protocolFile: editor.document.fileName,
            startTime: new Date(),
            config: config,
            status: 'preparing',
            logs: []
        };
        logMessage('info', `Starting integrated test with ${path.basename(editor.document.fileName)}`);
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Running Enhanced Integrated Test",
            cancellable: true
        }, async (progress, token) => {
            try {
                // Execute test phases (without database)
                await executeTestPhase(progress, token, 'Pre-test Commands', executePreTestCommands, 20);
                await executeTestPhase(progress, token, 'Configuration Backup', backupConfigurations, 30);
                await executeTestPhase(progress, token, 'Configuration Update', updateConfigurations, 40);
                await executeTestPhase(progress, token, 'Server Startup', startServerApplication, 60);
                await executeTestPhase(progress, token, 'Client Startup', startClientApplication, 80);
                await executeTestPhase(progress, token, 'Post-test Commands', executePostTestCommands, 90);
                progress.report({ increment: 100, message: "Test scenario active!" });
                if (currentTestSession) {
                    currentTestSession.status = 'running';
                    showEnhancedTestControlPanel();
                }
            }
            catch (error) {
                if (currentTestSession) {
                    currentTestSession.status = 'failed';
                }
                throw error;
            }
        });
    }
    catch (error) {
        logMessage('error', `Test failed: ${error}`);
        vscode.window.showErrorMessage(`💥 Test failed: ${error}`);
        await stopRunningTest();
    }
}
async function executeTestPhase(progress, token, phaseName, phaseFunction, incrementTo) {
    if (token.isCancellationRequested) {
        throw new Error('Test cancelled by user');
    }
    progress.report({ increment: 0, message: phaseName });
    logMessage('info', `Executing phase: ${phaseName}`);
    try {
        await phaseFunction();
        progress.report({ increment: incrementTo, message: `${phaseName} completed` });
        logMessage('info', `Phase completed: ${phaseName}`);
    }
    catch (error) {
        logMessage('error', `Phase failed: ${phaseName} - ${error}`);
        throw new Error(`${phaseName} failed: ${error}`);
    }
}
// ============================================================================
// COMMAND EXECUTION
// ============================================================================
async function executePreTestCommands() {
    const commands = currentTestSession?.config.testExecution?.preTestCommands;
    if (!commands || commands.length === 0) {
        return;
    }
    logMessage('info', 'Executing pre-test commands');
    await executeCommands(commands, 'pre-test');
}
async function executePostTestCommands() {
    const commands = currentTestSession?.config.testExecution?.postTestCommands;
    if (!commands || commands.length === 0) {
        return;
    }
    logMessage('info', 'Executing post-test commands');
    await executeCommands(commands, 'post-test');
}
async function executeCommands(commands, phase) {
    for (const command of commands) {
        await executeCommand(command, phase);
    }
}
async function executeCommand(command, phase) {
    logMessage('info', `Executing ${phase} command: ${command.name}`);
    return new Promise((resolve, reject) => {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        const workingDir = command.workingDirectory
            ? path.resolve(workspaceFolder?.uri.fsPath || '', command.workingDirectory)
            : workspaceFolder?.uri.fsPath;
        const timeout = (command.timeout || 30) * 1000;
        const args = command.args || [];
        const childProcess = child_process.spawn(command.command, args, {
            cwd: workingDir,
            stdio: 'pipe'
        });
        let output = '';
        let errorOutput = '';
        childProcess.stdout?.on('data', (data) => {
            output += data.toString();
        });
        childProcess.stderr?.on('data', (data) => {
            errorOutput += data.toString();
        });
        const timeoutId = setTimeout(() => {
            childProcess.kill();
            const error = new Error(`Command timeout: ${command.name}`);
            if (command.continueOnError) {
                logMessage('warn', `Command timeout (continuing): ${command.name}`);
                resolve();
            }
            else {
                reject(error);
            }
        }, timeout);
        childProcess.on('close', (code) => {
            clearTimeout(timeoutId);
            if (output) {
                logMessage('info', `Command output: ${output}`);
            }
            if (code === 0) {
                logMessage('info', `Command completed successfully: ${command.name}`);
                resolve();
            }
            else {
                const error = new Error(`Command failed with code ${code}: ${command.name}\\n${errorOutput}`);
                if (command.continueOnError) {
                    logMessage('warn', `Command failed (continuing): ${command.name} - ${error.message}`);
                    resolve();
                }
                else {
                    logMessage('error', `Command failed: ${command.name} - ${error.message}`);
                    reject(error);
                }
            }
        });
        childProcess.on('error', (error) => {
            clearTimeout(timeoutId);
            const commandError = new Error(`Failed to start command: ${command.name} - ${error.message}`);
            if (command.continueOnError) {
                logMessage('warn', `Failed to start command (continuing): ${command.name} - ${error.message}`);
                resolve();
            }
            else {
                logMessage('error', `Failed to start command: ${command.name} - ${error.message}`);
                reject(commandError);
            }
        });
    });
}
// ============================================================================
// ENHANCED CONFIGURATION MANAGEMENT
// ============================================================================
async function backupConfigurations() {
    if (!currentTestSession) {
        throw new Error('No active test session');
    }
    const config = currentTestSession.config;
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        throw new Error('No workspace folder found');
    }
    const serverDir = path.resolve(workspaceFolder.uri.fsPath, config.applicationPaths.serverDirectory);
    const clientDir = path.resolve(workspaceFolder.uri.fsPath, config.applicationPaths.clientDirectory);
    const backupSuffix = config.configurationFiles.backupSuffix || '.backup';
    const serverConfig = path.join(serverDir, config.configurationFiles.serverConfigFile);
    const clientConfig = path.join(clientDir, config.configurationFiles.clientConfigFile);
    const serverBackup = serverConfig + backupSuffix;
    const clientBackup = clientConfig + backupSuffix;
    // Validate paths exist
    if (!fs.existsSync(serverConfig)) {
        throw new Error(`Server configuration not found: ${serverConfig}`);
    }
    if (!fs.existsSync(clientConfig)) {
        throw new Error(`Client configuration not found: ${clientConfig}`);
    }
    // Create backups
    await fs.promises.copyFile(serverConfig, serverBackup);
    await fs.promises.copyFile(clientConfig, clientBackup);
    logMessage('info', 'Configuration files backed up successfully');
}
async function updateConfigurations() {
    if (!currentTestSession) {
        throw new Error('No active test session');
    }
    await updateServerConfiguration();
    await updateClientConfiguration();
}
async function updateServerConfiguration() {
    if (!currentTestSession)
        return;
    const config = currentTestSession.config;
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        throw new Error('No workspace folder found');
    }
    const serverDir = path.resolve(workspaceFolder.uri.fsPath, config.applicationPaths.serverDirectory);
    const serverConfigPath = path.join(serverDir, config.configurationFiles.serverConfigFile);
    const protocolFilePath = path.resolve(currentTestSession.protocolFile);
    const serverConfig = config.serverConfiguration;
    const simulationProtocolKey = serverConfig?.simulationProtocolKey || 'SimulationProtocol';
    const simulationProtocolPrefix = serverConfig?.simulationProtocolPrefix || '--SimulationMode true';
    try {
        if (serverConfig?.format === 'json') {
            const configContent = await fs.promises.readFile(serverConfigPath, 'utf8');
            const configObj = JSON.parse(configContent);
            // Update simulation protocol
            configObj[simulationProtocolKey] = `${simulationProtocolPrefix} ${protocolFilePath}`;
            // Apply additional settings
            if (serverConfig.additionalSettings) {
                Object.assign(configObj, serverConfig.additionalSettings);
            }
            await fs.promises.writeFile(serverConfigPath, JSON.stringify(configObj, null, 2));
        }
        else {
            // Handle XML/INI formats if needed
            throw new Error(`Server configuration format '${serverConfig?.format}' not yet supported`);
        }
        logMessage('info', 'Server configuration updated successfully');
    }
    catch (error) {
        throw new Error(`Failed to update server configuration: ${error}`);
    }
}
async function updateClientConfiguration() {
    if (!currentTestSession)
        return;
    const config = currentTestSession.config;
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        throw new Error('No workspace folder found');
    }
    const clientDir = path.resolve(workspaceFolder.uri.fsPath, config.applicationPaths.clientDirectory);
    const clientConfigPath = path.join(clientDir, config.configurationFiles.clientConfigFile);
    const clientConfig = config.clientConfiguration;
    const simulationModeKey = clientConfig?.simulationModeKey || 'SimulationMode';
    const simulationModeValue = clientConfig?.simulationModeValue || 'true';
    try {
        if (clientConfig?.format === 'xml') {
            const configContent = await fs.promises.readFile(clientConfigPath, 'utf8');
            let updatedConfig = configContent;
            // Update simulation mode
            const simModeRegex = new RegExp(`<add\\s+key="${simulationModeKey}"\\s+value="[^"]*"\\s*\\/>`);
            const newSimModeSetting = `<add key="${simulationModeKey}" value="${simulationModeValue}" />`;
            if (simModeRegex.test(updatedConfig)) {
                updatedConfig = updatedConfig.replace(simModeRegex, newSimModeSetting);
            }
            else {
                const appSettingsEndRegex = /<\/appSettings>/;
                if (appSettingsEndRegex.test(updatedConfig)) {
                    updatedConfig = updatedConfig.replace(appSettingsEndRegex, `    ${newSimModeSetting}\n  </appSettings>`);
                }
            }
            // Apply additional settings
            if (clientConfig.additionalSettings) {
                for (const [key, value] of Object.entries(clientConfig.additionalSettings)) {
                    const settingRegex = new RegExp(`<add\\s+key="${key}"\\s+value="[^"]*"\\s*\\/>`);
                    const newSetting = `<add key="${key}" value="${value}" />`;
                    if (settingRegex.test(updatedConfig)) {
                        updatedConfig = updatedConfig.replace(settingRegex, newSetting);
                    }
                    else {
                        const appSettingsEndRegex = /<\/appSettings>/;
                        if (appSettingsEndRegex.test(updatedConfig)) {
                            updatedConfig = updatedConfig.replace(appSettingsEndRegex, `    ${newSetting}\n  </appSettings>`);
                        }
                    }
                }
            }
            await fs.promises.writeFile(clientConfigPath, updatedConfig);
        }
        else {
            throw new Error(`Client configuration format '${clientConfig?.format}' not yet supported`);
        }
        logMessage('info', 'Client configuration updated successfully');
    }
    catch (error) {
        throw new Error(`Failed to update client configuration: ${error}`);
    }
}
// ============================================================================
// APPLICATION STARTUP
// ============================================================================
async function startServerApplication() {
    if (!currentTestSession) {
        throw new Error('No active test session');
    }
    const config = currentTestSession.config;
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        throw new Error('No workspace folder found');
    }
    const serverDir = path.resolve(workspaceFolder.uri.fsPath, config.applicationPaths.serverDirectory);
    const primaryExe = path.join(serverDir, config.applicationPaths.serverExecutable);
    const altExe = config.applicationPaths.serverExecutableAlt
        ? path.join(serverDir, config.applicationPaths.serverExecutableAlt)
        : null;
    let executablePath = primaryExe;
    if (!fs.existsSync(primaryExe) && altExe && fs.existsSync(altExe)) {
        executablePath = altExe;
    }
    if (!fs.existsSync(executablePath)) {
        throw new Error(`Server executable not found: ${executablePath}`);
    }
    logMessage('info', `Starting server application: ${executablePath}`);
    return new Promise((resolve, reject) => {
        const serverProcess = child_process.spawn(executablePath, [], {
            cwd: serverDir,
            detached: true,
            stdio: 'ignore'
        });
        currentTestSession.serverProcess = serverProcess;
        serverProcess.on('error', (error) => {
            logMessage('error', `Failed to start server: ${error}`);
            reject(new Error(`Failed to start server: ${error}`));
        });
        // Give the server time to start
        const startupDelay = (config.testExecution?.startupDelay || 5) * 1000;
        setTimeout(() => {
            logMessage('info', 'Server application started successfully');
            resolve();
        }, startupDelay);
    });
}
async function startClientApplication() {
    if (!currentTestSession) {
        throw new Error('No active test session');
    }
    const config = currentTestSession.config;
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        throw new Error('No workspace folder found');
    }
    const clientDir = path.resolve(workspaceFolder.uri.fsPath, config.applicationPaths.clientDirectory);
    const primaryExe = path.join(clientDir, config.applicationPaths.clientExecutable);
    const altExe = config.applicationPaths.clientExecutableAlt
        ? path.join(clientDir, config.applicationPaths.clientExecutableAlt)
        : null;
    let executablePath = primaryExe;
    if (!fs.existsSync(primaryExe) && altExe && fs.existsSync(altExe)) {
        executablePath = altExe;
    }
    if (!fs.existsSync(executablePath)) {
        throw new Error(`Client executable not found: ${executablePath}`);
    }
    logMessage('info', `Starting client application: ${executablePath}`);
    return new Promise((resolve, reject) => {
        const clientProcess = child_process.spawn(executablePath, [], {
            cwd: clientDir,
            detached: true,
            stdio: 'ignore'
        });
        currentTestSession.clientProcess = clientProcess;
        clientProcess.on('error', (error) => {
            logMessage('error', `Failed to start client: ${error}`);
            reject(new Error(`Failed to start client: ${error}`));
        });
        // Give the client time to start
        setTimeout(() => {
            logMessage('info', 'Client application started successfully');
            resolve();
        }, 2000);
    });
}
// ============================================================================
// ENHANCED UI COMPONENTS
// ============================================================================
function showEnhancedTestControlPanel() {
    if (!currentTestSession)
        return;
    testControlPanel = vscode.window.createWebviewPanel('enhancedTestControl', 'Enhanced Test Control Panel', vscode.ViewColumn.Two, { enableScripts: true });
    testControlPanel.webview.html = getEnhancedTestControlHTML();
    testControlPanel.webview.onDidReceiveMessage(async (message) => {
        switch (message.command) {
            case 'stopTest':
                await stopRunningTest();
                break;
            case 'restartTest':
                await stopRunningTest();
                setTimeout(() => runIntegratedTest(), 1000);
                break;
            case 'showLogs':
                await showTestLogs();
                break;
            case 'generateReport':
                await generateTestReport();
                break;
        }
    });
    testControlPanel.onDidDispose(() => {
        testControlPanel = null;
    });
}
function getEnhancedTestControlHTML() {
    if (!currentTestSession)
        return '';
    const session = currentTestSession;
    const runtime = Math.floor((Date.now() - session.startTime.getTime()) / 1000);
    return `<!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Enhanced Test Control Panel</title>
        <style>
            body { 
                font-family: Arial, sans-serif; 
                padding: 20px; 
                background: var(--vscode-editor-background);
                color: var(--vscode-foreground);
            }
            .status-panel {
                background: var(--vscode-textBlockQuote-background);
                border: 1px solid var(--vscode-textBlockQuote-border);
                border-radius: 8px;
                padding: 20px;
                margin-bottom: 20px;
            }
            .status-header {
                font-size: 18px;
                font-weight: bold;
                color: var(--vscode-textLink-foreground);
                margin-bottom: 15px;
            }
            .status-item {
                display: flex;
                justify-content: space-between;
                margin: 8px 0;
                padding: 5px 0;
                border-bottom: 1px solid var(--vscode-widget-border);
            }
            .status-label {
                font-weight: bold;
            }
            .status-running {
                color: #28a745;
            }
            .status-stopped {
                color: #dc3545;
            }
            .control-buttons {
                display: flex;
                gap: 10px;
                flex-wrap: wrap;
            }
            button {
                background: var(--vscode-button-background);
                color: var(--vscode-button-foreground);
                border: none;
                padding: 10px 20px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
            }
            button:hover {
                background: var(--vscode-button-hoverBackground);
            }
            .danger {
                background: var(--vscode-errorForeground);
            }
            .info {
                background: var(--vscode-textLink-foreground);
            }
            .logs-section {
                background: var(--vscode-editor-background);
                border: 1px solid var(--vscode-widget-border);
                border-radius: 4px;
                padding: 15px;
                margin-top: 20px;
                max-height: 300px;
                overflow-y: auto;
                font-family: monospace;
                font-size: 12px;
            }
        </style>
    </head>
    <body>
        <div class="status-panel">
            <div class="status-header">🔬 Enhanced Test Session Status</div>
            
            <div class="status-item">
                <span class="status-label">Session ID:</span>
                <span>${session.id}</span>
            </div>
            
            <div class="status-item">
                <span class="status-label">Protocol File:</span>
                <span>${path.basename(session.protocolFile)}</span>
            </div>
            
            <div class="status-item">
                <span class="status-label">Status:</span>
                <span class="status-running">${session.status.toUpperCase()}</span>
            </div>
            
            <div class="status-item">
                <span class="status-label">Runtime:</span>
                <span>${Math.floor(runtime / 60)}m ${runtime % 60}s</span>
            </div>
            
            <div class="status-item">
                <span class="status-label">Server Process:</span>
                <span class="${session.serverProcess ? 'status-running' : 'status-stopped'}">
                    ${session.serverProcess ? 'Running (PID: ' + session.serverProcess.pid + ')' : 'Stopped'}
                </span>
            </div>
            
            <div class="status-item">
                <span class="status-label">Client Process:</span>
                <span class="${session.clientProcess ? 'status-running' : 'status-stopped'}">
                    ${session.clientProcess ? 'Running (PID: ' + session.clientProcess.pid + ')' : 'Stopped'}
                </span>
            </div>
            
            <div class="status-item">
                <span class="status-label">Configuration:</span>
                <span>${session.config.projectName || 'Default'}</span>
            </div>
        </div>

        <div class="control-buttons">
            <button onclick="showLogs()" class="info">📋 Show Logs</button>
            <button onclick="generateReport()" class="info">📊 Generate Report</button>
            <button onclick="restartTest()">🔄 Restart Test</button>
            <button onclick="stopTest()" class="danger">🛑 Stop Test</button>
        </div>

        <div class="logs-section">
            <strong>Recent Log Entries:</strong><br>
            ${session.logs.slice(-10).map(log => '<div>' + log + '</div>').join('')}
        </div>

        <script>
            const vscode = acquireVsCodeApi();
            
            function stopTest() {
                vscode.postMessage({ command: 'stopTest' });
            }
            
            function restartTest() {
                vscode.postMessage({ command: 'restartTest' });
            }
            
            function showLogs() {
                vscode.postMessage({ command: 'showLogs' });
            }
            
            function generateReport() {
                vscode.postMessage({ command: 'generateReport' });
            }
        </script>
    </body>
    </html>`;
}
// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================
function generateSessionId() {
    return `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
function logMessage(level, message) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
    outputChannel.appendLine(logEntry);
    if (currentTestSession) {
        currentTestSession.logs.push(logEntry);
        // Keep only last 100 log entries
        if (currentTestSession.logs.length > 100) {
            currentTestSession.logs = currentTestSession.logs.slice(-100);
        }
    }
    // Also log to console for development
    console.log(logEntry);
}
async function showTestLogs() {
    outputChannel.show();
}
async function generateTestReport() {
    if (!currentTestSession) {
        vscode.window.showWarningMessage('No active test session');
        return;
    }
    const reportConfig = currentTestSession.config.reporting;
    if (!reportConfig?.generateReports) {
        vscode.window.showWarningMessage('Report generation is disabled in configuration');
        return;
    }
    try {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            throw new Error('No workspace folder found');
        }
        const reportDir = path.resolve(workspaceFolder.uri.fsPath, reportConfig.reportDirectory || './reports');
        // Create report directory if it doesn't exist
        if (!fs.existsSync(reportDir)) {
            await fs.promises.mkdir(reportDir, { recursive: true });
        }
        const timestamp = reportConfig.includeTimestamp ? `_${Date.now()}` : '';
        const sessionData = {
            sessionId: currentTestSession.id,
            protocolFile: currentTestSession.protocolFile,
            startTime: currentTestSession.startTime,
            endTime: new Date(),
            status: currentTestSession.status,
            configuration: currentTestSession.config.projectName,
            logs: currentTestSession.logs,
            systemInfo: reportConfig.includeSystemInfo ? {
                platform: process.platform,
                nodeVersion: process.version,
                extensionVersion: "2.0.0"
            } : undefined
        };
        const formats = reportConfig.reportFormats || ['json'];
        for (const format of formats) {
            const fileName = `test_report${timestamp}.${format}`;
            const filePath = path.join(reportDir, fileName);
            let content;
            switch (format) {
                case 'json':
                    content = JSON.stringify(sessionData, null, 2);
                    break;
                case 'html':
                    content = generateHtmlReport(sessionData);
                    break;
                default:
                    throw new Error(`Unsupported report format: ${format}`);
            }
            await fs.promises.writeFile(filePath, content);
        }
        vscode.window.showInformationMessage(`Test report generated in ${reportDir}`);
    }
    catch (error) {
        logMessage('error', `Failed to generate report: ${error}`);
        vscode.window.showErrorMessage(`Failed to generate report: ${error}`);
    }
}
function generateHtmlReport(sessionData) {
    return `<!DOCTYPE html>
    <html>
    <head>
        <title>Test Report - ${sessionData.sessionId}</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
            .section { margin: 20px 0; }
            .logs { background: #f8f9fa; padding: 15px; border-radius: 4px; max-height: 400px; overflow-y: auto; }
            .status-success { color: #28a745; }
            .status-error { color: #dc3545; }
            table { width: 100%; border-collapse: collapse; }
            th, td { text-align: left; padding: 8px; border-bottom: 1px solid #ddd; }
            th { background-color: #f2f2f2; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>ProtocolFile Test Report</h1>
            <p><strong>Session ID:</strong> ${sessionData.sessionId}</p>
            <p><strong>Generated:</strong> ${new Date().toISOString()}</p>
        </div>

        <div class="section">
            <h2>Test Summary</h2>
            <table>
                <tr><th>Property</th><th>Value</th></tr>
                <tr><td>Protocol File</td><td>${path.basename(sessionData.protocolFile)}</td></tr>
                <tr><td>Start Time</td><td>${new Date(sessionData.startTime).toLocaleString()}</td></tr>
                <tr><td>End Time</td><td>${new Date(sessionData.endTime).toLocaleString()}</td></tr>
                <tr><td>Duration</td><td>${Math.floor((new Date(sessionData.endTime).getTime() - new Date(sessionData.startTime).getTime()) / 1000)} seconds</td></tr>
                <tr><td>Status</td><td class="status-${sessionData.status === 'completed' ? 'success' : 'error'}">${sessionData.status.toUpperCase()}</td></tr>
                <tr><td>Configuration</td><td>${sessionData.configuration}</td></tr>
            </table>
        </div>

        ${sessionData.systemInfo ? `
        <div class="section">
            <h2>System Information</h2>
            <table>
                <tr><th>Property</th><th>Value</th></tr>
                <tr><td>Platform</td><td>${sessionData.systemInfo.platform}</td></tr>
                <tr><td>Node Version</td><td>${sessionData.systemInfo.nodeVersion}</td></tr>
                <tr><td>Extension Version</td><td>${sessionData.systemInfo.extensionVersion}</td></tr>
            </table>
        </div>
        ` : ''}

        <div class="section">
            <h2>Execution Logs</h2>
            <div class="logs">
                ${sessionData.logs.map((log) => '<div>' + log + '</div>').join('')}
            </div>
        </div>
    </body>
    </html>`;
}
// ============================================================================
// CLEANUP AND DEACTIVATION
// ============================================================================
async function stopRunningTest() {
    if (!currentTestSession) {
        vscode.window.showWarningMessage('No test is currently running');
        return;
    }
    logMessage('info', 'Stopping test session');
    try {
        // Stop processes
        if (currentTestSession.serverProcess) {
            currentTestSession.serverProcess.kill();
            currentTestSession.serverProcess = undefined;
        }
        if (currentTestSession.clientProcess) {
            currentTestSession.clientProcess.kill();
            currentTestSession.clientProcess = undefined;
        }
        // Restore configurations
        await restoreConfigurations();
        // Update session status
        currentTestSession.status = 'stopped';
        // Generate final report if enabled
        if (currentTestSession.config.reporting?.generateReports) {
            await generateTestReport();
        }
        logMessage('info', 'Test session stopped successfully');
        vscode.window.showInformationMessage('✅ Test stopped and configurations restored');
    }
    catch (error) {
        logMessage('error', `Error stopping test: ${error}`);
        vscode.window.showErrorMessage(`Error stopping test: ${error}`);
    }
    finally {
        currentTestSession = null;
        if (testControlPanel) {
            testControlPanel.dispose();
            testControlPanel = null;
        }
    }
}
async function restoreConfigurations() {
    if (!currentTestSession)
        return;
    const config = currentTestSession.config;
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder)
        return;
    const backupSuffix = config.configurationFiles.backupSuffix || '.backup';
    const serverDir = path.resolve(workspaceFolder.uri.fsPath, config.applicationPaths.serverDirectory);
    const clientDir = path.resolve(workspaceFolder.uri.fsPath, config.applicationPaths.clientDirectory);
    const serverConfig = path.join(serverDir, config.configurationFiles.serverConfigFile);
    const clientConfig = path.join(clientDir, config.configurationFiles.clientConfigFile);
    const serverBackup = serverConfig + backupSuffix;
    const clientBackup = clientConfig + backupSuffix;
    try {
        if (fs.existsSync(serverBackup)) {
            await fs.promises.copyFile(serverBackup, serverConfig);
            await fs.promises.unlink(serverBackup);
            logMessage('info', 'Server configuration restored');
        }
        if (fs.existsSync(clientBackup)) {
            await fs.promises.copyFile(clientBackup, clientConfig);
            await fs.promises.unlink(clientBackup);
            logMessage('info', 'Client configuration restored');
        }
    }
    catch (error) {
        logMessage('error', `Failed to restore configurations: ${error}`);
        throw new Error(`Failed to restore configurations: ${error}`);
    }
}
// ============================================================================
// ADDITIONAL EXPORT FUNCTIONS (keeping existing functionality)
// ============================================================================
async function exportConfiguration() {
    const config = await loadConfiguration();
    if (!config)
        return;
    const content = JSON.stringify(config, null, 2);
    const doc = await vscode.workspace.openTextDocument({
        content: content,
        language: 'json'
    });
    await vscode.window.showTextDocument(doc);
    vscode.window.showInformationMessage('Configuration exported to new document');
}
async function importConfiguration() {
    const files = await vscode.window.showOpenDialog({
        canSelectFiles: true,
        canSelectMany: false,
        filters: {
            'JSON files': ['json']
        },
        openLabel: 'Import Configuration'
    });
    if (!files || files.length === 0)
        return;
    try {
        const content = await fs.promises.readFile(files[0].fsPath, 'utf8');
        const config = JSON.parse(content);
        const isValid = await validateConfiguration(config);
        if (!isValid) {
            vscode.window.showErrorMessage('Invalid configuration file');
            return;
        }
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            vscode.window.showErrorMessage('No workspace folder found');
            return;
        }
        const configPath = path.join(workspaceFolder.uri.fsPath, 'protocolfile-config.json');
        await fs.promises.writeFile(configPath, JSON.stringify(config, null, 2));
        vscode.window.showInformationMessage('Configuration imported successfully');
    }
    catch (error) {
        vscode.window.showErrorMessage(`Failed to import configuration: ${error}`);
    }
}
// Include all the other existing functions (generateTemplate, validateProtocolFile, etc.)
// These would remain largely the same but can leverage the new configuration system
function deactivate() {
    if (currentTestSession) {
        stopRunningTest();
    }
    diagnosticsCollection.dispose();
    outputChannel.dispose();
    if (testControlPanel) {
        testControlPanel.dispose();
    }
}
// ============================================================================
// MISSING FUNCTIONS FROM ORIGINAL EXTENSION
// ============================================================================
function setupStatusBar(statusBarItem) {
    statusBarItem.command = 'protocolfile.showQuickActions';
    statusBarItem.tooltip = 'ProtocolFile Quick Actions';
}
function updateStatusBar(statusBarItem, editor) {
    if (editor && shouldValidateDocument(editor.document)) {
        statusBarItem.text = '$(file-code) ProtocolFile';
        statusBarItem.show();
    }
    else {
        statusBarItem.hide();
    }
}
function shouldValidateDocument(document) {
    const fileName = document.fileName.toLowerCase();
    return fileName.includes('protocolfile') || fileName.includes('testdataprotocolfile') || fileName.endsWith('.protocol.json');
}
function isTestDataFile(document) {
    const fileName = document.fileName.toLowerCase();
    return fileName.includes('testdataprotocolfile') || fileName.includes('testdata');
}
async function generateTemplate() {
    try {
        const templateOptions = [
            { label: '📄 Basic ProtocolFile', value: 'basic', description: 'Standard laboratory protocol structure' },
            { label: '🧪 NL1XT Protocol', value: 'nl1xt', description: 'NL1XT assay-specific template' },
            { label: '🧪 AD1XT Protocol', value: 'ad1xt', description: 'AD1XT assay-specific template' },
            { label: '🧪 AntiHIV Protocol', value: 'antihiv', description: 'AntiHIV assay-specific template' },
            { label: '📊 Test Data File', value: 'testdata', description: 'Simulation test scenarios' }
        ];
        const selectedTemplate = await vscode.window.showQuickPick(templateOptions, {
            placeHolder: 'Select a template type'
        });
        if (!selectedTemplate)
            return;
        const protocolName = await vscode.window.showInputBox({
            prompt: 'Enter protocol name',
            value: `${selectedTemplate.value}Protocol_${new Date().toISOString().split('T')[0]}`,
            validateInput: (value) => {
                if (!value || value.trim() === '') {
                    return 'Protocol name cannot be empty';
                }
                return null;
            }
        });
        if (!protocolName)
            return;
        const template = generateTemplateContent(selectedTemplate.value, protocolName);
        const doc = await vscode.workspace.openTextDocument({
            content: JSON.stringify(template, null, 2),
            language: 'json'
        });
        await vscode.window.showTextDocument(doc);
        const action = await vscode.window.showInformationMessage(`✅ Template '${selectedTemplate.label}' created successfully!`, 'Save As...', 'Validate');
        if (action === 'Save As...') {
            await vscode.commands.executeCommand('workbench.action.files.saveAs');
        }
        else if (action === 'Validate') {
            await validateProtocolFile();
        }
    }
    catch (error) {
        vscode.window.showErrorMessage(`Error generating template: ${error}`);
    }
}
function generateTemplateContent(type, name) {
    const baseProtocolTemplate = {
        "$schema": "./schemas/ProtocolFile.schema.json",
        "MethodInformation": {
            "Id": "TDM_auto",
            "DisplayName": name,
            "Version": "1.0",
            "MaximumNumberOfProcessingCycles": 1,
            "AssayInformation": {
                "AssayType": type.toUpperCase(),
                "AssayName": name,
                "AssayVersion": "1.0"
            }
        },
        "WorkflowSteps": [],
        "RequiredPlates": [],
        "LayoutRules": []
    };
    const testDataTemplate = {
        "$schema": "./schemas/testDataProtocolFile.schema.json",
        "TestDataInformation": {
            "TestDataId": name,
            "Description": `Test data for ${name}`,
            "TestDataVersion": "1.0"
        },
        "SimulationData": [],
        "ErrorScenarios": []
    };
    return type === 'testdata' ? testDataTemplate : baseProtocolTemplate;
}
async function validateProtocolFile() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage('❌ No active editor found');
        return;
    }
    if (!shouldValidateDocument(editor.document)) {
        const action = await vscode.window.showWarningMessage('⚠️ Current file is not a ProtocolFile. Validate anyway?', 'Yes', 'No');
        if (action !== 'Yes')
            return;
    }
    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: "Validating ProtocolFile...",
        cancellable: false
    }, async (progress) => {
        progress.report({ increment: 20, message: "Checking format..." });
        await new Promise(resolve => setTimeout(resolve, 200));
        progress.report({ increment: 40, message: "Running validation..." });
        const isValid = await validateProtocolFileInternal(editor.document, true);
        progress.report({ increment: 100, message: "Complete!" });
        if (isValid) {
            const action = await vscode.window.showInformationMessage('✅ ProtocolFile validation successful!', 'Run Test');
            if (action === 'Run Test') {
                await runIntegratedTest();
            }
        }
    });
}
async function validateProtocolFileInternal(document, showMessages = false) {
    try {
        if (document.isDirty) {
            await document.save();
        }
        const content = document.getText();
        let jsonData;
        try {
            jsonData = JSON.parse(content);
        }
        catch (parseError) {
            const diagnostic = new vscode.Diagnostic(new vscode.Range(0, 0, 0, 10), `Invalid JSON: ${parseError}`, vscode.DiagnosticSeverity.Error);
            setDiagnostics(document.uri, [diagnostic]);
            if (showMessages) {
                vscode.window.showErrorMessage('❌ Invalid JSON format');
            }
            return false;
        }
        // Determine which schema to use
        const isTestData = isTestDataFile(document);
        const schemaPath = isTestData ?
            './schemas/testDataProtocolFile.schema.json' :
            './schemas/ProtocolFile.schema.json';
        // Load schema
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            if (showMessages) {
                vscode.window.showErrorMessage('No workspace folder found');
            }
            return false;
        }
        const fullSchemaPath = path.join(workspaceFolder.uri.fsPath, schemaPath);
        if (!fs.existsSync(fullSchemaPath)) {
            if (showMessages) {
                vscode.window.showWarningMessage(`Schema file not found: ${schemaPath}`);
            }
            return true; // Skip validation if schema not found
        }
        const schemaContent = await fs.promises.readFile(fullSchemaPath, 'utf8');
        const schema = JSON.parse(schemaContent);
        // Validate
        const ajv = new ajv_1.default();
        const validate = ajv.compile(schema);
        const valid = validate(jsonData);
        if (!valid) {
            const diagnostics = validate.errors?.map(error => {
                const range = new vscode.Range(0, 0, 0, 10); // Simplified range
                return new vscode.Diagnostic(range, `${error.instancePath}: ${error.message}`, vscode.DiagnosticSeverity.Error);
            }) || [];
            setDiagnostics(document.uri, diagnostics);
            if (showMessages) {
                vscode.window.showErrorMessage(`❌ Validation failed: ${validate.errors?.[0]?.message}`);
            }
            return false;
        }
        // Clear diagnostics on success
        clearDiagnostics(document.uri);
        return true;
    }
    catch (error) {
        if (showMessages) {
            vscode.window.showErrorMessage(`Validation error: ${error}`);
        }
        return false;
    }
}
function clearDiagnostics(uri) {
    diagnosticsCollection.delete(uri);
}
function setDiagnostics(uri, diagnostics) {
    diagnosticsCollection.set(uri, diagnostics);
}
async function configureTestPaths() {
    vscode.window.showInformationMessage('Legacy test path configuration. Use "Open Configuration Editor" for enhanced features.', 'Open Configuration Editor').then(selection => {
        if (selection === 'Open Configuration Editor') {
            openConfigurationEditor();
        }
    });
}
async function showQuickActions() {
    const actions = [
        { label: '✅ Validate Current File', action: 'validate' },
        { label: '📄 Generate Template', action: 'template' },
        { label: '🚀 Run Enhanced Test', action: 'integratedTest' },
        { label: '⚙️ Open Configuration Editor', action: 'configEditor' },
        { label: '📊 Create Configuration Profile', action: 'createProfile' },
        { label: '📊 Generate Test Data', action: 'testData' },
        { label: '🔍 Compare Files', action: 'compare' },
        { label: '📊 Validate All Files', action: 'validateAll' },
        { label: '📋 Show Test Logs', action: 'logs' },
        { label: '🛑 Stop Running Test', action: 'stopTest' },
        { label: '❓ Show Help', action: 'help' }
    ];
    const selected = await vscode.window.showQuickPick(actions, {
        placeHolder: 'Select a ProtocolFile action'
    });
    if (!selected)
        return;
    switch (selected.action) {
        case 'validate':
            await validateProtocolFile();
            break;
        case 'template':
            await generateTemplate();
            break;
        case 'integratedTest':
            await runIntegratedTest();
            break;
        case 'configEditor':
            await openConfigurationEditor();
            break;
        case 'createProfile':
            await createConfigurationProfile();
            break;
        case 'testData':
            await generateTestData();
            break;
        case 'compare':
            await compareProtocolFiles();
            break;
        case 'validateAll':
            await quickValidateAllFiles();
            break;
        case 'logs':
            await showTestLogs();
            break;
        case 'stopTest':
            await stopRunningTest();
            break;
        case 'help':
            await showHelpPanel();
            break;
    }
}
async function quickValidateAllFiles() {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        vscode.window.showWarningMessage('📁 No workspace folder open');
        return;
    }
    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: "Validating all ProtocolFiles...",
        cancellable: true
    }, async (progress, token) => {
        const protocolFiles = [];
        for (const folder of workspaceFolders) {
            const files = await findProtocolFiles(folder.uri.fsPath);
            protocolFiles.push(...files);
        }
        if (protocolFiles.length === 0) {
            vscode.window.showInformationMessage('📝 No ProtocolFiles found');
            return;
        }
        let validFiles = 0;
        let invalidFiles = 0;
        for (let i = 0; i < protocolFiles.length; i++) {
            if (token.isCancellationRequested)
                break;
            const file = protocolFiles[i];
            const fileName = path.basename(file);
            progress.report({
                increment: (100 / protocolFiles.length),
                message: `Validating ${fileName}...`
            });
            try {
                const document = await vscode.workspace.openTextDocument(file);
                const isValid = await validateProtocolFileInternal(document);
                if (isValid) {
                    validFiles++;
                }
                else {
                    invalidFiles++;
                }
            }
            catch (error) {
                invalidFiles++;
            }
        }
        const action = await vscode.window.showInformationMessage(`📊 Validation complete! ✅ ${validFiles} valid, ❌ ${invalidFiles} invalid`, 'Show Problems');
        if (action === 'Show Problems') {
            await vscode.commands.executeCommand('workbench.panel.markers.view.focus');
        }
    });
}
async function findProtocolFiles(dir) {
    const files = [];
    try {
        const entries = await fs.promises.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory() && !entry.name.startsWith('.')) {
                const subFiles = await findProtocolFiles(fullPath);
                files.push(...subFiles);
            }
            else if ((entry.name.includes('ProtocolFile') || entry.name.includes('TestDataProtocolFile')) &&
                entry.name.endsWith('.json')) {
                files.push(fullPath);
            }
        }
    }
    catch (error) {
        // Directory not accessible, skip
    }
    return files;
}
async function compareProtocolFiles() {
    try {
        const files = await vscode.window.showOpenDialog({
            canSelectFiles: true,
            canSelectMany: true,
            filters: {
                'JSON files': ['json']
            },
            openLabel: 'Select files to compare'
        });
        if (!files || files.length === 0) {
            vscode.window.showWarningMessage('📁 No files selected');
            return;
        }
        if (files.length === 1) {
            const editor = vscode.window.activeTextEditor;
            if (!editor || !shouldValidateDocument(editor.document)) {
                vscode.window.showWarningMessage('📄 Open a ProtocolFile to compare with');
                return;
            }
            await vscode.commands.executeCommand('vscode.diff', vscode.Uri.file(editor.document.fileName), files[0], `${path.basename(editor.document.fileName)} ↔ ${path.basename(files[0].fsPath)}`);
        }
        else if (files.length >= 2) {
            await vscode.commands.executeCommand('vscode.diff', files[0], files[1], `${path.basename(files[0].fsPath)} ↔ ${path.basename(files[1].fsPath)}`);
        }
    }
    catch (error) {
        vscode.window.showErrorMessage(`💥 Error comparing files: ${error}`);
    }
}
async function generateTestData() {
    try {
        const testDataOptions = [
            { label: '✅ Happy Path Scenario', value: 'happy', description: 'Error-free test execution' },
            { label: '❌ Barcode Read Error (BRE)', value: 'bre', description: 'Barcode reading failure' },
            { label: '❌ No Carrier Error (NCE)', value: 'nce', description: 'Missing carrier error' },
            { label: '❌ Wrong Carrier Error (WCE)', value: 'wce', description: 'Incorrect carrier error' },
            { label: '🔄 Complete Test Set', value: 'complete', description: 'All error scenarios' }
        ];
        const selectedScenario = await vscode.window.showQuickPick(testDataOptions, {
            placeHolder: 'Select test data scenario'
        });
        if (!selectedScenario)
            return;
        const testDataName = await vscode.window.showInputBox({
            prompt: 'Enter test data name',
            value: `TestData_${selectedScenario.value}_${new Date().toISOString().split('T')[0]}`
        });
        if (!testDataName)
            return;
        const testDataContent = generateTestDataContent(selectedScenario.value, testDataName);
        const doc = await vscode.workspace.openTextDocument({
            content: JSON.stringify(testDataContent, null, 2),
            language: 'json'
        });
        await vscode.window.showTextDocument(doc);
        vscode.window.showInformationMessage(`✅ Test data '${selectedScenario.label}' created successfully!`);
    }
    catch (error) {
        vscode.window.showErrorMessage(`Error generating test data: ${error}`);
    }
}
function generateTestDataContent(scenario, name) {
    const baseTestData = {
        "$schema": "./schemas/testDataProtocolFile.schema.json",
        "TestDataInformation": {
            "TestDataId": name,
            "Description": `Test data scenario: ${scenario}`,
            "TestDataVersion": "1.0",
            "ScenarioType": scenario
        },
        "SimulationData": [],
        "ErrorScenarios": []
    };
    // Add scenario-specific data based on type
    switch (scenario) {
        case 'happy':
            baseTestData.SimulationData = [
                {
                    "ItemType": "Sample",
                    "Barcode": "12345678",
                    "ExpectedResult": "Success"
                }
            ];
            break;
        case 'bre':
            baseTestData.ErrorScenarios = [
                {
                    "ErrorType": "BarcodeReadError",
                    "ErrorCode": 5,
                    "Description": "Barcode cannot be read"
                }
            ];
            break;
        case 'nce':
            baseTestData.ErrorScenarios = [
                {
                    "ErrorType": "NoCarrierError",
                    "ErrorCode": 9,
                    "Description": "No carrier detected"
                }
            ];
            break;
        case 'wce':
            baseTestData.ErrorScenarios = [
                {
                    "ErrorType": "WrongCarrierError",
                    "ErrorCode": 100,
                    "Description": "Wrong carrier type detected"
                }
            ];
            break;
        case 'complete':
            baseTestData.SimulationData = [
                {
                    "ItemType": "Sample",
                    "Barcode": "12345678",
                    "ExpectedResult": "Success"
                }
            ];
            baseTestData.ErrorScenarios = [
                {
                    "ErrorType": "BarcodeReadError",
                    "ErrorCode": 5,
                    "Description": "Barcode cannot be read"
                },
                {
                    "ErrorType": "NoCarrierError",
                    "ErrorCode": 9,
                    "Description": "No carrier detected"
                },
                {
                    "ErrorType": "WrongCarrierError",
                    "ErrorCode": 100,
                    "Description": "Wrong carrier type detected"
                }
            ];
            break;
    }
    return baseTestData;
}
async function showHelpPanel() {
    const panel = vscode.window.createWebviewPanel('protocolFileHelp', 'ProtocolFile Help', vscode.ViewColumn.Two, { enableScripts: true });
    panel.webview.html = getHelpHTML();
}
function getHelpHTML() {
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>ProtocolFile Enhanced Help</title>
        <style>
            body { 
                font-family: Arial, sans-serif; 
                padding: 20px; 
                line-height: 1.6;
                color: var(--vscode-foreground);
                background-color: var(--vscode-editor-background);
            }
            h1, h2 { color: var(--vscode-textLink-foreground); }
            .command { 
                background: var(--vscode-textBlockQuote-background); 
                padding: 10px; 
                border-left: 4px solid var(--vscode-textBlockQuote-border);
                margin: 10px 0;
            }
            .shortcut { 
                background: var(--vscode-button-background);
                color: var(--vscode-button-foreground);
                padding: 4px 8px;
                border-radius: 4px;
                font-family: monospace;
            }
        </style>
    </head>
    <body>
        <h1>🚀 ProtocolFile Enhanced Help</h1>
        
        <h2>🎯 Key Features</h2>
        <ul>
            <li>🔧 Advanced Configuration Management</li>
            <li>🗄️ Database Integration</li>
            <li>📊 Enhanced Reporting</li>
            <li>🛡️ Enterprise Error Handling</li>
        </ul>
        
        <h2>📋 Quick Actions</h2>
        <div class="command">
            <strong>Open Configuration Editor:</strong> <span class="shortcut">Ctrl+Shift+C</span><br>
            Edit the main protocolfile-config.json file
        </div>
        
        <div class="command">
            <strong>Run Enhanced Test:</strong> <span class="shortcut">Ctrl+Shift+T</span><br>
            Execute complete test scenario with database and reporting
        </div>
        
        <div class="command">
            <strong>Validate File:</strong> <span class="shortcut">Ctrl+Shift+V</span><br>
            Validate current protocol file against schema
        </div>
        
        <div class="command">
            <strong>Generate Template:</strong> <span class="shortcut">Ctrl+Shift+N</span><br>
            Create new protocol templates
        </div>
        
        <h2>🔧 Configuration</h2>
        <p>The extension uses a centralized configuration file: <code>protocolfile-config.json</code></p>
        <p>This replaces the old VSCode settings approach and provides much more flexibility.</p>
        
        <h2>🆕 What's New in v2.0</h2>
        <ul>
            <li>✨ Configuration-based testing</li>
            <li>🗄️ Database integration</li>
            <li>📊 Advanced reporting</li>
            <li>🛡️ Enterprise error handling</li>
        </ul>
    </body>
    </html>`;
}
async function onDocumentSaved(document) {
    if (shouldValidateDocument(document)) {
        const config = await loadConfiguration();
        if (config?.validation?.validateOnSave) {
            await validateProtocolFileInternal(document);
        }
    }
}
async function onDocumentChanged(event) {
    if (shouldValidateDocument(event.document)) {
        const config = await loadConfiguration();
        if (config?.validation?.enableLiveValidation) {
            // Debounce validation
            setTimeout(async () => {
                await validateProtocolFileInternal(event.document);
            }, 1000);
        }
    }
}
async function showWelcomeMessage(context) {
    const hasShownWelcome = context.globalState.get('protocolfile.hasShownWelcome', false);
    if (!hasShownWelcome) {
        const action = await vscode.window.showInformationMessage('🎉 ProtocolFile Enhanced Extension activated! Ready to boost your testing workflow.', 'Show Help', 'Open Configuration', 'Don\'t Show Again');
        if (action === 'Show Help') {
            await showHelpPanel();
        }
        else if (action === 'Open Configuration') {
            await openConfigurationEditor();
        }
        else if (action === 'Don\'t Show Again') {
            await context.globalState.update('protocolfile.hasShownWelcome', true);
        }
    }
}
//# sourceMappingURL=extension.js.map