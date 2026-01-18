const { contextBridge, ipcRenderer } = require('electron');

// Expose session API to renderer
contextBridge.exposeInMainWorld('electron', {
  platform: process.platform,

  // Session operations
  sessions: {
    create: (data) => ipcRenderer.invoke('session:create', data),
    get: (id) => ipcRenderer.invoke('session:get', id),
    list: (filters) => ipcRenderer.invoke('session:list', filters),
    update: (id, data) => ipcRenderer.invoke('session:update', id, data),
    delete: (id) => ipcRenderer.invoke('session:delete', id),
    getFolder: () => ipcRenderer.invoke('sessions:folder'),
  },

  // Artifact operations
  artifacts: {
    add: (sessionId, data) => ipcRenderer.invoke('artifact:add', sessionId, data),
    get: (id) => ipcRenderer.invoke('artifact:get', id),
    list: (sessionId) => ipcRenderer.invoke('artifact:list', sessionId),
  },

  // Workflow step operations
  steps: {
    add: (sessionId, stepData) => ipcRenderer.invoke('step:add', sessionId, stepData),
    update: (id, data) => ipcRenderer.invoke('step:update', id, data),
    list: (sessionId) => ipcRenderer.invoke('step:list', sessionId),
  },

  // Stats
  stats: {
    get: () => ipcRenderer.invoke('stats:get'),
  },

  // Global paths
  paths: {
    get: () => ipcRenderer.invoke('webwright:path'),
  },

  // Folder operations
  folder: {
    open: (path) => ipcRenderer.invoke('folder:open', path),
  },

  // Event listeners for real-time updates
  on: (channel, callback) => {
    const validChannels = [
      'session:updated',
      'session:deleted',
      'artifact:added',
      'step:added',
      'step:updated',
    ];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => callback(...args));
    }
  },

  off: (channel, callback) => {
    const validChannels = [
      'session:updated',
      'session:deleted',
      'artifact:added',
      'step:added',
      'step:updated',
    ];
    if (validChannels.includes(channel)) {
      ipcRenderer.removeListener(channel, callback);
    }
  },
});
