const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const sessionDB = require('./database');

const isDev = process.env.NODE_ENV === 'development';
let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    titleBarStyle: 'hidden',
    trafficLightPosition: { x: 15, y: 15 },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

// Initialize database and IPC handlers
function initializeIPC() {
  // Session operations
  ipcMain.handle('session:create', async (event, data) => {
    try {
      return { success: true, session: sessionDB.createSession(data) };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('session:get', async (event, id) => {
    try {
      const session = sessionDB.getSession(id);
      return { success: true, session };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('session:list', async (event, filters = {}) => {
    try {
      const sessions = sessionDB.getSessions(filters);
      return { success: true, sessions };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('session:update', async (event, id, data) => {
    try {
      const session = sessionDB.updateSession(id, data);
      // Notify renderer of update
      if (mainWindow) {
        mainWindow.webContents.send('session:updated', session);
      }
      return { success: true, session };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('session:delete', async (event, id) => {
    try {
      sessionDB.deleteSession(id);
      // Notify renderer of deletion
      if (mainWindow) {
        mainWindow.webContents.send('session:deleted', id);
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Artifact operations
  ipcMain.handle('artifact:add', async (event, sessionId, data) => {
    try {
      const artifact = sessionDB.addArtifact(sessionId, data);
      // Notify renderer of new artifact
      if (mainWindow) {
        mainWindow.webContents.send('artifact:added', { sessionId, artifact });
      }
      return { success: true, artifact };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('artifact:get', async (event, id) => {
    try {
      const artifact = sessionDB.getArtifact(id);
      return { success: true, artifact };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('artifact:list', async (event, sessionId) => {
    try {
      const artifacts = sessionDB.getSessionArtifacts(sessionId);
      return { success: true, artifacts };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Workflow step operations
  ipcMain.handle('step:add', async (event, sessionId, stepData) => {
    try {
      const stepId = sessionDB.addWorkflowStep(sessionId, stepData);
      // Notify renderer
      if (mainWindow) {
        mainWindow.webContents.send('step:added', { sessionId, stepId, ...stepData });
      }
      return { success: true, stepId };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('step:update', async (event, id, data) => {
    try {
      sessionDB.updateWorkflowStep(id, data);
      // Notify renderer
      if (mainWindow) {
        mainWindow.webContents.send('step:updated', { id, ...data });
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('step:list', async (event, sessionId) => {
    try {
      const steps = sessionDB.getSessionSteps(sessionId);
      return { success: true, steps };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Stats
  ipcMain.handle('stats:get', async () => {
    try {
      const stats = sessionDB.getStats();
      return { success: true, stats };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Get sessions folder path
  ipcMain.handle('sessions:folder', async () => {
    return sessionDB.sessionsDir;
  });

  // Get global WebWright folder path
  ipcMain.handle('webwright:path', async () => {
    return {
      global: sessionDB.globalDir,
      sessions: sessionDB.sessionsDir,
      exports: sessionDB.exportsDir,
    };
  });

  // Open folder in Finder/Explorer
  ipcMain.handle('folder:open', async (event, folderPath) => {
    const { shell } = require('electron');
    shell.openPath(folderPath);
    return { success: true };
  });

  console.log('[IPC] Handlers registered');
}

// Send update to renderer from external source (daemon)
function notifyRenderer(channel, data) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, data);
  }
}

// Export for external use (by orchestrator)
module.exports = { notifyRenderer };

app.whenReady().then(() => {
  // Initialize database
  sessionDB.init();

  // Register IPC handlers
  initializeIPC();

  // Create window
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  sessionDB.close();
});
