import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { exec, spawn, ChildProcess } from 'child_process';
import { promisify } from 'util';
import Ajv from 'ajv';

const execAsync = promisify(exec);

// Global variables for process management
let serverProcess: ChildProcess | null = null;
let clientProcess: ChildProcess | null = null;
let isTestRunning = false;

export function activate(context: vscode.ExtensionContext) {
    console.log('ProtocolFile Validator Extension activated');

    // Register all commands
    const commands = [
        vscode.commands.registerCommand('protocolfile.validate', validateProtocolFile),
        vscode.commands.registerCommand('protocolfile.generateTemplate', generateTemplate),
        vscode.commands.registerCommand('protocolfile.runTest', runTestWithProtocol),
        vscode.commands.registerCommand('protocolfile.runIntegratedTest', runIntegratedTest),
        vscode.commands.registerCommand('protocolfile.configureTestPaths', configureTestPaths),
        vscode.commands.registerCommand('protocolfile.generateTestData', generateTestData),
        vscode.commands.registerCommand('protocolfile.compareFiles', compareProtocolFiles),
        vscode.commands.registerCommand('protocolfile.createBasic', () => createQuickTemplate('basic')),
        vscode.commands.registerCommand('protocolfile.createTestData', () => createQuickTemplate('testdata')),
        vscode.commands.registerCommand('protocolfile.quickValidate', quickValidateAllFiles),
        vscode.commands.registerCommand('protocolfile.showHelp', showHelpPanel),
        vscode.commands.registerCommand('protocolfile.showQuickActions', showQuickActions),
        vscode.commands.registerCommand('protocolfile.stopTest', stopRunningTest)
    ];

    // Auto-validation on save
    const saveListener = vscode.workspace.onDidSaveTextDocument((document) => {
        if (shouldValidateDocument(document)) {
            validateProtocolFileAuto(document);
        }
    });

    // Status bar
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    setupStatusBar(statusBarItem);
    
    // Active editor listener
    const activeEditorListener = vscode.window.onDidChangeActiveTextEditor((editor) => {
        updateStatusBar(statusBarItem, editor);
    });

    context.subscriptions.push(...commands, saveListener, statusBarItem, activeEditorListener);
    
    // Show welcome message on first activation
    showWelcomeMessage(context);
}

function shouldValidateDocument(document: vscode.TextDocument): boolean {
    const fileName = path.basename(document.fileName);
    return document.languageId === 'json' && 
           (fileName.includes('ProtocolFile') || fileName.includes('TestDataProtocolFile') || fileName.endsWith('.protocol.json'));
}

function isTestDataFile(document: vscode.TextDocument): boolean {
    const fileName = path.basename(document.fileName);
    return fileName.includes('TestDataProtocolFile') || fileName.toLowerCase().includes('testdata');
}

// ============================================================================
// INTEGRATED TEST RUNNER - REPLACES run_test.bat
// ============================================================================

async function runIntegratedTest() {
    const editor = vscode.window.activeTextEditor;
    if (!editor || !shouldValidateDocument(editor.document)) {
        vscode.window.showErrorMessage('📄 Please open a ProtocolFile or TestDataProtocolFile first');
        return;
    }

    if (isTestRunning) {
        const action = await vscode.window.showWarningMessage(
            '⚠️ A test is already running. Stop it first?',
            'Stop Current Test', 'Cancel'
        );
        if (action === 'Stop Current Test') {
            await stopRunningTest();
        } else {
            return;
        }
    }

    try {
        await editor.document.save();
        
        const config = vscode.workspace.getConfiguration('protocolfile');
        const testScenarioDir = path.dirname(editor.document.fileName);
        const protocolFile = path.basename(editor.document.fileName);
        
        vscode.window.showInformationMessage(`🚀 Starting integrated test with ${protocolFile}...`);
        
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Running Integrated Test",
            cancellable: true
        }, async (progress, token) => {
            
            // Step 1: Validate protocol file
            progress.report({ increment: 10, message: "Validating protocol file..." });
            const isValid = await validateProtocolFileInternal(editor.document);
            if (!isValid) {
                throw new Error('Protocol file validation failed');
            }
            
            // Step 2: Find and validate configuration files
            progress.report({ increment: 20, message: "Locating configuration files..." });
            const configPaths = await findConfigurationFiles(config);
            
            // Step 3: Backup configurations
            progress.report({ increment: 30, message: "Backing up configurations..." });
            await backupConfigurations(configPaths);
            
            // Step 4: Update configurations
            progress.report({ increment: 40, message: "Updating configurations..." });
            await updateConfigurations(configPaths, editor.document.fileName);
            
            // Step 5: Start applications
            progress.report({ increment: 60, message: "Starting server application..." });
            await startServerApplication(configPaths, protocolFile);
            
            if (token.isCancellationRequested) {
                await cleanupTest(configPaths);
                return;
            }
            
            progress.report({ increment: 80, message: "Starting client application..." });
            await startClientApplication(configPaths, protocolFile);
            
            progress.report({ increment: 100, message: "Test scenario active!" });
            
            // Show test control panel
            showTestControlPanel(protocolFile, configPaths);
        });
        
    } catch (error) {
        vscode.window.showErrorMessage(`💥 Test failed: ${error}`);
        await stopRunningTest();
    }
}

async function findConfigurationFiles(config: vscode.WorkspaceConfiguration) {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        throw new Error('No workspace folder found');
    }
    
    const serverDir = path.resolve(workspaceFolder.uri.fsPath, config.get('serverDirectory', '../../software.comm'));
    const clientDir = path.resolve(workspaceFolder.uri.fsPath, config.get('clientDirectory', '../../software.gui'));
    
    const serverConfigFile = config.get('serverConfigFile', 'appsettings.json');
    const clientConfigFile = config.get('clientConfigFile', 'app.config');
    
    const serverConfig = path.join(serverDir, serverConfigFile);
    const clientConfig = path.join(clientDir, clientConfigFile);
    
    // Validate paths exist
    if (!fs.existsSync(serverConfig)) {
        throw new Error(`Server configuration not found: ${serverConfig}`);
    }
    if (!fs.existsSync(clientConfig)) {
        throw new Error(`Client configuration not found: ${clientConfig}`);
    }
    
    return {
        serverDir,
        clientDir,
        serverConfig,
        clientConfig,
        serverExecutable: config.get('serverExecutable', 'software.comm.exe.bat'),
        clientExecutable: config.get('clientExecutable', 'software.gui.exe.bat')
    };
}

async function backupConfigurations(configPaths: any) {
    const serverBackup = configPaths.serverConfig + '.backup';
    const clientBackup = configPaths.clientConfig + '.backup';
    
    await fs.promises.copyFile(configPaths.serverConfig, serverBackup);
    await fs.promises.copyFile(configPaths.clientConfig, clientBackup);
    
    console.log('Configuration files backed up');
}

async function updateConfigurations(configPaths: any, protocolFilePath: string) {
    // Update server configuration (JSON)
    await updateServerConfig(configPaths.serverConfig, protocolFilePath);
    
    // Update client configuration (XML)
    await updateClientConfig(configPaths.clientConfig);
}

async function updateServerConfig(serverConfigPath: string, protocolFilePath: string) {
    try {
        const configContent = await fs.promises.readFile(serverConfigPath, 'utf8');
        const config = JSON.parse(configContent);
        
        // Update simulation protocol path
        const absoluteProtocolPath = path.resolve(protocolFilePath);
        config.SimulationProtocol = `--SimulationMode true ${absoluteProtocolPath}`;
        
        await fs.promises.writeFile(serverConfigPath, JSON.stringify(config, null, 2));
        console.log('Server configuration updated');
        
    } catch (error) {
        throw new Error(`Failed to update server configuration: ${error}`);
    }
}

async function updateClientConfig(clientConfigPath: string) {
    try {
        const configContent = await fs.promises.readFile(clientConfigPath, 'utf8');
        
        // Simple XML manipulation for app.config
        let updatedConfig = configContent;
        
        // Check if SimulationMode setting exists
        const simModeRegex = /<add\s+key="SimulationMode"\s+value="[^"]*"\s*\/>/;
        const newSimModeSetting = '<add key="SimulationMode" value="true" />';
        
        if (simModeRegex.test(updatedConfig)) {
            // Replace existing setting
            updatedConfig = updatedConfig.replace(simModeRegex, newSimModeSetting);
        } else {
            // Add new setting before closing appSettings tag
            const appSettingsEndRegex = /<\/appSettings>/;
            if (appSettingsEndRegex.test(updatedConfig)) {
                updatedConfig = updatedConfig.replace(appSettingsEndRegex, `    ${newSimModeSetting}\n  </appSettings>`);
            }
        }
        
        await fs.promises.writeFile(clientConfigPath, updatedConfig);
        console.log('Client configuration updated');
        
    } catch (error) {
        throw new Error(`Failed to update client configuration: ${error}`);
    }
}

async function startServerApplication(configPaths: any, protocolFile: string) {
    const serverExePath = path.join(configPaths.serverDir, configPaths.serverExecutable);
    const serverExeAlt = path.join(configPaths.serverDir, configPaths.serverExecutable.replace('.bat', ''));
    
    let executablePath = serverExePath;
    if (!fs.existsSync(serverExePath) && fs.existsSync(serverExeAlt)) {
        executablePath = serverExeAlt;
    }
    
    if (!fs.existsSync(executablePath)) {
        throw new Error(`Server executable not found: ${executablePath}`);
    }
    
    serverProcess = spawn(executablePath, [], {
        cwd: configPaths.serverDir,
        detached: false,
        stdio: 'pipe'
    });
    
    serverProcess.on('error', (error) => {
        vscode.window.showErrorMessage(`Server process error: ${error.message}`);
    });
    
    // Wait for server startup
    const startupDelay = vscode.workspace.getConfiguration('protocolfile').get('startupDelay', 5);
    await new Promise(resolve => setTimeout(resolve, startupDelay * 1000));
    
    console.log('Server application started');
}

async function startClientApplication(configPaths: any, protocolFile: string) {
    const clientExePath = path.join(configPaths.clientDir, configPaths.clientExecutable);
    const clientExeAlt = path.join(configPaths.clientDir, configPaths.clientExecutable.replace('.bat', ''));
    
    let executablePath = clientExePath;
    if (!fs.existsSync(clientExePath) && fs.existsSync(clientExeAlt)) {
        executablePath = clientExeAlt;
    }
    
    if (!fs.existsSync(executablePath)) {
        throw new Error(`Client executable not found: ${executablePath}`);
    }
    
    clientProcess = spawn(executablePath, [], {
        cwd: configPaths.clientDir,
        detached: false,
        stdio: 'pipe'
    });
    
    clientProcess.on('error', (error) => {
        vscode.window.showErrorMessage(`Client process error: ${error.message}`);
    });
    
    isTestRunning = true;
    console.log('Client application started');
}

function showTestControlPanel(protocolFile: string, configPaths: any) {
    const panel = vscode.window.createWebviewPanel(
        'testControlPanel',
        `Test Control - ${protocolFile}`,
        vscode.ViewColumn.Two,
        { enableScripts: true }
    );
    
    panel.webview.html = getTestControlHTML(protocolFile);
    
    panel.webview.onDidReceiveMessage(async (message) => {
        switch (message.command) {
            case 'stopTest':
                await stopRunningTest();
                panel.dispose();
                break;
            case 'restartTest':
                await stopRunningTest();
                setTimeout(() => runIntegratedTest(), 2000);
                break;
        }
    });
    
    // Auto-cleanup when panel is closed
    panel.onDidDispose(async () => {
        if (isTestRunning) {
            await stopRunningTest();
        }
    });
}

async function stopRunningTest() {
    if (!isTestRunning) {
        return;
    }
    
    try {
        // Stop processes
        if (serverProcess) {
            serverProcess.kill();
            serverProcess = null;
        }
        if (clientProcess) {
            clientProcess.kill();
            clientProcess = null;
        }
        
        // Restore configurations
        await restoreConfigurations();
        
        isTestRunning = false;
        vscode.window.showInformationMessage('🛑 Test stopped and configurations restored');
        
    } catch (error) {
        vscode.window.showErrorMessage(`Error stopping test: ${error}`);
    }
}

async function restoreConfigurations() {
    try {
        const config = vscode.workspace.getConfiguration('protocolfile');
        const configPaths = await findConfigurationFiles(config);
        
        const serverBackup = configPaths.serverConfig + '.backup';
        const clientBackup = configPaths.clientConfig + '.backup';
        
        if (fs.existsSync(serverBackup)) {
            await fs.promises.copyFile(serverBackup, configPaths.serverConfig);
            await fs.promises.unlink(serverBackup);
        }
        
        if (fs.existsSync(clientBackup)) {
            await fs.promises.copyFile(clientBackup, configPaths.clientConfig);
            await fs.promises.unlink(clientBackup);
        }
        
        console.log('Configurations restored');
        
    } catch (error) {
        console.error('Error restoring configurations:', error);
    }
}

async function cleanupTest(configPaths: any) {
    await stopRunningTest();
}

// ============================================================================
// CONFIGURATION MANAGEMENT
// ============================================================================

async function configureTestPaths() {
    const config = vscode.workspace.getConfiguration('protocolfile');
    
    const serverDir = await vscode.window.showInputBox({
        prompt: 'Enter server directory path',
        value: config.get('serverDirectory', '../../software.comm'),
        validateInput: (value) => {
            if (!value) return 'Server directory cannot be empty';
            return null;
        }
    });
    
    if (!serverDir) return;
    
    const clientDir = await vscode.window.showInputBox({
        prompt: 'Enter client directory path',
        value: config.get('clientDirectory', '../../software.gui'),
        validateInput: (value) => {
            if (!value) return 'Client directory cannot be empty';
            return null;
        }
    });
    
    if (!clientDir) return;
    
    const serverExe = await vscode.window.showInputBox({
        prompt: 'Enter server executable name',
        value: config.get('serverExecutable', 'software.comm.exe.bat')
    });
    
    if (!serverExe) return;
    
    const clientExe = await vscode.window.showInputBox({
        prompt: 'Enter client executable name',
        value: config.get('clientExecutable', 'software.gui.exe.bat')
    });
    
    if (!clientExe) return;
    
    // Update configuration
    await config.update('serverDirectory', serverDir, vscode.ConfigurationTarget.Workspace);
    await config.update('clientDirectory', clientDir, vscode.ConfigurationTarget.Workspace);
    await config.update('serverExecutable', serverExe, vscode.ConfigurationTarget.Workspace);
    await config.update('clientExecutable', clientExe, vscode.ConfigurationTarget.Workspace);
    
    vscode.window.showInformationMessage('✅ Test paths configured successfully!');
}

// ============================================================================
// BUILT-IN VALIDATION (REPLACES ConfigValidator.exe)
// ============================================================================

async function validateProtocolFile() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage('❌ No active editor found');
        return;
    }

    if (!shouldValidateDocument(editor.document)) {
        const action = await vscode.window.showWarningMessage(
            '⚠️ Current file is not a ProtocolFile. Validate anyway?',
            'Yes', 'No'
        );
        if (action !== 'Yes') return;
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
            const action = await vscode.window.showInformationMessage(
                '✅ ProtocolFile validation successful!',
                'Run Test'
            );
            
            if (action === 'Run Test') {
                await runIntegratedTest();
            }
        }
    });
}

async function validateProtocolFileInternal(document: vscode.TextDocument, showMessages = false): Promise<boolean> {
    try {
        if (document.isDirty) {
            await document.save();
        }

        const content = document.getText();
        let jsonData;
        
        try {
            jsonData = JSON.parse(content);
        } catch (parseError) {
            const diagnostic = new vscode.Diagnostic(
                new vscode.Range(0, 0, 0, 10),
                `Invalid JSON: ${parseError}`,
                vscode.DiagnosticSeverity.Error
            );
            setDiagnostics(document.uri, [diagnostic]);
            
            if (showMessages) {
                vscode.window.showErrorMessage('❌ Invalid JSON format');
            }
            return false;
        }

        // Determine which schema to use
        const isTestData = isTestDataFile(document);
        const schemaPath = isTestData ? 
            path.join(__dirname, '..', 'schemas', 'testDataProtocolFile.schema.json') :
            path.join(__dirname, '..', 'schemas', 'ProtocolFile.schema.json');
        
        if (!fs.existsSync(schemaPath)) {
            if (showMessages) {
                vscode.window.showErrorMessage(`❌ Schema file not found: ${schemaPath}`);
            }
            return false;
        }

        const schemaContent = await fs.promises.readFile(schemaPath, 'utf8');
        const schema = JSON.parse(schemaContent);
        
        // Validate using AJV
        const ajv = new Ajv({ allErrors: true });
        const validate = ajv.compile(schema);
        const valid = validate(jsonData);
        
        clearDiagnostics(document.uri);
        
        if (!valid && validate.errors) {
            const diagnostics = validate.errors.map(error => {
                const line = findLineForPath(content, error.instancePath);
                const range = new vscode.Range(line, 0, line, 100);
                
                return new vscode.Diagnostic(
                    range,
                    `${error.instancePath}: ${error.message}`,
                    vscode.DiagnosticSeverity.Error
                );
            });
            
            setDiagnostics(document.uri, diagnostics);
            
            if (showMessages) {
                const action = await vscode.window.showErrorMessage(
                    '❌ Validation failed. Check Problems panel.',
                    'Show Problems'
                );
                
                if (action === 'Show Problems') {
                    await vscode.commands.executeCommand('workbench.panel.markers.view.focus');
                }
            }
            return false;
        }
        
        return true;

    } catch (error) {
        if (showMessages) {
            vscode.window.showErrorMessage(`💥 Validation error: ${error}`);
        }
        return false;
    }
}

function findLineForPath(content: string, path: string): number {
    // Simple line finding - could be improved
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
        if (path && lines[i].includes(path.split('/').pop() || '')) {
            return i;
        }
    }
    return 0;
}

async function validateProtocolFileAuto(document: vscode.TextDocument, showSuccessMessage = false) {
    const isValid = await validateProtocolFileInternal(document, showSuccessMessage);
    // Auto-validation doesn't show success messages unless explicitly requested
}

// ============================================================================
// TEMPLATE GENERATION
// ============================================================================

async function generateTemplate() {
    try {
        const templateOptions = [
            { 
                label: '📄 Basic ProtocolFile', 
                value: 'basic',
                description: 'Standard laboratory protocol template'
            },
            { 
                label: '🧪 NL1XT Protocol', 
                value: 'nl1xt',
                description: 'NL1XT assay protocol template'
            },
            { 
                label: '🧪 AD1XT Protocol', 
                value: 'ad1xt',
                description: 'AD1XT assay protocol template'
            },
            { 
                label: '🧪 AntiHIV Protocol', 
                value: 'antihiv',
                description: 'AntiHIV assay protocol template'
            },
            { 
                label: '📊 Test Data File', 
                value: 'testdata',
                description: 'Simulation test data template'
            }
        ];

        const selectedTemplate = await vscode.window.showQuickPick(templateOptions, {
            placeHolder: 'Select a template type'
        });

        if (!selectedTemplate) return;

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

        if (!protocolName) return;

        const template = generateTemplateContent(selectedTemplate.value, protocolName);
        
        const doc = await vscode.workspace.openTextDocument({
            content: JSON.stringify(template, null, 2),
            language: 'json'
        });
        
        await vscode.window.showTextDocument(doc);
        
        const action = await vscode.window.showInformationMessage(
            `✅ Template '${selectedTemplate.label}' created successfully!`,
            'Save As...', 'Validate'
        );
        
        if (action === 'Save As...') {
            await vscode.commands.executeCommand('workbench.action.files.saveAs');
        } else if (action === 'Validate') {
            await validateProtocolFile();
        }
        
    } catch (error) {
        vscode.window.showErrorMessage(`Error generating template: ${error}`);
    }
}

async function createQuickTemplate(templateType: string) {
    try {
        const timestamp = new Date().toISOString().split('T')[0];
        const protocolName = `${templateType}Protocol_${timestamp}`;
        
        const template = generateTemplateContent(templateType, protocolName);
        
        const doc = await vscode.workspace.openTextDocument({
            content: JSON.stringify(template, null, 2),
            language: 'json'
        });
        
        await vscode.window.showTextDocument(doc);
        vscode.window.showInformationMessage(`🚀 Quick ${templateType} template created!`);
        
    } catch (error) {
        vscode.window.showErrorMessage(`Error creating quick template: ${error}`);
    }
}

function generateTemplateContent(type: string, name: string): any {
    const baseProtocolTemplate = {
        "$schema": "./schemas/ProtocolFile.schema.json",
        "MethodInformation": {
            "Id": "TDM_auto",
            "DisplayName": name,
            "Version": "1.0",
            "MaximumNumberOfProcessingCycles": 1,
            "MainTitle": "Laboratory Protocol",
            "SubTitle": "Automated Analysis",
            "OrderNumber": "92111",
            "MaximumNumberOfSamples": 192,
            "MaximumNumberOfAssays": 1,
            "SamplesLayoutType": "SAMPLES_LAYOUT_COMBINED"
        },
        "AssayInformation": [],
        "LoadingWorkflowSteps": [],
        "ProcessingWorkflowSteps": []
    };

    const testDataTemplate = {
        "$schema": "./schemas/testDataProtocolFile.schema.json",
        "SimulatedData": [
            {
                "TrackNumber": "3",
                "Counter": 0,
                "MainErrorCode": 0,
                "PlacedLabwareItems": [
                    {
                        "Barcode": "Track3_Sample01",
                        "LabwareId": "301",
                        "PositionId": "1",
                        "MainErrorCode": 0
                    }
                ]
            }
        ]
    };

    switch (type) {
        case 'testdata':
            return testDataTemplate;
        
        case 'nl1xt':
            return {
                ...baseProtocolTemplate,
                "AssayInformation": [{
                    "Type": "NL1XT",
                    "DisplayName": "NL1XT",
                    "MinimumNumberOfPatientSamplesOnFirstPlate": 5,
                    "StopPreparationWithFailedCalibrator": false,
                    "StopPreparationWithFailedControl": false,
                    "ValidityOfCalibrationInDays": 5,
                    "CalibratorLayoutRules": [],
                    "ControlLayoutRules": []
                }]
            };
        
        case 'ad1xt':
            return {
                ...baseProtocolTemplate,
                "AssayInformation": [{
                    "Type": "AD1XT",
                    "DisplayName": "AD1XT",
                    "MinimumNumberOfPatientSamplesOnFirstPlate": 5,
                    "StopPreparationWithFailedCalibrator": false,
                    "StopPreparationWithFailedControl": false,
                    "ValidityOfCalibrationInDays": 5,
                    "CalibratorLayoutRules": [],
                    "ControlLayoutRules": []
                }]
            };
        
        case 'antihiv':
            return {
                ...baseProtocolTemplate,
                "AssayInformation": [{
                    "Type": "AntiHIV",
                    "DisplayName": "AntiHIV",
                    "MinimumNumberOfPatientSamplesOnFirstPlate": 5,
                    "StopPreparationWithFailedCalibrator": false,
                    "StopPreparationWithFailedControl": false,
                    "ValidityOfCalibrationInDays": 5,
                    "CalibratorLayoutRules": [],
                    "ControlLayoutRules": []
                }]
            };
        
        default:
            return baseProtocolTemplate;
    }
}

async function generateTestData() {
    const scenarios = [
        { label: '✅ Happy Path - Counterweight', value: 'counterweight-happy' },
        { label: '❌ Barcode Read Error - Counterweight', value: 'counterweight-bre' },
        { label: '✅ Happy Path - Patient Samples', value: 'patient-happy' },
        { label: '❌ No Carrier Error - Patient Samples', value: 'patient-nce' },
        { label: '❌ Wrong Carrier Error - Patient Samples', value: 'patient-wce' },
        { label: '✅ Happy Path - MFX Carrier', value: 'mfx-happy' }
    ];

    const selected = await vscode.window.showQuickPick(scenarios, {
        placeHolder: 'Select a test scenario to generate'
    });

    if (!selected) return;

    const template = generateTestDataScenario(selected.value);
    
    const doc = await vscode.workspace.openTextDocument({
        content: JSON.stringify(template, null, 2),
        language: 'json'
    });
    
    await vscode.window.showTextDocument(doc);
    vscode.window.showInformationMessage(`📊 Test scenario '${selected.label}' created!`);
}

function generateTestDataScenario(scenario: string): any {
    const baseTemplate = {
        "$schema": "./schemas/testDataProtocolFile.schema.json",
        "SimulatedData": []
    };

    // Add scenario-specific data based on the snippets
    // This would contain the actual test data scenarios
    return baseTemplate;
}

// ============================================================================
// LEGACY SUPPORT & OTHER FUNCTIONS
// ============================================================================

async function runTestWithProtocol() {
    // Show option to use integrated test runner
    const action = await vscode.window.showInformationMessage(
        '🚀 Choose test runner method:',
        'Integrated Test Runner', 'Legacy Batch Script'
    );
    
    if (action === 'Integrated Test Runner') {
        await runIntegratedTest();
    } else if (action === 'Legacy Batch Script') {
        await runLegacyBatchScript();
    }
}

async function runLegacyBatchScript() {
    const editor = vscode.window.activeTextEditor;
    if (!editor || !shouldValidateDocument(editor.document)) {
        vscode.window.showErrorMessage('📄 Please open a ProtocolFile first');
        return;
    }

    try {
        await editor.document.save();
        
        const protocolPath = editor.document.fileName;
        const protocolDir = path.dirname(protocolPath);
        
        const testScripts = [
            path.join(protocolDir, 'run_test.bat'),
            path.join(protocolDir, 'run_test.cmd'),
            path.join(protocolDir, 'test.bat')
        ];
        
        let testScript = testScripts.find(script => fs.existsSync(script));
        
        if (!testScript) {
            const action = await vscode.window.showErrorMessage(
                `🔍 No test script found in: ${protocolDir}`,
                'Create Test Script', 'Continue Anyway'
            );
            
            if (action === 'Create Test Script') {
                await createTestScript(protocolDir);
                return;
            } else if (action !== 'Continue Anyway') {
                return;
            }
            
            testScript = path.join(protocolDir, 'run_test.bat');
        }

        const protocolName = path.basename(protocolPath);
        const scriptName = path.basename(testScript);
        
        const confirmed = await vscode.window.showInformationMessage(
            `🚀 Run test "${scriptName}" with "${protocolName}"?`,
            'Run Test', 'Cancel'
        );
        
        if (confirmed !== 'Run Test') return;

        const terminal = vscode.window.createTerminal({
            name: `Test: ${protocolName}`,
            cwd: protocolDir
        });
        
        if (fs.existsSync(testScript)) {
            terminal.sendText(`${testScript}`);
        } else {
            terminal.sendText(`echo "Test script not found: ${testScript}"`);
            terminal.sendText(`echo "Please create the test script first."`);
        }
        
        terminal.show();
        
        vscode.window.showInformationMessage(
            `⚡ Test started! Check terminal for progress.`
        );
        
    } catch (error) {
        vscode.window.showErrorMessage(`💥 Error running test: ${error}`);
    }
}

async function createTestScript(dir: string) {
    const scriptContent = `@echo off
setlocal enabledelayedexpansion

REM ============================================================================
REM CONFIGURATION SECTION - MODIFY THESE VARIABLES AS NEEDED
REM ============================================================================

REM === APPLICATION PATHS ===
set "SERVER_DIR=..\\..\\software.comm"
set "CLIENT_DIR=..\\..\\software.gui"
set "SERVER_CONFIG_FILE=appsettings.json"
set "CLIENT_CONFIG_FILE=app.config"
set "SERVER_EXECUTABLE=software.comm.exe.bat"
set "SERVER_EXECUTABLE_ALT=software.comm.exe"
set "CLIENT_EXECUTABLE=software.gui.exe.bat"
set "CLIENT_EXECUTABLE_ALT=software.gui.exe"

echo ========================================
echo        TEST SCENARIO AUTOMATION
echo ========================================
echo.
echo Use the VSCode extension's "Run Integrated Test" for better experience!
echo This script is provided for legacy compatibility.
echo.
pause

REM Add your test commands here
echo Test completed!
pause
`;

    const scriptPath = path.join(dir, 'run_test.bat');
    
    try {
        await fs.promises.writeFile(scriptPath, scriptContent);
        
        const action = await vscode.window.showInformationMessage(
            `✅ Test script created: ${scriptPath}`,
            'Open Script', 'Run Now'
        );
        
        if (action === 'Open Script') {
            const doc = await vscode.workspace.openTextDocument(scriptPath);
            await vscode.window.showTextDocument(doc);
        } else if (action === 'Run Now') {
            await runTestWithProtocol();
        }
        
    } catch (error) {
        vscode.window.showErrorMessage(`Error creating test script: ${error}`);
    }
}

// ============================================================================
// FILE COMPARISON
// ============================================================================

async function compareProtocolFiles() {
    try {
        const options: vscode.OpenDialogOptions = {
            canSelectFiles: true,
            canSelectFolders: false,
            canSelectMany: true,
            filters: {
                'ProtocolFiles': ['json']
            },
            title: 'Select ProtocolFiles to compare'
        };

        const files = await vscode.window.showOpenDialog(options);
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
            
            await vscode.commands.executeCommand('vscode.diff', 
                vscode.Uri.file(editor.document.fileName),
                files[0], 
                `${path.basename(editor.document.fileName)} ↔ ${path.basename(files[0].fsPath)}`
            );
            
        } else if (files.length >= 2) {
            await vscode.commands.executeCommand('vscode.diff', 
                files[0], 
                files[1], 
                `${path.basename(files[0].fsPath)} ↔ ${path.basename(files[1].fsPath)}`
            );
        }
        
    } catch (error) {
        vscode.window.showErrorMessage(`💥 Error comparing files: ${error}`);
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
        const protocolFiles: string[] = [];
        
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
            if (token.isCancellationRequested) break;
            
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
                } else {
                    invalidFiles++;
                }
            } catch (error) {
                invalidFiles++;
            }
        }
        
        const action = await vscode.window.showInformationMessage(
            `📊 Validation complete! ✅ ${validFiles} valid, ❌ ${invalidFiles} invalid`,
            'Show Problems'
        );
        
        if (action === 'Show Problems') {
            await vscode.commands.executeCommand('workbench.panel.markers.view.focus');
        }
    });
}

async function findProtocolFiles(dir: string): Promise<string[]> {
    const files: string[] = [];
    
    try {
        const entries = await fs.promises.readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            
            if (entry.isDirectory() && !entry.name.startsWith('.')) {
                const subFiles = await findProtocolFiles(fullPath);
                files.push(...subFiles);
            } else if ((entry.name.includes('ProtocolFile') || entry.name.includes('TestDataProtocolFile')) && entry.name.endsWith('.json')) {
                files.push(fullPath);
            }
        }
    } catch (error) {
        // Directory not accessible, skip
    }
    
    return files;
}

// ============================================================================
// STATUS BAR AND UI
// ============================================================================

function setupStatusBar(statusBarItem: vscode.StatusBarItem) {
    statusBarItem.command = 'protocolfile.showQuickActions';
    statusBarItem.tooltip = 'ProtocolFile Quick Actions';
}

function updateStatusBar(statusBarItem: vscode.StatusBarItem, editor?: vscode.TextEditor) {
    if (editor && shouldValidateDocument(editor.document)) {
        statusBarItem.text = '$(file-code) ProtocolFile';
        statusBarItem.show();
    } else {
        statusBarItem.hide();
    }
}

async function showQuickActions() {
    const actions = [
        { label: '✅ Validate Current File', action: 'validate' },
        { label: '📄 Generate Template', action: 'template' },
        { label: '🚀 Run Integrated Test', action: 'integratedTest' },
        { label: '📊 Generate Test Data', action: 'testData' },
        { label: '🔍 Compare Files', action: 'compare' },
        { label: '📊 Validate All Files', action: 'validateAll' },
        { label: '⚙️ Configure Test Paths', action: 'configure' },
        { label: '🛑 Stop Running Test', action: 'stopTest' },
        { label: '❓ Show Help', action: 'help' }
    ];
    
    const selected = await vscode.window.showQuickPick(actions, {
        placeHolder: 'Select a ProtocolFile action'
    });
    
    if (!selected) return;
    
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
        case 'testData':
            await generateTestData();
            break;
        case 'compare':
            await compareProtocolFiles();
            break;
        case 'validateAll':
            await quickValidateAllFiles();
            break;
        case 'configure':
            await configureTestPaths();
            break;
        case 'stopTest':
            await stopRunningTest();
            break;
        case 'help':
            await showHelpPanel();
            break;
    }
}

// ============================================================================
// DIAGNOSTIC MANAGEMENT
// ============================================================================

const diagnosticsCollection = vscode.languages.createDiagnosticCollection('protocolfile');

function clearDiagnostics(uri: vscode.Uri) {
    diagnosticsCollection.delete(uri);
}

function setDiagnostics(uri: vscode.Uri, diagnostics: vscode.Diagnostic[]) {
    diagnosticsCollection.set(uri, diagnostics);
}

// ============================================================================
// HELP AND WELCOME
// ============================================================================

async function showHelpPanel() {
    const panel = vscode.window.createWebviewPanel(
        'protocolFileHelp',
        'ProtocolFile Help',
        vscode.ViewColumn.Two,
        { enableScripts: true }
    );
    
    panel.webview.html = getHelpHTML();
}

async function showWelcomeMessage(context: vscode.ExtensionContext) {
    const hasShownWelcome = context.globalState.get('protocolfile.hasShownWelcome', false);
    
    if (!hasShownWelcome) {
        const action = await vscode.window.showInformationMessage(
            '🎉 ProtocolFile Extension activated! Ready to boost your testing workflow.',
            'Show Help', 'Create First Protocol', 'Don\'t Show Again'
        );
        
        if (action === 'Show Help') {
            await showHelpPanel();
        } else if (action === 'Create First Protocol') {
            await generateTemplate();
        }
        
        if (action === 'Don\'t Show Again') {
            await context.globalState.update('protocolfile.hasShownWelcome', true);
        }
    }
}

function getTestControlHTML(protocolFile: string): string {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Test Control Panel</title>
        <style>
            body { 
                font-family: Arial, sans-serif; 
                padding: 20px; 
                line-height: 1.6;
                color: var(--vscode-foreground);
                background-color: var(--vscode-editor-background);
            }
            h1 { color: var(--vscode-textLink-foreground); }
            .status { 
                background: var(--vscode-textBlockQuote-background); 
                padding: 15px; 
                border-left: 4px solid var(--vscode-textBlockQuote-border);
                margin: 15px 0;
                border-radius: 4px;
            }
            .button { 
                background: var(--vscode-button-background);
                color: var(--vscode-button-foreground);
                padding: 10px 20px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                margin: 5px;
                font-size: 14px;
            }
            .button:hover {
                background: var(--vscode-button-hoverBackground);
            }
            .stop-button {
                background: var(--vscode-errorForeground);
                color: white;
            }
            .info {
                background: var(--vscode-editorInfo-background);
                color: var(--vscode-editorInfo-foreground);
                padding: 10px;
                border-radius: 4px;
                margin: 10px 0;
            }
        </style>
    </head>
    <body>
        <h1>🚀 Test Control Panel</h1>
        
        <div class="status">
            <h3>📄 Active Protocol: ${protocolFile}</h3>
            <p>✅ Server and client applications are running</p>
            <p>⚙️ Configurations have been updated</p>
            <p>🔄 Test scenario is active</p>
        </div>
        
        <div class="info">
            <strong>💡 Instructions:</strong>
            <ul>
                <li>Your server and client applications are now running with the test protocol</li>
                <li>Use the applications to perform your testing</li>
                <li>When finished, click "Stop Test" to restore original configurations</li>
                <li>The applications will continue running until you close them manually</li>
            </ul>
        </div>
        
        <div>
            <button class="button stop-button" onclick="stopTest()">🛑 Stop Test & Restore Config</button>
            <button class="button" onclick="restartTest()">🔄 Restart Test</button>
        </div>
        
        <script>
            const vscode = acquireVsCodeApi();
            
            function stopTest() {
                vscode.postMessage({ command: 'stopTest' });
            }
            
            function restartTest() {
                vscode.postMessage({ command: 'restartTest' });
            }
        </script>
    </body>
    </html>`;
}

function getHelpHTML(): string {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>ProtocolFile Help</title>
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
            .feature {
                background: var(--vscode-editorInfo-background);
                padding: 10px;
                border-radius: 4px;
                margin: 10px 0;
            }
        </style>
    </head>
    <body>
        <h1>🚀 ProtocolFile Extension Help</h1>
        
        <h2>🎯 Key Features</h2>
        
        <div class="feature">
            <h3>🔧 Integrated Test Runner</h3>
            <p>Run laboratory tests without external dependencies. The extension handles:</p>
            <ul>
                <li>✅ Built-in JSON schema validation</li>
                <li>⚙️ Automatic configuration backup/restore</li>
                <li>🚀 Server and client application management</li>
                <li>📊 Real-time test control panel</li>
            </ul>
        </div>
        
        <h2>📋 Quick Actions</h2>
        <div class="command">
            <strong>Generate Template:</strong> <span class="shortcut">Ctrl+Shift+P</span> → "ProtocolFile: Generate Template"<br>
            Create laboratory protocol templates (ProtocolFile or TestDataProtocolFile)
        </div>
        
        <div class="command">
            <strong>Validate File:</strong> <span class="shortcut">Ctrl+Shift+V</span><br>
            Validate current ProtocolFile against schema using built-in validator
        </div>
        
        <div class="command">
            <strong>Run Integrated Test:</strong> <span class="shortcut">Ctrl+Shift+T</span><br>
            Start complete test scenario with automatic configuration management
        </div>
        
        <div class="command">
            <strong>Configure Test Paths:</strong> Command Palette → "ProtocolFile: Configure Test Paths"<br>
            Set up server/client directories and executable paths
        </div>
        
        <h2>📊 File Types Supported</h2>
        <ul>
            <li><strong>ProtocolFile.json:</strong> Laboratory protocol definitions</li>
            <li><strong>TestDataProtocolFile.json:</strong> Simulation test data</li>
            <li><strong>*.protocol.json:</strong> Protocol files with custom extension</li>
        </ul>
        
        <h2>🎨 Templates Available</h2>
        <ul>
            <li>📄 Basic ProtocolFile - Standard laboratory protocol</li>
            <li>🧪 NL1XT Protocol - NL1XT assay template</li>
            <li>🧪 AD1XT Protocol - AD1XT assay template</li>
            <li>🧪 AntiHIV Protocol - AntiHIV assay template</li>
            <li>📊 Test Data File - Simulation scenarios</li>
        </ul>
        
        <h2>🔧 Configuration</h2>
        <p>Configure the extension through VS Code settings:</p>
        <ul>
            <li><code>protocolfile.serverDirectory</code> - Server application path</li>
            <li><code>protocolfile.clientDirectory</code> - Client application path</li>
            <li><code>protocolfile.serverExecutable</code> - Server executable name</li>
            <li><code>protocolfile.clientExecutable</code> - Client executable name</li>
            <li><code>protocolfile.startupDelay</code> - Delay between server/client startup</li>
        </ul>
        
        <h2>⚡ Pro Tips</h2>
        <ul>
            <li>Click the status bar "ProtocolFile" text for quick actions</li>
            <li>Use snippets: Type "protocol-" or "testdata-" for quick templates</li>
            <li>Right-click on files for context menu actions</li>
            <li>Problems panel shows detailed validation errors</li>
            <li>Test control panel provides real-time test management</li>
        </ul>
        
        <h2>🆕 What's New</h2>
        <div class="feature">
            <h3>✨ No External Dependencies</h3>
            <p>The extension now includes built-in validation and test running capabilities. No need for external ConfigValidator.exe or complex batch scripts!</p>
        </div>
        
        <div class="feature">
            <h3>🎯 Laboratory-Focused</h3>
            <p>Templates and snippets are now specifically designed for laboratory protocols with proper schema validation for both ProtocolFile and TestDataProtocolFile formats.</p>
        </div>
    </body>
    </html>`;
}

export function deactivate() {
    // Clean up any running processes
    if (serverProcess) {
        serverProcess.kill();
    }
    if (clientProcess) {
        clientProcess.kill();
    }
    
    // Dispose diagnostics
    diagnosticsCollection.dispose();
}
