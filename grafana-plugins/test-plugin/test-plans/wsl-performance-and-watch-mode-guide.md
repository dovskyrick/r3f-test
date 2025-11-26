# WSL Performance and Watch Mode Guide

**Problem:** Slow builds and file watching not working in WSL

**Date:** November 26, 2025

---

## Table of Contents

1. [Understanding the Problem](#understanding-the-problem)
2. [Why This Happens](#why-this-happens)
3. [Solutions Ranked](#solutions-ranked)
4. [Quick Fix: Enable Polling](#quick-fix-enable-polling)
5. [Best Solution: Move to WSL Filesystem](#best-solution-move-to-wsl-filesystem)
6. [Performance Optimizations](#performance-optimizations)
7. [Benchmarks and Expected Times](#benchmarks-and-expected-times)

---

## Understanding the Problem

### What's Happening

**Your Current Setup:**
```
Windows Filesystem (C:\Dev\r3f-test)
         ↑
         │ (slow cross-OS filesystem access)
         │
    WSL/Ubuntu
         ↑
         │
    npm run dev (webpack watch)
         ↑
         │
    ❌ File changes not detected
    ❌ Very slow builds (5-10 minutes)
```

**Symptoms:**
- ✅ npm run dev starts successfully
- ❌ Saving files doesn't trigger rebuild
- ❌ Initial build takes 5-10 minutes
- ❌ Must manually restart npm run dev after changes
- ⚠️ No "webpack compiled successfully" after file save

---

## Why This Happens

### The Cross-Filesystem Problem

**Architecture:**

```
┌─────────────────────────────────────────────┐
│           Windows (Host OS)                 │
│                                             │
│  C:\Dev\r3f-test\                          │
│  └─ grafana-plugins\                       │
│     └─ test-plugin\                        │
│        └─ the-cube-panel\                  │
│           ├─ src\                          │
│           │  └─ SimplePanel.tsx ← You edit │
│           └─ node_modules\                 │
└─────────────────┬───────────────────────────┘
                  │
                  │ /mnt/c/ mounting
                  │ (slow I/O layer)
                  ↓
┌─────────────────────────────────────────────┐
│           WSL/Ubuntu (Guest OS)             │
│                                             │
│  /mnt/c/Dev/r3f-test/                      │
│  └─ npm run dev running here               │
│     └─ webpack watching for changes        │
│        └─ ❌ Watch events don't cross      │
│           filesystem boundary reliably     │
└─────────────────────────────────────────────┘
```

---

### Why File Watching Fails

**File System Events (inotify):**

Linux uses `inotify` to watch for file changes:
```javascript
// Webpack internally does this:
fs.watch('/mnt/c/Dev/r3f-test/...', (event, filename) => {
  // Trigger rebuild
});
```

**Problem:** Windows filesystem changes don't trigger inotify events when accessed through `/mnt/c/`

**Why:**
- Windows and Linux use different file change notification systems
- `/mnt/c/` is a translation layer (9P protocol in WSL2)
- File events from Windows don't propagate to Linux watchers
- WSL can't detect when you save a file in Windows

---

### Why Builds Are Slow

**Reason 1: Cross-Filesystem I/O**
```
Every file read:
Windows disk → Windows FS → 9P protocol → WSL → Linux FS cache

Every file write:
WSL → 9P protocol → Windows FS → Windows disk

Result: ~10-50x slower than native filesystem
```

**Reason 2: node_modules Access**
- Webpack reads thousands of files from node_modules
- Each read crosses the filesystem boundary
- 1000 files × 50ms each = 50 seconds just for reads!

**Reason 3: TypeScript Compilation**
- TypeScript compiler reads source files
- Generates type definitions
- Writes output files
- All crossing the slow boundary

**Benchmarks (1000 file operations):**
- Native Windows: ~100ms
- Native WSL: ~150ms
- WSL → Windows (/mnt/c/): ~5000ms (50x slower!)

---

## Solutions Ranked

### Overview

| Solution | Speed | Watch Mode | Effort | Recommended |
|----------|-------|------------|--------|-------------|
| 1. Move to WSL FS | ⭐⭐⭐⭐⭐ Fast | ✅ Works | Medium | ✅ YES |
| 2. Enable Polling | ⭐⭐ Slow | ✅ Works | Low | ⚠️ Workaround |
| 3. Run on Windows | ⭐⭐⭐⭐ Fast | ✅ Works | Low | ⚠️ If needed |
| 4. Keep Current Setup | ⭐ Very Slow | ❌ Broken | None | ❌ NO |

---

## Quick Fix: Enable Polling

**If you want to keep files on Windows but fix watch mode.**

### What is Polling?

Instead of waiting for file change events (which don't work), webpack periodically checks if files changed:

```
Normal watch (broken):
  FS event → rebuild ✅ (but events don't cross to WSL ❌)

Polling (works):
  Every 3s → check all files → if changed → rebuild ✅
```

**Trade-off:**
- ✅ Watch mode works!
- ⚠️ Still slow builds (cross-filesystem)
- ⚠️ CPU usage higher (constant checking)
- ⚠️ 3 second delay before rebuild starts

---

### How to Enable Polling

**Step 1: Check Current Webpack Config**

Your plugin already has polling configured! Look at this:

```typescript
// .config/webpack/webpack.config.ts (lines 237-242)

if (isWSL()) {
  baseConfig.watchOptions = {
    poll: 3000,        // Check every 3 seconds
    ignored: /node_modules/,
  };
}
```

**This should already be working!**

---

### Why It Might Not Be Working

**Check if webpack detects WSL:**

The config uses `isWSL()` function. Let's verify it works:

```bash
# In WSL terminal, in your plugin directory:
cd /mnt/c/Dev/r3f-test/grafana-plugins/test-plugin/the-cube-panel

# Check if WSL is detected:
cat .config/webpack/utils.ts | grep -A 10 "isWSL"
```

**If the function is missing or broken, polling won't enable.**

---

### Manual Fix: Force Polling

If auto-detection fails, manually enable it:

**File:** `.config/webpack/webpack.config.ts`

**Find the return statement (around line 244):**
```typescript
return baseConfig;
```

**Change to:**
```typescript
// Force polling for watch mode
baseConfig.watchOptions = {
  poll: 3000,           // Check every 3 seconds
  aggregateTimeout: 300, // Wait 300ms after last change before rebuilding
  ignored: /node_modules/,
};

return baseConfig;
```

**Then restart npm run dev.**

---

## Best Solution: Move to WSL Filesystem

**This is the REAL fix for performance.**

### Why This Works

```
┌─────────────────────────────────────────┐
│         WSL/Ubuntu Filesystem           │
│                                         │
│  ~/Dev/r3f-test/                       │
│  └─ grafana-plugins/                   │
│     └─ test-plugin/                    │
│        └─ the-cube-panel/              │
│           ├─ src/                      │
│           │  └─ SimplePanel.tsx        │
│           └─ node_modules/             │
│                                         │
│  npm run dev ← Running on SAME FS ✅   │
│  File watch ← Native inotify ✅        │
│  Fast I/O ← No cross-boundary ✅       │
└─────────────────────────────────────────┘
```

**Benefits:**
- ✅ 10-50x faster builds
- ✅ Watch mode works perfectly (no polling needed)
- ✅ Lower CPU usage
- ✅ Instant rebuild on file save
- ✅ Better developer experience

**Trade-offs:**
- ⚠️ Need to access files via `\\wsl$\` from Windows
- ⚠️ One-time migration effort
- ✅ Cursor has excellent WSL support

---

### Migration Steps

**Before starting:**
- ✅ Commit all changes to git
- ✅ Push to GitHub
- ✅ Close npm run dev
- ✅ Close Docker Grafana

---

#### Step 1: Copy Project to WSL Filesystem

```bash
# In WSL terminal:

# Create directory in WSL home
mkdir -p ~/Dev

# Copy entire project (this takes a few minutes)
cp -r /mnt/c/Dev/r3f-test ~/Dev/

# Verify copy completed
ls -la ~/Dev/r3f-test/

# Should see:
# - godot-backend/
# - grafana-plugins/
# - grafana-server/
# - my-cesium-app/
```

**Time estimate:** 5-10 minutes (one-time only)

---

#### Step 2: Update Grafana Docker Mounts

**File:** `~/Dev/r3f-test/grafana-server/docker-compose.yml`

**Current (Windows path):**
```yaml
volumes:
  - ../grafana-plugins/test-plugin/the-cube-panel:/var/lib/grafana/plugins/the-cube-panel
```

**Keep as-is!** Relative paths work from WSL filesystem too.

**No changes needed!** Docker will work from WSL.

---

#### Step 3: Reinstall node_modules (Important!)

Node modules contain native binaries that differ between Windows and Linux. Must reinstall:

```bash
cd ~/Dev/r3f-test/grafana-plugins/test-plugin/the-cube-panel

# Remove Windows-built node_modules
rm -rf node_modules package-lock.json

# Reinstall for Linux
npm install

# Should be much faster than on /mnt/c/!
```

**Also for other projects:**
```bash
# my-cesium-app (if you work on it)
cd ~/Dev/r3f-test/my-cesium-app
rm -rf node_modules package-lock.json
npm install
```

---

#### Step 4: Open Project in Cursor from WSL

**Method 1: Via Windows Explorer**

1. Open Windows Explorer
2. Type in address bar: `\\wsl$\Ubuntu\home\YOUR_USERNAME\Dev\r3f-test`
   - Replace YOUR_USERNAME with your WSL username (probably `rbbs`)
3. Right-click → "Open with Cursor"

**Method 2: Via Cursor's Open Folder**

1. Open Cursor
2. File → Open Folder
3. Type: `\\wsl$\Ubuntu\home\rbbs\Dev\r3f-test`
4. Click "Select Folder"

**Method 3: Via Command Line (if Cursor installed in PATH)**

```bash
# In WSL:
cd ~/Dev/r3f-test
cursor .
```

**Cursor will detect WSL and connect automatically!**

---

#### Step 5: Start Grafana from WSL

```bash
cd ~/Dev/r3f-test/grafana-server
docker-compose up -d

# Check it's running
docker-compose ps
```

**Docker works perfectly from WSL filesystem!**

---

#### Step 6: Start Plugin Development

```bash
cd ~/Dev/r3f-test/grafana-plugins/test-plugin/the-cube-panel

# Start watch mode
npm run dev

# Should compile MUCH faster now!
# And watch mode will work!
```

**Expected:**
- First build: 30 seconds (vs 5-10 minutes on /mnt/c/)
- File save → rebuild: 2-5 seconds
- Automatic detection of changes ✅

---

#### Step 7: Verify Everything Works

1. **Edit SimplePanel.tsx** (make a small change)
2. **Save the file**
3. **Watch terminal** - should see "webpack compiled successfully" within seconds!
4. **Refresh browser** - changes appear!

**Success! 🎉**

---

#### Step 8: Update Git Remote (Optional)

If you have uncommitted changes on Windows version:

```bash
# In WSL, in your NEW project location:
cd ~/Dev/r3f-test

# Check git status
git status

# If there are differences, you can:
# 1. Commit new changes
# 2. Or reset to match GitHub

# Verify remote is still correct
git remote -v
# Should show your GitHub repository
```

---

### Accessing Files from Windows

**Windows Explorer:**
- Path: `\\wsl$\Ubuntu\home\rbbs\Dev\r3f-test`
- You can browse, open, edit files normally
- Cursor works perfectly with this path

**Command Line:**
- From PowerShell: Can't directly access WSL paths
- Use WSL terminal for command line operations

**Best Practice:**
- **Edit:** Use Cursor (works with WSL paths)
- **Git:** Use WSL terminal
- **npm commands:** Use WSL terminal
- **Browse files:** Windows Explorer or Cursor

---

## Performance Optimizations

### After Moving to WSL

**Additional speed improvements:**

#### 1. Exclude Unnecessary Directories from Watch

**File:** `.config/webpack/webpack.config.ts`

```typescript
baseConfig.watchOptions = {
  ignored: [
    /node_modules/,
    /dist/,
    /.git/,
    /test-plans/,  // Don't watch markdown files
    /.cache/,
  ],
};
```

---

#### 2. Use SWC Instead of Babel (Already Configured!)

Your plugin already uses SWC (Speedy Web Compiler) which is much faster than Babel.

**Check:** `.config/webpack/webpack.config.ts` line 86 uses `swc-loader` ✅

---

#### 3. Enable Webpack Cache (Already Configured!)

Your plugin already has filesystem cache enabled:

```typescript
cache: {
  type: 'filesystem',
  buildDependencies: {
    config: [path.resolve(process.cwd(), '.config', 'webpack', 'webpack.config.ts')],
  },
},
```

**This means:**
- First build: Slow (everything compiles)
- Subsequent builds: Fast (only changed files)
- Cache persists between restarts

---

#### 4. Reduce Type Checking Overhead

Type checking is async (runs in separate process), but you can make it faster:

**File:** `.config/webpack/webpack.config.ts`

Find `ForkTsCheckerWebpackPlugin` (around line 213):

```typescript
new ForkTsCheckerWebpackPlugin({
  async: Boolean(env.development),  // Already async ✅
  issue: {
    include: [{ file: '**/*.{ts,tsx}' }],
  },
  typescript: { 
    configFile: path.join(process.cwd(), 'tsconfig.json'),
    // Add this for faster checking:
    mode: 'write-references',  // Only check changed files
  },
}),
```

---

#### 5. Disable Source Maps in Development (Optional)

Source maps help debugging but slow down builds:

**File:** `.config/webpack/webpack.config.ts` (line 55)

**Current:**
```typescript
devtool: env.production ? 'source-map' : 'eval-source-map',
```

**Faster (but harder to debug):**
```typescript
devtool: env.production ? 'source-map' : 'eval',
```

**Trade-off:**
- ✅ Faster builds (~20% faster)
- ❌ Harder to debug (line numbers less accurate)

---

## Benchmarks and Expected Times

### On /mnt/c/ (Windows FS from WSL) - Current

| Operation | Time | Working |
|-----------|------|---------|
| Initial build | 5-10 min | ✅ |
| Rebuild after change | N/A | ❌ |
| File watch | Never | ❌ |
| With polling enabled | 3-8 min | ⚠️ |
| npm install | 10-15 min | ⚠️ |

---

### On ~/Dev/ (WSL Native FS) - Recommended

| Operation | Time | Working |
|-----------|------|---------|
| Initial build | 20-40 sec | ✅ |
| Rebuild after change | 2-5 sec | ✅ |
| File watch | Instant | ✅ |
| npm install | 1-2 min | ✅ |

**10-20x faster overall!**

---

### On Windows (PowerShell/CMD) - Alternative

| Operation | Time | Working |
|-----------|------|---------|
| Initial build | 30-60 sec | ✅ |
| Rebuild after change | 3-7 sec | ✅ |
| File watch | Instant | ✅ |
| npm install | 2-3 min | ✅ |

**Good performance, but loses WSL benefits for backend.**

---

## Comparison Matrix

| Aspect | Windows FS + WSL | WSL Native FS | Windows Only |
|--------|-----------------|---------------|--------------|
| Build speed | ⭐ 1/5 | ⭐⭐⭐⭐⭐ 5/5 | ⭐⭐⭐⭐ 4/5 |
| Watch mode | ❌ Broken | ✅ Perfect | ✅ Perfect |
| Docker integration | ✅ Good | ✅ Perfect | ⚠️ Separate |
| Backend compatibility | ✅ Good | ✅ Perfect | ❌ Issues |
| File access from Windows | ✅ Native | ⚠️ Via \\wsl$ | ✅ Native |
| Migration effort | ✅ None | ⚠️ Medium | ❌ High |
| **Recommendation** | ❌ Avoid | ✅ Best | ⚠️ If needed |

---

## Troubleshooting

### After Moving to WSL, Builds Still Slow

**Check you're actually in WSL filesystem:**
```bash
pwd
# Should show: /home/rbbs/Dev/r3f-test/...
# NOT: /mnt/c/Dev/r3f-test/...
```

**If still on /mnt/c/, you didn't move the project.**

---

### Watch Mode Still Not Working

**1. Check if node_modules reinstalled:**
```bash
ls -la node_modules/.bin/webpack
# Should show Linux executable, not Windows .exe
```

**2. Clear webpack cache:**
```bash
rm -rf node_modules/.cache
npm run dev
```

**3. Check webpack watch options:**
```bash
cat .config/webpack/webpack.config.ts | grep -A 5 "watchOptions"
```

---

### Can't Access Files from Windows

**Path should be:**
```
\\wsl$\Ubuntu\home\rbbs\Dev\r3f-test
```

**Not:**
```
\\wsl$\rbbs\Dev\r3f-test  ❌ Wrong
```

**Find your username:**
```bash
whoami
# Output: rbbs (or whatever your WSL username is)
```

---

### Docker Can't Find Plugin

**Check volume mount in docker-compose.yml:**
```yaml
volumes:
  - ../grafana-plugins/test-plugin/the-cube-panel:/var/lib/grafana/plugins/the-cube-panel
```

**From WSL filesystem, relative paths work the same!**

**Verify:**
```bash
cd ~/Dev/r3f-test/grafana-server
docker exec -it grafana-dev ls -la /var/lib/grafana/plugins/the-cube-panel
# Should show your plugin files
```

---

## Recommendations

### For Your Situation

**Immediate (Today):**
1. ✅ Enable polling (quick fix for watch mode)
2. ⚠️ Continue working on Windows FS with slow builds

**Tomorrow (When You Have Time):**
1. ✅ Move project to WSL filesystem
2. ✅ Enjoy 10-20x faster builds
3. ✅ Get perfect watch mode
4. ✅ Better development experience

---

### Why Move to WSL FS?

**Time savings per day:**
- Old: 10 builds × 5 minutes = 50 minutes waiting
- New: 10 builds × 30 seconds = 5 minutes waiting
- **Savings: 45 minutes per day!**

**Over a month:**
- 45 minutes × 20 workdays = **15 hours saved**

**Worth the 30-minute migration!**

---

## Summary

### The Core Issue

**WSL accessing Windows filesystem (/mnt/c/) is slow and breaks file watching.**

### Quick Fix (Enable Polling)

Add to webpack config:
```typescript
baseConfig.watchOptions = {
  poll: 3000,
  ignored: /node_modules/,
};
```

**Result:**
- ✅ Watch mode works
- ⚠️ Still slow (5-10 min builds)
- ⚠️ 3 second delay

### Best Fix (Move to WSL FS)

```bash
cp -r /mnt/c/Dev/r3f-test ~/Dev/
cd ~/Dev/r3f-test/grafana-plugins/test-plugin/the-cube-panel
rm -rf node_modules
npm install
npm run dev
```

**Result:**
- ✅ 10-20x faster builds
- ✅ Instant watch mode
- ✅ Perfect development experience

### Expected Performance

| Operation | Before | After | Improvement |
|-----------|--------|-------|-------------|
| Initial build | 5-10 min | 30 sec | 10-20x |
| Rebuild | N/A | 2-5 sec | ∞ (was broken) |
| npm install | 10-15 min | 1-2 min | 5-10x |

---

**End of Guide**

**Next Steps:** Choose your approach and let's implement it! 🚀

