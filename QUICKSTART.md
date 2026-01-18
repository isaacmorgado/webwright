# Quick Start Guide

## 🚀 Get Running in 5 Minutes

### Step 1: Install WebWright (if not already installed)

```bash
npm install -g webwright
```

### Step 2: Install Desktop App Dependencies

```bash
cd webwright-desktop
npm install
```

**Time:** ~2-3 minutes

### Step 3: Start WebWright Daemon

Open a terminal and run:

```bash
webwright daemon
```

You should see output like:
```
AgentBrowser Pro daemon listening on /tmp/agentbrowser-pro-default.sock (session: default)
```

Keep this terminal open.

**Time:** ~10 seconds

### Step 4: Start HTTP Bridge

Open a **new terminal** and run:

```bash
cd webwright-desktop
node webwright-http-bridge.js
```

You should see:
```
╔════════════════════════════════════════════════════╗
║  WebWright HTTP Bridge                             ║
╠════════════════════════════════════════════════════╣
║  HTTP API: http://localhost:3456                   ║
║  Session:  default                                 ║
║  Daemon:   ✓ Running                               ║
╚════════════════════════════════════════════════════╝
```

Keep this terminal open too.

**Time:** ~5 seconds

### Step 5: Run the Desktop App

Open a **third terminal** and run:

```bash
cd webwright-desktop
npm run electron:dev
```

The Electron app will launch!

**Time:** ~30 seconds

### Step 6: Create Your First Task

1. You're now on the **New Task** page
2. Enter a task like: **"Go to Hacker News and get the top 5 post titles"**
3. Click **Start Task**
4. The task will start executing in your local browser!

---

## ✅ That's It!

You now have a fully functional WebWright desktop app running locally.

## Three Terminal Setup

For best experience, keep three terminals open:

**Terminal 1:** WebWright Daemon
```bash
webwright daemon
```

**Terminal 2:** HTTP Bridge
```bash
node webwright-http-bridge.js
```

**Terminal 3:** Electron App
```bash
npm run electron:dev
```

## What Can You Do?

### Create Tasks
- Describe any web automation task
- Agent will execute it in a real local browser
- Watch sessions in real-time

### Monitor Sessions
- See all your automation sessions
- Real-time status updates (polls every 2s)
- Stop or delete sessions

### Settings
- View daemon status and connection
- See WebWright version and features

---

## Common Issues

### "Daemon is offline"
- Make sure terminal 1 (`webwright daemon`) is running
- Check for error messages in that terminal

### "Port 3456 in use"
- Something else is using port 3456
- Find what's using it: `lsof -i :3456`
- Kill that process or change the port in `webwright-http-bridge.js`

### "npm install" Fails
- Make sure you have Node.js 18+ installed
- Try: `rm -rf node_modules package-lock.json && npm install`

### Electron Won't Start
- Make sure port 5173 is not in use
- Try running `npm run dev` first to test Vite server
- Check console for errors

---

## Next Steps

- **Read the README.md** for detailed documentation
- **Explore the features** - Try different automation tasks
- **Check Settings** - See all WebWright capabilities
- **Monitor Sessions** - Watch your automations in real-time

---

## Example Tasks to Try

```
Navigate to GitHub and search for "playwright"

Go to Amazon and find the price of "wireless mouse"

Open YouTube and get the title of the first trending video

Visit Wikipedia and extract the first paragraph about "artificial intelligence"

Go to Hacker News and return the top 10 post titles

Navigate to Reddit front page and count how many posts are visible
```

---

**Happy Automating! 🤖**
